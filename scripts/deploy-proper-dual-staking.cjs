const { ethers } = require('hardhat');

async function deployProperDualStaking() {
  console.log('🚀 Deploying Proper Dual Staking Contract...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Token addresses from deployment
  const MOCK_CORE_ADDRESS = '0x95401dc811bb5740090279Ba06cfA8fcF6113778';
  const MOCK_BTC_ADDRESS = '0x998abeb3E57409262aE5b751f60747921B33613E';

  try {
    // Send dummy transactions to get a different deployment address
    for (let i = 0; i < 5; i++) {
      const dummyTx = await deployer.sendTransaction({
        to: deployer.address,
        value: 0
      });
      await dummyTx.wait();
    }
    console.log('✅ Dummy transactions sent to change nonce');
    
    // Deploy ProperDualStaking
    console.log('\n📄 Deploying ProperDualStaking...');
    console.log('Using CORE address:', MOCK_CORE_ADDRESS);
    console.log('Using BTC address:', MOCK_BTC_ADDRESS);
    const ProperDualStaking = await ethers.getContractFactory('ProperDualStaking');
    const properDualStaking = await ProperDualStaking.deploy(
      MOCK_CORE_ADDRESS,
      MOCK_BTC_ADDRESS,
      deployer.address
    );
    await properDualStaking.waitForDeployment();
    
    const properDualStakingAddress = await properDualStaking.getAddress();
    console.log('✅ ProperDualStaking deployed to:', properDualStakingAddress);

    // Skip reward pool funding for now - can be done later through UI
    console.log('\n⚠️ Skipping reward pool funding - will be done through UI later...');

    // Test the contract
    console.log('\n🧪 Testing contract functions...');
    
    // Test calculateTier function with proper BTC decimal conversion
    const btcAmount = ethers.parseUnits('0.1', 8); // 0.1 BTC with 8 decimals
    const tier1 = await properDualStaking.calculateTier(ethers.parseEther('500'), btcAmount);
    const tier2 = await properDualStaking.calculateTier(ethers.parseEther('2000'), btcAmount);
    const tier3 = await properDualStaking.calculateTier(ethers.parseEther('6000'), btcAmount);
    const tier4 = await properDualStaking.calculateTier(ethers.parseEther('16000'), btcAmount);
    
    console.log('Tier calculations:');
    console.log('- 500 CORE + 0.1 BTC = Tier', tier1.toString(), '(Expected: 0 Base)');
    console.log('- 2000 CORE + 0.1 BTC = Tier', tier2.toString(), '(Expected: 1 Boost)');
    console.log('- 6000 CORE + 0.1 BTC = Tier', tier3.toString(), '(Expected: 2 Super)');
    console.log('- 16000 CORE + 0.1 BTC = Tier', tier4.toString(), '(Expected: 3 Satoshi)');
    
    // Check thresholds
    const baseRatio = await properDualStaking.BASE_RATIO();
    const boostRatio = await properDualStaking.BOOST_RATIO();
    const superRatio = await properDualStaking.SUPER_RATIO();
    const satoshiRatio = await properDualStaking.SATOSHI_RATIO();
    
    console.log('\nTier thresholds:');
    console.log('- BASE_RATIO:', baseRatio.toString());
    console.log('- BOOST_RATIO:', boostRatio.toString());
    console.log('- SUPER_RATIO:', superRatio.toString());
    console.log('- SATOSHI_RATIO:', satoshiRatio.toString());
    
    // Test ratios
    console.log('\nRatio calculations:');
    console.log('- 500 CORE / 0.1 BTC = Ratio:', (500 / 0.1).toString());
    console.log('- 2000 CORE / 0.1 BTC = Ratio:', (2000 / 0.1).toString());
    console.log('- 6000 CORE / 0.1 BTC = Ratio:', (6000 / 0.1).toString());
    console.log('- 16000 CORE / 0.1 BTC = Ratio:', (16000 / 0.1).toString());

    // Update deployment info
    const deploymentInfo = {
      ProperDualStaking: properDualStakingAddress,
      MockCORE: MOCK_CORE_ADDRESS,
      MockCoreBTC: MOCK_BTC_ADDRESS
    };

    console.log('\n📋 Deployment Summary:');
    console.log('ProperDualStaking:', properDualStakingAddress);
    console.log('MockCORE:', MOCK_CORE_ADDRESS);
    console.log('MockCoreBTC:', MOCK_BTC_ADDRESS);

    // Write to file
    const fs = require('fs');
    fs.writeFileSync('proper-dual-staking-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('\n✅ Deployment info saved to proper-dual-staking-deployment.json');

    console.log('\n🎉 Proper Dual Staking deployment completed successfully!');
    console.log('\nNow you can:');
    console.log('1. Update the frontend to use the new contract address');
    console.log('2. Stake CORE and BTC together in a single transaction');
    console.log('3. Get proper tier-based rewards');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  deployProperDualStaking()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployProperDualStaking };