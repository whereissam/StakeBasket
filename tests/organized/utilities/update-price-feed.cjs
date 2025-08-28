const hre = require("hardhat");

async function updatePriceFeed() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Updating price feed with account:", deployer.address);

  const PRICE_FEED_ADDRESS = "0x8a12e5F90279f0a5682c33D6Cab5C430B71aC80F";
  
  const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
  const priceFeed = PriceFeed.attach(PRICE_FEED_ADDRESS);

  try {
    console.log("\n=== Updating Price Feed ===");
    
    // Activate emergency mode to bypass staleness checks
    console.log("Activating emergency mode...");
    await priceFeed.activateEmergencyMode("Initial price setup for testnet");
    
    // Set mock prices for CORE and BTC since Pyth oracle is placeholder
    console.log("Setting CORE price...");
    await priceFeed.setPrice("CORE", 150000000); // $1.50 with 8 decimals
    
    console.log("Setting BTC price...");
    await priceFeed.setPrice("BTC", 9500000000000); // $95,000 with 8 decimals
    
    // Deactivate emergency mode
    console.log("Deactivating emergency mode...");
    await priceFeed.deactivateEmergencyMode();
    
    // Verify prices
    const corePrice = await priceFeed.getPrice("CORE");
    const btcPrice = await priceFeed.getPrice("BTC");
    
    console.log("CORE price:", corePrice.toString(), "($1.50)");
    console.log("BTC price:", btcPrice.toString(), "($95,000)");
    
    console.log("✅ Price feed updated successfully!");

  } catch (error) {
    console.error("❌ Price feed update failed:");
    console.error("Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

updatePriceFeed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });