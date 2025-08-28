const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env' });

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying DualStakingBasket with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Use existing deployed contracts from the latest deployment
  const PRICE_FEED = "0xe3195C58DE4e58BbD91191B1f5A4A5b76027D796";
  const STAKE_BASKET_TOKEN = "0x53E7AF808A87A220E88e3627662C83e73B3C40Bc";
  const MOCK_CORE = "0xa41575D35563288d6C59d8a02603dF9E2e171eeE";
  const MOCK_BTC = "0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7";
  
  console.log("\n📋 Using Existing Contracts:");
  console.log("- PriceFeed:", PRICE_FEED);
  console.log("- StakeBasketToken:", STAKE_BASKET_TOKEN);
  console.log("- CORE Token:", MOCK_CORE);
  console.log("- BTC Token:", MOCK_BTC);

  // Deploy MockDualStaking first (required for DualStakingBasket)
  console.log("\n🚀 Deploying MockDualStaking...");
  const MockDualStaking = await ethers.getContractFactory("contracts/mocks/MockDualStaking.sol:MockDualStaking");
  const mockDualStaking = await MockDualStaking.deploy();
  
  await mockDualStaking.waitForDeployment();
  const mockDualStakingAddress = await mockDualStaking.getAddress();
  console.log("MockDualStaking deployed to:", mockDualStakingAddress);

  // Deploy DualStakingBasket
  console.log("\n🚀 Deploying DualStakingBasket...");
  const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
  const dualStakingBasket = await DualStakingBasket.deploy(
    STAKE_BASKET_TOKEN,     // basketToken
    PRICE_FEED,             // priceFeed
    MOCK_CORE,              // coreToken
    MOCK_BTC,               // btcToken  
    mockDualStakingAddress, // dualStakingContract
    deployer.address,       // feeRecipient
    0,                      // targetTier (BRONZE = 0)
    deployer.address        // initialOwner
  );

  await dualStakingBasket.waitForDeployment();
  const dualStakingBasketAddress = await dualStakingBasket.getAddress();
  console.log("DualStakingBasket deployed to:", dualStakingBasketAddress);

  // Set up StakeBasketToken permissions for DualStakingBasket
  console.log("\n🔐 Setting up StakeBasketToken permissions for DualStakingBasket...");
  const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
  const basketToken = StakeBasketToken.attach(STAKE_BASKET_TOKEN);
  
  // Set DualStakingBasket as authorized minter
  console.log("Setting DualStakingBasket as StakeBasket contract...");
  const setContractTx = await basketToken.emergencySetStakeBasketContract(dualStakingBasketAddress);
  await setContractTx.wait();
  console.log("✅ DualStakingBasket authorized to mint basket tokens");

  // Verify permissions
  const authorizedContract = await basketToken.stakeBasketContract();
  console.log("\nVerifying permissions...");
  console.log("StakeBasketToken.stakeBasketContract():", authorizedContract);
  console.log("Expected DualStakingBasket address:", dualStakingBasketAddress);
  console.log("Permission setup correct:", authorizedContract === dualStakingBasketAddress);

  // Set minimum deposits (for testing with small amounts)
  console.log("\n⚙️ Configuring DualStakingBasket for testing...");
  const setMinTx = await dualStakingBasket.setMinimumDeposits(
    ethers.parseEther("0.01"), // minCore: 0.01 CORE
    ethers.parseEther("0.001"), // minBtc: 0.001 BTC
    ethers.parseUnits("1", 8)   // minUsd: $1 USD
  );
  await setMinTx.wait();
  console.log("✅ Minimum deposits configured for testing");

  // Update contract prices for testing
  console.log("\n💰 Setting test prices...");
  const PriceFeed = await ethers.getContractFactory("PriceFeed");
  const priceFeed = PriceFeed.attach(PRICE_FEED);
  
  try {
    // Set test prices
    await priceFeed.setPrice("CORE", ethers.parseUnits("1.5", 8)); // $1.5 per CORE
    await priceFeed.setPrice("BTC", ethers.parseUnits("65000", 8)); // $65,000 per BTC
    console.log("✅ Test prices set successfully");
  } catch (error) {
    console.log("⚠️ Could not set test prices (may need owner permission)");
  }

  // Test contract setup
  console.log("\n🧪 Testing DualStakingBasket setup...");
  try {
    const strategyInfo = await dualStakingBasket.getStrategyInfo();
    console.log("✅ DualStakingBasket getStrategyInfo() works");
    
    const poolInfo = await dualStakingBasket.getPoolInfo();
    console.log("✅ DualStakingBasket getPoolInfo() works");
    
  } catch (error) {
    console.log("⚠️ DualStakingBasket may need additional setup:", error.message);
  }

  console.log("\n=== DualStakingBasket Deployment Summary ===");
  console.log("MockDualStaking:", mockDualStakingAddress);
  console.log("DualStakingBasket:", dualStakingBasketAddress);
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  
  console.log("\n🎯 Ready for dual staking tests!");
  console.log("Update your test scripts to use:", dualStakingBasketAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });