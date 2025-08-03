const { ethers } = require('hardhat');

async function testDualStaking() {
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
      'function stake(uint256 coreAmount, uint256 btcAmount) external',
      'function getUserStakeInfo(address user) external view returns (uint256 coreStaked, uint256 btcStaked, uint256 shares, uint256 rewards, uint256 lastClaimTime)'
    ];
    
    const coreToken = new ethers.Contract(coreAddress, erc20ABI, wallet);
    const btcToken = new ethers.Contract(btcAddress, erc20ABI, wallet);
    const dualStaking = new ethers.Contract(dualStakingAddress, dualStakingABI, wallet);
    
    console.log('=== Testing Dual Staking ===');
    console.log('Wallet:', wallet.address);
    
    // Check balances
    const coreBalance = await coreToken.balanceOf(wallet.address);
    const btcBalance = await btcToken.balanceOf(wallet.address);
    const coreDecimals = await coreToken.decimals();
    const btcDecimals = await btcToken.decimals();
    
    console.log(`CORE balance: ${ethers.formatUnits(coreBalance, coreDecimals)}`);
    console.log(`BTC balance: ${ethers.formatUnits(btcBalance, btcDecimals)}`);
    
    // Check current allowances
    const coreAllowance = await coreToken.allowance(wallet.address, dualStakingAddress);
    const btcAllowance = await btcToken.allowance(wallet.address, dualStakingAddress);
    
    console.log(`CORE allowance: ${ethers.formatUnits(coreAllowance, coreDecimals)}`);
    console.log(`BTC allowance: ${ethers.formatUnits(btcAllowance, btcDecimals)}`);
    
    // Amounts to stake
    const coreAmount = ethers.parseEther('500'); // 500 CORE
    const btcAmount = ethers.parseUnits('0.1', btcDecimals); // 0.1 BTC
    
    console.log(`\nStaking amounts:`);
    console.log(`CORE: ${ethers.formatEther(coreAmount)}`);
    console.log(`BTC: ${ethers.formatUnits(btcAmount, btcDecimals)}`);
    
    // Approve if needed
    if (coreAllowance < coreAmount) {
      console.log('\nApproving CORE...');
      const approveTx = await coreToken.approve(dualStakingAddress, coreAmount);
      await approveTx.wait();
      console.log('CORE approved');
    }
    
    if (btcAllowance < btcAmount) {
      console.log('\nApproving BTC...');
      const approveTx = await btcToken.approve(dualStakingAddress, btcAmount);
      await approveTx.wait();
      console.log('BTC approved');
    }
    
    // Check stake info before
    const stakeInfoBefore = await dualStaking.getUserStakeInfo(wallet.address);
    console.log('\nStake info before:', {
      coreStaked: ethers.formatEther(stakeInfoBefore[0]),
      btcStaked: ethers.formatUnits(stakeInfoBefore[1], btcDecimals),
      shares: ethers.formatEther(stakeInfoBefore[2])
    });
    
    // Perform staking
    console.log('\nStaking...');
    const stakeTx = await dualStaking.stake(coreAmount, btcAmount);
    const receipt = await stakeTx.wait();
    console.log('Staking successful! Hash:', receipt.hash);
    
    // Check stake info after
    const stakeInfoAfter = await dualStaking.getUserStakeInfo(wallet.address);
    console.log('\nStake info after:', {
      coreStaked: ethers.formatEther(stakeInfoAfter[0]),
      btcStaked: ethers.formatUnits(stakeInfoAfter[1], btcDecimals),
      shares: ethers.formatEther(stakeInfoAfter[2])
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

testDualStaking();