// Fix Price Feed with correct prices
const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Fixing Price Feed...");
    
    const [signer] = await ethers.getSigners();
    const priceFeed = await ethers.getContractAt("PriceFeed", "0x930b218f3e63eE452c13561057a8d5E61367d5b7", signer);
    
    try {
        // Set correct CORE price ($0.70)
        console.log("Setting CORE price to $0.70...");
        await priceFeed.emergencySetPrice("CORE", ethers.parseUnits("0.70", 8), "Fix CORE price");
        
        // Add BTC asset with correct price ($110,000)
        console.log("Adding BTC price at $110,000...");
        await priceFeed.emergencySetPrice("BTC", ethers.parseUnits("110000", 8), "Add BTC price");
        
        // Verify prices
        const corePrice = await priceFeed.getPrice("CORE");
        const btcPrice = await priceFeed.getPrice("BTC");
        
        console.log(`✅ CORE Price: $${ethers.formatUnits(corePrice, 8)}`);
        console.log(`✅ BTC Price: $${ethers.formatUnits(btcPrice, 8)}`);
        
    } catch (error) {
        console.error("❌ Error fixing prices:", error.message);
    }
}

main().catch(console.error);