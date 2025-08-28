const hre = require("hardhat");

async function checkCurrentPrices() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Checking current prices on Core Testnet2...");

  const PRICE_FEED_ADDRESS = "0x8a12e5F90279f0a5682c33D6Cab5C430B71aC80F";
  
  const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
  const priceFeed = PriceFeed.attach(PRICE_FEED_ADDRESS);

  try {
    console.log("\n=== Current Prices in PriceFeed Contract ===");
    
    // Get current prices
    const corePrice = await priceFeed.getPrice("CORE");
    const btcPrice = await priceFeed.getPrice("BTC");
    
    // Get price data with timestamps
    const corePriceData = await priceFeed.priceData("CORE");
    const btcPriceData = await priceFeed.priceData("BTC");
    
    console.log(`CORE Price: ${corePrice.toString()} ($${(Number(corePrice) / 1e8).toFixed(4)})`);
    console.log(`  - Last Updated: ${new Date(Number(corePriceData.lastUpdated) * 1000).toLocaleString()}`);
    console.log(`  - Decimals: ${corePriceData.decimals}`);
    console.log(`  - Active: ${corePriceData.isActive}`);
    
    console.log(`\nBTC Price: ${btcPrice.toString()} ($${(Number(btcPrice) / 1e8).toLocaleString()})`);
    console.log(`  - Last Updated: ${new Date(Number(btcPriceData.lastUpdated) * 1000).toLocaleString()}`);
    console.log(`  - Decimals: ${btcPriceData.decimals}`);
    console.log(`  - Active: ${btcPriceData.isActive}`);
    
    // Check if prices are fresh (within 1 hour)
    const now = Math.floor(Date.now() / 1000);
    const coreAge = now - Number(corePriceData.lastUpdated);
    const btcAge = now - Number(btcPriceData.lastUpdated);
    
    console.log(`\n=== Price Freshness ===`);
    console.log(`CORE price age: ${Math.floor(coreAge / 60)} minutes (${coreAge < 3600 ? 'FRESH' : 'STALE'})`);
    console.log(`BTC price age: ${Math.floor(btcAge / 60)} minutes (${btcAge < 3600 ? 'FRESH' : 'STALE'})`);

  } catch (error) {
    console.error("❌ Failed to check prices:");
    console.error("Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

checkCurrentPrices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });