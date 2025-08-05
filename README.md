# StakeBasket - Multi-Asset Staking ETF Platform

A decentralized ETF platform for staking multiple Core DAO assets with automated rebalancing and governance features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or bun
- MetaMask or compatible wallet

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 📁 Project Structure

```
staking/
├── 📂 src/                    # Frontend source code
│   ├── 📂 components/         # React components
│   ├── 📂 hooks/             # Custom React hooks
│   ├── 📂 store/             # State management
│   ├── 📂 config/            # Configuration files
│   └── 📂 routes/            # Application routes
├── 📂 contracts/             # Smart contracts
├── 📂 scripts/               # Deployment & utility scripts
│   ├── 📂 deployment/        # Contract deployment scripts
│   ├── 📂 testing/           # Test scripts
│   ├── 📂 utilities/         # Utility scripts
│   ├── 📂 balance-check/     # Balance checking tools
│   └── 📂 token-utilities/   # Token management tools
├── 📂 docs/                  # Documentation
│   ├── 📂 deployment/        # Deployment guides
│   ├── 📂 testing/           # Testing documentation
│   └── 📂 configuration/     # Configuration guides
├── 📂 test/                  # Test files
├── 📂 backend/               # Backend services
├── 📂 deployment-data/       # Deployment configuration files
├── 📂 logs/                  # Log files
└── 📂 examples/              # Code examples
```

## ✨ Features

- **🔄 Dynamic Contract Configuration**: Easy contract switching via UI or environment variables
- **💰 Multi-Asset Staking**: Stake CORE, coreBTC, and other Core DAO assets
- **🤖 Automated Rebalancing**: Smart contracts automatically optimize your portfolio
- **🏛️ Governance System**: Vote on protocol decisions and earn rewards
- **💧 Liquid Staking**: Get stCORE tokens representing your staked CORE
- **📊 Real-time Analytics**: Track performance and yields
- **🏥 Contract Health Monitoring**: Real-time contract validation

## 🏗️ Architecture

The platform consists of:
- **StakeBasket**: Main ETF contract
- **StakingManager**: Handles external staking protocols
- **BasketGovernance**: Decentralized governance system
- **PriceFeed**: Oracle integration for asset pricing
- **Dynamic Contract Store**: Flexible contract configuration system

## 📚 Documentation

| Directory | Description |
|-----------|-------------|
| `docs/configuration/` | Contract configuration guides |
| `docs/deployment/` | Deployment instructions |
| `docs/testing/` | Testing guides and results |
| `docs/` | General project documentation |

### Key Documents
- 📋 `docs/configuration/CONTRACT_CONFIGURATION.md` - Easy contract configuration guide
- 🚀 `docs/deployment/COREDAO_DEPLOYMENT_GUIDE.md` - CoreDAO deployment guide
- 🧪 `docs/testing/TESTING_GUIDE.md` - Testing instructions
- 📊 `docs/PROJECT_STRUCTURE.md` - Detailed project structure

## 🛠️ Development

### Contract Configuration
The project now supports easy contract configuration:

```bash
# Via environment variables
VITE_STAKE_BASKET_ADDRESS=0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422
VITE_DUAL_STAKING_ADDRESS=0xf4B146FbA71F41E0592668ffbF264F1D186b2Ca8
```

Or use the Contract Settings UI in any page to configure visually.

### Testing
```bash
# Run frontend tests
npm test

# Deploy and test contracts locally
node scripts/deployment/deploy-complete-system.cjs

# Test specific functionality
node scripts/testing/legacy/test-dual-staking.cjs
```

### Deployment
```bash
# Deploy to testnet
node scripts/deploy-testnet.cjs

# Deploy dual staking
node scripts/deploy-dual-staking.cjs
```

## 🔧 Scripts Directory

| Directory | Purpose |
|-----------|---------|
| `scripts/deployment/` | Contract deployment scripts |
| `scripts/testing/` | Testing and validation scripts |
| `scripts/utilities/` | Debug and utility tools |
| `scripts/balance-check/` | Balance checking tools |
| `scripts/token-utilities/` | Token management utilities |

## 🏥 Health Monitoring

The platform includes built-in contract health monitoring:
- Real-time contract deployment checking
- Network connectivity validation
- Visual health indicators in dashboard
- Automatic environment variable detection

## 🌐 Network Configuration

### Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Hardhat Local | 31337 | ✅ Ready |
| Core Testnet2 | 1114 | ✅ Ready |
| Core Mainnet | 1116 | 🎯 Target |

### Contract Addresses

**Core Testnet2 (Chain ID: 1114)**:
- StakeBasket: 0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422
- StakeBasketToken: 0x65507FCcfe3daE3cfb456Eb257a2eaefd463336B
- StakingManager: 0x4dE3513095f841b06A01CC3FFd5C25b1dfb69019
- CoreOracle: 0xf630BC778a0030dd658F116b40cB23B4dd37051E

*See `src/config/contracts.ts` for complete address configuration.*

## 🔧 Backend Services (Optional)

The StakeBasket backend provides enterprise-grade monitoring, automation, and operational intelligence. See `backend/` directory for setup instructions.

## 🛡️ Security

- **Audited Dependencies**: Using OpenZeppelin battle-tested contracts
- **Reentrancy Protection**: Safeguards on all critical functions
- **Access Control**: Proper permission management
- **Price Feed Validation**: Oracle manipulation resistance
- **Comprehensive Testing**: Extensive test coverage
- **Contract Health Monitoring**: Real-time validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the scripts in `scripts/testing/`
5. Submit a pull request

## 📝 License

MIT

---

## Legacy Information

This README has been reorganized for better navigation. For the complete original documentation including detailed feature descriptions and roadmap, see the individual files in the `docs/` directory.

Key legacy features:
- Multi-asset staking ETF for CORE and lstBTC
- Automated yield optimization and rebalancing
- Professional-grade backend services
- Integration with CoreDAO's Satoshi Plus consensus
- Comprehensive testing suite and documentation