const hre = require("hardhat");

async function setupPriceFeed() {
  console.log("🔧 Setting up price feed for local development...");
  
  try {
    const [deployer] = await hre.ethers.getSigners();
    
    // Get deployment info
    const deploymentPath = './docs/testnet-deployment.json';
    let deploymentData;
    
    try {
      deploymentData = require('../docs/testnet-deployment.json');
    } catch (error) {
      console.log("❌ No deployment data found. Please deploy contracts first.");
      return false;
    }
    
    const priceFeedAddress = deploymentData.contracts?.PriceFeed;
    
    if (!priceFeedAddress) {
      console.log("❌ PriceFeed contract address not found in deployment data");
      return false;
    }
    
    console.log("📍 PriceFeed address:", priceFeedAddress);
    
    // Get contract instance
    const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceFeedAddress);
    
    // Check if prices are already set
    let corePrice, btcPrice;
    try {
      corePrice = await priceFeed.getPrice("CORE");
      btcPrice = await priceFeed.getPrice("BTC");
      
      if (corePrice > 0 && btcPrice > 0) {
        console.log("✅ Prices already set:");
        console.log(`   CORE: $${hre.ethers.formatUnits(corePrice, 8)}`);
        console.log(`   BTC: $${hre.ethers.formatUnits(btcPrice, 8)}`);
        return true;
      }
    } catch (error) {
      console.log("🔍 Prices not set, will initialize them...");
    }
    
    // Set CORE price ($1.50) - try with higher gas limit
    const corePriceWei = hre.ethers.parseUnits("1.50", 8); // 8 decimals for price feed
    console.log("⚡ Setting CORE price to $1.50...");
    const tx1 = await priceFeed.setPrice("CORE", corePriceWei, { gasLimit: 100000 });
    await tx1.wait();
    
    // Set BTC price ($95,000)
    const btcPriceWei = hre.ethers.parseUnits("95000", 8); // 8 decimals for price feed
    console.log("⚡ Setting BTC price to $95,000...");
    const tx2 = await priceFeed.setPrice("BTC", btcPriceWei, { gasLimit: 100000 });
    await tx2.wait();
    
    // Verify prices
    const coreResult = await priceFeed.getPrice("CORE");
    const btcResult = await priceFeed.getPrice("BTC");
    
    console.log("✅ Price feed setup completed!");
    console.log(`   CORE: $${hre.ethers.formatUnits(coreResult, 8)}`);
    console.log(`   BTC: $${hre.ethers.formatUnits(btcResult, 8)}`);
    
    return true;
    
  } catch (error) {
    console.error("❌ Failed to setup price feed:", error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  setupPriceFeed()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupPriceFeed };