const { ethers } = require('hardhat');

async function simpleStakingTest() {
  console.log('🚀 Simple staking test...');
  
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  
  // Use the exact addresses from deployment
  const basketTokenAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  const basketStakingAddress = '0xc5a5C42992dECbae36851359345FE25997F5C42d';
  
  try {
    // Manually create contract instances with ABI
    const basketTokenABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function balanceOf(address) view returns (uint256)",
      "function approve(address,uint256) returns (bool)"
    ];
    
    const basketStakingABI = [
      "function getUserStakeInfo(address) view returns (uint256,uint256,uint256,uint8)",
      "function getUserTier(address) view returns (uint8)",
      "function stake(uint256)"
    ];
    
    const basketToken = new ethers.Contract(basketTokenAddress, basketTokenABI, deployer);
    const basketStaking = new ethers.Contract(basketStakingAddress, basketStakingABI, deployer);
    
    console.log('✅ Contracts created');
    
    // Check balance
    console.log('📊 Checking BASKET balance...');
    const balance = await basketToken.balanceOf(deployer.address);
    console.log('💰 BASKET balance:', ethers.utils.formatEther(balance));
    
    if (balance.gt(0)) {
      console.log('✅ Have BASKET tokens, proceeding with staking test...');
      
      // Check initial stake info
      const initialStakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
      console.log('📈 Initial staked:', ethers.utils.formatEther(initialStakeInfo[0]));
      
      // Test staking 10 BASKET tokens
      const stakeAmount = ethers.utils.parseEther('10');
      
      console.log('⏳ Step 1: Approving 10 BASKET tokens...');
      const approveTx = await basketToken.approve(basketStaking.address, stakeAmount);
      const approveReceipt = await approveTx.wait();
      console.log('✅ Approved! Gas used:', approveReceipt.gasUsed.toString());
      
      console.log('⏳ Step 2: Staking 10 BASKET tokens...');
      const stakeTx = await basketStaking.stake(stakeAmount);
      const stakeReceipt = await stakeTx.wait();
      console.log('✅ Staked! Gas used:', stakeReceipt.gasUsed.toString());
      
      // Check final balance and stake info
      const finalBalance = await basketToken.balanceOf(deployer.address);
      const finalStakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
      
      console.log('🎉 FINAL RESULTS:');
      console.log('💰 BASKET balance:', ethers.utils.formatEther(finalBalance));
      console.log('🔒 Staked amount:', ethers.utils.formatEther(finalStakeInfo[0]));
      console.log('🎖️  User tier:', finalStakeInfo[3].toString());
      
      // Gas cost analysis
      const totalGas = approveReceipt.gasUsed.add(stakeReceipt.gasUsed);
      const avgGasPrice = approveReceipt.effectiveGasPrice;
      const totalCost = totalGas.mul(avgGasPrice);
      
      console.log('⛽ Total gas used:', totalGas.toString());
      console.log('💵 Gas price:', ethers.utils.formatUnits(avgGasPrice, 'gwei'), 'gwei');
      console.log('💰 Total cost:', ethers.utils.formatEther(totalCost), 'ETH');
      
      console.log('✅ SUCCESS! Staking flow completed with no issues.');
    } else {
      console.log('❌ No BASKET tokens available');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) console.error('📋 Reason:', error.reason);
  }
}

simpleStakingTest().catch(console.error);