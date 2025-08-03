const { ethers } = require('hardhat');

async function main() {
    console.log('\n🚀 Core Liquid Staking Demo\n');
    
    // Load deployment info
    const fs = require('fs');
    let deploymentInfo;
    try {
        deploymentInfo = JSON.parse(fs.readFileSync('./deployment-liquid-staking.json', 'utf8'));
    } catch (error) {
        console.error('❌ Please run deployment script first: npx hardhat run scripts/deploy-liquid-staking.js');
        process.exit(1);
    }
    
    const [deployer, treasury, operator, user1, user2] = await ethers.getSigners();
    
    // Get contract instances
    const liquidStakingManager = await ethers.getContractAt('CoreLiquidStakingManager', deploymentInfo.contracts.liquidStakingManager);
    const stCoreToken = await ethers.getContractAt('StCoreToken', deploymentInfo.contracts.stCoreToken);
    const mockCoreStaking = await ethers.getContractAt('MockCoreStaking', deploymentInfo.contracts.mockCoreStaking);
    
    console.log('📊 Initial State:');
    await printSystemStatus(liquidStakingManager, stCoreToken, user1, user2);
    
    // Demo 1: User staking
    console.log('\n=== Demo 1: User Staking ===');
    console.log('👤 User1 stakes 50 CORE...');
    const stakeAmount1 = ethers.utils.parseEther('50');
    const tx1 = await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: stakeAmount1 });
    await tx1.wait();
    console.log('✅ Transaction hash:', tx1.hash);
    
    console.log('\n👤 User2 stakes 30 CORE...');
    const stakeAmount2 = ethers.utils.parseEther('30');
    const tx2 = await liquidStakingManager.connect(user2).stake(ethers.constants.AddressZero, { value: stakeAmount2 });
    await tx2.wait();
    console.log('✅ Transaction hash:', tx2.hash);
    
    console.log('\n📊 After Staking:');
    await printSystemStatus(liquidStakingManager, stCoreToken, user1, user2);
    
    // Demo 2: Reward simulation and collection
    console.log('\n=== Demo 2: Reward Collection ===');
    console.log('💰 Simulating validator rewards...');
    
    // Add rewards to validators
    await mockCoreStaking.setValidatorReward(deploymentInfo.validators[0], ethers.utils.parseEther('2.5'));
    await mockCoreStaking.setValidatorReward(deploymentInfo.validators[1], ethers.utils.parseEther('3.0'));
    await mockCoreStaking.setValidatorReward(deploymentInfo.validators[2], ethers.utils.parseEther('1.8'));
    
    console.log('🔄 Collecting and compounding rewards...');
    const rewardTx = await liquidStakingManager.connect(operator).afterTurnRound();
    await rewardTx.wait();
    console.log('✅ Transaction hash:', rewardTx.hash);
    
    console.log('\n📊 After Reward Collection:');
    await printSystemStatus(liquidStakingManager, stCoreToken, user1, user2);
    
    // Demo 3: Rebalancing
    console.log('\n=== Demo 3: Automated Rebalancing ===');
    console.log('⚖️ Performing automated rebalancing...');
    const rebalanceTx = await liquidStakingManager.connect(operator).rebalance();
    await rebalanceTx.wait();
    console.log('✅ Transaction hash:', rebalanceTx.hash);
    
    console.log('\n📊 After Rebalancing:');
    await printSystemStatus(liquidStakingManager, stCoreToken, user1, user2);
    await printValidatorDistribution(liquidStakingManager, deploymentInfo.validators);
    
    // Demo 4: Unstaking request
    console.log('\n=== Demo 4: Unstaking Process ===');
    const unstakeAmount = ethers.utils.parseEther('20');
    
    console.log(`👤 User1 requests to unstake ${ethers.utils.formatEther(unstakeAmount)} stCORE...`);
    
    // Approve and request unstaking
    const approveTx = await stCoreToken.connect(user1).approve(liquidStakingManager.address, unstakeAmount);
    await approveTx.wait();
    
    const unstakeTx = await liquidStakingManager.connect(user1).requestUnstake(unstakeAmount);
    await unstakeTx.wait();
    console.log('✅ Unstake request submitted. Transaction hash:', unstakeTx.hash);
    
    // Check unstake request
    const request = await liquidStakingManager.unstakeRequests(0);
    console.log('📋 Unstake Request Details:');
    console.log(`   - User: ${request.user}`);
    console.log(`   - stCORE Amount: ${ethers.utils.formatEther(request.stCoreAmount)}`);
    console.log(`   - CORE Amount: ${ethers.utils.formatEther(request.coreAmount)}`);
    console.log(`   - Request Time: ${new Date(request.requestTime * 1000).toLocaleString()}`);
    console.log(`   - Fulfilled: ${request.fulfilled}`);
    
    console.log('\n📊 After Unstake Request:');
    await printSystemStatus(liquidStakingManager, stCoreToken, user1, user2);
    
    // Demo 5: Manual rebalancing
    console.log('\n=== Demo 5: Manual Rebalancing ===');
    const manualAmount = ethers.utils.parseEther('10');
    console.log(`🔧 Manually rebalancing ${ethers.utils.formatEther(manualAmount)} CORE from validator 1 to validator 2...`);
    
    const manualTx = await liquidStakingManager.connect(operator).manualRebalance(
        deploymentInfo.validators[0],
        deploymentInfo.validators[1], 
        manualAmount
    );
    await manualTx.wait();
    console.log('✅ Transaction hash:', manualTx.hash);
    
    console.log('\n📊 After Manual Rebalancing:');
    await printValidatorDistribution(liquidStakingManager, deploymentInfo.validators);
    
    // Demo 6: Parameter updates
    console.log('\n=== Demo 6: Parameter Management ===');
    console.log('⚙️ Updating protocol parameters...');
    
    const newThreshold = 750; // 7.5%
    const paramTx = await liquidStakingManager.connect(deployer).setRebalanceThreshold(newThreshold);
    await paramTx.wait();
    console.log(`✅ Rebalance threshold updated to ${newThreshold / 100}%`);
    
    // Demo 7: System health check
    console.log('\n=== Demo 7: System Health Check ===');
    await performHealthCheck(liquidStakingManager, stCoreToken, mockCoreStaking, deploymentInfo.validators);
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Users can stake CORE and receive liquid stCORE tokens');
    console.log('✅ Rewards are automatically collected and compounded');
    console.log('✅ Automated rebalancing optimizes validator distribution');
    console.log('✅ Manual rebalancing provides operator control');
    console.log('✅ Unstaking process works with time delay');
    console.log('✅ Protocol parameters can be updated');
    console.log('✅ System maintains healthy state and accurate accounting');
}

