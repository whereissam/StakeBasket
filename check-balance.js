const { ethers } = require('hardhat');

async function checkBalance() {
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // BASKET token address from your config
    const basketTokenAddress = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
    
    // Account #2 from Hardhat
    const account2 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    
    // ERC20 ABI for balanceOf
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    
    const basketToken = new ethers.Contract(basketTokenAddress, abi, provider);
    
    const balance = await basketToken.balanceOf(account2);
    
    console.log(`Account #2 BASKET balance: ${ethers.formatEther(balance)} BASKET`);
    
    // Check ETH balance too
    const ethBalance = await provider.getBalance(account2);
    console.log(`Account #2 ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBalance();