const { ethers } = require('hardhat');

async function testFixedStaking() {
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Your wallet address
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account #0
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Contract addresses
    const coreAddress = '0xB06c856C8eaBd1d8321b687E188204C1018BC4E5';
    const btcAddress = '0xaB7B4c595d3cE8C85e16DA86630f2fc223B05057';
    const dualStakingAddress = '0x9BcC604D4381C5b0Ad12Ff3Bf32bEdE063416BC7';
    
    // ABIs
    const erc20ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)'
    ];
    
    const dualStakingABI = [
      'function stakeCORE(uint256 amount) external',
      'function stakeBTC(uint256 amount) external',
      'function getUserStake(address user) external view returns (uint256 btcAmount, uint256 coreAmount)',
      'function getTierRewards(address user) external view returns (uint256 tier, uint256 apy)',
      'function getPendingRewards(address user) external view returns (uint256)'
    ];
    
    const coreToken = new ethers.Contract(coreAddress, erc20ABI, wallet);
    const btcToken = new ethers.Contract(btcAddress, erc20ABI, wallet);
    const dualStaking = new ethers.Contract(dualStakingAddress, dualStakingABI, wallet);
    
    console.log('=== Testing Fixed Dual Staking ===');
    console.log('Wallet:', wallet.address);
    
    // Check balances
    const coreBalance = await coreToken.balanceOf(wallet.address);
    const btcBalance = await btcToken.balanceOf(wallet.address);
    const btcDecimals = await btcToken.decimals();
    
    console.log(`CORE balance: ${ethers.formatEther(coreBalance)}`);
    console.log(`BTC balance: ${ethers.formatUnits(btcBalance, btcDecimals)}`);
    
    // Test view functions first
    console.log('\n=== Testing View Functions ===');
    
    try {
      const userStake = await dualStaking.getUserStake(wallet.address);
      console.log('getUserStake works:', {
        btcAmount: ethers.formatUnits(userStake[0], btcDecimals),
        coreAmount: ethers.formatEther(userStake[1])
      });
    } catch (e) {
      console.log('getUserStake failed:', e.message);
    }
    
    try {
      const tierRewards = await dualStaking.getTierRewards(wallet.address);
      console.log('getTierRewards works:', {
        tier: tierRewards[0].toString(),
        apy: tierRewards[1].toString()
      });
    } catch (e) {
      console.log('getTierRewards failed:', e.message);
    }
    
    try {
      const pendingRewards = await dualStaking.getPendingRewards(wallet.address);
      console.log('getPendingRewards works:', ethers.formatEther(pendingRewards));
    } catch (e) {
      console.log('getPendingRewards failed:', e.message);
    }
    
    // Now test staking
    console.log('\n=== Testing Staking ===');
    const coreAmount = ethers.parseEther('500');
    const btcAmount = ethers.parseUnits('0.1', btcDecimals);
    
    console.log(`Staking: ${ethers.formatEther(coreAmount)} CORE`);
    
    // Check allowance and approve if needed
    const coreAllowance = await coreToken.allowance(wallet.address, dualStakingAddress);
    if (coreAllowance < coreAmount) {
      console.log('Approving CORE...');
      const approveTx = await coreToken.approve(dualStakingAddress, coreAmount);
      await approveTx.wait();
      console.log('CORE approved');
    }
    
    // Stake CORE
    try {
      console.log('Staking CORE...');
      const stakeTx = await dualStaking.stakeCORE(coreAmount);
      const receipt = await stakeTx.wait();
      console.log('CORE staking successful! Hash:', receipt.hash);
      
      // Check stake after CORE
      const stakeAfterCORE = await dualStaking.getUserStake(wallet.address);
      console.log('After CORE stake:', {
        btcAmount: ethers.formatUnits(stakeAfterCORE[0], btcDecimals),
        coreAmount: ethers.formatEther(stakeAfterCORE[1])
      });
      
    } catch (e) {
      console.log('CORE staking failed:', e.message);
    }
    
    // Now stake BTC
    console.log(`\nStaking: ${ethers.formatUnits(btcAmount, btcDecimals)} BTC`);
    
    const btcAllowance = await btcToken.allowance(wallet.address, dualStakingAddress);
    if (btcAllowance < btcAmount) {
      console.log('Approving BTC...');
      const approveTx = await btcToken.approve(dualStakingAddress, btcAmount);
      await approveTx.wait();
      console.log('BTC approved');
    }
    
    try {
      console.log('Staking BTC...');
      const stakeTx = await dualStaking.stakeBTC(btcAmount);
      const receipt = await stakeTx.wait();
      console.log('BTC staking successful! Hash:', receipt.hash);
      
      // Check final stake
      const finalStake = await dualStaking.getUserStake(wallet.address);
      const finalTier = await dualStaking.getTierRewards(wallet.address);
      console.log('Final stake:', {
        btcAmount: ethers.formatUnits(finalStake[0], btcDecimals),
        coreAmount: ethers.formatEther(finalStake[1]),
        tier: finalTier[0].toString(),
        apy: finalTier[1].toString()
      });
      
    } catch (e) {
      console.log('BTC staking failed:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFixedStaking();