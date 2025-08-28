const hre = require("hardhat");
require('dotenv').config();

/**
 * Comprehensive PriceFeed Testing Script
 * Tests price accuracy, conversion logic, and compares with external sources
 */

async function main() {
    const [owner] = await hre.ethers.getSigners();
    
    console.log("🧪 Testing PriceFeed Price Accuracy");
    console.log("=====================================");
    console.log("Network:", hre.network.name);
    console.log("Owner address:", owner.address);
    
    // Get deployed PriceFeed contract address
    let priceFeedAddress;
    try {
        const fs = require('fs');
        const deploymentInfo = JSON.parse(fs.readFileSync('testnet-deployment-info.json', 'utf8'));
        priceFeedAddress = deploymentInfo.contracts.priceFeed;
    } catch (error) {
        console.log("❌ Could not find deployment info, using fallback address");
        // Fallback - you can set this manually
        priceFeedAddress = process.env.PRICE_FEED_ADDRESS || "";
        if (!priceFeedAddress) {
            console.log("❌ Please set PRICE_FEED_ADDRESS in .env file");
            return;
        }
    }
    
    console.log("PriceFeed Contract:", priceFeedAddress);
    
    // Connect to the deployed contract
    const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceFeedAddress);
    
    // Test assets to validate
    const testAssets = [
        { symbol: "CORE", name: "Core", expectedRange: [0.5, 5.0] }, // $0.5 - $5
        { symbol: "BTC", name: "Bitcoin", expectedRange: [30000, 120000] }, // $30k - $120k  
        { symbol: "USDT", name: "Tether", expectedRange: [0.98, 1.02] }, // $0.98 - $1.02
        { symbol: "USDC", name: "USD Coin", expectedRange: [0.98, 1.02] } // $0.98 - $1.02
    ];
    
    console.log("\n📊 Testing Asset Prices");
    console.log("========================");
    
    for (const asset of testAssets) {
        await testAssetPrice(priceFeed, asset);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
    
    console.log("\n🔧 Testing Pyth Price Conversion Logic");
    console.log("======================================");
    await testPythConversion(priceFeed);
    
    console.log("\n🌐 Comparing with External Price Sources");
    console.log("========================================");
    await compareWithExternalSources(priceFeed);
    
    console.log("\n🛡️ Testing Circuit Breaker Functionality");
    console.log("=========================================");
    await testCircuitBreaker(priceFeed);
    
    console.log("\n✅ PriceFeed Testing Complete");
}

