const hre = require("hardhat");

async function main() {
    const PriceFeed = await hre.ethers.getContractAt('PriceFeed', '0x92d36203C9e13f839Fb5668655b123d678bC8049');
    
    console.log("🔍 Checking Price Data Status");
    console.log("============================\n");
    
    try {
        console.log("📊 CORE Price Data:");
        const coreData = await PriceFeed.priceData("CORE");
        console.log(`   Price: ${hre.ethers.formatUnits(coreData.price, 18)}`);
        console.log(`   Last Updated: ${coreData.lastUpdated}`);
        console.log(`   Decimals: ${coreData.decimals}`);
        console.log(`   Is Active: ${coreData.isActive}`);
        
        if (!coreData.isActive) {
            console.log("   ❌ CORE is not active - need to initialize!");
        }
    } catch (e) {
        console.log(`   Error reading CORE data: ${e.message}`);
    }
    
    try {
        console.log("\n📊 BTC Price Data:");
        const btcData = await PriceFeed.priceData("BTC");
        console.log(`   Price: ${hre.ethers.formatUnits(btcData.price, 18)}`);
        console.log(`   Last Updated: ${btcData.lastUpdated}`);
        console.log(`   Decimals: ${btcData.decimals}`);
        console.log(`   Is Active: ${btcData.isActive}`);
        
        if (!btcData.isActive) {
            console.log("   ❌ BTC is not active - need to initialize!");
        }
    } catch (e) {
        console.log(`   Error reading BTC data: ${e.message}`);
    }
    
    // Check supported assets
    try {
        console.log("\n📋 Supported Assets:");
        const supportedAssets = await PriceFeed.getSupportedAssets();
        console.log(`   ${supportedAssets.join(", ")}`);
    } catch (e) {
        console.log(`   Error reading supported assets: ${e.message}`);
    }
}

main().catch(console.error);