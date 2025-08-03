# 🚀 CoreDAO Deployment Guide

Complete guide for deploying StakeBasket Protocol on CoreDAO ecosystem with proper token configuration.

## 🌍 CoreDAO Network Information

### **Mainnet (Core Chain)**
- **Chain ID**: 1116
- **RPC URL**: https://rpc.coredao.org
- **Explorer**: https://scan.coredao.org
- **Native Token**: CORE (address(0))

### **Testnet2 (Core Testnet)**
- **Chain ID**: 1114
- **RPC URL**: https://rpc.test.btcs.network
- **Explorer**: https://scan.test.btcs.network
- **Native Token**: tCORE2 (address(0))
- **Faucet**: https://scan.test.btcs.network/faucet

## 🪙 CoreDAO Token Ecosystem

### **Native Token**
- **CORE**: Native gas and staking token (like ETH on Ethereum)
  - Used for: Gas fees, validator staking, Dual Staking
  - Consensus: Satoshi Plus (Bitcoin miners + CORE validators)

### **Bitcoin Tokens**
- **lstBTC**: 🌟 **Primary Bitcoin Token**
  - Liquid Staked Bitcoin via Dual Staking
  - Managed by Maple Finance
  - Custodians: BitGo, Copper, Hex Trust
  - Yield-bearing, fully liquid, institutional-grade
  
- **SolvBTC.CORE**: Solv Protocol's Bitcoin representation
- **cbBTC Core**: Coinbase's Bitcoin token on Core

### **Stablecoins (Bridged)**
- **USDT**: 0x900101d06A7426441Ae63e9AB3B9b0F63Be145F1
- **USDC**: 0xa4151B2B3e269645181dCcF2D426cE75fcbDeca9

### **Testnet Tokens**
- **tCORE2**: Only official testnet token
- **Mock Tokens**: Deploy your own ERC-20 contracts for testing

## 🎯 StakeBasket Protocol Configuration for CoreDAO

### **Optimal Asset Allocation**
```
📊 CoreDAO-Optimized Portfolio:
├── 40% Native CORE    → Staking yields + governance
├── 35% lstBTC         → Bitcoin Dual Staking yields  
├── 15% USDT          → Stability + liquidity
└── 10% USDC          → Additional stability
```

### **Key Integration Points**

#### **1. Dual Staking Integration**
```solidity
// Tier system optimized for Core's 16,000:1 SATOSHI tier
enum StakingTier {
    BASE,    // No CORE requirement
    BOOST,   // 2,000:1 CORE:BTC
    SUPER,   // 6,000:1 CORE:BTC
    SATOSHI  // 16,000:1 CORE:BTC (maximum yield)
}
```

#### **2. lstBTC Integration**
- Primary Bitcoin exposure through institutional-grade lstBTC
- Real Bitcoin yield (not synthetic)
- Maintained custody with trusted institutions
- Full DeFi composability

#### **3. Native CORE Staking**
- Direct validator delegation
- Liquid staking via stCORE tokens
- Automated rebalancing across validators

## 🛠️ Deployment Instructions

### **1. Prerequisites**
```bash
# Install dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Configure networks in hardhat.config.js
networks: {
  coredao: {
    url: "https://rpc.coredao.org",
    chainId: 1116,
    accounts: [process.env.PRIVATE_KEY]
  },
  coredaoTestnet: {
    url: "https://rpc.test.btcs.network", 
    chainId: 1114,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

### **2. Testnet Deployment**
```bash
# Get testnet tokens
curl -X POST https://scan.test.btcs.network/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS"}'

# Deploy to testnet
npx hardhat run scripts/deploy-and-test.js --network coredaoTestnet

# Verify deployment
npx hardhat verify --network coredaoTestnet DEPLOYED_ADDRESS
```

### **3. Mainnet Deployment** 
```bash
# Deploy to mainnet (use real token addresses)
npx hardhat run scripts/deploy-mainnet.js --network coredao

# Verify all contracts
npm run verify:mainnet
```

## 📋 Pre-Deployment Checklist

### **Testnet Setup**
- [ ] Get tCORE2 from faucet: https://scan.test.btcs.network/faucet
- [ ] Deploy mock tokens for testing (lstBTC, USDT, USDC)
- [ ] Configure price feeds with realistic CoreDAO prices
- [ ] Test Dual Staking tier calculations
- [ ] Verify governance staking tiers

### **Mainnet Setup**
- [ ] Configure real token addresses:
  - [ ] lstBTC contract address
  - [ ] USDT: 0x900101d06A7426441Ae63e9AB3B9b0F63Be145F1
  - [ ] USDC: 0xa4151B2B3e269645181dCcF2D426cE75fcbDeca9
- [ ] Set up Chainlink price feeds for CoreDAO
- [ ] Configure validator addresses for staking
- [ ] Set proper fee parameters for ecosystem
- [ ] Enable emergency pause mechanisms

## 🔧 CoreDAO-Specific Configurations

### **Price Feed Configuration**
```javascript
// CoreDAO ecosystem prices
await priceFeed.setPrices([
  "CORE",      // $1.50
  "lstBTC",    // $95,000 (Bitcoin + yield)
  "SolvBTC",   // $95,000  
  "USDT",      // $1.00
  "USDC"       // $1.00
], [
  ethers.parseEther("1.5"),
  ethers.parseEther("95000"),
  ethers.parseEther("95000"),
  ethers.parseEther("1.0"),
  ethers.parseEther("1.0")
]);
```

### **Validator Configuration**
```javascript
// Add CoreDAO validators for staking
const validators = [
  "0x...", // Top CoreDAO validators by performance
  "0x...", // Diversify across multiple validators
  "0x..."  // Risk-adjusted selection
];

for (const validator of validators) {
  await stakingManager.addCoreValidator(validator);
}
```

### **Dual Staking Setup**
```javascript
// Configure for SATOSHI tier (maximum yield)
await dualStakingBasket.setTargetTier(3); // SATOSHI
await dualStakingBasket.updateTierRatio(3, ethers.parseEther("16000")); // 16,000:1 ratio
```

## 🧪 Testing Strategy

### **Testnet Testing**
```bash
# Run comprehensive test suite
npx hardhat run scripts/deploy-and-test.js --network coredaoTestnet

# Test specific CoreDAO features
npx hardhat test test/CoreDAOIntegration.test.js --network coredaoTestnet

# Stress test with CoreDAO token ecosystem
npx hardhat run scripts/stress-test-coredao.js --network coredaoTestnet
```

### **Expected Test Results**
```
🚀 CoreDAO StakeBasket Protocol Deployment...

2️⃣ Deploying CoreDAO Ecosystem Mock Tokens...
✅ Mock lstBTC deployed: 0x123... (Primary Bitcoin token)
✅ Mock SolvBTC deployed: 0x456... 
✅ Mock USDT deployed: 0x789... (Bridged stablecoin)
✅ Mock USDC deployed: 0xabc...
✅ Native CORE configured (using ETH as proxy)

Test 4: CoreDAO Dual Staking Flow
✅ User1 dual staking: 16000.0 CORE + 1.0 lstBTC
✅ Achieved SATOSHI tier with 20.0% APY 
✅ Bitcoin yield: Institutional-grade via Maple Finance

📊 Final CoreDAO Protocol Stats:
- Native CORE staked: 40% allocation
- lstBTC exposure: 35% allocation (primary Bitcoin yield)
- Stablecoin buffer: 25% allocation (USDT + USDC)
- Dual Staking tier: SATOSHI (maximum yield)
```

## 🔐 Security Considerations

### **CoreDAO-Specific Risks**
- **Bridge Risk**: USDT/USDC are bridged tokens
- **lstBTC Custodial Risk**: Mitigated by institutional custodians
- **Dual Staking Complexity**: Monitor CORE:BTC ratios
- **Validator Risk**: Diversify across multiple validators

### **Risk Mitigation**
```solidity
// Price deviation limits for bridged tokens
function setCircuitBreaker(string memory asset, uint256 maxDeviation) external;

// Emergency pause for bridge issues
function emergencyPause() external onlyOwner;

// Validator health monitoring
function getValidatorHealth(address validator) external view;
```

## 🎉 Go Live Checklist

### **Final Verification**
- [ ] All contracts deployed and verified on CoreDAO
- [ ] Token integrations working (lstBTC, USDT, USDC)
- [ ] Dual Staking achieving target tiers
- [ ] Price feeds updating correctly
- [ ] Governance staking functional
- [ ] Emergency controls active
- [ ] Documentation updated with real addresses

### **Launch Sequence**
1. **Soft Launch**: Limited deposits for testing
2. **Community Testing**: Invite Core community
3. **Full Launch**: Open to all users
4. **Monitor**: Track performance and yields
5. **Optimize**: Adjust parameters based on usage

## 📞 Support Resources

- **CoreDAO Docs**: https://docs.coredao.org
- **CoreDAO Discord**: https://discord.gg/coredao
- **Bridge Issues**: https://bridge.coredao.org
- **lstBTC Support**: Maple Finance documentation
- **Validator List**: https://scan.coredao.org/validators

---

🚀 **Ready to bring institutional-grade Bitcoin yield and native CORE staking to DeFi!**