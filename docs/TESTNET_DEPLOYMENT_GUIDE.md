# Core Testnet Deployment Guide

## 🎯 Overview

This guide walks through deploying StakeBasket contracts to Core Testnet for public testing and validation.

## 📋 Prerequisites

### 1. Environment Setup

Update your `.env` file with a valid private key:

```bash
# Add your private key (starts with 0x, 66 characters total)
PRIVATE_KEY=0x1234567890abcdef...your-private-key-here
```

⚠️ **SECURITY WARNING**: Never commit real private keys to version control!

### 2. Core Testnet CORE Tokens

You'll need testnet CORE tokens for deployment. Get them from:

**Core Testnet Faucet**: https://scan.test.btcs.network/faucet

Minimum required: ~0.1 CORE for deployment gas fees

### 3. Network Configuration

Core Testnet is already configured in `hardhat.config.cjs`:

```javascript
coreTestnet: {
  url: "https://rpc.test.btcs.network",
  chainId: 1115,
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
}
```

## 🚀 Deployment Steps

### Step 1: Compile Contracts

```bash
npx hardhat compile
```

### Step 2: Deploy to Core Testnet

```bash
npx hardhat run scripts/deploy-testnet.cjs --network coreTestnet
```

### Step 3: Verify Deployment

The deployment script will:

1. ✅ Deploy Mock CORE and lstBTC tokens
2. ✅ Deploy Mock Core Staking contracts  
3. ✅ Deploy PriceFeed with initial prices
4. ✅ Deploy StakeBasketToken
5. ✅ Deploy StakingManager
6. ✅ Deploy StakeBasket
7. ✅ Configure all contracts
8. ✅ Add validators to mock staking
9. ✅ Save deployment info to `docs/testnet-deployment.json`

## 📊 Expected Output

```bash
🚀 Deploying StakeBasket to Core Testnet
Network: coreTestnet
Chain ID: 1115
Deploying contracts with the account: 0x...
Account balance: 1.5 CORE

📋 Deployment Plan:
1. Deploy Mock CORE and lstBTC tokens (for testnet)
2. Deploy Mock Core Staking contracts
3. Deploy PriceFeed
4. Deploy StakeBasketToken
5. Deploy StakingManager
6. Deploy StakeBasket
7. Configure contracts

🪙 Step 1: Deploying Mock Tokens...
MockCORE deployed to: 0x...
MockCoreBTC deployed to: 0x...
MockLstBTC deployed to: 0x...

⛏️  Step 2: Deploying Mock Core Staking...
MockCoreStaking deployed to: 0x...

📊 Step 3: Deploying PriceFeed...
PriceFeed deployed to: 0x...

🎯 Step 4: Deploying StakeBasketToken...
StakeBasketToken deployed to: 0x...

🧮 Step 5: Calculating future StakeBasket address...
Predicted StakeBasket address: 0x...

🎛️  Step 6: Deploying StakingManager...
StakingManager deployed to: 0x...

🗄️  Step 7: Deploying StakeBasket...
StakeBasket deployed to: 0x...
✅ Address prediction successful!

⚙️  Step 8: Configuring contracts...
Setting StakeBasket contract in StakeBasketToken...
Setting initial prices in PriceFeed...
Adding validators to MockCoreStaking...

✅ Step 9: Verifying deployment...
StakeBasket Token name: StakeBasket Token
StakeBasket Token symbol: BASKET
StakeBasket owner: 0x...
CORE price: 1.50000000 USD
lstBTC price: 65000.00000000 USD

🎉 === DEPLOYMENT COMPLETE ===
Network: coreTestnet
Chain ID: 1115
Deployer: 0x...

📋 Contract Addresses:
MockCORE: 0x...
MockCoreBTC: 0x...
MockLstBTC: 0x...
MockCoreStaking: 0x...
PriceFeed: 0x...
StakingManager: 0x...
StakeBasketToken: 0x...
StakeBasket: 0x...

📝 Next Steps:
1. Update frontend config with these contract addresses
2. Test ETF functionality on testnet
3. Verify contracts on Core Testnet explorer
4. Share contracts for community testing

💾 Deployment info saved to docs/testnet-deployment.json
```

## 🔧 Post-Deployment Configuration

### Update Frontend Config

After successful deployment, update `src/config/contracts.ts` with the new testnet addresses:

```typescript
export const CONTRACT_ADDRESSES = {
  // ... existing configs
  coreTestnet: {
    StakeBasket: '0x...', // From deployment output
    StakeBasketToken: '0x...',
    StakingManager: '0x...',
    PriceFeed: '0x...',
    // Mock contracts for testnet
    MockCORE: '0x...',
    MockLstBTC: '0x...',
    MockCoreStaking: '0x...',
  }
}
```

### Frontend Environment Variables

Update frontend `.env` for testnet:

```bash
VITE_ENABLE_TESTNET=true
VITE_DEFAULT_NETWORK=coreTestnet
```

## 🧪 Testing on Testnet

### 1. Frontend Testing

```bash
npm run dev
```

- Connect wallet to Core Testnet (Chain ID: 1115)
- Switch to testnet mode in the UI
- Test deposit/withdrawal flows
- Verify staking rewards simulation

### 2. Contract Verification

Visit Core Testnet explorer:
- **Explorer**: https://scan.test.btcs.network/
- Search for deployed contract addresses
- Verify contract source code (optional)

### 3. Community Testing

Share testnet deployment with:
- Core community channels
- DeFi testing groups  
- Security auditors
- Beta testers

## 🛡️ Security Considerations

### Testnet Safety
- ✅ Uses mock contracts - no real funds at risk
- ✅ Controlled environment for testing
- ✅ No mainnet impact

### Before Mainnet
- 🔄 Professional security audit required
- 🔄 Comprehensive testing with real Core contracts
- 🔄 Community feedback integration
- 🔄 Gas optimization review

## 📈 Monitoring

### Key Metrics to Track
- Contract deployment success rate
- Transaction costs on testnet
- User interaction patterns
- Error rates and types
- Performance under load

### Analytics Setup
- Monitor testnet usage
- Track user feedback
- Identify edge cases
- Performance bottlenecks

## 🎯 Success Criteria

### Deployment Success
- ✅ All contracts deployed without errors
- ✅ Contract addresses saved correctly
- ✅ Initial configuration successful
- ✅ Validator setup complete

### Functionality Verification
- ✅ ETF deposits working
- ✅ ETF withdrawals working  
- ✅ Staking simulation working
- ✅ NAV calculations accurate
- ✅ Frontend integration successful

### Ready for Next Phase
- 🎯 Zero critical bugs found
- 🎯 Community testing positive feedback
- 🎯 Performance metrics acceptable
- 🎯 Security review passes

## 🔄 Next Steps After Testnet

1. **Collect Feedback** - Community testing results
2. **Optimize Performance** - Gas costs and efficiency  
3. **Security Audit** - Professional smart contract audit
4. **Mainnet Preparation** - Production-ready deployment
5. **Core Mainnet Launch** - Public ETF launch

## 📞 Support

If you encounter issues during deployment:

1. Check Core Testnet RPC status
2. Verify private key format (starts with 0x)
3. Ensure sufficient CORE testnet balance
4. Review error messages in deployment logs
5. Check network connectivity

## 🎉 Conclusion

This testnet deployment represents a major milestone in the StakeBasket development journey. With successful testnet deployment, the project moves from local development to public validation, bringing us one step closer to mainnet launch.

**The StakeBasket ETF is ready for community testing!** 🚀