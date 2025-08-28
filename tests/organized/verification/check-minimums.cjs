const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env' });

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔍 Checking DualStakingBasket Minimum Requirements");
  console.log("=================================================");
  console.log("Deployer address:", deployer.address);
  
  // Contract addresses
  const DUAL_STAKING_BASKET = "0x9CEDb460dd32d72d9C7DB76F4D5b357dcb331f3a";
  
  const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
  const dualStaking = DualStakingBasket.attach(DUAL_STAKING_BASKET);
  
  console.log("\n📊 Checking minimum deposit requirements...");
  
  try {
    // Read minimum deposits from storage slots or public variables
    // Let's check if there are public getters
    const minCoreDeposit = await dualStaking.minCoreDeposit();
    const minBtcDeposit = await dualStaking.minBtcDeposit();
    const minUsdDeposit = await dualStaking.minUsdDeposit();
    
    console.log("✅ Current minimum deposits:");
    console.log(`- Min CORE: ${ethers.formatEther(minCoreDeposit)} CORE`);
    console.log(`- Min BTC: ${ethers.formatEther(minBtcDeposit)} BTC`);
    console.log(`- Min USD: $${ethers.formatUnits(minUsdDeposit, 8)}`);
    
  } catch (error) {
    console.log("❌ Could not read minimums directly:", error.message);
    console.log("The variables might be private. Let's try other approaches...");
  }
  
  // Get current prices to calculate what we need
  console.log("\n💰 Getting current prices...");
  try {
    const priceFeedAddr = await dualStaking.priceFeed();
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceFeedAddr);
    
    const corePrice = await priceFeed.getPrice("CORE");
    const btcPrice = await priceFeed.getPrice("BTC");
    
    console.log("✅ Current prices:");
    console.log(`- CORE: $${ethers.formatUnits(corePrice, 8)}`);
    console.log(`- BTC: $${ethers.formatUnits(btcPrice, 8)}`);
    
    // Try different deposit amounts to find the minimum
    console.log("\n🧪 Testing different deposit amounts...");
    
    const testAmounts = [
      { core: "0.01", btc: "0.0001" },
      { core: "1", btc: "0.001" },
      { core: "10", btc: "0.01" },
      { core: "100", btc: "0.1" }
    ];
    
    for (const amounts of testAmounts) {
      const coreAmount = ethers.parseEther(amounts.core);
      const btcAmount = ethers.parseEther(amounts.btc);
      
      try {
        await dualStaking.deposit.staticCall(coreAmount, btcAmount);
        console.log(`✅ ${amounts.core} CORE + ${amounts.btc} BTC would work`);
        break;
      } catch (error) {
        console.log(`❌ ${amounts.core} CORE + ${amounts.btc} BTC fails: ${error.message.split('\n')[0]}`);
      }
    }
    
  } catch (error) {
    console.log("❌ Error getting prices:", error.message);
  }
  
  console.log("\n🔧 Let's try to lower the minimum deposits as owner...");
  try {
    const setMinTx = await dualStaking.setMinimumDeposits(
      ethers.parseEther("0.001"), // minCore: 0.001 CORE  
      ethers.parseEther("0.00001"), // minBtc: 0.00001 BTC
      ethers.parseUnits("0.1", 8)   // minUsd: $0.10 USD
    );
    await setMinTx.wait();
    console.log("✅ Minimum deposits lowered for testing");
    
  } catch (error) {
    console.log("❌ Could not update minimums:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });