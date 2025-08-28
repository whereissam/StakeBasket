const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🚀 DEPLOYING FULL TESTNET SYSTEM");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy Mock Tokens First
  console.log("\n1️⃣ DEPLOYING MOCK TOKENS");
  console.log("-".repeat(40));
  
  // Deploy Mock CORE Token
  const MockCORE = await hre.ethers.getContractFactory("MockCORE");
  const mockCORE = await MockCORE.deploy(deployer.address);
  await mockCORE.waitForDeployment();
  const mockCOREAddress = await mockCORE.getAddress();
  console.log("✅ MockCORE deployed to:", mockCOREAddress);

  // Deploy Mock coreBTC Token
  const MockCoreBTC = await hre.ethers.getContractFactory("MockCoreBTC");
  const mockCoreBTC = await MockCoreBTC.deploy(deployer.address);
  await mockCoreBTC.waitForDeployment();
  const mockCoreBTCAddress = await mockCoreBTC.getAddress();
  console.log("✅ MockCoreBTC deployed to:", mockCoreBTCAddress);

  // Deploy Mock lstBTC Token
  const MockLstBTC = await hre.ethers.getContractFactory("MockLstBTC");
  const mockLstBTC = await MockLstBTC.deploy(mockCoreBTCAddress, deployer.address);
  await mockLstBTC.waitForDeployment();
  const mockLstBTCAddress = await mockLstBTC.getAddress();
  console.log("✅ MockLstBTC deployed to:", mockLstBTCAddress);

  // Deploy Mock Core Staking
  const MockCoreStaking = await hre.ethers.getContractFactory("MockCoreStaking");
  const mockCoreStaking = await MockCoreStaking.deploy(mockCOREAddress, deployer.address);
  await mockCoreStaking.waitForDeployment();
  const mockCoreStakingAddress = await mockCoreStaking.getAddress();
  console.log("✅ MockCoreStaking deployed to:", mockCoreStakingAddress);

  // Deploy Core Contracts
  console.log("\n2️⃣ DEPLOYING CORE CONTRACTS");
  console.log("-".repeat(40));

  // Deploy PriceFeed
  const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
  const priceFeed = await PriceFeed.deploy(deployer.address);
  await priceFeed.waitForDeployment();
  const priceFeedAddress = await priceFeed.getAddress();
  console.log("✅ PriceFeed deployed to:", priceFeedAddress);

  // Deploy StakeBasketToken
  const StakeBasketToken = await hre.ethers.getContractFactory("StakeBasketToken");
  const stakeBasketToken = await StakeBasketToken.deploy(
    "StakeBasket Token",
    "BASKET", 
    deployer.address
  );
  await stakeBasketToken.waitForDeployment();
  const stakeBasketTokenAddress = await stakeBasketToken.getAddress();
  console.log("✅ StakeBasketToken deployed to:", stakeBasketTokenAddress);

  // Deploy StakingManager with proper addresses
  const StakingManager = await hre.ethers.getContractFactory("StakingManager");
  const stakingManager = await StakingManager.deploy(
    "0x0000000000000000000000000000000000000001", // placeholder StakeBasket
    mockCoreStakingAddress,  // Core staking contract
    mockLstBTCAddress,      // lstBTC contract
    mockCoreBTCAddress,     // coreBTC contract
    mockCOREAddress,        // CORE token contract
    deployer.address        // owner
  );
  await stakingManager.waitForDeployment();
  const stakingManagerAddress = await stakingManager.getAddress();
  console.log("✅ StakingManager deployed to:", stakingManagerAddress);

  // Deploy StakeBasket
  const StakeBasket = await hre.ethers.getContractFactory("StakeBasket");
  const stakeBasket = await StakeBasket.deploy(
    stakeBasketTokenAddress,  // _etfToken
    stakingManagerAddress,    // _stakingManager
    priceFeedAddress,         // _priceFeed
    deployer.address,         // _feeRecipient
    deployer.address,         // _protocolTreasury
    deployer.address          // initialOwner
  );
  await stakeBasket.waitForDeployment();
  const stakeBasketAddress = await stakeBasket.getAddress();
  console.log("✅ StakeBasket deployed to:", stakeBasketAddress);

  // Configure Contracts
  console.log("\n3️⃣ CONFIGURING CONTRACTS");
  console.log("-".repeat(40));

  // Set StakeBasket in token
  await stakeBasketToken.setStakeBasketContract(stakeBasketAddress);
  console.log("✅ StakeBasket contract set in token");

  // Update StakingManager with StakeBasket address
  await stakingManager.setStakeBasket(stakeBasketAddress);
  console.log("✅ StakingManager updated with StakeBasket address");

  // Set initial prices
  await priceFeed.setPrices(
    ["CORE", "coreBTC", "ETH"],
    [
      ethers.parseEther("2.50"),    // CORE at $2.50
      ethers.parseEther("65000"),   // BTC at $65,000
      ethers.parseEther("3000")     // ETH at $3,000
    ]
  );
  console.log("✅ Initial prices set");

  // Distribute test tokens to users
  const [deployer2, user1, user2] = await hre.ethers.getSigners();
  const testAmount = ethers.parseEther("10000");
  const btcTestAmount = ethers.parseUnits("10", 8); // 10 BTC

  await mockCORE.transfer(user1.address, testAmount);
  await mockCORE.transfer(user2.address, testAmount);
  await mockCoreBTC.mint(user1.address, btcTestAmount);
  await mockCoreBTC.mint(user2.address, btcTestAmount);
  console.log("✅ Test tokens distributed to users");

  // Final verification
  console.log("\n4️⃣ DEPLOYMENT VERIFICATION");
  console.log("-".repeat(40));

  const tokenName = await stakeBasketToken.name();
  const tokenSymbol = await stakeBasketToken.symbol();
  const basketContract = await stakeBasketToken.stakeBasketContract();
  
  console.log(`Token Name: ${tokenName}`);
  console.log(`Token Symbol: ${tokenSymbol}`);
  console.log(`Basket Contract: ${basketContract}`);
  console.log(`Expected Basket: ${stakeBasketAddress}`);
  console.log(`Match: ${basketContract === stakeBasketAddress}`);

  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    deployer: deployer.address,
    contracts: {
      mockCORE: mockCOREAddress,
      mockCoreBTC: mockCoreBTCAddress,
      mockCoreStaking: mockCoreStakingAddress,
      mockLstBTC: mockLstBTCAddress,
      priceFeed: priceFeedAddress,
      stakingManager: stakingManagerAddress,
      stakeBasketToken: stakeBasketTokenAddress,
      stakeBasket: stakeBasketAddress
    },
    validators: [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333"
    ]
  };

  const fs = require('fs');
  fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎯 DEPLOYMENT SUMMARY");
  console.log("="*50);
  console.log("MockCORE:", mockCOREAddress);
  console.log("MockCoreBTC:", mockCoreBTCAddress);
  console.log("MockLstBTC:", mockLstBTCAddress);
  console.log("MockCoreStaking:", mockCoreStakingAddress);
  console.log("PriceFeed:", priceFeedAddress);
  console.log("StakingManager:", stakingManagerAddress);
  console.log("StakeBasketToken:", stakeBasketTokenAddress);
  console.log("StakeBasket:", stakeBasketAddress);
  
  console.log("\n✅ FULL TESTNET SYSTEM DEPLOYED SUCCESSFULLY!");
  console.log("📄 Deployment info saved to deployment-info.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});