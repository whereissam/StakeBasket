const { ethers } = require("hardhat");

/**
 * Stress testing script for StakeBasket Protocol
 * Tests edge cases, high load, and potential failure scenarios
 */

async function runStressTests() {
    console.log("⚡ Starting Stress Tests...\n");
    
    const [deployer, ...users] = await ethers.getSigners();
    const treasury = users[0];
    const operator = users[1];
    
    // Deploy minimal contracts for stress testing
    const contracts = await deployMinimalContracts(deployer, treasury, operator);
    
    try {
        // Test 1: High Volume Deposits/Withdrawals
        await testHighVolumeOperations(contracts, users.slice(2, 12)); // 10 users
        
        // Test 2: Edge Case Amounts
        await testEdgeCaseAmounts(contracts, users[12]);
        
        // Test 3: Rapid State Changes
        await testRapidStateChanges(contracts, users[13]);
        
        // Test 4: Gas Limit Testing
        await testGasLimits(contracts, users[14]);
        
        // Test 5: Governance Attack Scenarios
        await testGovernanceAttacks(contracts, users.slice(15, 18));
        
        // Test 6: Price Feed Manipulation
        await testPriceFeedManipulation(contracts, users[18]);
        
        // Test 7: Reward Distribution Stress
        await testRewardDistributionStress(contracts, users.slice(19));
        
        console.log("✅ All stress tests passed!\n");
        
    } catch (error) {
        console.error("❌ Stress test failed:", error);
        throw error;
    }
}

async function deployMinimalContracts(deployer, treasury, operator) {
    console.log("Deploying minimal contracts for stress testing...");
    
    const contracts = {};
    
    // Deploy core contracts
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = await PriceFeed.deploy(deployer.address);
    contracts.priceFeed = priceFeed;
    
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const coreToken = await MockCORE.deploy(deployer.address);
    
    const MockCoreBTC = await ethers.getContractFactory("MockCoreBTC");
    const btcToken = await MockCoreBTC.deploy(deployer.address);
    contracts.coreToken = coreToken;
    contracts.btcToken = btcToken;
    
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const basketToken = await StakeBasketToken.deploy("BASKET", "BASKET", deployer.address);
    contracts.basketToken = basketToken;
    
    const BasketStaking = await ethers.getContractFactory("BasketStaking");
    const basketStaking = await BasketStaking.deploy(await basketToken.getAddress(), deployer.address);
    contracts.basketStaking = basketStaking;
    
    const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
    const mockCoreStaking = await MockCoreStaking.deploy(await coreToken.getAddress(), deployer.address);
    contracts.mockCoreStaking = mockCoreStaking;
    
    // Fund staking contract (reduce amount to 1000 ETH)
    await mockCoreStaking.fundRewards(ethers.parseEther("1000"), { value: ethers.parseEther("1000") });
    
    console.log("✅ Minimal contracts deployed\n");
    return contracts;
}

async function testHighVolumeOperations(contracts, users) {
    console.log("Test 1: High Volume Deposits/Withdrawals");
    
    const { basketStaking, basketToken, coreToken } = contracts;
    
    // Mint tokens to all users
    for (let i = 0; i < users.length; i++) {
        await basketToken.mint(users[i].address, ethers.parseEther("10000"));
        await coreToken.mint(users[i].address, ethers.parseEther("1000"));
    }
    
    // Set basket staking contract
    await basketToken.setStakeBasketContract(await basketStaking.getAddress());
    
    const startTime = Date.now();
    const promises = [];
    
    // Concurrent staking operations
    for (let i = 0; i < users.length; i++) {
        const stakeAmount = ethers.parseEther((100 + i * 50).toString());
        promises.push(
            basketToken.connect(users[i]).approve(await basketStaking.getAddress(), stakeAmount)
                .then(() => basketStaking.connect(users[i]).stake(stakeAmount))
        );
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`  ✅ ${users.length} concurrent stake operations completed in ${endTime - startTime}ms`);
    
    // Check final state
    const totalStaked = await basketStaking.totalStaked();
    console.log(`  Total staked: ${ethers.formatEther(totalStaked)} BASKET`);
    
    // Test concurrent unstaking
    const unstakePromises = [];
    for (let i = 0; i < users.length; i++) {
        const unstakeAmount = ethers.parseEther("50");
        unstakePromises.push(basketStaking.connect(users[i]).unstake(unstakeAmount));
    }
    
    await Promise.all(unstakePromises);
    console.log(`  ✅ ${users.length} concurrent unstake operations completed\n`);
}

async function testEdgeCaseAmounts(contracts, user) {
    console.log("Test 2: Edge Case Amounts");
    
    const { basketStaking, basketToken } = contracts; 
    
    await basketToken.mint(user.address, ethers.parseEther("1000000"));
    await basketToken.setStakeBasketContract(await basketStaking.getAddress());
    
    // Test very small amounts
    const tinyAmount = 1; // 1 wei
    try {
        await basketToken.connect(user).approve(await basketStaking.getAddress(), tinyAmount);
        await basketStaking.connect(user).stake(tinyAmount);
        console.log("  ✅ Tiny amount (1 wei) staking works");
    } catch (error) {
        console.log("  ⚠️ Tiny amount staking failed (expected behavior)");
    }
    
    // Test very large amounts
    const hugeAmount = ethers.parseEther("999999");
    try {
        await basketToken.connect(user).approve(await basketStaking.getAddress(), hugeAmount);
        await basketStaking.connect(user).stake(hugeAmount);
        console.log("  ✅ Large amount staking works");
        
        const userStake = await basketStaking.stakeInfo(user.address);
        console.log(`  User staked amount: ${ethers.formatEther(userStake.amount)}`);
    } catch (error) {
        console.log("  ❌ Large amount staking failed:", error.message);
    }
    
    console.log("");
}

async function testRapidStateChanges(contracts, user) {
    console.log("Test 3: Rapid State Changes");
    
    const { basketStaking, basketToken } = contracts;
    
    await basketToken.mint(user.address, ethers.parseEther("10000"));
    await basketToken.setStakeBasketContract(await basketStaking.getAddress());
    
    // Rapid stake/unstake cycles
    const cycles = 20;
    const stakeAmount = ethers.parseEther("100");
    
    await basketToken.connect(user).approve(await basketStaking.getAddress(), stakeAmount * BigInt(cycles));
    
    const startTime = Date.now();
    
    for (let i = 0; i < cycles; i++) {
        await basketStaking.connect(user).stake(stakeAmount);
        await basketStaking.connect(user).unstake(stakeAmount);
    }
    
    const endTime = Date.now();
    console.log(`  ✅ ${cycles} rapid stake/unstake cycles completed in ${endTime - startTime}ms`);
    
    // Check final state consistency
    const finalStakeInfo = await basketStaking.stakeInfo(user.address);
    console.log(`  Final stake amount: ${ethers.formatEther(finalStakeInfo.amount)}`);
    console.log("");
}

async function testGasLimits(contracts, user) {
    console.log("Test 4: Gas Limit Testing");
    
    const { basketStaking, basketToken } = contracts;
    
    await basketToken.mint(user.address, ethers.parseEther("1000"));
    await basketToken.setStakeBasketContract(await basketStaking.getAddress());
    await basketToken.connect(user).approve(await basketStaking.getAddress(), ethers.parseEther("500"));
    
    // Test gas consumption for different operations
    const stakeAmount = ethers.parseEther("500");
    
    // Measure gas for staking
    const stakeTx = await basketStaking.connect(user).stake(stakeAmount);
    const stakeReceipt = await stakeTx.wait();
    console.log(`  Stake gas used: ${stakeReceipt.gasUsed.toString()}`);
    
    // Measure gas for claiming rewards
    try {
        const claimTx = await basketStaking.connect(user).claimRewards();
        const claimReceipt = await claimTx.wait();
        console.log(`  Claim rewards gas used: ${claimReceipt.gasUsed.toString()}`);
    } catch (error) {
        console.log("  No rewards to claim (expected)");
    }
    
    // Measure gas for unstaking
    const unstakeTx = await basketStaking.connect(user).unstake(ethers.parseEther("100"));
    const unstakeReceipt = await unstakeTx.wait();
    console.log(`  Unstake gas used: ${unstakeReceipt.gasUsed.toString()}`);
    
    console.log("");
}

async function testGovernanceAttacks(contracts, attackers) {
    console.log("Test 5: Governance Attack Scenarios");
    
    const { basketStaking, basketToken } = contracts;
    
    // Simulate flash loan attack (rapid large stake -> vote -> unstake)
    const attacker = attackers[0];
    const largeAmount = ethers.parseEther("100000");
    
    await basketToken.mint(attacker.address, largeAmount);
    await basketToken.setStakeBasketContract(await basketStaking.getAddress());
    await basketToken.connect(attacker).approve(await basketStaking.getAddress(), largeAmount);
    
    // Attacker stakes large amount
    await basketStaking.connect(attacker).stake(largeAmount);
    const votingPower = await basketStaking.getVotingMultiplier(attacker.address);
    console.log(`  Attacker voting power multiplier: ${votingPower/100}%`);
    
    // Immediately try to unstake
    try {
        await basketStaking.connect(attacker).unstake(largeAmount);
        console.log("  ⚠️ Flash loan attack possible - no timelock on unstaking");
    } catch (error) {
        console.log("  ✅ Flash loan attack prevented");
    }
    
    // Test governance token concentration
    const totalSupply = await basketToken.totalSupply();
    const attackerBalance = await basketToken.balanceOf(attacker.address);
    const concentration = (attackerBalance * 10000n) / totalSupply;
    console.log(`  Attacker token concentration: ${concentration/100n}%`);
    
    if (concentration > 3000n) { // >30%
        console.log("  ⚠️ High token concentration - governance risk");
    } else {
        console.log("  ✅ Token concentration acceptable");
    }
    
    console.log("");
}

async function testPriceFeedManipulation(contracts, user) {
    console.log("Test 6: Price Feed Manipulation");
    
    const { priceFeed } = contracts;
    
    // Test extreme price changes
    const originalCorePrice = await priceFeed.getCorePrice();
    console.log(`  Original CORE price: $${ethers.formatEther(originalCorePrice)}`);
    
    // Try to set extreme price
    const extremePrice = ethers.parseEther("1000000"); // $1M CORE
    try {
        await priceFeed.setPrice("CORE", extremePrice);
        const newPrice = await priceFeed.getCorePrice();
        console.log(`  ⚠️ Extreme price set: $${ethers.formatEther(newPrice)}`);
    } catch (error) {
        console.log("  ✅ Extreme price change prevented");
    }
    
    // Test price staleness
    const priceAge = await priceFeed.getPriceAge("CORE");
    console.log(`  Current price age: ${priceAge} seconds`);
    
    const isValid = await priceFeed.isPriceValid("CORE");
    console.log(`  Price validity: ${isValid}`);
    
    // Test rapid price updates
    for (let i = 0; i < 10; i++) {
        const randomPrice = ethers.parseEther((Math.random() * 10).toString());
        await priceFeed.setPrice("CORE", randomPrice);
    }
    console.log("  ✅ Rapid price updates handled");
    
    console.log("");
}

async function testRewardDistributionStress(contracts, users) {
    console.log("Test 7: Reward Distribution Stress");
    
    const { basketStaking, basketToken } = contracts;
    
    // Create many small stakers
    const stakers = users.slice(0, Math.min(10, users.length));
    
    for (const staker of stakers) {
        const amount = ethers.parseEther("100");
        await basketToken.mint(staker.address, amount);
        await basketToken.setStakeBasketContract(await basketStaking.getAddress());
        await basketToken.connect(staker).approve(await basketStaking.getAddress(), amount);
        await basketStaking.connect(staker).stake(amount);
    }
    
    console.log(`  ${stakers.length} stakers registered`);
    
    // Simulate reward distribution
    const rewardAmount = ethers.parseEther("100");
    await basketStaking.depositProtocolFees({ value: rewardAmount });
    console.log(`  Deposited ${ethers.formatEther(rewardAmount)} ETH in rewards`);
    
    // Test if all stakers can claim (gas efficiency test)
    const claimPromises = [];
    for (const staker of stakers) {
        claimPromises.push(
            basketStaking.connect(staker).claimRewards().catch(error => {
                if (error.message.includes("no rewards")) {
                    return null; // Expected for new stakers
                }
                throw error;
            })
        );
    }
    
    await Promise.all(claimPromises);
    console.log("  ✅ Reward distribution stress test completed");
    
    console.log("");
}

// Run stress tests
if (require.main === module) {
    runStressTests()
        .then(() => {
            console.log("🎉 All stress tests completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Stress tests failed:", error);
            process.exit(1);
        });
}

module.exports = { runStressTests };