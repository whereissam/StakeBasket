const { ethers } = require('hardhat');

async function debugContracts() {
  console.log('🔍 Debugging contract connections...');
  
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  
  const basketTokenAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  const basketStakingAddress = '0xc5a5C42992dECbae36851359345FE25997F5C42d';
  
  console.log('📍 Target addresses:');
  console.log('   BasketToken:', basketTokenAddress);
  console.log('   BasketStaking:', basketStakingAddress);
  
  // Check if code exists at these addresses
  const basketTokenCode = await ethers.provider.getCode(basketTokenAddress);
  const basketStakingCode = await ethers.provider.getCode(basketStakingAddress);
  
  console.log('\n🏗️  Contract code check:');
  console.log('   BasketToken has code:', basketTokenCode !== '0x');
  console.log('   BasketStaking has code:', basketStakingCode !== '0x');
  
  if (basketTokenCode !== '0x') {
    console.log('   BasketToken code length:', basketTokenCode.length);
  }
  if (basketStakingCode !== '0x') {
    console.log('   BasketStaking code length:', basketStakingCode.length);
  }
  
  // Try to get contracts
  try {
    const basketToken = await ethers.getContractAt('StakeBasketToken', basketTokenAddress);
    console.log('✅ BasketToken contract created');
    
    // Try a simple read operation
    const name = await basketToken.name();
    console.log('✅ BasketToken name:', name);
    
    const balance = await basketToken.balanceOf(deployer.address);
    console.log('✅ BASKET balance:', ethers.utils.formatEther(balance));
    
  } catch (error) {
    console.log('❌ BasketToken error:', error.message);
  }
  
  try {
    const basketStaking = await ethers.getContractAt('BasketStaking', basketStakingAddress);
    console.log('✅ BasketStaking contract created');
    
    // Try a simple read operation
    const stakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
    console.log('✅ Stake info retrieved:', {
      amount: ethers.utils.formatEther(stakeInfo.amount),
      tier: stakeInfo.tier.toString()
    });
    
  } catch (error) {
    console.log('❌ BasketStaking error:', error.message);
  }
}

debugContracts().catch(console.error);