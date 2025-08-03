const { ethers } = require("hardhat");

/**
 * Individual contract testing script
 * Tests each contract in isolation to verify core functionality
 */

async function testIndividualContracts() {
    console.log("🔬 Testing Individual Contracts...\n");
    
    const [deployer, user1, user2, treasury] = await ethers.getSigners();
    
    // Test 1: PriceFeed
    await testPriceFeed(deployer);
    
    // Test 2: UnbondingQueue
    await testUnbondingQueue(deployer, user1);
    
    // Test 3: MockTokens
    await testMockTokens(deployer, user1, user2);
    
    // Test 4: MockCoreStaking
    await testMockCoreStaking(deployer, user1);
    
    // Test 5: StakeBasketToken
    await testStakeBasketToken(deployer, user1);
    
    // Test 6: BasketStaking
    await testBasketStaking(deployer, user1);
    
    // Test 7: StCoreToken
    await testStCoreToken(deployer);
    
    console.log("✅ All individual contract tests passed!\n");
}

async function testPriceFeed(deployer) {
    console.log("Testing PriceFeed...");
    
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = await PriceFeed.deploy(deployer.address);
    await priceFeed.waitForDeployment();
    
    // Test initial prices
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    
    console.log(`  CORE Price: $${ethers.formatEther(corePrice)}`);
    console.log(`  BTC Price: $${ethers.formatEther(btcPrice)}`);
    
    // Test price updates
    await priceFeed.setPrice("CORE", ethers.parseEther("1.5"));
    const newCorePrice = await priceFeed.getCorePrice();
    console.log(`  Updated CORE Price: $${ethers.formatEther(newCorePrice)}`);
    
    // Test price validity
    const isValid = await priceFeed.isPriceValid("CORE");
    console.log(`  CORE price valid: ${isValid}`);
    
    console.log("✅ PriceFeed test passed\n");
}

async function testUnbondingQueue(deployer, user1) {
    console.log("Testing UnbondingQueue...");
    
    const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
    const queue = await UnbondingQueue.deploy(deployer.address);
    await queue.waitForDeployment();
    
    // Test unbonding request
    await queue.requestUnbonding(user1.address, ethers.parseEther("10"), "CORE");
    
    // Test queue info
    const queueInfo = await queue.getQueueInfo(user1.address, "CORE");
    console.log(`  User queue position: ${queueInfo.position}`);
    console.log(`  Total queued: ${ethers.formatEther(queueInfo.totalQueued)} CORE`);
    
    // Test instant withdrawal check
    const canWithdraw = await queue.canWithdrawInstantly(ethers.parseEther("1"), "CORE");
    console.log(`  Can withdraw instantly: ${canWithdraw}`);
    
    console.log("✅ UnbondingQueue test passed\n");
}

async function testMockTokens(deployer, user1, user2) {
    console.log("Testing MockTokens...");
    
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const coreToken = await MockCORE.deploy(deployer.address);
    await coreToken.waitForDeployment();
    
    // Test minting
    await coreToken.mint(user1.address, ethers.parseEther("1000"));
    const balance = await coreToken.balanceOf(user1.address);
    console.log(`  User1 CORE balance: ${ethers.formatEther(balance)}`);
    
    // Test transfers
    await coreToken.connect(user1).transfer(user2.address, ethers.parseEther("100"));
    const user2Balance = await coreToken.balanceOf(user2.address);
    console.log(`  User2 CORE balance after transfer: ${ethers.formatEther(user2Balance)}`);
    
    // Test approvals
    await coreToken.connect(user1).approve(deployer.address, ethers.parseEther("50"));
    const allowance = await coreToken.allowance(user1.address, deployer.address);
    console.log(`  Allowance: ${ethers.formatEther(allowance)}`);
    
    console.log("✅ MockTokens test passed\n");
}

async function testMockCoreStaking(deployer, user1) {
    console.log("Testing MockCoreStaking...");
    
    // Deploy token first
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const coreToken = await MockCORE.deploy(deployer.address);
    await coreToken.waitForDeployment();
    
    const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
    const staking = await MockCoreStaking.deploy(await coreToken.getAddress(), deployer.address);
    await staking.waitForDeployment();
    
    // Fund with ETH for rewards
    await staking.fundRewards(ethers.parseEther("100"), { value: ethers.parseEther("100") });
    
    // Test validator info
    const validators = await staking.getValidators();
    console.log(`  Default validators: ${validators.length}`);
    
    if (validators.length > 0) {
        const [delegated, commission, score, isActive] = await staking.getValidatorInfo(validators[0]);
        console.log(`  Validator info - Delegated: ${ethers.formatEther(delegated)}, Commission: ${commission}, Active: ${isActive}`);
        
        // Test delegation with ETH (using payable delegate function)
        const delegateAmount = ethers.parseEther("1");
        await staking.connect(user1)["delegate(address)"](validators[0], { value: delegateAmount });
        
        const userDelegated = await staking.getDelegatedAmount(user1.address, validators[0]);
        console.log(`  User delegated: ${ethers.formatEther(userDelegated)} ETH`);
        
        // Test rewards
        const rewards = await staking.getRewards(user1.address, validators[0]);
        console.log(`  Pending rewards: ${ethers.formatEther(rewards)}`);
    }
    
    console.log("✅ MockCoreStaking test passed\n");
}

async function testStakeBasketToken(deployer, user1) {
    console.log("Testing StakeBasketToken...");
    
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const token = await StakeBasketToken.deploy("BASKET ETF", "BASKET", deployer.address);
    await token.waitForDeployment();
    
    // Test initial state
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    
    console.log(`  Token: ${name} (${symbol})`);
    console.log(`  Initial supply: ${ethers.formatEther(totalSupply)}`);
    
    // Set StakeBasket contract (using deployer as mock)
    await token.setStakeBasketContract(deployer.address);
    
    // Test minting (only StakeBasket can mint)
    await token.mint(user1.address, ethers.parseEther("100"));
    const balance = await token.balanceOf(user1.address);
    console.log(`  User1 balance after mint: ${ethers.formatEther(balance)}`);
    
    // Test burning
    await token.burn(user1.address, ethers.parseEther("10"));
    const newBalance = await token.balanceOf(user1.address);
    console.log(`  User1 balance after burn: ${ethers.formatEther(newBalance)}`);
    
    console.log("✅ StakeBasketToken test passed\n");
}

async function testBasketStaking(deployer, user1) {
    console.log("Testing BasketStaking...");
    
    // Deploy StakeBasketToken first
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const basketToken = await StakeBasketToken.deploy("BASKET ETF", "BASKET", deployer.address);
    await basketToken.waitForDeployment();
    
    const BasketStaking = await ethers.getContractFactory("BasketStaking");
    const staking = await BasketStaking.deploy(await basketToken.getAddress(), deployer.address);
    await staking.waitForDeployment();
    
    // Mint tokens to user for staking
    await basketToken.setStakeBasketContract(deployer.address);
    await basketToken.mint(user1.address, ethers.parseEther("1000"));
    
    // Test staking
    const stakeAmount = ethers.parseEther("150"); // Bronze tier
    await basketToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user1).stake(stakeAmount);
    
    // Check tier
    const tier = await staking.getUserTier(user1.address);
    const feeReduction = await staking.getFeeReduction(user1.address);
    const votingMultiplier = await staking.getVotingMultiplier(user1.address);
    
    console.log(`  User tier: ${tier} (Bronze=1, Silver=2, Gold=3, Platinum=4)`);  
    console.log(`  Fee reduction: ${Number(feeReduction)/100}%`);
    console.log(`  Voting multiplier: ${Number(votingMultiplier)/100}%`);
    
    // Test tier benefits
    const [threshold, multiplier, benefits] = await staking.getTierBenefits(tier);
    console.log(`  Tier threshold: ${ethers.formatEther(threshold)} BASKET`);
    console.log(`  Benefits: ${benefits}`);
    
    console.log("✅ BasketStaking test passed\n");
}

async function testStCoreToken(deployer) {
    console.log("Testing StCoreToken...");
    
    const StCoreToken = await ethers.getContractFactory("StCoreToken");
    const stCore = await StCoreToken.deploy(deployer.address);
    await stCore.waitForDeployment();
    
    // Set liquid staking manager (using deployer as mock)
    await stCore.setLiquidStakingManager(deployer.address);
    
    // Test minting
    const coreAmount = ethers.parseEther("10");
    const stCoreAmount = await stCore.mint(deployer.address, coreAmount);
    
    const balance = await stCore.balanceOf(deployer.address);
    const totalStaked = await stCore.totalStakedCore();
    const conversionRate = await stCore.getConversionRate();
    
    console.log(`  Minted: ${ethers.formatEther(balance)} stCORE for ${ethers.formatEther(coreAmount)} CORE`);
    console.log(`  Total staked: ${ethers.formatEther(totalStaked)} CORE`);
    console.log(`  Conversion rate: ${ethers.formatEther(conversionRate)} CORE per stCORE`);
    
    // Test conversion functions
    const coreToStCore = await stCore.coreToStCore(ethers.parseEther("5"));
    const stCoreToCore = await stCore.stCoreToCore(ethers.parseEther("5"));
    
    console.log(`  5 CORE = ${ethers.formatEther(coreToStCore)} stCORE`);
    console.log(`  5 stCORE = ${ethers.formatEther(stCoreToCore)} CORE`);
    
    console.log("✅ StCoreToken test passed\n");
}

// Run individual tests
if (require.main === module) {
    testIndividualContracts()
        .then(() => {
            console.log("🎉 All individual contract tests completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Individual contract tests failed:", error);
            process.exit(1);
        });
}

module.exports = { testIndividualContracts };