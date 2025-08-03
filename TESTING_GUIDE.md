# StakeBasket Testing Guide

## Quick Start Testing

### Prerequisites
1. Ensure Node.js is installed
2. Install dependencies: `npm install`
3. Start Hardhat local network: `npx hardhat node`

### ✅ Verified Working Tests

Run these tests to verify the system is working correctly:

```bash
# 1. Compile all contracts
npx hardhat compile

# 2. Run individual contract tests (comprehensive)
npx hardhat run scripts/test-individual-contracts.cjs --network localhost

# 3. Run basic deployment test
npx hardhat run scripts/debug-deploy.cjs --network localhost
```

### Expected Test Results

When running `scripts/test-individual-contracts.cjs`, you should see:

```
✅ PriceFeed test passed - CORE $1.5, BTC $95k prices working correctly
✅ UnbondingQueue test passed - 7-day unbonding queue mechanics working  
✅ MockTokens test passed - Token transfers, minting, and allowances working
✅ MockCoreStaking test passed - Validator delegation and reward simulation working
✅ StakeBasketToken test passed - ERC20 token minting/burning working
✅ BasketStaking test passed - Tiered staking benefits and fee reductions working
✅ StCoreToken test passed - Liquid staking conversions and dynamic rates working

🎉 All individual contract tests completed successfully!
```

## Core Testnet2 Testing

### Network Configuration
- **Chain ID**: 1114
- **RPC URL**: https://rpc.test2.btcs.network
- **Faucet**: https://scan.test2.btcs.network/faucet

### Testnet Setup
1. Add Core Testnet2 to MetaMask:
   - Network Name: Core Testnet2
   - RPC URL: https://rpc.test2.btcs.network
   - Chain ID: 1114
   - Currency Symbol: tCORE2

2. Get testnet tokens from faucet
3. Deploy contracts to testnet (if needed)

## OpenZeppelin v5 Compatibility

All contracts have been updated for OpenZeppelin v5 compatibility:

### Key Changes Made
- ✅ `Ownable` constructors now require `initialOwner` parameter
- ✅ ERC20 function calls use `super.` prefix where needed
- ✅ Interface methods updated (`claimReward` vs `claimRewards`)
- ✅ Price feed functions standardized (`getSolvBTCPrice`)
- ✅ Payable functions properly marked for ETH transfers

### Compilation Status
All contracts compile successfully with no errors using OpenZeppelin v5.x.

## Troubleshooting

### Common Issues

**Issue**: "Sender doesn't have enough funds"
- **Solution**: Restart Hardhat node to get fresh accounts with 10,000 ETH each

**Issue**: "function selector was not recognized"
- **Solution**: Ensure you're using the correct contract interface and function names

**Issue**: "Cannot mix BigInt and other types"
- **Solution**: Use `Number()` conversion for BigInt arithmetic operations

### Getting Help

If tests fail:
1. Check that Hardhat node is running
2. Verify network configuration
3. Ensure latest dependencies are installed
4. Check console output for specific error messages

## Testing Workflow

### For Development
1. Start local node: `npx hardhat node`
2. Run individual tests: `npx hardhat run scripts/test-individual-contracts.cjs --network localhost`
3. Make changes to contracts
4. Recompile: `npx hardhat compile`
5. Re-run tests to verify

### For Deployment
1. Test locally first
2. Update network configuration for target network
3. Deploy to testnet
4. Verify contracts on explorer
5. Run integration tests

---

**Last Updated**: Based on OpenZeppelin v5 compatibility updates and Core Testnet2 configuration.