async function printSystemStatus(liquidStakingManager, stCoreToken, user1, user2) {
    const contractInfo = await liquidStakingManager.getContractInfo();
    const tokenInfo = await stCoreToken.getTokenInfo();
    const user1Balance = await stCoreToken.balanceOf(user1.address);
    const user2Balance = await stCoreToken.balanceOf(user2.address);
    const user1CoreValue = await stCoreToken.stCoreToCore(user1Balance);
    const user2CoreValue = await stCoreToken.stCoreToCore(user2Balance);
    
    console.log('📊 System Status:');
    console.log(`   - Total Staked: ${ethers.utils.formatEther(contractInfo.totalStaked)} CORE`);
    console.log(`   - Total stCORE Supply: ${ethers.utils.formatEther(contractInfo.totalStCoreSupply)}`);
    console.log(`   - Conversion Rate: ${ethers.utils.formatEther(contractInfo.conversionRate)} CORE per stCORE`);
    console.log(`   - Active Validators: ${contractInfo.validatorCount}`);
    console.log(`   - Total Delegated: ${ethers.utils.formatEther(contractInfo.totalDelegated)} CORE`);
    console.log('');
    console.log('👥 User Balances:');
    console.log(`   - User1: ${ethers.utils.formatEther(user1Balance)} stCORE (≈ ${ethers.utils.formatEther(user1CoreValue)} CORE)`);
    console.log(`   - User2: ${ethers.utils.formatEther(user2Balance)} stCORE (≈ ${ethers.utils.formatEther(user2CoreValue)} CORE)`);
}

