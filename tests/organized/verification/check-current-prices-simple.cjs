const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("💰 Current PriceFeed Prices");
    console.log("============================");
    
    // Get PriceFeed address
    const fs = require('fs');
    const deploymentInfo = JSON.parse(fs.readFileSync('testnet-deployment-info.json', 'utf8'));
    const priceFeedAddress = deploymentInfo.contracts.priceFeed;
    
    console.log("PriceFeed Contract:", priceFeedAddress);
    console.log("Network:", hre.network.name);
    
    // Connect to contract
    const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceFeedAddress);
    
    // Test assets
    const assets = ["CORE", "BTC", "USDT", "USDC", "SolvBTC", "cbBTC", "coreBTC"];
    
    console.log("\n📊 Asset Prices:");
    console.log("=================");
    
    for (const asset of assets) {
        try {
            // Get price data
            const priceData = await priceFeed.getPriceData(asset);
            const [rawPrice, lastUpdated, decimals, isActive] = priceData;
            
            if (!isActive) {
                console.log(`${asset.padEnd(8)}: ❌ Not active`);
                continue;
            }
            
            // Convert BigInt to string then to number for display
            const priceStr = rawPrice.toString();
            const humanPrice = Number(priceStr) / Math.pow(10, 18);
            
            // Check if price is fresh
            const currentTime = Math.floor(Date.now() / 1000);
            const ageMinutes = (Number(currentTime) - Number(lastUpdated)) / 60;
            const isStale = ageMinutes > 60;
            
            console.log(`${asset.padEnd(8)}: $${humanPrice.toFixed(6)} ${isStale ? '⚠️ STALE' : '✅ FRESH'} (${ageMinutes.toFixed(0)}m old)`);
            
        } catch (error) {
            console.log(`${asset.padEnd(8)}: ❌ Error: ${error.message}`);
        }
    }
    
    console.log("\n🔄 Testing Price Updates:");
    console.log("==========================");
    
    // Try to update prices that have Pyth IDs set
    const updateAssets = ["CORE"];
    
    for (const asset of updateAssets) {
        try {
            console.log(`\nUpdating ${asset} price from Pyth...`);
            const tx = await priceFeed.updatePriceFromPyth(asset);
            await tx.wait();
            console.log(`✅ ${asset} price updated successfully`);
            
            // Get updated price
            const priceData = await priceFeed.getPriceData(asset);
            const [rawPrice] = priceData;
            const humanPrice = Number(rawPrice.toString()) / Math.pow(10, 18);
            console.log(`   New price: $${humanPrice.toFixed(6)}`);
            
        } catch (error) {
            console.log(`❌ Failed to update ${asset}: ${error.message}`);
        }
    }
    
    console.log("\n🌐 External Price Comparison:");
    console.log("==============================");
    
    // Get external prices for CORE
    try {
        // Note: CORE may not be on major exchanges, using BTC as example
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await response.json();
        
        if (data.bitcoin) {
            console.log(`External BTC Price: $${data.bitcoin.usd}`);
            
            try {
                const btcData = await priceFeed.getPriceData("BTC");
                const [rawPrice, , , isActive] = btcData;
                
                if (isActive) {
                    const humanPrice = Number(rawPrice.toString()) / Math.pow(10, 18);
                    const deviation = Math.abs(humanPrice - data.bitcoin.usd) / data.bitcoin.usd * 100;
                    console.log(`PriceFeed BTC: $${humanPrice.toFixed(2)} (${deviation.toFixed(1)}% difference)`);
                } else {
                    console.log(`PriceFeed BTC: Not active`);
                }
            } catch (error) {
                console.log(`PriceFeed BTC: Error getting price`);
            }
        }
    } catch (error) {
        console.log("Could not fetch external price");
    }
    
    console.log("\n✅ Price check complete!");
}

main().catch(console.error);