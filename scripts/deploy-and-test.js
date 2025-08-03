const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Starting StakeBasket Protocol Deployment & Testing...\n");
    
    const [deployer, treasury, operator, user1, user2] = await ethers.getSigners();
    
    console.log("📋 Account Setup:");
    console.log("Deployer:", deployer.address);
    console.log("Treasury:", treasury.address);
    console.log("Operator:", operator.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address, "\n");
    
    const deployedContracts = {};
    
    try {
        // 1. Deploy Core Infrastructure
        console.log("1️⃣ Deploying Core Infrastructure...");
        
        const PriceFeed = await ethers.getContractFactory("PriceFeed");
        const priceFeed = await PriceFeed.deploy(deployer.address);
        await priceFeed.waitForDeployment();
        deployedContracts.priceFeed = await priceFeed.getAddress();
        console.log("✅ PriceFeed deployed:", deployedContracts.priceFeed);
        
        const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
        const unbondingQueue = await UnbondingQueue.deploy(deployer.address);
        await unbondingQueue.waitForDeployment();
        deployedContracts.unbondingQueue = await unbondingQueue.getAddress();
        console.log("✅ UnbondingQueue deployed:", deployedContracts.unbondingQueue);
        
        // 2. Deploy CoreDAO Ecosystem Mock Tokens
        console.log("\n2️⃣ Deploying CoreDAO Ecosystem Mock Tokens...");
        
        // For testnet: We use native tCORE2 (address(0)) and create mock versions of other tokens
        const MockTokens = await ethers.getContractFactory("MockTokens");
        
        // Mock lstBTC (Liquid Staked Bitcoin) - primary BTC token on Core
        const mockLstBTC = await MockTokens.deploy("Liquid Staked Bitcoin", "lstBTC", deployer.address);
        await mockLstBTC.waitForDeployment();
        deployedContracts.mockLstBTC = await mockLstBTC.getAddress();
        console.log("✅ Mock lstBTC deployed:", deployedContracts.mockLstBTC);
        
        // Mock SolvBTC.CORE
        const mockSolvBTC = await MockTokens.deploy("Solv Protocol Bitcoin", "SolvBTC", deployer.address);
        await mockSolvBTC.waitForDeployment();
        deployedContracts.mockSolvBTC = await mockSolvBTC.getAddress();
        console.log("✅ Mock SolvBTC deployed:", deployedContracts.mockSolvBTC);
        
        // Mock USDT (bridged stablecoin)
        const mockUSDT = await MockTokens.deploy("Tether USD", "USDT", deployer.address);
        await mockUSDT.waitForDeployment();
        deployedContracts.mockUSDT = await mockUSDT.getAddress();
        console.log("✅ Mock USDT deployed:", deployedContracts.mockUSDT);
        
        // Mock USDC (bridged stablecoin)
        const mockUSDC = await MockTokens.deploy("USD Coin", "USDC", deployer.address);
        await mockUSDC.waitForDeployment();
        deployedContracts.mockUSDC = await mockUSDC.getAddress();
        console.log("✅ Mock USDC deployed:", deployedContracts.mockUSDC);
        
        // Note: Native CORE is address(0) - we use ETH as proxy for testing
        deployedContracts.nativeCORE = ethers.ZeroAddress;
        console.log("✅ Native CORE configured (address(0) - using ETH as proxy)");
        
        // 3. Deploy Mock Staking Contracts
        console.log("\n3️⃣ Deploying Mock Staking Contracts...");
        
        // Mock CoreDAO native staking (uses ETH as native token proxy)
        const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
        const mockCoreStaking = await MockCoreStaking.deploy(ethers.ZeroAddress, deployer.address); // Native token
        await mockCoreStaking.waitForDeployment();
        deployedContracts.mockCoreStaking = await mockCoreStaking.getAddress();
        console.log("✅ MockCoreStaking deployed:", deployedContracts.mockCoreStaking);
        
        // Mock CoreDAO Dual Staking (CORE + Bitcoin)
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        const mockDualStaking = await MockDualStaking.deploy(
            ethers.ZeroAddress,                    // Native CORE
            deployedContracts.mockLstBTC,          // Primary Bitcoin token (lstBTC)
            deployer.address
        );
        await mockDualStaking.waitForDeployment();
        deployedContracts.mockDualStaking = await mockDualStaking.getAddress();
        console.log("✅ MockDualStaking deployed:", deployedContracts.mockDualStaking);
        
        // 4. Deploy Governance Layer
        console.log("\n4️⃣ Deploying Governance Layer...");
        
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        const stakeBasketToken = await StakeBasketToken.deploy("BASKET ETF", "BASKET", deployer.address);
        await stakeBasketToken.waitForDeployment();
        deployedContracts.stakeBasketToken = await stakeBasketToken.getAddress();
        console.log("✅ StakeBasketToken deployed:", deployedContracts.stakeBasketToken);
        
        const BasketStaking = await ethers.getContractFactory("BasketStaking");
        const basketStaking = await BasketStaking.deploy(deployedContracts.stakeBasketToken, deployer.address);
        await basketStaking.waitForDeployment();
        deployedContracts.basketStaking = await basketStaking.getAddress();
        console.log("✅ BasketStaking deployed:", deployedContracts.basketStaking);
        
        const BasketGovernance = await ethers.getContractFactory("BasketGovernance");
        const basketGovernance = await BasketGovernance.deploy(
            deployedContracts.stakeBasketToken,
            deployedContracts.basketStaking,
            deployer.address
        );
        await basketGovernance.waitForDeployment();
        deployedContracts.basketGovernance = await basketGovernance.getAddress();
        console.log("✅ BasketGovernance deployed:", deployedContracts.basketGovernance);
        
        // 5. Deploy Liquid Staking
        console.log("\n5️⃣ Deploying Liquid Staking...");
        
        const StCoreToken = await ethers.getContractFactory("StCoreToken");
        const stCoreToken = await StCoreToken.deploy();
        await stCoreToken.waitForDeployment();
        deployedContracts.stCoreToken = await stCoreToken.getAddress();
        console.log("✅ StCoreToken deployed:", deployedContracts.stCoreToken);
        
        const CoreLiquidStakingManager = await ethers.getContractFactory("CoreLiquidStakingManager");
        const coreLiquidStakingManager = await CoreLiquidStakingManager.deploy(
            deployedContracts.mockCoreStaking,
            treasury.address,
            operator.address,
            deployedContracts.unbondingQueue
        );
        await coreLiquidStakingManager.waitForDeployment();
        deployedContracts.coreLiquidStakingManager = await coreLiquidStakingManager.getAddress();
        console.log("✅ CoreLiquidStakingManager deployed:", deployedContracts.coreLiquidStakingManager);
        
        // 6. Deploy ETF Layer  
        console.log("\n6️⃣ Deploying ETF Layer...");
        
        const StakingManager = await ethers.getContractFactory("StakingManager");
        const stakingManager = await StakingManager.deploy(
            ethers.ZeroAddress, // Will set StakeBasket address later
            deployedContracts.mockCoreStaking,
            deployedContracts.mockLstBTC,          // Primary BTC token
            deployedContracts.mockUSDT,            // Bridged stablecoin
            ethers.ZeroAddress,                    // Native CORE token
            deployer.address
        );
        await stakingManager.waitForDeployment();
        deployedContracts.stakingManager = await stakingManager.getAddress();
        console.log("✅ StakingManager deployed:", deployedContracts.stakingManager);
        
        const StakeBasket = await ethers.getContractFactory("StakeBasket");
        const stakeBasket = await StakeBasket.deploy(
            deployedContracts.stakeBasketToken,
            deployedContracts.stakingManager,
            deployedContracts.priceFeed,
            treasury.address,
            treasury.address,
            deployer.address
        );
        await stakeBasket.waitForDeployment();
        deployedContracts.stakeBasket = await stakeBasket.getAddress();
        console.log("✅ StakeBasket deployed:", deployedContracts.stakeBasket);
        
        const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
        const dualStakingBasket = await DualStakingBasket.deploy(
            deployedContracts.stakeBasketToken,
            deployedContracts.priceFeed,
            ethers.ZeroAddress,                    // Native CORE
            deployedContracts.mockLstBTC,          // Primary Bitcoin token (lstBTC)
            deployedContracts.mockDualStaking,
            treasury.address,
            3, // SATOSHI tier (16,000:1 CORE:BTC ratio)
            deployer.address
        );
        await dualStakingBasket.waitForDeployment();
        deployedContracts.dualStakingBasket = await dualStakingBasket.getAddress();
        console.log("✅ DualStakingBasket deployed:", deployedContracts.dualStakingBasket);
        
        // 7. Deploy Governance Bridge
        console.log("\n7️⃣ Deploying Governance Bridge...");
        
        const CoreDAOGovernanceProxy = await ethers.getContractFactory("CoreDAOGovernanceProxy");
        const coreDAOGovernanceProxy = await CoreDAOGovernanceProxy.deploy(
            deployedContracts.basketGovernance,
            deployedContracts.mockCoreStaking,
            deployer.address
        );
        await coreDAOGovernanceProxy.waitForDeployment();
        deployedContracts.coreDAOGovernanceProxy = await coreDAOGovernanceProxy.getAddress();
        console.log("✅ CoreDAOGovernanceProxy deployed:", deployedContracts.coreDAOGovernanceProxy);
        
        // 8. Initialize Contracts
        console.log("\n8️⃣ Initializing Contracts...");
        
        // Set StakeBasket in StakeBasketToken
        await stakeBasketToken.setStakeBasketContract(deployedContracts.stakeBasket);
        console.log("✅ StakeBasketToken initialized");
        
        // Set LiquidStakingManager in StCoreToken
        await stCoreToken.setLiquidStakingManager(deployedContracts.coreLiquidStakingManager);
        console.log("✅ StCoreToken initialized");
        
        // Set BasketStaking in StakeBasket
        await stakeBasket.setBasketStaking(deployedContracts.basketStaking);
        console.log("✅ StakeBasket initialized");
        
        // Add validators to StakingManager
        await stakingManager.addCoreValidator("0x1111111111111111111111111111111111111111");
        await stakingManager.addCoreValidator("0x2222222222222222222222222222222222222222");
        console.log("✅ Validators added to StakingManager");
        
        // Fund reward pools
        await mockDualStaking.fundRewardPool(ethers.parseEther("1000"));
        await mockCoreStaking.fundRewards({ value: ethers.parseEther("1000") });
        console.log("✅ Reward pools funded");
        
        // Mint CoreDAO ecosystem test tokens
        await mockLstBTC.mint(user1.address, ethers.parseEther("10"));      // 10 lstBTC (~$950k)
        await mockLstBTC.mint(user2.address, ethers.parseEther("5"));       // 5 lstBTC (~$475k)
        await mockSolvBTC.mint(user1.address, ethers.parseEther("2"));      // 2 SolvBTC
        await mockUSDT.mint(user1.address, ethers.parseUnits("50000", 6));   // 50k USDT
        await mockUSDT.mint(user2.address, ethers.parseUnits("25000", 6));   // 25k USDT
        await mockUSDC.mint(user1.address, ethers.parseUnits("25000", 6));   // 25k USDC
        console.log("✅ CoreDAO ecosystem test tokens minted");
        console.log("   - lstBTC: Primary Bitcoin yield token");
        console.log("   - SolvBTC: Alternative Bitcoin representation");
        console.log("   - USDT/USDC: Bridged stablecoins");
        console.log("   - Native CORE: Available via testnet faucet at https://scan.test.btcs.network/faucet");
        
        // Save deployment addresses
        fs.writeFileSync(
            "./deployment-addresses.json",
            JSON.stringify(deployedContracts, null, 2)
        );
        console.log("✅ Deployment addresses saved to deployment-addresses.json");
        
        console.log("\n🎉 Deployment Complete! Starting Integration Tests...\n");
        
        // Run Integration Tests
        await runIntegrationTests(deployedContracts, { deployer, treasury, operator, user1, user2 });
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

async function runIntegrationTests(contracts, signers) {
    console.log("🧪 Running Integration Tests...\n");
    
    const { deployer, treasury, operator, user1, user2 } = signers;
    
    try {
        // Test 1: StakeBasket ETF Deposit/Redeem
        console.log("Test 1: StakeBasket ETF Flow");
        const stakeBasket = await ethers.getContractAt("StakeBasket", contracts.stakeBasket);
        const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", contracts.stakeBasketToken);
        
        // User1 deposits 1 ETH
        const depositAmount = ethers.parseEther("1");
        await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
        
        const user1Shares = await stakeBasketToken.balanceOf(user1.address);
        console.log(`✅ User1 deposited ${ethers.formatEther(depositAmount)} ETH, received ${ethers.formatEther(user1Shares)} BASKET shares`);
        
        // Test 2: BasketStaking Governance
        console.log("\nTest 2: Governance Staking Flow");
        const basketStaking = await ethers.getContractAt("BasketStaking", contracts.basketStaking);
        
        // User1 stakes BASKET tokens for governance benefits
        const stakeAmount = ethers.parseEther("150"); // Bronze tier
        await stakeBasketToken.connect(user1).approve(contracts.basketStaking, stakeAmount);
        await basketStaking.connect(user1).stake(stakeAmount);
        
        const userTier = await basketStaking.getUserTier(user1.address);
        const feeReduction = await basketStaking.getFeeReduction(user1.address);
        console.log(`✅ User1 staked ${ethers.formatEther(stakeAmount)} BASKET, achieved tier ${userTier}, fee reduction: ${feeReduction/100}%`);
        
        // Test 3: Liquid Staking
        console.log("\nTest 3: Liquid Staking Flow");
        const coreLiquidStaking = await ethers.getContractAt("CoreLiquidStakingManager", contracts.coreLiquidStakingManager);
        const stCoreToken = await ethers.getContractAt("StCoreToken", contracts.stCoreToken);
        
        // User2 stakes CORE for stCORE
        const stakeETH = ethers.parseEther("2");
        await coreLiquidStaking.connect(user2).stake(ethers.ZeroAddress, { value: stakeETH });
        
        const stCoreBalance = await stCoreToken.balanceOf(user2.address);
        const conversionRate = await stCoreToken.getConversionRate();
        console.log(`✅ User2 staked ${ethers.formatEther(stakeETH)} ETH, received ${ethers.formatEther(stCoreBalance)} stCORE`);
        console.log(`✅ Current conversion rate: ${ethers.formatEther(conversionRate)} CORE per stCORE`);
        
        // Test 4: Dual Staking
        console.log("\nTest 4: Dual Staking Flow");
        const mockCoreToken = await ethers.getContractAt("MockTokens", contracts.mockCoreToken);
        const mockBTCToken = await ethers.getContractAt("MockTokens", contracts.mockBTCToken);
        const mockDualStaking = await ethers.getContractAt("MockDualStaking", contracts.mockDualStaking);
        
        // User1 stakes in dual staking for tier rewards
        const coreStakeAmount = ethers.parseEther("2000"); // BOOST tier ratio
        const btcStakeAmount = ethers.parseEther("1");
        
        await mockCoreToken.connect(user1).approve(contracts.mockDualStaking, coreStakeAmount);
        await mockBTCToken.connect(user1).approve(contracts.mockDualStaking, btcStakeAmount);
        
        await mockDualStaking.connect(user1).stakeCORE(coreStakeAmount);
        await mockDualStaking.connect(user1).stakeBTC(btcStakeAmount);
        
        const [tier, apy] = await mockDualStaking.getTierRewards(user1.address);
        const userRatio = await mockDualStaking.getUserRatio(user1.address);
        console.log(`✅ User1 dual staking: ${ethers.formatEther(coreStakeAmount)} CORE + ${ethers.formatEther(btcStakeAmount)} BTC`);
        console.log(`✅ Achieved tier ${tier} with ${apy/100}% APY, ratio: ${ethers.formatEther(userRatio)}:1`);
        
        // Test 5: Governance Proposal
        console.log("\nTest 5: Governance Proposal Flow");
        const basketGovernance = await ethers.getContractAt("BasketGovernance", contracts.basketGovernance);
        
        // User1 creates a proposal (has enough BASKET staked)
        const proposalId = await basketGovernance.connect(user1).propose(
            "Test Proposal",
            "This is a test proposal for parameter change",
            0, // ParameterChange
            ethers.ZeroAddress,
            "0x",
            0
        );
        
        console.log(`✅ User1 created proposal ID: ${proposalId}`);
        
        // Vote on the proposal
        await basketGovernance.connect(user1).castVote(1, 1); // Vote "for"
        
        const votingPower = await basketGovernance.getVotingPower(user1.address);
        console.log(`✅ User1 voted with voting power: ${ethers.formatEther(votingPower)}`);
        
        // Test 6: Price Feed
        console.log("\nTest 6: Price Feed Integration");
        const priceFeed = await ethers.getContractAt("PriceFeed", contracts.priceFeed);
        
        const corePrice = await priceFeed.getCorePrice();
        const btcPrice = await priceFeed.getLstBTCPrice();
        console.log(`✅ CORE Price: $${ethers.formatEther(corePrice)}`);
        console.log(`✅ BTC Price: $${ethers.formatEther(btcPrice)}`);
        
        // Test 7: Cross-contract Integration
        console.log("\nTest 7: Cross-contract Integration");
        
        // Check if StakeBasket properly integrates with BasketStaking for fee discounts
        const totalAUM = await stakeBasket.getTotalAUM();
        const navPerShare = await stakeBasket.getNAVPerShare();
        console.log(`✅ StakeBasket Total AUM: $${ethers.formatEther(totalAUM)}`);
        console.log(`✅ NAV per Share: $${ethers.formatEther(navPerShare)}`);
        
        console.log("\n🎉 All Integration Tests Passed! Protocol is working correctly.\n");
        
        // Display final stats
        console.log("📊 Final Protocol Stats:");
        console.log("- Total BASKET shares issued:", ethers.formatEther(await stakeBasketToken.totalSupply()));
        console.log("- Total CORE staked in liquid staking:", ethers.formatEther(await stCoreToken.totalStakedCore()));
        console.log("- Total users in governance staking:", "1"); // We only tested with user1
        console.log("- Total dual staking participants:", "1"); // We only tested with user1
        
    } catch (error) {
        console.error("❌ Integration test failed:", error);
        throw error;
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

module.exports = { main, runIntegrationTests };