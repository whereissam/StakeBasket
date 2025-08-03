const { ethers } = require('hardhat');

async function testStakingFlow() {
  console.log('Testing complete staking flow with updated contracts...');
  
  // Get contracts
  const [deployer] = await ethers.getSigners();
  console.log('Deployer address:', deployer.address);
  
  // Check if contracts exist at these addresses
  const basketTokenAddress = '0xCD8a1C3ba11CF5ECfa6267617243239504a98d90';
  const basketStakingAddress = '0x8198f5d8F8CfFE8f9C413d98a0A55aEB8ab9FbB7';
  
  console.log('\nChecking BasketToken at:', basketTokenAddress);
  const basketTokenCode = await ethers.provider.getCode(basketTokenAddress);
  console.log('BasketToken has code:', basketTokenCode !== '0x');
  
  console.log('\nChecking BasketStaking at:', basketStakingAddress);
  const basketStakingCode = await ethers.provider.getCode(basketStakingAddress);
  console.log('BasketStaking has code:', basketStakingCode !== '0x');
  
  if (basketTokenCode !== '0x') {
    try {
      const basketToken = await ethers.getContractAt('StakeBasketToken', basketTokenAddress);
      console.log('\nGetting BASKET token info...');
      const name = await basketToken.name();
      const symbol = await basketToken.symbol();
      const balance = await basketToken.balanceOf(deployer.address);
      console.log('Token name:', name);
      console.log('Token symbol:', symbol);
      console.log('Balance:', ethers.utils.formatEther(balance));
      
      if (basketStakingCode !== '0x') {
        const basketStaking = await ethers.getContractAt('BasketStaking', basketStakingAddress);
        console.log('\nGetting staking info...');
        const stakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
        console.log('Staked amount:', ethers.utils.formatEther(stakeInfo.amount));
        console.log('User tier:', stakeInfo.tier.toString());
        
        // Test staking flow
        const stakeAmount = ethers.utils.parseEther('10');
        
        console.log('\n=== STEP 1: APPROVING 10 BASKET TOKENS ===');
        const approveTx = await basketToken.approve(basketStaking.address, stakeAmount);
        console.log('Approve tx hash:', approveTx.hash);
        const approveReceipt = await approveTx.wait();
        console.log('✅ Approve gas used:', approveReceipt.gasUsed.toString());
        console.log('✅ Approve gas price:', ethers.utils.formatUnits(approveReceipt.effectiveGasPrice, 'gwei'), 'gwei');
        console.log('✅ Approve cost:', ethers.utils.formatEther(approveReceipt.gasUsed.mul(approveReceipt.effectiveGasPrice)), 'ETH');
        
        console.log('\n=== STEP 2: STAKING 10 BASKET TOKENS ===');
        const stakeTx = await basketStaking.stake(stakeAmount);
        console.log('Stake tx hash:', stakeTx.hash);
        const stakeReceipt = await stakeTx.wait();
        console.log('✅ Stake gas used:', stakeReceipt.gasUsed.toString());
        console.log('✅ Stake gas price:', ethers.utils.formatUnits(stakeReceipt.effectiveGasPrice, 'gwei'), 'gwei');
        console.log('✅ Stake cost:', ethers.utils.formatEther(stakeReceipt.gasUsed.mul(stakeReceipt.effectiveGasPrice)), 'ETH');
        
        // Check final balances
        const finalBalance = await basketToken.balanceOf(deployer.address);
        const finalStakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
        
        console.log('\n=== FINAL RESULTS ===');
        console.log('Final BASKET balance:', ethers.utils.formatEther(finalBalance));
        console.log('Final staked amount:', ethers.utils.formatEther(finalStakeInfo.amount));
        console.log('User tier:', finalStakeInfo.tier.toString());
        
        const totalCostEth = approveReceipt.gasUsed.mul(approveReceipt.effectiveGasPrice).add(stakeReceipt.gasUsed.mul(stakeReceipt.effectiveGasPrice));
        console.log('\n=== GAS ANALYSIS ===');
        console.log('🔥 Total transaction cost:', ethers.utils.formatEther(totalCostEth), 'ETH');
        console.log('🔥 Total gas used:', approveReceipt.gasUsed.add(stakeReceipt.gasUsed).toString());
        
        const ethPriceUSD = 3000;
        const totalCostUSD = parseFloat(ethers.utils.formatEther(totalCostEth)) * ethPriceUSD;
        console.log('🔥 Estimated cost in USD (at $3000/ETH):', '$' + totalCostUSD.toFixed(4));
        
        console.log('\n✅ Staking flow completed successfully!');
        console.log('✅ Only 2 transactions required (approve + stake)');
        console.log('✅ Gas costs are reasonable with 1 gwei pricing');
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  }
}

testStakingFlow().catch(console.error);