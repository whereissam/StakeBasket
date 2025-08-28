const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🌐 Deploying StakeBasket to Core Testnet2");
    console.log("=========================================\n");

    // Check network
    const network = hre.network.name;
    console.log(`📡 Network: ${network}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    
    // Get deployer
    const [deployer] = await hre.ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Check balance
    try {
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} CORE`);
        
        if (balance === 0n) {
            console.log("\n❌ ERROR: Deployer has no CORE tokens!");
            console.log("📝 To get testnet CORE tokens:");
            console.log("   1. Visit: https://scan.test2.btcs.network/faucet");
            console.log(`   2. Request tokens for: ${deployer.address}`);
            console.log("   3. Wait for confirmation and try again");
            return;
        }
        
        if (balance < hre.ethers.parseEther("1")) {
            console.log("⚠️  WARNING: Low balance. Deployment may fail if gas fees are high.");
            console.log("💡 Consider getting more tokens from the faucet if deployment fails.");
        }
    } catch (error) {
        console.log(`⚠️  Could not check balance: ${error.message}`);
    }

    console.log("\n🚀 Starting deployment...\n");

    try {
        // Deploy Mock Tokens first (for testnet we still use mocks)
        console.log("=== Deploying Mock Tokens ===");
        
        // Deploy MockCORE
        console.log("📦 Deploying MockCORE...");
        const MockCORE = await hre.ethers.getContractFactory("MockCORE");
        const mockCORE = await MockCORE.deploy(deployer.address);
        await mockCORE.waitForDeployment();
        const mockCOREAddress = await mockCORE.getAddress();
        console.log(`✅ MockCORE deployed: ${mockCOREAddress}`);

        // Deploy MockCoreBTC
        console.log("📦 Deploying MockCoreBTC...");
        const MockCoreBTC = await hre.ethers.getContractFactory("MockCoreBTC");
        const mockCoreBTC = await MockCoreBTC.deploy(deployer.address);
        await mockCoreBTC.waitForDeployment();
        const mockCoreBTCAddress = await mockCoreBTC.getAddress();
        console.log(`✅ MockCoreBTC deployed: ${mockCoreBTCAddress}`);

        // Deploy Mock Staking Contracts
        console.log("\n=== Deploying Mock Staking Contracts ===");
        
        // Deploy MockCoreStaking
        console.log("📦 Deploying MockCoreStaking...");
        const MockCoreStaking = await hre.ethers.getContractFactory("MockCoreStaking");
        const mockCoreStaking = await MockCoreStaking.deploy(mockCOREAddress, deployer.address);
        await mockCoreStaking.waitForDeployment();
        const mockCoreStakingAddress = await mockCoreStaking.getAddress();
        console.log(`✅ MockCoreStaking deployed: ${mockCoreStakingAddress}`);

        // Deploy MockLstBTC
        console.log("📦 Deploying MockLstBTC...");
        const MockLstBTC = await hre.ethers.getContractFactory("MockLstBTC");
        const mockLstBTC = await MockLstBTC.deploy(mockCoreBTCAddress, deployer.address);
        await mockLstBTC.waitForDeployment();
        const mockLstBTCAddress = await mockLstBTC.getAddress();
        console.log(`✅ MockLstBTC deployed: ${mockLstBTCAddress}`);

        // Deploy StakeBasket Core Contracts
        console.log("\n=== Deploying StakeBasket Contracts ===");

        // Deploy PriceFeed
        console.log("📦 Deploying PriceFeed...");
        const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
        const priceFeed = await PriceFeed.deploy(deployer.address);
        await priceFeed.waitForDeployment();
        const priceFeedAddress = await priceFeed.getAddress();
        console.log(`✅ PriceFeed deployed: ${priceFeedAddress}`);

        // Deploy StakeBasketToken
        console.log("📦 Deploying StakeBasketToken...");
        const StakeBasketToken = await hre.ethers.getContractFactory("StakeBasketToken");
        const stakeBasketToken = await StakeBasketToken.deploy(
            "StakeBasket Token", // name
            "BASKET",          // symbol
            deployer.address    // initial owner
        );
        await stakeBasketToken.waitForDeployment();
        const stakeBasketTokenAddress = await stakeBasketToken.getAddress();
        console.log(`✅ StakeBasketToken deployed: ${stakeBasketTokenAddress}`);

        // Deploy StakingManager
        console.log("📦 Deploying StakingManager...");
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
        console.log(`✅ StakingManager deployed: ${stakingManagerAddress}`);

        // Deploy StakeBasket
        console.log("📦 Deploying StakeBasket...");
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
        console.log(`✅ StakeBasket deployed: ${stakeBasketAddress}`);

        // Configuration
        console.log("\n=== Configuring Contracts ===");

        // Set StakeBasket contract in StakeBasketToken
        console.log("⚙️  Setting StakeBasket contract in StakeBasketToken...");
        await stakeBasketToken.setStakeBasketContract(stakeBasketAddress);
        console.log("✅ StakeBasket contract set in StakeBasketToken");
        
        // Re-deploy StakingManager with correct StakeBasket address
        console.log("⚙️  Re-deploying StakingManager with correct StakeBasket address...");
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
        console.log(`✅ Corrected StakingManager deployed: ${stakingManagerCorrectAddress}`);
        
        // Update StakeBasket to use the corrected StakingManager
        console.log("⚙️  Updating StakeBasket with corrected StakingManager...");
        await stakeBasket.setStakingManager(stakingManagerCorrectAddress);
        console.log("✅ StakeBasket updated with corrected StakingManager");
        
        // Set up rebalancing parameters
        console.log("⚙️  Configuring automated rebalancing...");
        await stakingManagerCorrect.setRebalanceThresholds(50, 600); // 0.5% APY threshold, 600 risk threshold
        await stakingManagerCorrect.setAutomationBot(deployer.address); // Set deployer as automation bot for testing
        console.log("✅ Rebalancing parameters configured");

        // Add validators to StakingManager
        console.log("⚙️  Adding validators to StakingManager...");
        const validators = await mockCoreStaking.getValidators();
        console.log(`📋 Found ${validators.length} validators`);
        
        for (const validator of validators) {
            await stakingManagerCorrect.addCoreValidator(validator);
            console.log(`✅ Added validator: ${validator}`);
        }

        // Fund contracts with test tokens
        console.log("⚙️  Funding contracts with test tokens...");
        await mockCORE.faucet();
        await mockCoreBTC.faucet();
        console.log("✅ Test tokens minted");

        // Create deployment info
        const deploymentInfo = {
            network: network,
            chainId: hre.network.config.chainId,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: {
                mockCORE: mockCOREAddress,
                mockCoreBTC: mockCoreBTCAddress,
                mockCoreStaking: mockCoreStakingAddress,
                mockLstBTC: mockLstBTCAddress,
                priceFeed: priceFeedAddress,
                stakingManager: stakingManagerCorrectAddress, // Use the corrected one
                stakeBasketToken: stakeBasketTokenAddress,
                stakeBasket: stakeBasketAddress
            },
            validators: validators,
            rebalancing: {
                apyThreshold: 50,
                riskThreshold: 600,
                automationBot: deployer.address
            }
        };

        // Save deployment info
        const deploymentFileName = `testnet-deployment-${Date.now()}.json`;
        fs.writeFileSync(deploymentFileName, JSON.stringify(deploymentInfo, null, 2));

        // Display deployment summary
        console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
        console.log("=========================");
        console.log(`📊 Network: ${network} (Chain ID: ${hre.network.config.chainId})`);
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`📅 Timestamp: ${deploymentInfo.timestamp}`);
        console.log("\n📋 Deployed Contracts:");
        console.log(`   MockCORE: ${mockCOREAddress}`);
        console.log(`   MockCoreBTC: ${mockCoreBTCAddress}`);
        console.log(`   MockCoreStaking: ${mockCoreStakingAddress}`);
        console.log(`   MockLstBTC: ${mockLstBTCAddress}`);
        console.log(`   PriceFeed: ${priceFeedAddress}`);
        console.log(`   StakingManager: ${stakingManagerCorrectAddress}`);
        console.log(`   StakeBasketToken: ${stakeBasketTokenAddress}`);
        console.log(`   StakeBasket: ${stakeBasketAddress}`);
        
        console.log(`\n💾 Deployment info saved to: ${deploymentFileName}`);
        
        console.log("\n🔗 Block Explorer Links:");
        console.log(`   Scan: https://scan.test2.btcs.network/`);
        console.log(`   StakeBasket: https://scan.test2.btcs.network/address/${stakeBasketAddress}`);
        console.log(`   StakeBasketToken: https://scan.test2.btcs.network/address/${stakeBasketTokenAddress}`);
        
        console.log("\n📝 Next Steps:");
        console.log("   1. Verify contracts on block explorer");
        console.log("   2. Test contract interactions");
        console.log("   3. Update frontend config with new addresses");
        console.log("   4. Test ETF functionality on testnet");

    } catch (error) {
        console.error("\n❌ Deployment failed:");
        console.error(`Error: ${error.message}`);
        console.error("\n🔍 Troubleshooting:");
        console.error("   - Check your private key is valid");
        console.error("   - Ensure you have enough CORE tokens for gas");
        console.error("   - Try the Core Testnet2 faucet if balance is low");
        console.error("   - Check network connectivity");
        
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });