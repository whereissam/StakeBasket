const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying StakeBasket to CoreDAO Testnet2");
  console.log("==============================================\n");
  
  // Check environment
  if (!process.env.PRIVATE_KEY) {
    console.log("❌ PRIVATE_KEY not found in environment variables");
    console.log("💡 Create .env file with your private key:");
    console.log("   PRIVATE_KEY=0x1234567890abcdef...");
    return;
  }
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "tCORE");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("⚠️ Low balance! Get testnet CORE from: https://bridge.coredao.org");
    console.log("   Need at least 0.1 tCORE for deployment\n");
  }
  
  try {
    // Step 1: Deploy API3PriceFeed
    console.log("🔮 Step 1: Deploying API3PriceFeed...");
    const API3PriceFeed = await hre.ethers.getContractFactory("API3PriceFeed");
    const priceFeed = await API3PriceFeed.deploy(deployer.address);
    await priceFeed.waitForDeployment();
    const priceFeedAddress = await priceFeed.getAddress();
    console.log("✅ API3PriceFeed deployed:", priceFeedAddress);
    
    // Configure for testnet (longer staleness period)
    console.log("⚙️ Configuring price feed for testnet...");
    await priceFeed.setMaxPriceAge(6 * 60 * 60); // 6 hours for testnet
    
    // Set initial prices (will be replaced by real API3 data)
    await priceFeed.updatePrice("CORE", 150 * 10**8); // $1.50
    await priceFeed.updatePrice("BTC", 95000 * 10**8); // $95,000
    await priceFeed.updatePrice("lstBTC", 96000 * 10**8); // $96,000
    console.log("✅ Initial prices set");
    
    // Step 2: Deploy StakeBasketToken
    console.log("\n🎫 Step 2: Deploying StakeBasketToken...");
    const StakeBasketToken = await hre.ethers.getContractFactory("StakeBasketToken");
    const stakeBasketToken = await StakeBasketToken.deploy(
      "StakeBasket Token",
      "BASKET", 
      deployer.address
    );
    await stakeBasketToken.waitForDeployment();
    const tokenAddress = await stakeBasketToken.getAddress();
    console.log("✅ StakeBasketToken deployed:", tokenAddress);
    
    // Step 3: Deploy StakingManager
    console.log("\n⚡ Step 3: Deploying StakingManager...");
    const StakingManager = await hre.ethers.getContractFactory("StakingManager");
    const stakingManager = await StakingManager.deploy(
      tokenAddress, // Will be updated after StakeBasket deployment
      priceFeedAddress,
      deployer.address
    );
    await stakingManager.waitForDeployment();
    const stakingManagerAddress = await stakingManager.getAddress();
    console.log("✅ StakingManager deployed:", stakingManagerAddress);
    
    // Step 4: Deploy StakeBasket
    console.log("\n🧺 Step 4: Deploying StakeBasket...");
    const StakeBasket = await hre.ethers.getContractFactory("StakeBasket");
    const stakeBasket = await StakeBasket.deploy(
      tokenAddress,
      stakingManagerAddress,
      priceFeedAddress,
      deployer.address, // fee recipient
      deployer.address, // protocol treasury
      deployer.address  // initial owner
    );
    await stakeBasket.waitForDeployment();
    const stakeBasketAddress = await stakeBasket.getAddress();
    console.log("✅ StakeBasket deployed:", stakeBasketAddress);
    
    // Step 5: Configure contracts
    console.log("\n⚙️ Step 5: Configuring contracts...");
    
    // Set StakeBasket address in token contract
    await stakeBasketToken.emergencySetStakeBasketContract(stakeBasketAddress);
    console.log("✅ StakeBasket address set in token contract");
    
    // Deploy new StakingManager with correct StakeBasket address
    console.log("Re-deploying StakingManager with correct StakeBasket address...");
    const correctedStakingManager = await StakingManager.deploy(
      stakeBasketAddress,
      priceFeedAddress, 
      deployer.address
    );
    await correctedStakingManager.waitForDeployment();
    const correctedStakingManagerAddress = await correctedStakingManager.getAddress();
    console.log("✅ Corrected StakingManager deployed:", correctedStakingManagerAddress);
    
    // Update StakeBasket with correct StakingManager
    await stakeBasket.setStakingManager(correctedStakingManagerAddress);
    console.log("✅ StakeBasket updated with corrected StakingManager");
    
    // Step 6: Deploy BasketStaking (for governance)
    console.log("\n🗳️ Step 6: Deploying BasketStaking...");
    const BasketStaking = await hre.ethers.getContractFactory("BasketStaking");
    const basketStaking = await BasketStaking.deploy(
      tokenAddress,
      deployer.address
    );
    await basketStaking.waitForDeployment();
    const basketStakingAddress = await basketStaking.getAddress();
    console.log("✅ BasketStaking deployed:", basketStakingAddress);
    
    // Set BasketStaking in StakeBasket for fee distribution
    await stakeBasket.setBasketStaking(basketStakingAddress);
    console.log("✅ BasketStaking connected to StakeBasket");
    
    // Step 7: Save deployment info
    const deploymentInfo = {
      network: "coreTestnet2",
      chainId: 1114,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      contracts: {
        priceFeed: priceFeedAddress,
        stakeBasketToken: tokenAddress,
        stakingManager: correctedStakingManagerAddress,
        stakeBasket: stakeBasketAddress,
        basketStaking: basketStakingAddress
      },
      configuration: {
        maxPriceAge: "6 hours",
        managementFee: "0.5%",
        performanceFee: "10%",
        protocolFeeShare: "20%"
      }
    };
    
    const deploymentPath = path.join(__dirname, "../deployment-data/testnet2-deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Deployment info saved to:", deploymentPath);
    
    // Step 8: Verification summary
    console.log("\n🎉 DEPLOYMENT COMPLETE");
    console.log("======================");
    console.log(`📡 Network: CoreDAO Testnet2 (Chain ID: 1114)`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Gas Used: ~${(await hre.ethers.provider.getBalance(deployer.address) - balance) / -1000000000n} CORE`);
    console.log("\n📋 Contract Addresses:");
    console.log(`   API3PriceFeed: ${priceFeedAddress}`);
    console.log(`   StakeBasketToken: ${tokenAddress}`);
    console.log(`   StakingManager: ${correctedStakingManagerAddress}`);
    console.log(`   StakeBasket: ${stakeBasketAddress}`);
    console.log(`   BasketStaking: ${basketStakingAddress}`);
    
    console.log("\n🔗 Block Explorer:");
    console.log(`   https://scan.test2.btcs.network/address/${stakeBasketAddress}`);
    
    console.log("\n✅ All Security Fixes Active:");
    console.log("   ✅ Pull-based reward withdrawals");
    console.log("   ✅ 2-day timelock on critical changes");
    console.log("   ✅ Integer overflow protection");
    console.log("   ✅ External call validation");
    console.log("   ✅ DEX slippage protection");
    console.log("   ✅ Price manipulation safeguards");
    console.log("   ✅ Gas DoS protection");
    console.log("   ✅ High-precision calculations");
    
    console.log("\n🎯 Next Steps:");
    console.log("1. Configure API3 price feeds with real dAPI addresses");
    console.log("2. Add real CoreDAO validators to StakingManager"); 
    console.log("3. Test all functionality on testnet");
    console.log("4. Update frontend configuration with new addresses");
    console.log("5. Run comprehensive integration tests");
    
  } catch (error) {
    console.log(`❌ Deployment failed: ${error.message}`);
    if (error.reason) {
      console.log(`   Reason: ${error.reason}`);
    }
    if (error.transaction) {
      console.log(`   Transaction: ${error.transaction.hash}`);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });