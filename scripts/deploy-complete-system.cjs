const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Complete Local Testnet Deployment Script
 * Deploys all contracts in correct dependency order
 */

let deploymentData = {
  network: "localhost", 
  timestamp: new Date().toISOString(),
  contracts: {},
  addresses: {}
};

async function main() {
  console.log("🚀 Starting Complete System Deployment to Local Testnet");
  console.log("=" .repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  try {
    // Phase 1: Deploy basic utility contracts
    console.log("\n🏗️  Phase 1: Basic Utility Contracts");
    console.log("-" .repeat(40));

    // Deploy Price Feed first
    console.log("⚡ Deploying PriceFeed...");
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = await PriceFeed.deploy(deployer.address);
    await priceFeed.waitForDeployment();
    const priceFeedAddress = await priceFeed.getAddress();
    deploymentData.contracts.PriceFeed = priceFeedAddress;
    console.log(`✅ PriceFeed deployed to: ${priceFeedAddress}`);

    // Set initial prices (ETH = CORE for local testing)
    await priceFeed.setPrice("ETH/USD", ethers.parseUnits("2000", 8)); // $2000 per ETH
    await priceFeed.setPrice("BTC/USD", ethers.parseUnits("50000", 8)); // $50000 per BTC  
    await priceFeed.setPrice("CORE/USD", ethers.parseUnits("2000", 8)); // Same as ETH for testing
    console.log("💲 Initial prices set for ETH, BTC, and CORE");

    // Deploy Mock BTC Token
    console.log("\n⚡ Deploying Mock BTC Token...");
    const TestBTC = await ethers.getContractFactory("TestBTC");
    const mockBTC = await TestBTC.deploy();
    await mockBTC.waitForDeployment();
    const mockBTCAddress = await mockBTC.getAddress();
    deploymentData.contracts.MockBTC = mockBTCAddress;
    console.log(`✅ Mock BTC Token deployed to: ${mockBTCAddress}`);

    // Phase 2: Deploy core staking infrastructure
    console.log("\n🏗️  Phase 2: Core Staking Infrastructure");
    console.log("-" .repeat(40));

    // Deploy Mock Core Staking
    console.log("⚡ Deploying MockCoreStaking...");
    const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
    const mockCoreStaking = await MockCoreStaking.deploy(
      ethers.ZeroAddress, // Use native ETH as CORE token (no ERC20 token needed)
      deployer.address    // Owner
    );
    await mockCoreStaking.waitForDeployment();
    const mockCoreStakingAddress = await mockCoreStaking.getAddress();
    deploymentData.contracts.MockCoreStaking = mockCoreStakingAddress;
    console.log(`✅ MockCoreStaking deployed to: ${mockCoreStakingAddress}`);

    // Deploy Dual Staking
    console.log("\n⚡ Deploying MockDualStaking...");
    const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
    const mockDualStaking = await MockDualStaking.deploy(
      ethers.ZeroAddress, // Use native ETH as CORE token
      mockBTCAddress,
      deployer.address
    );
    await mockDualStaking.waitForDeployment();
    const mockDualStakingAddress = await mockDualStaking.getAddress();
    deploymentData.contracts.MockDualStaking = mockDualStakingAddress;
    console.log(`✅ MockDualStaking deployed to: ${mockDualStakingAddress}`);

    // Fund dual staking reward pool
    console.log("💰 Funding DualStaking reward pool...");
    await mockDualStaking.fundRewardPoolNative({ value: ethers.parseEther("100") });
    console.log("✅ Funded with 100 ETH for rewards");

    // Phase 3: Deploy basket system using factory
    console.log("\n🏗️  Phase 3: Basket System Deployment");
    console.log("-" .repeat(40));

    console.log("⚡ Deploying ContractFactory...");
    const ContractFactory = await ethers.getContractFactory("ContractFactory");
    const factory = await ContractFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    deploymentData.contracts.ContractFactory = factoryAddress;
    console.log(`✅ ContractFactory deployed to: ${factoryAddress}`);

    // Deploy complete basket system
    console.log("⚡ Deploying complete system...");
    const deployTx = await factory.deployCompleteSystem(
      deployer.address, // owner
      deployer.address, // treasury 
      deployer.address  // operator
    );
    await deployTx.wait();

    // Get deployed contract addresses
    const allContracts = await factory.getAllContracts();
    const [basketTokenAddress, testBTCAddress, mockDualStakingAddress2, 
           priceFeedAddress2, unbondingQueueAddress, coreLiquidStakingAddress,
           stakingManagerAddress, basketStakingAddress, stakeBasketAddress] = allContracts;

    deploymentData.contracts.StakeBasketToken = basketTokenAddress;
    deploymentData.contracts.StakeBasket = stakeBasketAddress;
    deploymentData.contracts.BasketStaking = basketStakingAddress;
    deploymentData.contracts.StakingManager = stakingManagerAddress;

    console.log(`✅ StakeBasketToken: ${basketTokenAddress}`);
    console.log(`✅ StakeBasket: ${stakeBasketAddress}`);
    console.log(`✅ BasketStaking: ${basketStakingAddress}`);
    console.log(`✅ StakingManager: ${stakingManagerAddress}`);

    // Phase 4: Setup and configuration
    console.log("\n🏗️  Phase 4: System Configuration");
    console.log("-" .repeat(40));

    // Get contract instances
    const stakeBasket = await ethers.getContractAt("StakeBasket", stakeBasketAddress);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", stakeBasketAddress);

    // Configure the basket
    console.log("⚙️  Configuring basket parameters...");
    
    // Set target ratio (50 CORE : 1 BTC)
    await dualStakingBasket.setTargetRatio(ethers.parseUnits("50", 18));
    console.log("✅ Target ratio set to 50:1");

    // Set performance fee (5%)
    await stakeBasket.setPerformanceFee(500);
    console.log("✅ Performance fee set to 5%");

    // Phase 5: Verification and testing
    console.log("\n🏗️  Phase 5: System Verification");
    console.log("-" .repeat(40));

    // Test basic functionality
    console.log("🧪 Testing basic functionality...");
    
    // Check if contracts are properly connected
    const basketStakingContract = await stakeBasket.basketStakingContract();
    const stakingManagerContract = await stakeBasket.stakingManager();
    const dualStakingContract = await dualStakingBasket.dualStakingContract();
    
    console.log("🔗 Contract connections:");
    console.log(`  - BasketStaking: ${basketStakingContract === basketStakingAddress ? '✅' : '❌'}`);
    console.log(`  - StakingManager: ${stakingManagerContract === stakingManagerAddress ? '✅' : '❌'}`);
    console.log(`  - DualStaking: ${dualStakingContract === mockDualStakingAddress ? '✅' : '❌'}`);

    // Mint some BTC tokens to deployer for testing
    console.log("\n💎 Minting test tokens...");
    await mockBTC.mint(deployer.address, ethers.parseUnits("100", 8)); // 100 BTC
    const btcBalance = await mockBTC.balanceOf(deployer.address);
    console.log(`✅ Minted ${ethers.formatUnits(btcBalance, 8)} BTC to deployer`);

    // Set up some mock validators in CoreStaking
    console.log("🏛️  Setting up mock validators...");
    await mockCoreStaking.registerValidator(
      "0x1000000000000000000000000000000000000001", // Mock validator address
      500, // 5% commission
      900  // 90% reliability score
    );
    console.log("✅ Mock validator registered");

    // Final summary
    console.log("\n" + "=" .repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(60));
    
    console.log("\n📋 Contract Addresses:");
    console.log("-" .repeat(40));
    Object.entries(deploymentData.contracts).forEach(([name, address]) => {
      console.log(`${name.padEnd(20)} : ${address}`);
    });

    console.log("\n🧪 Test Commands:");
    console.log("-" .repeat(40));
    console.log("1. Test deposit:");
    console.log(`   npx hardhat run scripts/test-deposit.cjs --network localhost`);
    console.log("\n2. Test dual staking:");
    console.log(`   npx hardhat run scripts/test-dual-staking.cjs --network localhost`);
    console.log("\n3. Check balances:");
    console.log(`   npx hardhat run scripts/check-balances.cjs --network localhost`);

    console.log("\n🌐 Frontend Configuration:");
    console.log("-" .repeat(40));
    console.log("Add these addresses to your frontend config:");
    console.log(`STAKE_BASKET_ADDRESS="${basketTokenAddress}"`);
    console.log(`DUAL_STAKING_ADDRESS="${stakeBasketAddress}"`);
    console.log(`MOCK_BTC_ADDRESS="${mockBTCAddress}"`);
    console.log(`PRICE_FEED_ADDRESS="${priceFeedAddress}"`);

    // Save deployment data
    const fs = require('fs');
    if (!fs.existsSync('deployment-data')) {
      fs.mkdirSync('deployment-data');
    }
    
    fs.writeFileSync(
      'deployment-data/local-deployment.json',
      JSON.stringify(deploymentData, null, 2)
    );
    console.log("\n💾 Deployment data saved to deployment-data/local-deployment.json");

    return deploymentData;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };