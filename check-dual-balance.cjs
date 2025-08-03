const { ethers } = require('hardhat');

async function checkBalance() {
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Your wallet address
    const account = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    
    // Contract addresses from deployment
    const coreAddress = '0xB06c856C8eaBd1d8321b687E188204C1018BC4E5';
    const btcAddress = '0xaB7B4c595d3cE8C85e16DA86630f2fc223B05057';
    
    // ERC20 ABI for balanceOf
    const abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)'
    ];
    
    const coreToken = new ethers.Contract(coreAddress, abi, provider);
    const btcToken = new ethers.Contract(btcAddress, abi, provider);
    
    const coreBalance = await coreToken.balanceOf(account);
    const btcBalance = await btcToken.balanceOf(account);
    const coreDecimals = await coreToken.decimals();
    const btcDecimals = await btcToken.decimals();
    const coreSymbol = await coreToken.symbol();
    const btcSymbol = await btcToken.symbol();
    
    console.log(`\n=== Balance Check for ${account} ===`);
    console.log(`${coreSymbol} balance: ${ethers.formatUnits(coreBalance, coreDecimals)} (${coreDecimals} decimals)`);
    console.log(`${btcSymbol} balance: ${ethers.formatUnits(btcBalance, btcDecimals)} (${btcDecimals} decimals)`);
    console.log(`Raw ${coreSymbol}: ${coreBalance.toString()}`);
    console.log(`Raw ${btcSymbol}: ${btcBalance.toString()}`);
    
    // Check ETH balance too
    const ethBalance = await provider.getBalance(account);
    console.log(`ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkBalance();