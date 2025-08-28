# Organized Test Suite

This directory contains all testing, verification, and deployment scripts, properly organized for maintainability.

## 📁 Directory Structure

### `/core/`
Essential verification scripts for core functionality:
- `verify-minter.cjs` - Verify token minting permissions and roles

### `/integration/` 
Comprehensive integration test suites (8 files):
- `test-base-tier.cjs` - Test base tier staking functionality
- `test-basket-minting.cjs` - Test basket token minting processes
- `test-dual-staking-real.cjs` - Real-world dual staking integration tests
- `test-live-testnet.cjs` - Live testnet integration testing
- `test-pricefeed-accuracy.cjs` - Oracle price feed accuracy tests
- `test-pyth-prices.cjs` - Pyth Network oracle integration tests
- `test-real-working-dual-staking.cjs` - End-to-end dual staking tests
- `test-three-functions.cjs` - Core functionality trio tests

### `/verification/`
Contract and system verification scripts (8 files):
- `check-allowances.cjs` - Verify token allowances and approvals
- `check-basket-permissions.cjs` - Verify basket contract permissions
- `check-current-prices*.cjs` - Price feed verification scripts
- `check-minimums.cjs` - Verify minimum deposit/stake amounts
- `check-price-feed-status.cjs` - Oracle feed health checks
- `check-redeem-specifics.cjs` - Redemption process verification
- `verify-frontend-addresses.cjs` - Frontend contract address verification

### `/deployment/`
Contract deployment scripts (3 files):
- `deploy-dual-staking-basket.cjs` - Deploy dual staking basket contracts
- `deploy-dual-staking-fixed.cjs` - Deploy fixed dual staking implementation
- `deploy-full-testnet.cjs` - Complete testnet deployment

### `/utilities/`
Helper scripts for maintenance and operations (9 files):
- `check-price-data.cjs` - Check oracle price data
- `configure-swap-router.cjs` - Configure DEX routing
- `decode-error.cjs` - Decode contract error messages
- `get-real-token-prices.cjs` - Fetch real-time token prices
- `simple-deposit-test.cjs` - Simple deposit functionality test
- `update-price-feed.cjs` - Update price feed configurations
- `update-real-market-prices.cjs` - Update with real market prices
- `update-switchboard-prices.cjs` - Switchboard oracle updates
- `use-switchboard-realtime.cjs` - Real-time Switchboard integration

### `/deprecated/`
Legacy files kept for reference (3 files):
- Historical implementations and debugging attempts

## 🚀 Quick Start Commands

**Core Verification:**
```bash
npx hardhat run tests/organized/core/verify-minter.cjs --network localhost
```

**Integration Testing:**
```bash
npx hardhat run tests/organized/integration/test-dual-staking-real.cjs --network localhost
```

**System Verification:**
```bash
npx hardhat run tests/organized/verification/check-basket-permissions.cjs --network localhost
```

**Price Feed Testing:**
```bash
npx hardhat run tests/organized/integration/test-pricefeed-accuracy.cjs --network localhost
```

## 📊 Test Coverage

- **Total Scripts**: 31 organized files (down from 48+ scattered files)
- **Integration Tests**: 8 comprehensive test suites
- **Verification Scripts**: 8 system health checks  
- **Deployment Scripts**: 3 deployment configurations
- **Utility Scripts**: 9 operational tools
- **Legacy Files**: 3 deprecated scripts (for reference)

## 🎯 Best Practices

1. **Use integration tests** for comprehensive functionality testing
2. **Run verification scripts** before and after deployments
3. **Use utilities** for maintenance and monitoring
4. **Reference deprecated** files only for historical context
5. **Always test on localhost** before testnet deployment

## 🔧 Environment Setup

Ensure your `.env` file contains:
```bash
DOTENV_CONFIG_PATH=.env.test  # For testnet
DOTENV_CONFIG_PATH=.env       # For mainnet
```

## 📝 Notes

- All scripts use `.cjs` extension for CommonJS compatibility with Hardhat
- Scripts are network-aware and can be run with `--network` flag
- Verification scripts are safe to run multiple times
- Integration tests may modify blockchain state in test environments