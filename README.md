# StakeBasket - Multi-Asset Staking ETF Platform

A decentralized ETF platform for staking multiple Core DAO assets with automated rebalancing and governance features.

## 🌐 Live Deployment

**🧪 Core Testnet2 (Chain ID: 1114)** - **LIVE NOW!**

- **StakeBasket ETF**: [`0x13F8b7693445c180Ec11f211d9Af425920B795Af`](https://scan.test2.btcs.network/address/0x13F8b7693445c180Ec11f211d9Af425920B795Af)
- **Governance**: [`0x43e9E9f5DA3dF1e0E0659be7E321e9397E41aa8e`](https://scan.test2.btcs.network/address/0x43e9E9f5DA3dF1e0E0659be7E321e9397E41aa8e)
- **Liquid Staking**: [`0x0925Df2ae2eC60f0abFF0e7E4dCA6f4B16351c0E`](https://scan.test2.btcs.network/address/0x0925Df2ae2eC60f0abFF0e7E4dCA6f4B16351c0E)
- **Dual Staking**: [`0x0C9A264bA0c35e327ae0CdB4507F2D6142BD8a3f`](https://scan.test2.btcs.network/address/0x0C9A264bA0c35e327ae0CdB4507F2D6142BD8a3f)

**🎯 Try It Now:**
1. Add Core Testnet2 to MetaMask (Chain ID: 1114, RPC: `https://rpc.test2.btcs.network`)
2. Get testnet CORE from [Core Faucet](https://scan.test2.btcs.network/faucet)
3. Visit the app and start staking!

## 🚀 Getting Started

For a comprehensive guide on how to get started with StakeBasket development, please see the [Developer Guide](DEVELOPER_GUIDE.md).

## ✨ Features

- **🔄 Dynamic Contract Configuration**: Easy contract switching via UI or environment variables
- **💰 Multi-Asset Staking**: Stake CORE, coreBTC, and other Core DAO assets
- **🤖 Automated Rebalancing**: Smart contracts automatically optimize your portfolio
- **🏛️ Governance System**: Vote on protocol decisions and earn rewards
- **💧 Liquid Staking**: Get stCORE tokens representing your staked CORE
- **📊 Real-time Analytics**: Track performance and yields
- **🏥 Contract Health Monitoring**: Real-time contract validation

## 🏗️ Architecture

StakeBasket is a comprehensive DeFi ecosystem built on Core DAO featuring:

### Core Components
- **StakeBasket ETF**: Multi-asset staking with automated rebalancing
- **Governance System**: BASKET token-based DAO with tiered voting
- **Liquid Staking**: Stake CORE → get stCORE liquid tokens
- **Dual Staking**: Optimized CORE:BTC ratio strategies
- **Price Oracles**: Real-time asset pricing with circuit breakers

### Smart Contract Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Governance    │    │   Liquid        │    │   Multi-Asset   │
│   System        │    │   Staking       │    │   ETF           │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ BasketGovernance│    │ CoreLiquidMgr   │    │ StakeBasket     │
│ BasketStaking   │────│ StCoreToken     │────│ StakingManager  │
│ BasketToken     │    │ UnbondingQueue  │    │ DualStakingETF  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                            ┌─────────────────┐
                            │   Infrastructure │
                            ├─────────────────┤
                            │ PriceFeed       │
                            │ Mock Contracts  │
                            │ Testing Suite   │
                            └─────────────────┘
```

## 💰 Staking Tiers & Benefits

| Tier | BASKET Required | Fee Discount | Voting Power | Annual Rewards |
|------|----------------|--------------|--------------|----------------|
| 🥉 **Bronze** | 100 | 5% | 1.0x | Protocol fees |
| 🥈 **Silver** | 1,000 | 10% | 1.1x | + Bonus rewards |
| 🥇 **Gold** | 10,000 | 25% | 1.25x | + Premium APY |
| 💎 **Platinum** | 100,000 | 50% | 1.5x | + VIP benefits |

## 🚀 Quick Start

### For Users
1. **Connect Wallet** → MetaMask to Core Testnet2
2. **Get CORE** → [Core Faucet](https://scan.test2.btcs.network/faucet)
3. **Get Test Tokens** → Visit `/faucet` route in the app
4. **Start Staking** → Deposit CORE → Earn BASKET

### For Developers
```bash
# Clone repository
git clone https://github.com/your-repo/staking
cd staking

# Install dependencies
npm install
cd backend && npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start development
npm run dev          # Frontend (http://localhost:5173)
cd backend && npm start  # Backend (http://localhost:3001)

# Deploy contracts
npx hardhat run scripts/deployment/deploy-complete-system.cjs --network coreTestnet2
```

## 📊 Yield Sources

1. **🏆 CORE Staking Rewards**: ~8% APY from validator delegation
2. **🪙 lstBTC Yield**: Bitcoin liquid staking rewards  
3. **⚡ Dual Staking Bonuses**: Up to 50% bonus for optimal ratios
4. **🎯 Fee Optimization**: Tiered discounts reduce costs
5. **🤖 Auto-Rebalancing**: Continuous yield maximization

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **TanStack Router** for routing
- **Wagmi v2** for Web3 integration
- **Viem** for Ethereum interactions
- **Tailwind CSS** for styling
- **Shadcn/ui** components

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Ethers.js** for blockchain interaction
- **JWT** authentication
- **RESTful API** architecture

### Smart Contracts
- **Solidity 0.8.20+**
- **Hardhat** development framework
- **OpenZeppelin** security standards
- **Comprehensive test suite**
- **Gas optimized**

### Infrastructure
- **Core DAO Testnet2** deployment
- **IPFS** for decentralized storage
- **Chainlink** price feeds integration
- **Multi-signature** governance

## 🧪 Testing

### Contract Testing
```bash
# Run all tests
npx hardhat test

# Run specific test suite
npx hardhat test test/StakeBasket.test.cjs
npx hardhat test test/Governance.test.cjs

# Coverage report
npx hardhat coverage
```

### Frontend Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

## 🔐 Security

- ✅ **ReentrancyGuard** on all state-changing functions
- ✅ **Access Control** with role-based permissions  
- ✅ **Circuit Breakers** for price deviation protection
- ✅ **Timelock** governance with execution delays
- ✅ **Pausable** emergency stop functionality
- ✅ **Comprehensive Auditing** and testing

## 🌍 Network Support

| Network | Status | Chain ID | RPC |
|---------|--------|----------|-----|
| **Core Testnet2** | ✅ Live | 1114 | `https://rpc.test2.btcs.network` |
| **Core Mainnet** | 🚧 Coming Soon | 1116 | `https://rpc.coredao.org` |
| **Hardhat Local** | ✅ Development | 31337 | `http://127.0.0.1:8545` |

## 📈 Roadmap

### Phase 1: Core ETF ✅ **COMPLETED**
- [x] Multi-asset staking (CORE + lstBTC)
- [x] Automated rebalancing
- [x] Price feed integration
- [x] Basic governance

### Phase 2: Advanced Features ✅ **COMPLETED**  
- [x] Tiered staking rewards
- [x] Liquid staking (stCORE)
- [x] Dual staking optimization
- [x] Enhanced governance

### Phase 3: Ecosystem Expansion 🚧 **IN PROGRESS**
- [ ] Additional asset support (stETH, wBTC)
- [ ] Cross-chain integration
- [ ] Advanced trading strategies
- [ ] Mobile app

### Phase 4: Mainnet & Scale 🎯 **PLANNED**
- [ ] Core Mainnet deployment
- [ ] Security audits
- [ ] Liquidity mining programs
- [ ] Institutional partnerships

## 🏆 Key Features

### 🎯 For Stakers
- **Low Gas Fees**: Built on Core DAO
- **Auto-Compounding**: Rewards automatically reinvested
- **Flexible Withdrawals**: 7-day unstaking period
- **Risk Management**: Diversified validator selection

### 🏛️ For DAO Members  
- **Governance Rights**: Vote on protocol changes
- **Fee Sharing**: Earn from protocol revenue
- **Strategy Input**: Propose new yield strategies
- **Treasury Access**: Community-controlled funds

### 🔧 For Developers
- **Open Source**: MIT licensed, contribute freely
- **Well Documented**: Comprehensive guides and APIs
- **Modular Design**: Easy to extend and integrate
- **Testing Suite**: Robust testing framework

## 📞 Community & Support

- **🐦 Twitter**: [@StakeBasket](https://twitter.com/stakebasket)
- **💬 Discord**: [Join Community](https://discord.gg/stakebasket)
- **📧 Email**: team@stakebasket.fi
- **📖 Docs**: [Documentation Site](https://docs.stakebasket.fi)
- **🐛 Issues**: [GitHub Issues](https://github.com/your-repo/staking/issues)

## 📚 Documentation

For detailed documentation, please see:
- [Developer Guide](DEVELOPER_GUIDE.md) - Setup and development
- [API Documentation](API3_INTEGRATION_GUIDE.md) - Backend APIs
- [Contract Architecture](contracts/README.md) - Smart contract details
- [Project Structure](PROJECT_STRUCTURE.md) - Codebase organization

## 🤝 Contributing

We welcome contributions from the community! 

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

See [Developer Guide](DEVELOPER_GUIDE.md) for detailed contribution guidelines.

## ⚖️ Legal

This project is for educational and research purposes. Smart contracts are experimental technology. Use at your own risk. See [full disclaimer](LEGAL.md).

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Core DAO ecosystem**

*StakeBasket represents the future of DeFi on Core DAO - combining the security of Bitcoin with the innovation of Ethereum DeFi.*