async function printValidatorDistribution(liquidStakingManager, validators) {
    console.log('🏛️ Validator Distribution:');
    let totalDelegated = ethers.BigNumber.from(0);
    
    for (let i = 0; i < validators.length; i++) {
        const delegated = await liquidStakingManager.delegatedAmountByValidator(validators[i]);
        totalDelegated = totalDelegated.add(delegated);
        const percentage = totalDelegated.gt(0) ? delegated.mul(10000).div(totalDelegated).toNumber() / 100 : 0;
        console.log(`   - Validator ${i + 1}: ${ethers.utils.formatEther(delegated)} CORE`);
    }
    console.log(`   - Total: ${ethers.utils.formatEther(totalDelegated)} CORE`);
}

async function performHealthCheck(liquidStakingManager, stCoreToken, mockCoreStaking, validators) {
    console.log('🔍 Performing system health check...');
    
    let issues = [];
    
    // Check validator status
    for (let i = 0; i < validators.length; i++) {
        const validator = validators[i];
        const isActive = await liquidStakingManager.isActiveValidator(validator);
        const delegatedAmount = await liquidStakingManager.delegatedAmountByValidator(validator);
        
        if (!isActive && delegatedAmount.gt(0)) {
            issues.push(`⚠️  Inactive validator ${validator} still has ${ethers.utils.formatEther(delegatedAmount)} CORE delegated`);
        }
        
        try {
            const [, , , validatorActive] = await mockCoreStaking.getValidatorInfo(validator);
            const riskScore = await mockCoreStaking.getValidatorRiskScore(validator);
            const maxRisk = await liquidStakingManager.maxValidatorRisk();
            
            if (!validatorActive) {
                issues.push(`⚠️  Validator ${validator} is inactive in core staking contract`);
            }
            
            if (riskScore.gte(maxRisk)) {
                issues.push(`⚠️  Validator ${validator} has high risk score: ${riskScore} >= ${maxRisk}`);
            }
        } catch (error) {
            issues.push(`❌ Failed to check validator ${validator}: ${error.message}`);
        }
    }
    
    // Check accounting consistency
    const totalStaked = await stCoreToken.totalStakedCore();
    const totalDelegated = await liquidStakingManager.getTotalDelegated();
    const contractBalance = await ethers.provider.getBalance(liquidStakingManager.address);
    
    const expectedBalance = totalStaked.add(contractBalance);
    if (!totalDelegated.eq(totalStaked)) {
        issues.push(`⚠️  Accounting mismatch: Total delegated (${ethers.utils.formatEther(totalDelegated)}) != Total staked (${ethers.utils.formatEther(totalStaked)})`);
    }
    
    // Check conversion rate
    const conversionRate = await stCoreToken.getConversionRate();
    if (conversionRate.lt(ethers.utils.parseEther('1'))) {
        issues.push(`⚠️  Conversion rate below 1:1: ${ethers.utils.formatEther(conversionRate)}`);
    }
    
    if (issues.length === 0) {
        console.log('✅ System health check passed - no issues found');
    } else {
        console.log(`❌ System health check found ${issues.length} issue(s):`);
        issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    console.log('📊 Health Check Summary:');
    console.log(`   - Total Validators: ${validators.length}`);
    console.log(`   - Total Staked: ${ethers.utils.formatEther(totalStaked)} CORE`);
    console.log(`   - Total Delegated: ${ethers.utils.formatEther(totalDelegated)} CORE`);
    console.log(`   - Contract Balance: ${ethers.utils.formatEther(contractBalance)} CORE`);
    console.log(`   - Conversion Rate: ${ethers.utils.formatEther(conversionRate)} CORE per stCORE`);
    console.log(`   - Issues Found: ${issues.length}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Demo failed:');
        console.error(error);
        process.exit(1);
    });