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

  // Add some validators to MockCoreStaking
  console.log("\nAdding test validators to MockCoreStaking...");
  const validators = await mockCoreStaking.getValidators();
  console.log("Default validators added:", validators);

  // Fund contracts with some test tokens for easier testing
  console.log("\nFunding contracts with test tokens...");
  
  // Mint tokens to deployer for testing
  await mockCORE.mint(deployer.address, hre.ethers.parseEther("10000"));
  await mockCoreBTC.mint(deployer.address, hre.ethers.parseUnits("100", 8)); // 100 coreBTC
  
  // Fund reward pools
  await mockCORE.mint(mockCoreStakingAddress, hre.ethers.parseEther("50000")); // Rewards pool
  await mockCoreBTC.mint(mockLstBTCAddress, hre.ethers.parseUnits("500", 8)); // lstBTC rewards pool

  console.log("Test tokens minted and reward pools funded");

  // Verify deployment
  console.log("\n=== Verifying Deployment ===");
  console.log("StakeBasket Token name:", await stakeBasketToken.name());
  console.log("StakeBasket Token symbol:", await stakeBasketToken.symbol());
  console.log("StakeBasket owner:", await stakeBasket.owner());
  console.log("StakeBasket Token stakeBasketContract:", await stakeBasketToken.stakeBasketContract());
  console.log("MockCORE total supply:", hre.ethers.formatEther(await mockCORE.totalSupply()));
  console.log("MockCoreBTC total supply:", hre.ethers.formatUnits(await mockCoreBTC.totalSupply(), 8));

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
  console.log("  StakingManager:", stakingManagerAddress);
  console.log("  StakeBasketToken:", stakeBasketTokenAddress);
  console.log("  StakeBasket:", stakeBasketAddress);
  console.log("");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  
  console.log("\n=== Testing Setup Complete ===");
  console.log("You can now:");
  console.log("1. Call mockCORE.faucet() to get test CORE tokens");
  console.log("2. Call mockCoreBTC.faucet() to get test coreBTC tokens");
  console.log("3. Interact with StakeBasket using the frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });