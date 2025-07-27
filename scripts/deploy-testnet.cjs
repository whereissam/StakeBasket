const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🚀 Deploying StakeBasket to Core Testnet");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "CORE");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.warn("⚠️  Low balance. You may need testnet CORE tokens from the faucet");
    console.log("Core Testnet Faucet: https://scan.test.btcs.network/faucet");
  }

  console.log("\n📋 Deployment Plan:");
  console.log("1. Deploy Mock CORE and lstBTC tokens (for testnet)");
  console.log("2. Deploy Mock Core Staking contracts");
  console.log("3. Deploy PriceFeed");
  console.log("4. Deploy StakeBasketToken");
  console.log("5. Deploy StakingManager");
  console.log("6. Deploy StakeBasket");
  console.log("7. Configure contracts");

  // Step 1: Deploy Mock Tokens for testnet
  console.log("\n🪙 Step 1: Deploying Mock Tokens...");
  
  const MockCORE = await hre.ethers.getContractFactory("MockCORE");
  const mockCORE = await MockCORE.deploy(deployer.address);
  await mockCORE.waitForDeployment();
  const mockCOREAddress = await mockCORE.getAddress();
  console.log("MockCORE deployed to:", mockCOREAddress);

  const MockCoreBTC = await hre.ethers.getContractFactory("MockCoreBTC");
  const mockCoreBTC = await MockCoreBTC.deploy(deployer.address);
  await mockCoreBTC.waitForDeployment();
  const mockCoreBTCAddress = await mockCoreBTC.getAddress();
  console.log("MockCoreBTC deployed to:", mockCoreBTCAddress);

  const MockLstBTC = await hre.ethers.getContractFactory("MockLstBTC");
  const mockLstBTC = await MockLstBTC.deploy(mockCoreBTCAddress, deployer.address);
  await mockLstBTC.waitForDeployment();
  const mockLstBTCAddress = await mockLstBTC.getAddress();
  console.log("MockLstBTC deployed to:", mockLstBTCAddress);

  // Step 2: Deploy Mock Core Staking
  console.log("\n⛏️  Step 2: Deploying Mock Core Staking...");
  
  const MockCoreStaking = await hre.ethers.getContractFactory("MockCoreStaking");
  const mockCoreStaking = await MockCoreStaking.deploy(mockCOREAddress, deployer.address);
  await mockCoreStaking.waitForDeployment();
  const mockCoreStakingAddress = await mockCoreStaking.getAddress();
  console.log("MockCoreStaking deployed to:", mockCoreStakingAddress);

  // Step 3: Deploy PriceFeed
  console.log("\n📊 Step 3: Deploying PriceFeed...");
  
  const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
  const priceFeed = await PriceFeed.deploy(deployer.address);
  await priceFeed.waitForDeployment();
  const priceFeedAddress = await priceFeed.getAddress();
  console.log("PriceFeed deployed to:", priceFeedAddress);

  // Step 4: Deploy StakeBasketToken
  console.log("\n🎯 Step 4: Deploying StakeBasketToken...");
  
  const StakeBasketToken = await hre.ethers.getContractFactory("StakeBasketToken");
  const stakeBasketToken = await StakeBasketToken.deploy(
    "StakeBasket Token", // name
    "BASKET",          // symbol
    deployer.address    // initial owner
  );
  await stakeBasketToken.waitForDeployment();
  const stakeBasketTokenAddress = await stakeBasketToken.getAddress();
  console.log("StakeBasketToken deployed to:", stakeBasketTokenAddress);

  // Step 5: Calculate future StakeBasket address
  console.log("\n🧮 Step 5: Calculating future StakeBasket address...");
  
  // Get deployer nonce to predict StakeBasket address
  const currentNonce = await deployer.getNonce();
  const stakingManagerNonce = currentNonce; // StakingManager will be deployed now
  const stakeBasketNonce = currentNonce + 1; // StakeBasket will be deployed next
  
  // Calculate the future StakeBasket address
  const futureStakeBasketAddress = hre.ethers.getCreateAddress({
    from: deployer.address,
    nonce: stakeBasketNonce
  });
  console.log("Predicted StakeBasket address:", futureStakeBasketAddress);

  // Step 6: Deploy StakingManager with predicted address
  console.log("\n🎛️  Step 6: Deploying StakingManager...");
  
  const StakingManager = await hre.ethers.getContractFactory("StakingManager");
  const stakingManager = await StakingManager.deploy(
    futureStakeBasketAddress, // predicted StakeBasket address
    mockCoreStakingAddress, // Core staking contract
    mockLstBTCAddress,      // lstBTC contract
    mockCoreBTCAddress,     // coreBTC contract
    deployer.address        // initial owner
  );
  await stakingManager.waitForDeployment();
  const stakingManagerAddress = await stakingManager.getAddress();
  console.log("StakingManager deployed to:", stakingManagerAddress);

  // Step 7: Deploy StakeBasket
  console.log("\n🗄️  Step 7: Deploying StakeBasket...");
  
  const StakeBasket = await hre.ethers.getContractFactory("StakeBasket");
  const stakeBasket = await StakeBasket.deploy(
    stakeBasketTokenAddress, // StakeBasket token address
    stakingManagerAddress,   // StakingManager address
    priceFeedAddress,        // PriceFeed address
    deployer.address,        // fee recipient
    deployer.address         // initial owner
  );
  await stakeBasket.waitForDeployment();
  const stakeBasketAddress = await stakeBasket.getAddress();
  console.log("StakeBasket deployed to:", stakeBasketAddress);
  
  // Verify the predicted address matches actual address
  if (stakeBasketAddress.toLowerCase() === futureStakeBasketAddress.toLowerCase()) {
    console.log("✅ Address prediction successful!");
  } else {
    console.warn("⚠️  Address prediction mismatch. This might cause issues.");
    console.log("Predicted:", futureStakeBasketAddress);
    console.log("Actual:", stakeBasketAddress);
  }

  // Step 8: Configure contracts
  console.log("\n⚙️  Step 8: Configuring contracts...");
  
  // Set StakeBasket contract in StakeBasketToken
  console.log("Setting StakeBasket contract in StakeBasketToken...");
  await stakeBasketToken.setStakeBasketContract(stakeBasketAddress);
  
  // Set initial prices in PriceFeed
  console.log("Setting initial prices in PriceFeed...");
  await priceFeed.setPrice("CORE", hre.ethers.parseUnits("1.5", 8)); // $1.50
  await priceFeed.setPrice("lstBTC", hre.ethers.parseUnits("65000", 8)); // $65,000
  await priceFeed.setPrice("BTC", hre.ethers.parseUnits("65000", 8)); // $65,000
  
  // Add mock validators to Core staking (they're already registered in constructor)
  console.log("Validators already registered in MockCoreStaking constructor...");

  // Verification
  console.log("\n✅ Step 9: Verifying deployment...");
  
  console.log("StakeBasket Token name:", await stakeBasketToken.name());
  console.log("StakeBasket Token symbol:", await stakeBasketToken.symbol());
  console.log("StakeBasket owner:", await stakeBasket.owner());
  console.log("StakeBasket Token stakeBasketContract:", await stakeBasketToken.stakeBasketContract());
  
  // Check prices
  const corePrice = await priceFeed.getPrice("CORE");
  const lstBTCPrice = await priceFeed.getPrice("lstBTC");
  console.log("CORE price:", hre.ethers.formatUnits(corePrice, 8), "USD");
  console.log("lstBTC price:", hre.ethers.formatUnits(lstBTCPrice, 8), "USD");

  console.log("\n🎉 === DEPLOYMENT COMPLETE ===");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("Deployer:", deployer.address);
  console.log("\n📋 Contract Addresses:");
  console.log("MockCORE:", mockCOREAddress);
  console.log("MockCoreBTC:", mockCoreBTCAddress);
  console.log("MockLstBTC:", mockLstBTCAddress);
  console.log("MockCoreStaking:", mockCoreStakingAddress);
  console.log("PriceFeed:", priceFeedAddress);
  console.log("StakingManager:", stakingManagerAddress);
  console.log("StakeBasketToken:", stakeBasketTokenAddress);
  console.log("StakeBasket:", stakeBasketAddress);
  
  console.log("\n📝 Next Steps:");
  console.log("1. Update frontend config with these contract addresses");
  console.log("2. Test ETF functionality on testnet");
  console.log("3. Verify contracts on Core Testnet explorer");
  console.log("4. Share contracts for community testing");
  
  // Save deployment addresses to file
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    contracts: {
      MockCORE: mockCOREAddress,
      MockCoreBTC: mockCoreBTCAddress,
      MockLstBTC: mockLstBTCAddress,
      MockCoreStaking: mockCoreStakingAddress,
      PriceFeed: priceFeedAddress,
      StakingManager: stakingManagerAddress,
      StakeBasketToken: stakeBasketTokenAddress,
      StakeBasket: stakeBasketAddress,
    },
    timestamp: new Date().toISOString()
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './docs/testnet-deployment.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n💾 Deployment info saved to docs/testnet-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });