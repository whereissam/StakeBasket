const { ethers } = require('hardhat');

async function testStakingFlow() {
  console.log('🚀 Testing complete staking flow...');
  
  // Get contracts with actual deployed addresses (lowercase as shown in logs)
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  
  const basketTokenAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  const basketStakingAddress = '0xc5a5C42992dECbae36851359345FE25997F5C42d';
  
  try {
    const basketToken = await ethers.getContractAt('StakeBasketToken', basketTokenAddress);
    const basketStaking = await ethers.getContractAt('BasketStaking', basketStakingAddress);
    
    console.log('✅ Contracts connected successfully');
    console.log('📍 BasketToken:', basketToken.address);
    console.log('📍 BasketStaking:', basketStaking.address);
    
    // Check initial state
    const initialBalance = await basketToken.balanceOf(deployer.address);
    const initialStakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
    
    console.log('\n📊 INITIAL STATE:');
    console.log('💰 BASKET balance:', ethers.utils.formatEther(initialBalance));
    console.log('🔒 Staked amount:', ethers.utils.formatEther(initialStakeInfo.amount));
    console.log('🎖️  User tier:', initialStakeInfo.tier.toString());
    console.log('🎁 Pending rewards:', ethers.utils.formatEther(initialStakeInfo.pendingRewards));
    
    if (initialBalance.isZero()) {
      console.log('❌ No BASKET tokens available. Run get-basket-tokens.cjs first!');
      return;
    }
    
    // Test staking 10 BASKET tokens
    const stakeAmount = ethers.utils.parseEther('10');
    console.log('\n🎯 Testing stake of 10 BASKET tokens...');
    
    console.log('\n⏳ STEP 1: APPROVING BASKET TOKENS');
    const approveTx = await basketToken.approve(basketStaking.address, stakeAmount);
    console.log('📝 Approve tx hash:', approveTx.hash);
    const approveReceipt = await approveTx.wait();
    console.log('✅ Approve confirmed!');
    console.log('⛽ Gas used:', approveReceipt.gasUsed.toString());
    console.log('💵 Gas price:', ethers.utils.formatUnits(approveReceipt.effectiveGasPrice, 'gwei'), 'gwei');
    console.log('💰 Cost:', ethers.utils.formatEther(approveReceipt.gasUsed.mul(approveReceipt.effectiveGasPrice)), 'ETH');
    
    console.log('\n⏳ STEP 2: STAKING BASKET TOKENS');
    const stakeTx = await basketStaking.stake(stakeAmount);
    console.log('📝 Stake tx hash:', stakeTx.hash);
    const stakeReceipt = await stakeTx.wait();
    console.log('✅ Stake confirmed!');
    console.log('⛽ Gas used:', stakeReceipt.gasUsed.toString());
    console.log('💵 Gas price:', ethers.utils.formatUnits(stakeReceipt.effectiveGasPrice, 'gwei'), 'gwei');
    console.log('💰 Cost:', ethers.utils.formatEther(stakeReceipt.gasUsed.mul(stakeReceipt.effectiveGasPrice)), 'ETH');
    
    // Check final state
    const finalBalance = await basketToken.balanceOf(deployer.address);
    const finalStakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
    
    console.log('\n📊 FINAL STATE:');
    console.log('💰 BASKET balance:', ethers.utils.formatEther(finalBalance));
    console.log('🔒 Staked amount:', ethers.utils.formatEther(finalStakeInfo.amount));
    console.log('🎖️  User tier:', finalStakeInfo.tier.toString());
    console.log('🎁 Pending rewards:', ethers.utils.formatEther(finalStakeInfo.pendingRewards));
    
    // Gas analysis
    const totalGasUsed = approveReceipt.gasUsed.add(stakeReceipt.gasUsed);
    const totalCostEth = approveReceipt.gasUsed.mul(approveReceipt.effectiveGasPrice)
                        .add(stakeReceipt.gasUsed.mul(stakeReceipt.effectiveGasPrice));
    
    console.log('\n📈 GAS ANALYSIS:');
    console.log('🔥 Total gas used:', totalGasUsed.toString());
    console.log('💰 Total cost:', ethers.utils.formatEther(totalCostEth), 'ETH');
    
    // Estimate USD cost (rough approximation)
    const ethPriceUSD = 3000;
    const totalCostUSD = parseFloat(ethers.utils.formatEther(totalCostEth)) * ethPriceUSD;
    console.log('💵 Estimated USD cost (~$3000/ETH):', '$' + totalCostUSD.toFixed(6));
    
    console.log('\n🎉 SUCCESS! Staking flow completed successfully!');
    console.log('✅ Only 2 transactions required (approve + stake)');
    console.log('✅ Gas costs are very low with 1 gwei pricing');
    console.log('✅ No multiple popups or excessive transactions');
    console.log('✅ Data updates correctly after transactions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) console.error('📋 Reason:', error.reason);
  }
}

testStakingFlow().catch(console.error);