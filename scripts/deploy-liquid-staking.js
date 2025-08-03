const { ethers } = require('hardhat');

async function main() {
    console.log('\n=== Deploying Core Liquid Staking System ===\n');
    
    const [deployer, treasury, operator] = await ethers.getSigners();
    
    console.log('Deploying contracts with account:', deployer.address);
    console.log('Treasury address:', treasury.address);
    console.log('Operator address:', operator.address);
    console.log('Account balance:', ethers.utils.formatEther(await deployer.getBalance()), 'CORE\n');
    
    // 1. Deploy MockCoreStaking (for local testing)
    console.log('1. Deploying MockCoreStaking...');
    const MockCoreStaking = await ethers.getContractFactory('MockCoreStaking');
    const mockCoreStaking = await MockCoreStaking.deploy();
    await mockCoreStaking.deployed();
    console.log('   MockCoreStaking deployed to:', mockCoreStaking.address);
    
    // 2. Deploy CoreLiquidStakingManager
    console.log('\n2. Deploying CoreLiquidStakingManager...');
    const CoreLiquidStakingManager = await ethers.getContractFactory('CoreLiquidStakingManager');
    const liquidStakingManager = await CoreLiquidStakingManager.deploy(
        mockCoreStaking.address,
        treasury.address,
        operator.address
    );
    await liquidStakingManager.deployed();
    console.log('   CoreLiquidStakingManager deployed to:', liquidStakingManager.address);
    
    // 3. Get stCORE token address
    console.log('\n3. Getting stCORE token address...');
    const stCoreTokenAddress = await liquidStakingManager.stCoreToken();
    console.log('   stCORE Token deployed to:', stCoreTokenAddress);
    
    // 4. Set up mock validators
    console.log('\n4. Setting up mock validators...');
    const validatorAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0x2345678901234567890123456789012345678901',
        '0x3456789012345678901234567890123456789012'
    ];
    
    // Add validators to mock contract with different performance metrics
    await mockCoreStaking.addValidator(validatorAddresses[0], 500, 8500, true); // 5% commission, 85% hybrid score
    await mockCoreStaking.addValidator(validatorAddresses[1], 300, 9000, true); // 3% commission, 90% hybrid score  
    await mockCoreStaking.addValidator(validatorAddresses[2], 700, 8000, true); // 7% commission, 80% hybrid score
    
    console.log('   Mock validators added:');
    console.log('   - Validator 1:', validatorAddresses[0], '(5% commission, 85% hybrid score)');
    console.log('   - Validator 2:', validatorAddresses[1], '(3% commission, 90% hybrid score)');
    console.log('   - Validator 3:', validatorAddresses[2], '(7% commission, 80% hybrid score)');
    
    // 5. Add validators to liquid staking manager
    console.log('\n5. Adding validators to liquid staking manager...');
    for (const validator of validatorAddresses) {
        await liquidStakingManager.addValidator(validator);
        console.log('   Added validator:', validator);
    }
    
    // 6. Get contract information
    console.log('\n6. Contract Information:');
    const contractInfo = await liquidStakingManager.getContractInfo();
    console.log('   - stCORE Token Address:', contractInfo.stCoreTokenAddress);
    console.log('   - Total Staked:', ethers.utils.formatEther(contractInfo.totalStaked), 'CORE');
    console.log('   - Total stCORE Supply:', ethers.utils.formatEther(contractInfo.totalStCoreSupply));
    console.log('   - Conversion Rate:', ethers.utils.formatEther(contractInfo.conversionRate));
    console.log('   - Validator Count:', contractInfo.validatorCount.toString());
    console.log('   - Total Delegated:', ethers.utils.formatEther(contractInfo.totalDelegated), 'CORE');
    
    // 7. Save deployment info
    const deploymentInfo = {
        network: 'localhost',
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        treasury: treasury.address,
        operator: operator.address,
        contracts: {
            mockCoreStaking: mockCoreStaking.address,
            liquidStakingManager: liquidStakingManager.address,
            stCoreToken: stCoreTokenAddress
        },
        validators: validatorAddresses,
        parameters: {
            rebalanceThreshold: await liquidStakingManager.rebalanceThreshold(),
            maxValidatorRisk: await liquidStakingManager.maxValidatorRisk(),
            protocolFee: await liquidStakingManager.protocolFee(),
            performanceFee: await liquidStakingManager.performanceFee(),
            unstakingPeriod: await liquidStakingManager.unstakingPeriod()
        }
    };
    
    console.log('\n=== Deployment Summary ===');
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync(
        './deployment-liquid-staking.json', 
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('\nDeployment info saved to: deployment-liquid-staking.json');
    
    console.log('\n=== Deployment Complete ===');
    console.log('🎉 Core Liquid Staking system deployed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run tests: npx hardhat test test/CoreLiquidStaking.test.cjs');
    console.log('2. Try demo script: node scripts/demo-liquid-staking.js');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Deployment failed:');
        console.error(error);
        process.exit(1);
    });