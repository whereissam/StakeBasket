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

  // Deploy MockCoreStaking
  console.log("\nDeploying MockCoreStaking...");
  const MockCoreStaking = await hre.ethers.getContractFactory("MockCoreStaking");
  const mockCoreStaking = await MockCoreStaking.deploy(mockCOREAddress, deployer.address);
  await mockCoreStaking.waitForDeployment();
  const mockCoreStakingAddress = await mockCoreStaking.getAddress();
  console.log("MockCoreStaking deployed to:", mockCoreStakingAddress);

  // Deploy StakingManager with debug logging
  console.log("\nDeploying StakingManager...");
  console.log("Parameters:");
  console.log("  _stakeBasketContract:", deployer.address); // Use deployer for now
  console.log("  _coreStakingContract:", mockCoreStakingAddress);
  console.log("  _lstBTCContract:", hre.ethers.ZeroAddress);
  console.log("  _coreBTCContract:", hre.ethers.ZeroAddress);
  console.log("  _coreToken:", mockCOREAddress);
  console.log("  initialOwner:", deployer.address);

  const StakingManager = await hre.ethers.getContractFactory("StakingManager");
  const stakingManager = await StakingManager.deploy(
    deployer.address,         // _stakeBasketContract (using deployer for testing)
    mockCoreStakingAddress,   // _coreStakingContract
    hre.ethers.ZeroAddress,   // _lstBTCContract
    hre.ethers.ZeroAddress,   // _coreBTCContract
    mockCOREAddress,          // _coreToken
    deployer.address          // initialOwner
  );
  await stakingManager.waitForDeployment();
  const stakingManagerAddress = await stakingManager.getAddress();
  console.log("StakingManager deployed to:", stakingManagerAddress);

  // Set up rebalancing parameters
  console.log("\nConfiguring rebalancing parameters...");
  await stakingManager.setRebalanceThresholds(50, 600); // 0.5% APY threshold, 600 risk threshold
  await stakingManager.setAutomationBot(deployer.address); // Set deployer as automation bot for testing
  console.log("Rebalancing parameters configured");

  // Get validators and add them to StakingManager
  console.log("\nSetting up validators...");
  const validators = await mockCoreStaking.getAllValidatorAddresses();
  console.log("Found validators:", validators);

  for (const validator of validators) {
    await stakingManager.addCoreValidator(validator);
    console.log("Added validator:", validator);
  }

  console.log("\n✅ Basic deployment completed successfully!");
  console.log("Addresses:");
  console.log("  MockCORE:", mockCOREAddress);
  console.log("  MockCoreStaking:", mockCoreStakingAddress);
  console.log("  StakingManager:", stakingManagerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });