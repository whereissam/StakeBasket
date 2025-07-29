const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy Mock Tokens first
  console.log("\n=== Deploying Mock Tokens ===");
  
  // Deploy MockCORE
  console.log("\nDeploying MockCORE...");
  const MockCORE = await hre.ethers.getContractFactory("MockCORE");
  const mockCORE = await MockCORE.deploy(deployer.address);
  await mockCORE.waitForDeployment();
  const mockCOREAddress = await mockCORE.getAddress();
  console.log("MockCORE deployed to:", mockCOREAddress);

  // Deploy MockCoreBTC
  console.log("\nDeploying MockCoreBTC...");
  const MockCoreBTC = await hre.ethers.getContractFactory("MockCoreBTC");
  const mockCoreBTC = await MockCoreBTC.deploy(deployer.address);
  await mockCoreBTC.waitForDeployment();
  const mockCoreBTCAddress = await mockCoreBTC.getAddress();
  console.log("MockCoreBTC deployed to:", mockCoreBTCAddress);

  // Deploy Mock Staking Contracts
  console.log("\n=== Deploying Mock Staking Contracts ===");
  
  // Deploy MockCoreStaking
  console.log("\nDeploying MockCoreStaking...");
  const MockCoreStaking = await hre.ethers.getContractFactory("MockCoreStaking");
  const mockCoreStaking = await MockCoreStaking.deploy(mockCOREAddress, deployer.address);
  await mockCoreStaking.waitForDeployment();
  const mockCoreStakingAddress = await mockCoreStaking.getAddress();
  console.log("MockCoreStaking deployed to:", mockCoreStakingAddress);

  // Deploy MockLstBTC
  console.log("\nDeploying MockLstBTC...");
  const MockLstBTC = await hre.ethers.getContractFactory("MockLstBTC");
  const mockLstBTC = await MockLstBTC.deploy(mockCoreBTCAddress, deployer.address);
  await mockLstBTC.waitForDeployment();
  const mockLstBTCAddress = await mockLstBTC.getAddress();
  console.log("MockLstBTC deployed to:", mockLstBTCAddress);

  // Deploy StakeBasket Core Contracts
  console.log("\n=== Deploying StakeBasket Contracts ===");

  // Deploy PriceFeed
  console.log("\nDeploying PriceFeed...");
  const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
  const priceFeed = await PriceFeed.deploy(deployer.address);
  await priceFeed.waitForDeployment();
  const priceFeedAddress = await priceFeed.getAddress();
  console.log("PriceFeed deployed to:", priceFeedAddress);

  // Deploy StakeBasketToken
  console.log("\nDeploying StakeBasketToken...");
  const StakeBasketToken = await hre.ethers.getContractFactory("StakeBasketToken");
  const stakeBasketToken = await StakeBasketToken.deploy(
    "StakeBasket Token", // name
    "BASKET",          // symbol
    deployer.address    // initial owner
  );
  
  await stakeBasketToken.waitForDeployment();
  const stakeBasketTokenAddress = await stakeBasketToken.getAddress();
  console.log("StakeBasketToken deployed to:", stakeBasketTokenAddress);

  // Deploy StakingManager
  console.log("\nDeploying StakingManager...");
  const StakingManager = await hre.ethers.getContractFactory("StakingManager");
  const stakingManager = await StakingManager.deploy(
    "0x0000000000000000000000000000000000000001", // placeholder for StakeBasket address
    mockCoreStakingAddress,   // Core staking contract
    mockLstBTCAddress,        // lstBTC contract
    mockCoreBTCAddress,       // coreBTC contract
    mockCOREAddress,          // CORE token contract
    deployer.address          // initial owner
  );
  await stakingManager.waitForDeployment();
  const stakingManagerAddress = await stakingManager.getAddress();
  console.log("StakingManager deployed to:", stakingManagerAddress);

  // Deploy StakeBasket
  console.log("\nDeploying StakeBasket...");
  const StakeBasket = await hre.ethers.getContractFactory("StakeBasket");
  const stakeBasket = await StakeBasket.deploy(
    stakeBasketTokenAddress, // StakeBasket token address
    stakingManagerAddress,   // StakingManager address
    priceFeedAddress,        // PriceFeed address
    deployer.address,        // fee recipient (using deployer for now)
    deployer.address,        // protocol treasury
    deployer.address         // initial owner
  );
  
  await stakeBasket.waitForDeployment();
  const stakeBasketAddress = await stakeBasket.getAddress();
  console.log("StakeBasket deployed to:", stakeBasketAddress);

  // Configuration
  console.log("\n=== Configuring Contracts ===");

  // Set StakeBasket contract in StakeBasketToken
  console.log("\nSetting StakeBasket contract in StakeBasketToken...");
  await stakeBasketToken.setStakeBasketContract(stakeBasketAddress);
  console.log("StakeBasket contract set in StakeBasketToken");
  
  // Update StakingManager with correct StakeBasket address
  console.log("\nUpdating StakingManager configuration...");
  // Note: We can't update the immutable stakeBasketContract, but we can configure other settings
  
  // Deploy a new StakingManager with correct StakeBasket address
  console.log("\nRe-deploying StakingManager with correct StakeBasket address...");
  const stakingManagerCorrect = await StakingManager.deploy(
    stakeBasketAddress,       // correct StakeBasket address
    mockCoreStakingAddress,   // Core staking contract
    mockLstBTCAddress,        // lstBTC contract
    mockCoreBTCAddress,       // coreBTC contract
    mockCOREAddress,          // CORE token contract
    deployer.address          // initial owner
  );
  await stakingManagerCorrect.waitForDeployment();
  const stakingManagerCorrectAddress = await stakingManagerCorrect.getAddress();
  console.log("Corrected StakingManager deployed to:", stakingManagerCorrectAddress);
  
  // Update StakeBasket to use the corrected StakingManager
  console.log("\nUpdating StakeBasket with corrected StakingManager...");
  await stakeBasket.setStakingManager(stakingManagerCorrectAddress);
  console.log("StakeBasket updated with corrected StakingManager");
  
  // Set up rebalancing parameters
  console.log("\nConfiguring automated rebalancing...");
  await stakingManagerCorrect.setRebalanceThresholds(50, 600); // 0.5% APY threshold, 600 risk threshold
  await stakingManagerCorrect.setAutomationBot(deployer.address); // Set deployer as automation bot for testing
  console.log("Rebalancing parameters configured");

  // Add some validators to MockCoreStaking and configure StakingManager
  console.log("\nAdding test validators to MockCoreStaking...");
  const validators = await mockCoreStaking.getValidators();
  console.log("Default validators:", validators);
  
  // Add validators to StakingManager's active list
  console.log("\nAdding validators to StakingManager...");
  for (const validator of validators) {
    await stakingManagerCorrect.addCoreValidator(validator);
    console.log("Added validator:", validator);
  }
  
  // Add some additional validators with different performance characteristics for testing
  console.log("\nAdding additional test validators...");
  const additionalValidators = [
    { address: "0x4444444444444444444444444444444444444444", commission: 400, score: 950 }, // High performer
    { address: "0x5555555555555555555555555555555555555555", commission: 800, score: 600 }, // Poor performer
    { address: "0x6666666666666666666666666666666666666666", commission: 600, score: 300 }  // Very poor performer
  ];
  
  for (const val of additionalValidators) {
    await mockCoreStaking.registerValidator(val.address, val.commission, val.score);
    await stakingManagerCorrect.addCoreValidator(val.address);
    console.log(`Added validator: ${val.address} (commission: ${val.commission/100}%, score: ${val.score/10}%)`);
  }

  // Fund contracts with some test tokens for easier testing
  console.log("\nFunding contracts with test tokens...");
  
  // Mint tokens to deployer for testing
  await mockCORE.mint(deployer.address, hre.ethers.parseEther("10000"));
  await mockCoreBTC.mint(deployer.address, hre.ethers.parseUnits("100", 8)); // 100 coreBTC
  
  // Fund reward pools
  await mockCORE.mint(mockCoreStakingAddress, hre.ethers.parseEther("50000")); // Rewards pool
  await mockCoreBTC.mint(mockLstBTCAddress, hre.ethers.parseUnits("500", 8)); // lstBTC rewards pool
  
  // Fund StakeBasket with some CORE for initial operations
  await mockCORE.mint(stakeBasketAddress, hre.ethers.parseEther("1000"));
  
  // Approve StakingManager to spend CORE on behalf of StakeBasket
  await mockCORE.mint(stakingManagerCorrectAddress, hre.ethers.parseEther("100")); // For delegation gas

  console.log("Test tokens minted and reward pools funded");

  // Verify deployment
  console.log("\n=== Verifying Deployment ===");
  console.log("StakeBasket Token name:", await stakeBasketToken.name());
  console.log("StakeBasket Token symbol:", await stakeBasketToken.symbol());
  console.log("StakeBasket owner:", await stakeBasket.owner());
  console.log("StakeBasket Token stakeBasketContract:", await stakeBasketToken.stakeBasketContract());
  console.log("MockCORE total supply:", hre.ethers.formatEther(await mockCORE.totalSupply()));
  console.log("MockCoreBTC total supply:", hre.ethers.formatUnits(await mockCoreBTC.totalSupply(), 8));
  console.log("Active validators in StakingManager:", (await stakingManagerCorrect.getActiveCoreValidators()).length);
  console.log("Rebalancing bot address:", await stakingManagerCorrect.automationBot());
  
  // Test rebalancing decision logic
  const [needsRebalance, reason] = await stakingManagerCorrect.shouldRebalance();
  console.log("Initial rebalancing check - Needs rebalance:", needsRebalance, "Reason:", reason);

  console.log("\n=== Deployment Summary ===");
  console.log("Mock Tokens:");
  console.log("  MockCORE:", mockCOREAddress);
  console.log("  MockCoreBTC:", mockCoreBTCAddress);
  console.log("");
  console.log("Mock Staking:");
  console.log("  MockCoreStaking:", mockCoreStakingAddress);
  console.log("  MockLstBTC:", mockLstBTCAddress);
  console.log("");
  console.log("StakeBasket Core:");
  console.log("  PriceFeed:", priceFeedAddress);
  console.log("  StakingManager:", stakingManagerCorrectAddress);
  console.log("  StakeBasketToken:", stakeBasketTokenAddress);
  console.log("  StakeBasket:", stakeBasketAddress);
  console.log("");
  console.log("Rebalancing Configuration:");
  console.log("  APY Threshold: 0.5%");
  console.log("  Risk Threshold: 60%");
  console.log("  Automation Bot:", deployer.address);
  console.log("");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  
  // Save deployment addresses to a file for backend services
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      mockCORE: mockCOREAddress,
      mockCoreBTC: mockCoreBTCAddress,
      mockCoreStaking: mockCoreStakingAddress,
      mockLstBTC: mockLstBTCAddress,
      priceFeed: priceFeedAddress,
      stakingManager: stakingManagerCorrectAddress,
      stakeBasketToken: stakeBasketTokenAddress,
      stakeBasket: stakeBasketAddress
    },
    validators: await mockCoreStaking.getAllValidatorAddresses(),
    rebalancing: {
      apyThreshold: 50,
      riskThreshold: 600,
      automationBot: deployer.address
    }
  };
  
  // Write to file for backend services
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '..', 'deployment-info.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentFile);
  
  console.log("\n=== Testing Setup Complete ===");
  console.log("You can now:");
  console.log("1. Call mockCORE.faucet() to get test CORE tokens");
  console.log("2. Call mockCoreBTC.faucet() to get test coreBTC tokens");
  console.log("3. Interact with StakeBasket using the frontend");
  console.log("4. Test automated validator rebalancing:");
  console.log("   - Call mockCoreStaking.setValidatorStatus(validator, false) to deactivate a validator");
  console.log("   - Call stakingManager.shouldRebalance() to check if rebalancing is needed");
  console.log("   - Call stakingManager.getOptimalValidatorDistribution() to see recommended allocations");
  console.log("   - Call stakingManager.rebalanceCoreStaking() to execute rebalancing");
  console.log("\nBackend services can use the deployment info in deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Export for use in other scripts
module.exports = { main };