async function testAssetPrice(priceFeed, asset) {
    try {
        console.log(`\n📈 Testing ${asset.name} (${asset.symbol})`);
        
        // Check if asset is active
        const priceData = await priceFeed.getPriceData(asset.symbol);
        const [price, lastUpdated, decimals, isActive] = priceData;
        
        if (!isActive) {
            console.log(`⚠️  ${asset.symbol} is not active in PriceFeed`);
            return;
        }
        
        console.log(`   Raw Price: ${price.toString()}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Last Updated: ${new Date(lastUpdated * 1000).toISOString()}`);
        
        // Convert to human-readable price
        const humanPrice = parseFloat(hre.ethers.formatUnits(price, 18));
        console.log(`   Formatted Price: $${humanPrice.toFixed(6)}`);
        
        // Check if price is within expected range
        const [min, max] = asset.expectedRange;
        if (humanPrice >= min && humanPrice <= max) {
            console.log(`   ✅ Price is within expected range ($${min} - $${max})`);
        } else {
            console.log(`   ⚠️  Price outside expected range ($${min} - $${max})`);
        }
        
        // Check price age
        const currentTime = Math.floor(Date.now() / 1000);
        const ageMinutes = (currentTime - lastUpdated) / 60;
        console.log(`   Age: ${ageMinutes.toFixed(1)} minutes`);
        
        if (ageMinutes > 60) {
            console.log(`   ⚠️  Price is older than 1 hour (stale)`);
        } else {
            console.log(`   ✅ Price is fresh`);
        }
        
        // Test specific getter functions
        try {
            let specificPrice;
            switch (asset.symbol) {
                case "CORE":
                    specificPrice = await priceFeed.getCorePrice();
                    break;
                case "BTC":
                    specificPrice = await priceFeed.getPrimaryBTCPrice();
                    break;
                case "USDT":
                    specificPrice = await priceFeed.getUSDTPrice();
                    break;
                case "USDC":
                    specificPrice = await priceFeed.getUSDCPrice();
                    break;
                default:
                    specificPrice = await priceFeed.getPrice(asset.symbol);
            }
            
            const specificHumanPrice = parseFloat(hre.ethers.formatUnits(specificPrice, 18));
            if (Math.abs(humanPrice - specificHumanPrice) < 0.000001) {
                console.log(`   ✅ Specific getter matches generic getter`);
            } else {
                console.log(`   ❌ Price mismatch: Generic $${humanPrice} vs Specific $${specificHumanPrice}`);
            }
        } catch (error) {
            console.log(`   ❌ Error testing specific getter: ${error.message}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Error testing ${asset.symbol}: ${error.message}`);
    }
}

async function testPythConversion(priceFeed) {
    console.log("Testing theoretical Pyth price conversions...");
    
    // Test different expo scenarios
    const testCases = [
        { price: 9800000000, expo: -8, expected: 98.0, name: "BTC-like (expo -8)" },
        { price: 100000000, expo: -6, expected: 100.0, name: "CORE-like (expo -6)" }, 
        { price: 1000000, expo: -6, expected: 1.0, name: "USDT-like (expo -6)" },
        { price: 500, expo: -2, expected: 5.0, name: "Simple (expo -2)" },
        { price: 123, expo: 0, expected: 123.0, name: "No scaling (expo 0)" }
    ];
    
    console.log("\n   Theoretical Conversion Tests:");
    for (const testCase of testCases) {
        const result = simulatePythConversion(testCase.price, testCase.expo);
        const success = Math.abs(result - testCase.expected) < 0.001;
        console.log(`   ${success ? '✅' : '❌'} ${testCase.name}: ${testCase.price} * 10^${testCase.expo} = $${result} (expected $${testCase.expected})`);
    }
}

function simulatePythConversion(price, expo) {
    // Simulate the contract's conversion logic
    if (expo < 0) {
        const scale = Math.pow(10, Math.abs(expo));
        return (price * 1e18) / scale / 1e18;
    } else {
        const scale = Math.pow(10, expo);
        return price * scale;
    }
}

async function compareWithExternalSources(priceFeed) {
    try {
        // Fetch external prices for comparison
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=usd');
        const externalPrices = await response.json();
        
        console.log("External prices from CoinGecko:");
        console.log(`   BTC: $${externalPrices.bitcoin?.usd || 'N/A'}`);
        console.log(`   USDT: $${externalPrices.tether?.usd || 'N/A'}`);
        console.log(`   USDC: $${externalPrices['usd-coin']?.usd || 'N/A'}`);
        
        // Compare with PriceFeed prices
        const comparisons = [
            { symbol: "BTC", external: externalPrices.bitcoin?.usd },
            { symbol: "USDT", external: externalPrices.tether?.usd },
            { symbol: "USDC", external: externalPrices['usd-coin']?.usd }
        ];
        
        console.log("\nPrice Comparisons:");
        for (const comp of comparisons) {
            if (!comp.external) continue;
            
            try {
                const priceFeedPrice = await priceFeed.getPrice(comp.symbol);
                const pfPrice = parseFloat(hre.ethers.formatUnits(priceFeedPrice, 18));
                const deviation = Math.abs(pfPrice - comp.external) / comp.external * 100;
                
                console.log(`   ${comp.symbol}: PriceFeed $${pfPrice.toFixed(6)} vs External $${comp.external.toFixed(6)} (${deviation.toFixed(2)}% diff)`);
                
                if (deviation < 5) {
                    console.log(`   ✅ Deviation within acceptable range (<5%)`);
                } else {
                    console.log(`   ⚠️  High deviation (>5%) - may need investigation`);
                }
            } catch (error) {
                console.log(`   ❌ Error comparing ${comp.symbol}: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.log("❌ Could not fetch external prices for comparison:", error.message);
    }
}

async function testCircuitBreaker(priceFeed) {
    const testAssets = ["CORE", "BTC", "USDT"];
    
    console.log("Checking circuit breaker status for assets:");
    
    for (const asset of testAssets) {
        try {
            const status = await priceFeed.getCircuitBreakerStatus(asset);
            const [isTriggered, triggerTime, cooldownEnds, canReset] = status;
            
            console.log(`\n   ${asset}:`);
            console.log(`     Triggered: ${isTriggered}`);
            if (isTriggered) {
                console.log(`     Trigger Time: ${new Date(triggerTime * 1000).toISOString()}`);
                console.log(`     Cooldown Ends: ${new Date(cooldownEnds * 1000).toISOString()}`);
                console.log(`     Can Reset: ${canReset}`);
            }
            
            // Check comprehensive asset status
            const assetStatus = await priceFeed.getAssetStatus(asset);
            const [isActive, isPriceValid, cbTriggered, hasBackup, priceAge, updateCount] = assetStatus;
            
            console.log(`     Active: ${isActive}`);
            console.log(`     Price Valid: ${isPriceValid}`);
            console.log(`     Has Backup: ${hasBackup}`);
            console.log(`     Price Age: ${priceAge}s`);
            console.log(`     Update Count: ${updateCount}`);
            
        } catch (error) {
            console.log(`   ❌ Error checking ${asset}: ${error.message}`);
        }
    }
}

// Handle errors
main().catch((error) => {
    console.error("❌ Test failed:", error);
    process.exitCode = 1;
});