const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Testing Pyth prices with account:", deployer.address);
  console.log("Network:", hre.network.name);
  
  // Get deployed PriceFeed address (updated from deployment)
  const DEPLOYED_ADDRESSES = {
    hardhat: "0x2c8ED11fd7A058096F2e5828799c68BE88744E2F", // Updated from deployment
    localhost: "0x2c8ED11fd7A058096F2e5828799c68BE88744E2F", // Same as hardhat
    coreTestnet2: "0xADBD20E27FfF3B90CF73fA5A327ce77D32138ded" // Update with actual address
  };
  
  const priceFeedAddress = DEPLOYED_ADDRESSES[hre.network.name];
  if (!priceFeedAddress) {
    console.error("❌ No PriceFeed address configured for network:", hre.network.name);
    return;
  }
  
  console.log("Using PriceFeed at:", priceFeedAddress);
  
  // Get the deployed PriceFeed contract
  const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
  const priceFeed = PriceFeed.attach(priceFeedAddress);
  
  // Test assets to check
  const testAssets = ["BTC", "ETH", "CORE", "USDT", "USDC"];
  
  console.log("\n=== Testing Pyth Price Updates ===");
  
  for (const asset of testAssets) {
    console.log(`\n--- Testing ${asset} ---`);
    
    try {
      // Check if asset is configured
      const pythPriceId = await priceFeed.pythPriceIds(asset);
      console.log(`${asset} Pyth Price ID:`, pythPriceId);
      
      if (pythPriceId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log(`⚠️ ${asset} not configured with Pyth price ID`);
        continue;
      }
      
      // Try to update price from Pyth
      console.log(`Updating ${asset} price from Pyth...`);
      const updateTx = await priceFeed.updatePriceFromPyth(asset);
      await updateTx.wait();
      console.log(`✅ ${asset} price updated successfully`);
      
      // Get the updated price
      const price = await priceFeed.getPrice(asset);
      const priceInUSD = Number(price) / 1e18;
      console.log(`💰 ${asset} Price: $${priceInUSD.toLocaleString()}`);
      
      // Get price data details
      const [priceVal, lastUpdated, decimals, isActive] = await priceFeed.getPriceData(asset);
      const updateTime = new Date(Number(lastUpdated) * 1000);
      console.log(`📊 Last Updated: ${updateTime.toISOString()}`);
      console.log(`📊 Decimals: ${decimals}, Active: ${isActive}`);
      
    } catch (error) {
      console.log(`❌ ${asset} price update failed:`, error.message);
      
      // Try to get existing price if any
      try {
        const existingPrice = await priceFeed.getPrice(asset);
        const priceInUSD = Number(existingPrice) / 1e18;
        console.log(`💰 ${asset} Existing Price: $${priceInUSD.toLocaleString()}`);
      } catch (getPriceError) {
        console.log(`❌ ${asset} no existing price:`, getPriceError.message);
      }
    }
  }
  
  console.log("\n=== Testing Pyth Oracle Connection ===");
  
  try {
    const pythOracle = await priceFeed.pythOracle();
    console.log("Pyth Oracle Address:", pythOracle);
    
    if (pythOracle === "0x0000000000000000000000000000000000000000") {
      console.log("⚠️ Pyth Oracle not set!");
    } else {
      console.log("✅ Pyth Oracle configured");
    }
  } catch (error) {
    console.log("❌ Error checking Pyth oracle:", error.message);
  }
  
  console.log("\n=== Testing Circuit Breaker Status ===");
  
  for (const asset of testAssets) {
    try {
      const [isTriggered, triggerTime, cooldownEnds, canReset] = await priceFeed.getCircuitBreakerStatus(asset);
      if (isTriggered) {
        console.log(`⚠️ ${asset} Circuit Breaker TRIGGERED at ${new Date(Number(triggerTime) * 1000).toISOString()}`);
        console.log(`   Cooldown ends: ${new Date(Number(cooldownEnds) * 1000).toISOString()}, Can reset: ${canReset}`);
      } else {
        console.log(`✅ ${asset} Circuit Breaker OK`);
      }
    } catch (error) {
      console.log(`❌ ${asset} circuit breaker check failed:`, error.message);
    }
  }
  
  console.log("\n=== Price Comparison Test ===");
  
  // Compare with manual price check if possible
  const currentBTCPrice = 114000; // Current BTC price (you can update this)
  const currentETHPrice = 3400;   // Current ETH price (you can update this)
  const currentCOREPrice = 0.49;  // Current CORE price (you can update this)
  
  const expectedPrices = {
    BTC: currentBTCPrice,
    ETH: currentETHPrice,
    CORE: currentCOREPrice,
    USDT: 1.0,
    USDC: 1.0
  };
  
  for (const [asset, expected] of Object.entries(expectedPrices)) {
    try {
      const price = await priceFeed.getPrice(asset);
      const actual = Number(price) / 1e18;
      const deviation = Math.abs(actual - expected) / expected * 100;
      
      console.log(`${asset}: Expected $${expected.toLocaleString()}, Got $${actual.toLocaleString()}, Deviation: ${deviation.toFixed(2)}%`);
      
      if (deviation < 5) {
        console.log(`✅ ${asset} price looks reasonable`);
      } else if (deviation < 20) {
        console.log(`⚠️ ${asset} price deviation moderate`);
      } else {
        console.log(`❌ ${asset} price deviation high - may need investigation`);
      }
    } catch (error) {
      console.log(`❌ ${asset} price comparison failed:`, error.message);
    }
  }
  
  console.log("\n=== Test Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });