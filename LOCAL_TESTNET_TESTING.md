# 🧪 Local Testnet Testing Guide

This guide provides comprehensive bash commands and scripts to verify that your local Hardhat testnet is working correctly for the StakeBasket DeFi application.

## 🚀 Prerequisites

Ensure you have the following running:
- **Hardhat Node**: `npx hardhat node` (Terminal 1)
- **Frontend Dev Server**: `npm run dev` (Terminal 2)

## 📋 Quick Verification Checklist

### ✅ 1. Network Connectivity Test
```bash
# Test basic RPC connectivity
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://localhost:8545
```
**Expected:** `{"jsonrpc":"2.0","id":1,"result":"0x7a69"}` (Chain ID 31337)

### ✅ 2. Account Balance Check
```bash
# Check default test account balance
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","latest"],"id":1}' \
  http://localhost:8545
```
**Expected:** Large balance (10000 ETH) indicating test account is funded

### ✅ 3. Contract Deployment Verification
```bash
# Check StakeBasket contract deployment
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xa82ff9afd8f496c3d6ac40e2a0f282e47488cfc9","latest"],"id":1}' \
  http://localhost:8545
```
**Expected:** Long hex string (contract bytecode), not `"0x"`

### ✅ 4. StakeBasketToken Contract Check
```bash
# Check token contract deployment
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x9e545e3c0baab3e08cdfd552c960a1050f373042","latest"],"id":1}' \
  http://localhost:8545
```
**Expected:** Long hex string (contract bytecode), not `"0x"`

## 🔧 Comprehensive Test Scripts

### 📝 Test Script 1: Basic Network Health Check
Create and run `test-network.cjs`:

\`\`\`javascript
const { ethers } = require('hardhat');

async function testNetwork() {
  console.log('🌐 Testing Network Health...\n');
  
  const [signer] = await ethers.getSigners();
  console.log('📝 Test Account:', signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
  
  const chainId = await ethers.provider.getNetwork();
  console.log('🔗 Chain ID:', chainId.chainId.toString());
  
  console.log(balance > ethers.parseEther('1000') ? '✅ Network Ready' : '❌ Insufficient Balance');
}
testNetwork();
\`\`\`

**Run with:** `npx hardhat run test-network.cjs --network localhost`

### 📝 Test Script 2: Contract Functionality Test
Create and run `test-contracts.cjs`:

\`\`\`javascript
const { ethers } = require('hardhat');

async function testContracts() {
  console.log('📋 Testing Contract Functionality...\n');
  
  const stakeBasketAddress = '0xa82ff9afd8f496c3d6ac40e2a0f282e47488cfc9';
  const tokenAddress = '0x9e545e3c0baab3e08cdfd552c960a1050f373042';
  
  try {
    const stakeBasket = await ethers.getContractAt('StakeBasket', stakeBasketAddress);
    const token = await ethers.getContractAt('StakeBasketToken', tokenAddress);
    
    // Test basic contract calls
    const owner = await stakeBasket.owner();
    const isPaused = await stakeBasket.paused();
    const tokenName = await token.name();
    const tokenSymbol = await token.symbol();
    
    console.log('✅ StakeBasket Owner:', owner);
    console.log('✅ Paused Status:', isPaused);
    console.log('✅ Token Name:', tokenName);
    console.log('✅ Token Symbol:', tokenSymbol);
    
    // Test authorization
    const stakeBasketInToken = await token.stakeBasketContract();
    console.log('✅ Authorization:', stakeBasketInToken === stakeBasketAddress ? 'Correct' : 'FAILED');
    
    console.log('\n🎉 All contract tests passed!');
  } catch (error) {
    console.error('❌ Contract test failed:', error.message);
  }
}
testContracts();
\`\`\`

**Run with:** `npx hardhat run test-contracts.cjs --network localhost`

### 📝 Test Script 3: Deposit Functionality Test
Create and run `test-deposit.cjs`:

\`\`\`javascript
const { ethers } = require('hardhat');

async function testDeposit() {
  console.log('💰 Testing Deposit Functionality...\n');
  
  try {
    const [signer] = await ethers.getSigners();
    const stakeBasket = await ethers.getContractAt('StakeBasket', '0xa82ff9afd8f496c3d6ac40e2a0f282e47488cfc9');
    const token = await ethers.getContractAt('StakeBasketToken', '0x9e545e3c0baab3e08cdfd552c960a1050f373042');
    
    const depositAmount = ethers.parseEther('0.1');
    console.log('📝 Testing deposit of', ethers.formatEther(depositAmount), 'ETH');
    
    // Check initial token balance
    const initialBalance = await token.balanceOf(signer.address);
    console.log('🏦 Initial BASKET balance:', ethers.formatEther(initialBalance));
    
    // Gas estimation
    const gasEstimate = await stakeBasket.deposit.estimateGas(depositAmount, { value: depositAmount });
    console.log('⛽ Gas estimate:', gasEstimate.toString());
    
    // Execute deposit
    const tx = await stakeBasket.deposit(depositAmount, { 
      value: depositAmount,
      gasLimit: gasEstimate * 2n 
    });
    await tx.wait();
    
    // Check final balance
    const finalBalance = await token.balanceOf(signer.address);
    console.log('🎉 Final BASKET balance:', ethers.formatEther(finalBalance));
    console.log('✅ Deposit successful! Frontend should work correctly.');
    
  } catch (error) {
    console.error('❌ Deposit test failed:', error.message);
  }
}
testDeposit();
\`\`\`

**Run with:** `npx hardhat run test-deposit.cjs --network localhost`

## 🎯 Frontend Testing

Once all bash tests pass, test the frontend:

1. **Open Browser:** Navigate to `http://localhost:5174/dashboard`
2. **Connect Wallet:** Use MetaMask with Hardhat network
3. **Add Custom Network:**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

4. **Import Test Account:**
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - This gives you access to test funds

5. **Test Deposit:** Try depositing ETH and verify you receive BASKET tokens

## 🚨 Troubleshooting Commands

### Reset Local Environment
```bash
# Kill existing Hardhat processes
pkill -f "hardhat node"

# Clear cache and restart
npx hardhat clean
npx hardhat node --reset

# Redeploy contracts (in new terminal)
npx hardhat run redeploy-fixed.cjs --network localhost
```

### Check Process Status
```bash
# Check if Hardhat node is running
ps aux | grep hardhat

# Check port usage
lsof -i :8545  # Hardhat node
lsof -i :5174  # Frontend dev server
```

### View Hardhat Node Logs
The Hardhat node terminal shows real-time transaction logs. Look for:
- ✅ `eth_sendTransaction` - Successful transactions
- ❌ `Error: Transaction reverted` - Failed transactions
- 🔍 Contract calls and their results

## 📊 Success Indicators

| Test | Success Criteria | Command |
|------|------------------|---------|
| **Network** | Chain ID 31337, RPC responding | `curl` RPC test |
| **Balances** | >9000 ETH in test accounts | Balance check script |  
| **Contracts** | Bytecode deployed, not "0x" | Contract verification |
| **Authorization** | Token recognizes StakeBasket | Authorization test |
| **Linkage** | Contracts properly linked together | `npx hardhat run verify-contracts.cjs --network localhost` |
| **Deposits** | Gas estimation works, tx succeeds | Deposit test script |
| **Frontend** | Can connect wallet, make transactions | Browser testing |

## 🎉 All Tests Passing?

If all tests pass:
- ✅ **Local testnet is fully functional**
- ✅ **Contracts are properly deployed and authorized** 
- ✅ **Frontend integration should work perfectly**
- ✅ **Ready for development and testing**

Your local development environment is ready! 🚀

---

### 📝 Test Script 4: Contract Verification & Linkage
Create and run `verify-contracts.cjs`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Contract addresses from deployment
  const stakeBasketTokenAddress = '0x9e545e3c0baab3e08cdfd552c960a1050f373042';
  const stakeBasketAddress = '0xa82ff9afd8f496c3d6ac40e2a0f282e47488cfc9';
  
  console.log('🔍 Verifying Contract Linkage...');
  console.log('StakeBasketToken:', stakeBasketTokenAddress);
  console.log('StakeBasket:', stakeBasketAddress);
  
  try {
    // Get contract instances
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const stakeBasketToken = StakeBasketToken.attach(stakeBasketTokenAddress);
    
    const StakeBasket = await ethers.getContractFactory("StakeBasket");
    const stakeBasket = StakeBasket.attach(stakeBasketAddress);
    
    // Check if StakeBasketToken knows about StakeBasket
    const linkedStakeBasketContract = await stakeBasketToken.stakeBasketContract();
    console.log('StakeBasketToken.stakeBasketContract():', linkedStakeBasketContract);
    console.log('Expected StakeBasket address:', stakeBasketAddress);
    console.log('Addresses match:', linkedStakeBasketContract.toLowerCase() === stakeBasketAddress.toLowerCase());
    
    // Check if StakeBasket knows about StakeBasketToken (uses etfToken variable name)
    const etfTokenAddress = await stakeBasket.etfToken();
    console.log('StakeBasket.etfToken:', etfTokenAddress);
    console.log('Expected StakeBasketToken address:', stakeBasketTokenAddress);
    console.log('Token addresses match:', etfTokenAddress.toLowerCase() === stakeBasketTokenAddress.toLowerCase());
    
    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('Deployer balance:', ethers.formatEther(balance), 'ETH');
    
    console.log('\n✅ Contract verification completed');
    
  } catch (error) {
    console.error('❌ Error verifying contracts:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Run with:** `npx hardhat run verify-contracts.cjs --network localhost`

**This script verifies:**
- StakeBasketToken is properly linked to StakeBasket
- StakeBasket is properly linked to StakeBasketToken  
- Both contracts are deployed and accessible
- Helps debug "caller is not the StakeBasket contract" errors

## 📝 Current Contract Addresses (Updated)

- **StakeBasket**: `0xa82ff9afd8f496c3d6ac40e2a0f282e47488cfc9`
- **StakeBasketToken**: `0x9e545e3c0baab3e08cdfd552c960a1050f373042`
- **Test Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

*Last Updated: 2025-08-22*