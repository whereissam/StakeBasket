# Essential Scripts Directory

This directory contains **only essential scripts** (8 files) for core functionality, down from 119+ scattered scripts!

## 📁 Simple Structure - All Scripts in Root

**Deployment Scripts:**
- `deploy-complete-system.cjs` - Full system deployment for local/production
- `deploy-with-mocks.cjs` - Deploy with mock contracts for testing  
- `deploy-testnet2.cjs` - CoreDAO Testnet2 deployment
- `verify-deployment.cjs` - Post-deployment verification

**Utility Scripts:**
- `setup-price-feed.cjs` - Configure price feed oracles
- `update-frontend-config.cjs` - Update frontend contract addresses
- `fund-wallet.cjs` - Fund wallets with test tokens
- `get-test-tokens.cjs` - Mint/acquire test tokens

## 🚀 Quick Usage

### Essential Commands
```bash
# Deploy to local Anvil
npm run deploy:local

# Deploy with mocks for testing  
npm run deploy:mocks

# Deploy to CoreDAO Testnet2
npm run deploy:testnet2

# Verify deployment
npx hardhat run scripts/deployment/verify-deployment.cjs --network localhost
```

### Utility Commands
```bash
# Setup price feeds
npx hardhat run scripts/setup-price-feed.cjs --network localhost

# Fund wallet with test tokens
npx hardhat run scripts/fund-wallet.cjs --network localhost

# Get test tokens
npx hardhat run scripts/get-test-tokens.cjs --network localhost

# Verify deployment
npx hardhat run scripts/verify-deployment.cjs --network localhost
```

## 📊 Organization Benefits

### Before Organization:
- ❌ **119 script files** scattered across multiple folders
- ❌ **39 deployment scripts** with massive duplication
- ❌ **53 test scripts** (mostly outdated)
- ❌ **12 check scripts** with redundancy
- ❌ **7 fix scripts** (one-time fixes)
- ❌ Multiple subdirectories with overlapping functionality

### After Organization:
- ✅ **8 essential scripts** in single directory
- ✅ **4 deployment scripts** (one for each use case)  
- ✅ **4 utility scripts** (core functionality only)
- ✅ **Simple flat structure** - no unnecessary folders
- ✅ **Only essential scripts remain** - no clutter

## 🔍 What Happened to Old Scripts?

**Eliminated completely**: The 119 original scripts were redundant, outdated, or moved to better locations:

- **Debug scripts** → Use proper debugging tools instead
- **Fix scripts** → One-time fixes that are no longer needed
- **Duplicate deployment scripts** → Consolidated into 4 essential ones
- **Outdated test scripts** → Moved to organized `/tests/organized/` structure
- **Check scripts** → Moved to `/tests/organized/verification/`
- **Demo scripts** → Removed (not referenced anywhere)

## 📝 Best Practices

1. **Use npm scripts** when available (faster and consistent)
2. **Run verification** after every deployment
3. **Use utilities** for common tasks instead of manual operations
4. **Reference demos** for usage examples
5. **Archive old scripts** instead of deleting them

## 🎯 Integration with Other Organized Directories

- **Contracts**: `/contracts/` - Organized by functionality
- **Tests**: `/tests/organized/` - Comprehensive test suites  
- **Deployments**: `/deployment-data/` - All deployment configs
- **Scripts**: `/scripts/` - Essential automation only

---

*This organization reduces cognitive overhead and makes the codebase much more maintainable!*