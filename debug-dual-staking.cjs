const { ethers } = require('hardhat');

async function debugDualStaking() {
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Your wallet address
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account #0
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Contract addresses
    const dualStakingAddress = '0x9BcC604D4381C5b0Ad12Ff3Bf32bEdE063416BC7';
    
    // More complete ABI
    const dualStakingABI = [
      'function stake(uint256 coreAmount, uint256 btcAmount) external',
      'function getUserStakeInfo(address user) external view returns (uint256 coreStaked, uint256 btcStaked, uint256 shares, uint256 rewards, uint256 lastClaimTime)',
      'function getTierStatus(address user) external view returns (uint8 tier, uint256 coreStaked, uint256 btcStaked, uint256 ratio, uint256 rewards, uint256 apy)',
      'function calculateTier(uint256 coreAmount, uint256 btcAmount) external pure returns (uint8)',
      // Add these to check if they exist
      'function coreToken() external view returns (address)',
      'function btcToken() external view returns (address)',
      'function owner() external view returns (address)'
    ];
    
    const dualStaking = new ethers.Contract(dualStakingAddress, dualStakingABI, wallet);
    
    console.log('=== Debugging Dual Staking Contract ===');
    console.log('Contract:', dualStakingAddress);
    console.log('Wallet:', wallet.address);
    
    try {
      // Test if contract exists and is accessible
      const code = await provider.getCode(dualStakingAddress);
      console.log('Contract code length:', code.length);
      
      if (code === '0x') {
        console.log('ERROR: No contract deployed at this address!');
        return;
      }
      
      // Try to call view functions first
      console.log('\n=== Testing View Functions ===');
      
      try {
        const userInfo = await dualStaking.getUserStakeInfo(wallet.address);
        console.log('getUserStakeInfo works:', userInfo);
      } catch (e) {
        console.log('getUserStakeInfo failed:', e.message);
      }
      
      try {
        const tierStatus = await dualStaking.getTierStatus(wallet.address);
        console.log('getTierStatus works:', tierStatus);
      } catch (e) {
        console.log('getTierStatus failed:', e.message);
      }
      
      try {
        const tier = await dualStaking.calculateTier(ethers.parseEther('500'), ethers.parseUnits('0.1', 8));
        console.log('calculateTier works:', tier);
      } catch (e) {
        console.log('calculateTier failed:', e.message);
      }
      
      // Try to check token addresses
      try {
        const coreToken = await dualStaking.coreToken();
        console.log('coreToken address:', coreToken);
      } catch (e) {
        console.log('coreToken failed:', e.message);
      }
      
      try {
        const btcToken = await dualStaking.btcToken();
        console.log('btcToken address:', btcToken);
      } catch (e) {
        console.log('btcToken failed:', e.message);
      }
      
      // Now try a dry run of stake function
      console.log('\n=== Testing Stake Function (dry run) ===');
      const coreAmount = ethers.parseEther('500');
      const btcAmount = ethers.parseUnits('0.1', 8);
      
      try {
        // Try to estimate gas first
        const gasEstimate = await dualStaking.stake.estimateGas(coreAmount, btcAmount);
        console.log('Gas estimate successful:', gasEstimate.toString());
      } catch (e) {
        console.log('Gas estimation failed:', e.message);
        // Try to get more specific error
        try {
          await dualStaking.stake.staticCall(coreAmount, btcAmount);
        } catch (staticError) {
          console.log('Static call error:', staticError.message);
        }
      }
      
    } catch (error) {
      console.error('Contract interaction failed:', error.message);
    }
    
  } catch (error) {
    console.error('Setup error:', error.message);
  }
}

debugDualStaking();