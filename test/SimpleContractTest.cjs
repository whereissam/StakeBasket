require('dotenv').config();
const { ethers } = require('ethers');

// Contract addresses from deployment
const CONTRACTS = {
  MockCORE: "0x16a77F70571b099B659BD5255d341ae57e913F52",
  StakeBasket: "0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422",
  CoreOracle: "0xf630BC778a0030dd658F116b40cB23B4dd37051E"
};

// Simple ABI for basic functions
const CORE_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)", 
  "function balanceOf(address) view returns (uint256)",
  "function faucet()"
];

const ORACLE_ABI = [
  "function getPrice(string) view returns (uint256)",
  "function getSupportedAssets() view returns (string[])"
];

async function testContracts() {
  console.log('🔗 Testing Core Testnet2 Contract Integration...\n');
  
  try {
    // Connect to Core Testnet2
    const provider = new ethers.JsonRpcProvider('https://rpc.test2.btcs.network');
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, 'Chain ID:', Number(network.chainId));
    
    // Create wallet from private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log('❌ No PRIVATE_KEY in environment variables');
      return;
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('👤 Using wallet:', wallet.address);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Wallet balance:', ethers.formatEther(balance), 'CORE\n');
    
    // Test CORE token
    console.log('📊 Testing MockCORE Token...');
    const coreToken = new ethers.Contract(CONTRACTS.MockCORE, CORE_ABI, wallet);
    
    const name = await coreToken.name();
    const symbol = await coreToken.symbol();
    const userBalance = await coreToken.balanceOf(wallet.address);
    
    console.log('  Name:', name);
    console.log('  Symbol:', symbol);
    console.log('  Your balance:', ethers.formatEther(userBalance), symbol);
    
    // Test Oracle
    console.log('\n🔮 Testing CoreOracle...');
    const oracle = new ethers.Contract(CONTRACTS.CoreOracle, ORACLE_ABI, provider);
    
    const supportedAssets = await oracle.getSupportedAssets();
    console.log('  Supported assets:', supportedAssets);
    
    const corePrice = await oracle.getPrice("CORE");
    console.log('  CORE price: $' + ethers.formatUnits(corePrice, 8));
    
    const btcPrice = await oracle.getPrice("BTC");
    console.log('  BTC price: $' + ethers.formatUnits(btcPrice, 8));
    
    console.log('\n🎉 All contract tests passed!');
    console.log('\n✅ Your contracts are working correctly on Core Testnet2');
    console.log('🌐 Explorer: https://scan.test2.btcs.network/address/' + CONTRACTS.StakeBasket);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🔧 Network troubleshooting:');
      console.log('1. Check your internet connection');
      console.log('2. Try using a VPN if DNS is blocked');
      console.log('3. Use an alternative DNS (8.8.8.8)');
    }
  }
}

testContracts();