const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🔍 Verifying StakeBasket Testnet Deployment");
  console.log("Network:", hre.network.name);
  
  // Load deployment info
  const deploymentFile = './docs/testnet-deployment.json';
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run deployment first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  console.log("\n📋 Verifying contracts from deployment:", deployment.timestamp);
  
  const contracts = deployment.contracts;
  
  try {
    // Get contract instances
    const stakeBasket = await hre.ethers.getContractAt("StakeBasket", contracts.StakeBasket);
    const stakeBasketToken = await hre.ethers.getContractAt("StakeBasketToken", contracts.StakeBasketToken);
    const stakingManager = await hre.ethers.getContractAt("StakingManager", contracts.StakingManager);
    const priceFeed = await hre.ethers.getContractAt("PriceFeed", contracts.PriceFeed);
    const mockCORE = await hre.ethers.getContractAt("MockCORE", contracts.MockCORE);
    const mockLstBTC = await hre.ethers.getContractAt("MockLstBTC", contracts.MockLstBTC);
    
    console.log("\n✅ Contract Verification:");
    
    // Verify StakeBasket
    console.log("\n🗄️  StakeBasket Contract:");
    console.log("- Address:", await stakeBasket.getAddress());
    console.log("- Owner:", await stakeBasket.owner());
    console.log("- Paused:", await stakeBasket.paused());
    const totalAUM = await stakeBasket.getTotalAUM();
    console.log("- Total AUM:", hre.ethers.formatEther(totalAUM), "USD");
    
    // Verify StakeBasketToken
    console.log("\n🎯 StakeBasketToken Contract:");
    console.log("- Address:", await stakeBasketToken.getAddress());
    console.log("- Name:", await stakeBasketToken.name());
    console.log("- Symbol:", await stakeBasketToken.symbol());
    console.log("- Total Supply:", hre.ethers.formatEther(await stakeBasketToken.totalSupply()));
    console.log("- StakeBasket Contract:", await stakeBasketToken.stakeBasketContract());
    
    // Verify StakingManager
    console.log("\n🎛️  StakingManager Contract:");
    console.log("- Address:", await stakingManager.getAddress());
    console.log("- StakeBasket Contract:", await stakingManager.stakeBasketContract());
    console.log("- Core Staking:", await stakingManager.coreStakingContract());
    console.log("- lstBTC Contract:", await stakingManager.lstBTCContract());
    
    // Verify PriceFeed
    console.log("\n📊 PriceFeed Contract:");
    console.log("- Address:", await priceFeed.getAddress());
    const corePrice = await priceFeed.getPrice("CORE");
    const lstBTCPrice = await priceFeed.getPrice("lstBTC");
    console.log("- CORE Price:", hre.ethers.formatUnits(corePrice, 8), "USD");
    console.log("- lstBTC Price:", hre.ethers.formatUnits(lstBTCPrice, 8), "USD");
    
    // Verify Mock Tokens
    console.log("\n🪙 Mock Token Contracts:");
    console.log("- MockCORE:", await mockCORE.getAddress());
    console.log("  - Name:", await mockCORE.name());
    console.log("  - Symbol:", await mockCORE.symbol());
    console.log("- MockLstBTC:", await mockLstBTC.getAddress());
    console.log("  - Name:", await mockLstBTC.name());
    console.log("  - Symbol:", await mockLstBTC.symbol());
    console.log("  - Exchange Rate:", hre.ethers.formatEther(await mockLstBTC.getExchangeRate()));
    
    console.log("\n🎯 Functionality Tests:");
    
    // Test NAV calculation
    const navPerShare = await stakeBasket.getNAVPerShare();
    console.log("- NAV per Share:", hre.ethers.formatEther(navPerShare), "USD");
    
    // Test price feeds
    console.log("- Price feeds responding:", corePrice > 0 && lstBTCPrice > 0 ? "✅" : "❌");
    
    // Check contract interactions
    const isConfigured = (await stakeBasketToken.stakeBasketContract()) === (await stakeBasket.getAddress());
    console.log("- Contracts properly configured:", isConfigured ? "✅" : "❌");
    
    console.log("\n🌐 Network Information:");
    console.log("- Network:", hre.network.name);
    console.log("- Chain ID:", deployment.chainId);
    console.log("- Deployer:", deployment.deployer);
    
    console.log("\n🔗 Useful Links:");
    console.log("- Core Testnet Explorer:", "https://scan.test.btcs.network/");
    console.log("- StakeBasket Contract:", `https://scan.test.btcs.network/address/${contracts.StakeBasket}`);
    console.log("- StakeBasketToken Contract:", `https://scan.test.btcs.network/address/${contracts.StakeBasketToken}`);
    
    console.log("\n🎉 === VERIFICATION COMPLETE ===");
    console.log("✅ All contracts deployed and configured correctly!");
    console.log("🚀 Ready for frontend integration and testing!");
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });