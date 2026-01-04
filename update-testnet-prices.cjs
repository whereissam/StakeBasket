// Update prices on Core Testnet2
const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Updating prices on Core Testnet2...");
    
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    const priceFeed = await ethers.getContractAt("PriceFeed", "0xd3fC275555C46Ffa4a6F9d15380D4edA9D9fb06b", signer);
    
    try {
        // Check if emergency mode is active
        const isEmergencyMode = await priceFeed.emergencyMode();
        console.log(`Emergency mode status: ${isEmergencyMode}`);
        
        if (!isEmergencyMode) {
            console.log("Activating emergency mode...");
            const emergencyTx = await priceFeed.activateEmergencyMode("Update stale prices for testing");
            await emergencyTx.wait();
            console.log("✅ Emergency mode activated");
        }
        
        // Update CORE price to $1.50
        console.log("Setting CORE price to $1.50...");
        const coreTx = await priceFeed.emergencySetPrice("CORE", ethers.parseUnits("1.50", 8), "Update CORE price");
        await coreTx.wait();
        console.log("✅ CORE price updated");
        
        // Update BTC price to $65,000
        console.log("Setting BTC price to $65,000...");
        const btcTx = await priceFeed.emergencySetPrice("BTC", ethers.parseUnits("65000", 8), "Update BTC price");
        await btcTx.wait();
        console.log("✅ BTC price updated");
        
        // Deactivate emergency mode
        console.log("Deactivating emergency mode...");
        const deactivateTx = await priceFeed.deactivateEmergencyMode();
        await deactivateTx.wait();
        console.log("✅ Emergency mode deactivated");
        
        // Verify prices
        const corePrice = await priceFeed.getPrice("CORE");
        const btcPrice = await priceFeed.getPrice("BTC");
        
        console.log(`\n📊 Updated Prices:`);
        console.log(`CORE: $${ethers.formatUnits(corePrice, 8)}`);
        console.log(`BTC: $${ethers.formatUnits(btcPrice, 8)}`);
        
        console.log("\n✅ Price feed updated successfully!");
        
    } catch (error) {
        console.error("❌ Error updating prices:", error.message);
        if (error.reason) console.log("Reason:", error.reason);
    }
}

main().catch(console.error);