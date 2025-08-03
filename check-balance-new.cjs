const { ethers } = require('hardhat');

async function checkBalance() {
  const [signer] = await ethers.getSigners();
  
  console.log('🔍 Checking balances for:', signer.address);
  console.log('');
  
  // Check ETH balance
  const ethBalance = await signer.getBalance();
  console.log('💰 ETH Balance:', ethers.utils.formatEther(ethBalance));
  
  // Check BASKET balance using raw call
  const basketTokenAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  const balanceOfSignature = '0x70a08231'; // balanceOf(address)
  const addressPadded = signer.address.toLowerCase().replace('0x', '').padStart(64, '0');
  const callData = balanceOfSignature + addressPadded;
  
  try {
    const result = await ethers.provider.call({
      to: basketTokenAddress,
      data: callData
    });
    
    if (result && result !== '0x') {
      const balance = ethers.BigNumber.from(result);
      console.log('🪙 BASKET Balance:', ethers.utils.formatEther(balance));
    } else {
      console.log('🪙 BASKET Balance: 0 (or contract not found)');
    }
  } catch (error) {
    console.log('❌ Error checking BASKET balance:', error.message);
  }
  
  console.log('');
  console.log('📍 Contract Addresses:');
  console.log('   BASKET Token:', basketTokenAddress);
  console.log('   Basket Staking:', '0xc5a5C42992dECbae36851359345FE25997F5C42d');
  console.log('');
  console.log('🌐 Network Info:');
  console.log('   RPC URL: http://127.0.0.1:8545');
  console.log('   Chain ID: 31337');
}

checkBalance().catch(console.error);