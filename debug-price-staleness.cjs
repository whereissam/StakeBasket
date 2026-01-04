// Debug price staleness issue
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging price staleness...");
    
    const [signer] = await ethers.getSigners();
    const priceFeed = await ethers.getContractAt("PriceFeed", "0xd3fC275555C46Ffa4a6F9d15380D4edA9D9fb06b", signer);
    
    try {
        // Check staleness settings
        console.log("📊 Price Feed Configuration:");
        
        const stalenessEnabled = await priceFeed.stalenessCheckEnabled();
        console.log(`Staleness Check Enabled: ${stalenessEnabled}`);
        
        const maxPriceAge = await priceFeed.maxPriceAge();
        console.log(`Max Price Age: ${maxPriceAge} seconds (${maxPriceAge/60} minutes)`);
        
        // Check price data for CORE
        try {
            const corePrice = await priceFeed.getPrice("CORE");
            console.log(`\nCORE Price: $${ethers.formatUnits(corePrice, 8)}`);
        } catch (error) {
            console.log(`\n❌ CORE Price Error: ${error.message}`);
        }
        
        // Try to get price data directly
        try {
            const corePriceData = await priceFeed.priceData("CORE");
            const currentTime = Math.floor(Date.now() / 1000);
            console.log(`\nRaw CORE Price Data:`);
            console.log(`- Price: $${ethers.formatUnits(corePriceData.price, 8)}`);
            console.log(`- Last Update: ${corePriceData.lastUpdated} (${new Date(Number(corePriceData.lastUpdated) * 1000).toISOString()})`);
            console.log(`- Age: ${currentTime - Number(corePriceData.lastUpdated)} seconds`);
            console.log(`- Is Stale: ${currentTime - Number(corePriceData.lastUpdated) > maxPriceAge}`);
        } catch (error) {
            console.log(`❌ Raw Price Data Error: ${error.message}`);
        }
        
        // Disable staleness check if enabled
        if (stalenessEnabled) {
            console.log("\n💡 Disabling staleness check for testing...");
            const disableTx = await priceFeed.setStalenessCheckEnabled(false);
            await disableTx.wait();
            console.log("✅ Staleness check disabled");
        } else {
            console.log("\n✅ Staleness check is already disabled");
        }
        
        // Try getting price again
        try {
            const corePrice = await priceFeed.getPrice("CORE");
            console.log(`\nFinal CORE Price: $${ethers.formatUnits(corePrice, 8)}`);
        } catch (error) {
            console.log(`\n❌ Final CORE Price Error: ${error.message}`);
        }
        
    } catch (error) {
        console.error("❌ Debug error:", error.message);
    }
}

main().catch(console.error);