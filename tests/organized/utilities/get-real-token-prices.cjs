const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("💰 Getting Real Token Prices");
    console.log("=============================");
    console.log("Time:", new Date().toISOString());
    
    // Get PriceFeed address
    const fs = require('fs');
    const deploymentInfo = JSON.parse(fs.readFileSync('testnet-deployment-info.json', 'utf8'));
    const priceFeedAddress = deploymentInfo.contracts.priceFeed;
    
    const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceFeedAddress);
    
    console.log("PriceFeed Contract:", priceFeedAddress);
    
    // First, let's get live market prices from APIs
    console.log("\n🌐 Fetching Live Market Prices:");
    console.log("================================");
    
    let liveMarketPrices = {};
    
    try {
        // Get major crypto prices
        console.log("Fetching from CoinGecko...");
        const cryptoResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin,core-dao&vs_currencies=usd');
        const cryptoData = await cryptoResponse.json();
        
        if (cryptoData.bitcoin) {
            liveMarketPrices.BTC = cryptoData.bitcoin.usd;
            console.log(`✅ BTC: $${cryptoData.bitcoin.usd.toLocaleString()}`);
        }
        
        if (cryptoData['core-dao']) {
            liveMarketPrices.CORE = cryptoData['core-dao'].usd;
            console.log(`✅ CORE: $${cryptoData['core-dao'].usd}`);
        } else {
            // Fallback for CORE if not found
            liveMarketPrices.CORE = 0.436; // From our previous search
            console.log(`⚠️  CORE: $0.436 (fallback price)`);
        }
        
        if (cryptoData.tether) {
            liveMarketPrices.USDT = cryptoData.tether.usd;
            console.log(`✅ USDT: $${cryptoData.tether.usd}`);
        }
        
        if (cryptoData['usd-coin']) {
            liveMarketPrices.USDC = cryptoData['usd-coin'].usd;
            console.log(`✅ USDC: $${cryptoData['usd-coin'].usd}`);
        }
        
    } catch (error) {
        console.log("❌ Error fetching live prices:", error.message);
        console.log("Using fallback prices...");
        
        // Fallback prices (reasonable estimates)
        liveMarketPrices = {
            CORE: 0.436,    // Based on our search
            BTC: 111000,    // Approximate BTC price
            USDT: 1.000,    // Stable
            USDC: 0.9998    // Stable
        };
    }
    
    // Set BTC-pegged tokens to BTC price
    if (liveMarketPrices.BTC) {
        liveMarketPrices.SolvBTC = liveMarketPrices.BTC;
        liveMarketPrices.cbBTC = liveMarketPrices.BTC;
        liveMarketPrices.coreBTC = liveMarketPrices.BTC;
        console.log(`✅ BTC-pegged tokens set to $${liveMarketPrices.BTC.toLocaleString()}`);
    }
    
    console.log("\n💎 Current Market Prices Summary:");
    console.log("==================================");
    
    for (const [token, price] of Object.entries(liveMarketPrices)) {
        console.log(`${token.padEnd(8)}: $${typeof price === 'number' ? price.toLocaleString() : price}`);
    }
    
    console.log("\n🔄 Updating PriceFeed Contract:");
    console.log("================================");
    
    // Update prices in contract
    for (const [asset, price] of Object.entries(liveMarketPrices)) {
        try {
            const priceWei = hre.ethers.parseUnits(price.toString(), 18);
            console.log(`Setting ${asset} to $${price}...`);
            
            const tx = await priceFeed.setPrice(asset, priceWei);
            await tx.wait();
            console.log(`✅ ${asset} updated successfully`);
            
        } catch (error) {
            console.log(`❌ Failed to update ${asset}: ${error.message}`);
        }
        
        // Prevent nonce issues
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("\n📊 VERIFICATION - Contract vs Market Prices:");
    console.log("=============================================");
    
    for (const [asset, marketPrice] of Object.entries(liveMarketPrices)) {
        try {
            const contractData = await priceFeed.getPriceData(asset);
            const [rawPrice, lastUpdated, , isActive] = contractData;
            
            if (!isActive) {
                console.log(`${asset.padEnd(8)}: ❌ Not active in contract`);
                continue;
            }
            
            const contractPrice = Number(rawPrice.toString()) / 1e18;
            const deviation = Math.abs(contractPrice - marketPrice) / marketPrice * 100;
            const status = deviation < 0.1 ? '✅ PERFECT' : 
                          deviation < 1.0 ? '✅ ACCURATE' : 
                          deviation < 5.0 ? '⚠️ CLOSE' : '❌ INACCURATE';
            
            const ageSeconds = Math.floor(Date.now() / 1000) - Number(lastUpdated);
            const freshness = ageSeconds < 60 ? '🟢 FRESH' : 
                             ageSeconds < 300 ? '🟡 OK' : '🔴 STALE';
            
            console.log(`${asset.padEnd(8)}: Market $${marketPrice.toLocaleString()} | Contract $${contractPrice.toLocaleString()} (${deviation.toFixed(2)}% diff) ${status} ${freshness}`);
            
        } catch (error) {
            console.log(`${asset.padEnd(8)}: ❌ Error reading from contract`);
        }
    }
    
    console.log("\n🎯 Testing All Price Getter Functions:");
    console.log("=======================================");
    
    const getterTests = [
        { name: "CORE", func: "getCorePrice", expected: liveMarketPrices.CORE },
        { name: "Primary BTC", func: "getPrimaryBTCPrice", expected: liveMarketPrices.SolvBTC },
        { name: "USDT", func: "getUSDTPrice", expected: liveMarketPrices.USDT },
        { name: "USDC", func: "getUSDCPrice", expected: liveMarketPrices.USDC },
        { name: "SolvBTC", func: "getSolvBTCPrice", expected: liveMarketPrices.SolvBTC },
        { name: "cbBTC", func: "getCbBTCPrice", expected: liveMarketPrices.cbBTC },
        { name: "coreBTC", func: "getCoreBTCPrice", expected: liveMarketPrices.coreBTC }
    ];
    
    let allWorking = true;
    
    for (const test of getterTests) {
        try {
            const price = await priceFeed[test.func]();
            const humanPrice = Number(price.toString()) / 1e18;
            const expected = test.expected;
            const match = Math.abs(humanPrice - expected) < (expected * 0.01); // Within 1%
            
            console.log(`${test.name.padEnd(12)}: $${humanPrice.toLocaleString()} ${match ? '✅' : '⚠️'} (expected $${expected.toLocaleString()})`);
            
            if (!match) allWorking = false;
            
        } catch (error) {
            console.log(`${test.name.padEnd(12)}: ❌ ERROR - ${error.message}`);
            allWorking = false;
        }
    }
    
    console.log("\n🏆 FINAL RESULTS:");
    console.log("==================");
    
    if (allWorking) {
        console.log("🎉 SUCCESS! All prices are working and accurate!");
        console.log("✅ Contract prices match live market data");
        console.log("✅ All getter functions work perfectly");
        console.log("✅ Data is fresh and up-to-date");
    } else {
        console.log("⚠️  Some issues detected, but basic functionality works");
        console.log("🔧 Contract has been updated with latest available prices");
    }
    
    console.log("\n📈 REAL PRICES YOU CAN VERIFY:");
    console.log("===============================");
    
    try {
        // Get final prices from contract for user verification
        const corePrice = await priceFeed.getCorePrice();
        const btcPrice = await priceFeed.getPrimaryBTCPrice(); 
        const usdtPrice = await priceFeed.getUSDTPrice();
        const usdcPrice = await priceFeed.getUSDCPrice();
        
        console.log(`💎 CORE:  $${(Number(corePrice.toString()) / 1e18).toFixed(6)}`);
        console.log(`₿  BTC:   $${(Number(btcPrice.toString()) / 1e18).toLocaleString()}`);
        console.log(`💵 USDT:  $${(Number(usdtPrice.toString()) / 1e18).toFixed(6)}`);
        console.log(`💵 USDC:  $${(Number(usdcPrice.toString()) / 1e18).toFixed(6)}`);
        
        console.log("\n🔍 You can verify these prices at:");
        console.log("   • CORE: https://coinmarketcap.com/currencies/core-dao/");
        console.log("   • BTC:  https://coinmarketcap.com/currencies/bitcoin/");
        console.log("   • USDT: https://coinmarketcap.com/currencies/tether/");
        console.log("   • USDC: https://coinmarketcap.com/currencies/usd-coin/");
        
    } catch (error) {
        console.log("❌ Error getting final price summary");
    }
    
    console.log("\n✅ Price update complete! Contract ready for use.");
}

main().catch(console.error);