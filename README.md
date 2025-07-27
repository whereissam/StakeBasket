# StakeBasket

**A multi-asset staking ETF platform on Core blockchain for CORE and lstBTC yield optimization.**

StakeBasket is a decentralized ETF (Exchange-Traded Fund) that allows users to deposit assets and automatically receive exposure to optimized staking strategies across the Core blockchain ecosystem. Users deposit native CORE tokens and receive BASKET tokens representing their proportional share of the fund's diversified staking portfolio.

![](https://i.imgur.com/1KEKVst.png)

## 🎯 Features

### Core ETF Functionality
- 💰 **Multi-Asset ETF** - Diversified exposure to CORE and lstBTC staking
- 🔄 **Automatic Rebalancing** - Optimized allocation across staking strategies
- 📈 **NAV Tracking** - Real-time net asset value calculations
- 🎯 **Yield Optimization** - Maximized returns through professional management
- 🔒 **Secure Architecture** - Battle-tested smart contracts with comprehensive testing

### Staking Strategies
- ⚡️ **CORE Staking** - Delegate to validators with 8% APY target
- 🚀 **lstBTC Integration** - Liquid staked Bitcoin with auto-compounding
- 🔄 **Dynamic Allocation** - Responsive to market conditions and yields
- 📊 **Performance Tracking** - Transparent reporting of strategy performance

### User Experience
- 🎨 **Modern UI** - Clean, intuitive interface built with React + TypeScript
- 🌙 **Dark/Light Mode** - Customizable theme preferences
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🔌 **Multi-Wallet Support** - Compatible with MetaMask, WalletConnect, and more
- 💫 **Real-time Updates** - Live portfolio values and transaction status

## 🚀 Quick Start

### For Users (Frontend Only)

1. **Visit the Application**:
   ```bash
   # Start the application
   npm install
   npm run dev
   ```

2. **Connect Your Wallet**:
   - Install MetaMask or your preferred Web3 wallet
   - Connect to Core Testnet2 (Chain ID: 1114)
   - Start depositing native CORE tokens and earning yield!

### For Developers (Full Setup)

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd stakebasket
   npm install
   ```

2. **Local Development Environment**:
   ```bash
   # Terminal 1: Start Hardhat local network
   npx hardhat node
   
   # Terminal 2: Deploy contracts with mocks
   node scripts/deploy-with-mocks.cjs
   
   # Terminal 3: Start frontend
   npm run dev
   
   # Terminal 4 (Optional): Start backend services
   cd backend && bun install && bun run dev
   ```

3. **Access the Application**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`
   - Local blockchain: `http://127.0.0.1:8545`
   - Chain ID: `31337` (Hardhat local)

## 📁 Project Structure

```
stakebasket/
├── 📄 README.md                    # This file
├── 📄 PROJECT_STRUCTURE.md        # Detailed structure overview
├── 📁 docs/                       # Documentation
├── 📁 contracts/                  # Smart contracts
├── 📁 src/                        # Frontend React app
├── 📁 test/                       # Comprehensive test suite
├── 📁 scripts/                    # Deployment scripts
├── 📁 backend/                    # Backend services and automation
├── 📁 config-files/               # Configuration files
└── 📁 artifacts/                  # Compiled contract artifacts
```

**👀 See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed folder organization.**

## 🧪 Testing

### Run Comprehensive Tests

#### Smart Contract Tests
```bash
# Basic ETF functionality
npx hardhat run test/SimpleETFTest.cjs --network localhost

# Complete system test
npx hardhat run test/FinalETFTest.cjs --network localhost

# All integration tests
npx hardhat run test/FullIntegration.test.cjs --network localhost
```

#### Backend Service Tests
```bash
cd backend

# Test all backend services
bun run test/test-backend.ts

# Test automation systems
bun run test/test-automation.ts

# Test specific endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/monitoring/metrics
```

### Test Results
- ✅ **Token Faucets** - Working correctly
- ✅ **ETF Deposits/Withdrawals** - Full functionality verified
- ✅ **NAV Calculations** - Accurate and real-time
- ✅ **Staking Rewards** - Simulation and distribution working
- ✅ **Multi-User Scenarios** - Fair value distribution
- ✅ **Frontend Integration** - Complete UI/contract integration

**📊 See [docs/ETF_TEST_RESULTS.md](./docs/ETF_TEST_RESULTS.md) for detailed test results.**

## 🏗️ Technology Stack

### Smart Contracts
- **Solidity 0.8.20** - Smart contract development
- **Hardhat** - Development and testing framework
- **OpenZeppelin** - Security-audited contract libraries
- **Core Blockchain** - Target deployment network

### Frontend
- **React 19** - Modern UI library with latest features
- **TypeScript** - Type safety and developer experience
- **Vite** - Lightning-fast build tool and dev server
- **TailwindCSS v4** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful, accessible components
- **Zustand** - Lightweight state management

### Backend Services
- **Bun** - Fast JavaScript runtime and package manager
- **Hono** - Lightweight, fast web framework
- **Node-cron** - Automated task scheduling
- **WebSocket** - Real-time data streaming
- **Viem** - Blockchain client for contract interaction

### Web3 Integration
- **Wagmi** - React hooks for Core/Ethereum
- **Viem** - Type-safe blockchain client
- **RainbowKit** - Wallet connection interface
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Server state management
- **Sonner** - Toast notifications for user feedback

## 📋 Available Scripts

```bash
# Frontend Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run code quality checks

# Backend Services
cd backend
bun install          # Install backend dependencies
bun run dev          # Start backend with hot reload
bun run start        # Start backend in production
bun run build        # Build backend for production

# Blockchain
npx hardhat node     # Start local blockchain
npx hardhat compile  # Compile smart contracts
npx hardhat test     # Run smart contract tests
```

## 🌐 Network Configuration

### Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Hardhat Local | 31337 | ✅ Ready |
| Core Testnet2 | 1114 | ✅ Deployed |
| Core Mainnet | 1116 | 🎯 Target |

### Contract Addresses

**Core Testnet2 (Chain ID: 1114)**:
- StakeBasket: `0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422`
- StakeBasketToken: `0x65507FCcfe3daE3cfb456Eb257a2eaefd463336B`
- StakingManager: `0x4dE3513095f841b06A01CC3FFd5C25b1dfb69019`
- CoreOracle: `0xf630BC778a0030dd658F116b40cB23B4dd37051E`

**Local Development (Hardhat)**:
- StakeBasket: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- StakeBasketToken: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- StakingManager: `0x0165878A594ca255338adfa4d48449f69242Eb8F`

*See [src/config/contracts.ts](./src/config/contracts.ts) for complete address configuration.*

## 🔧 Backend Services (Optional)

The StakeBasket backend provides enterprise-grade monitoring, automation, and operational intelligence. **The ETF works without the backend**, but it adds professional fund management capabilities.

### What the Backend Provides

#### 🤖 **Automated Operations**
- **Auto-Rebalancing** - Maintains target portfolio allocation (60% CORE, 40% lstBTC)
- **Liquidity Management** - Ensures optimal liquidity ratios for redemptions
- **Dynamic Fee Adjustment** - Responds to market volatility automatically
- **Risk Management** - Automated emergency responses and risk mitigation

#### 📊 **Real-time Monitoring**
- **Contract Metrics** - Live AUM, NAV, performance tracking
- **Validator Performance** - Core network validator monitoring and scoring
- **Price Feed Health** - Oracle reliability and freshness monitoring
- **Alert System** - Intelligent alerts with categorization and cooldowns

#### 🌐 **API Services**
- **REST Endpoints** - `/api/monitoring`, `/api/alerts`, `/api/automation`
- **WebSocket Streaming** - Real-time data updates at `ws://localhost:8080`
- **Core Integration** - Direct Core blockchain API integration
- **Management Interface** - Administrative controls and configurations

### Backend Setup

#### Prerequisites
```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash
```

#### Quick Start
```bash
cd backend
bun install
bun run dev          # Starts on http://localhost:3001
```

#### Environment Configuration
```bash
# Create backend/.env (optional for enhanced features)
CORE_API_KEY=your_core_api_key                    # For Core API integration
AUTOMATION_PRIVATE_KEY=0x...                      # For automated transactions
ORACLE_CONTRACT_ADDRESS=0x...                     # For oracle updates
```

#### API Endpoints
```bash
# Health & Status
GET  /health                                       # Service health check
GET  /api/monitoring/status                        # System status

# Monitoring
GET  /api/monitoring/metrics                       # Current contract metrics
GET  /api/monitoring/prices                        # Price feed data
GET  /api/monitoring/events                        # Recent contract events

# Alerts
GET  /api/alerts                                   # List active alerts
GET  /api/alerts/stats                             # Alert statistics
PATCH /api/alerts/:id/acknowledge                  # Acknowledge alert

# Automation
GET  /api/automation/tasks                         # List automation tasks
PATCH /api/automation/tasks/:id/toggle             # Enable/disable automation
GET  /api/automation/rebalancing/strategy          # Get rebalancing config

# Validators
GET  /api/validators                               # Core validator metrics
GET  /api/validators/top/10                        # Top 10 validators
GET  /api/validators/performance/summary           # Performance overview
```

### Backend Testing
```bash
# Comprehensive backend tests
bun run test/test-backend.ts

# Test automation engine
bun run test/test-automation.ts

# Test API endpoints manually
curl http://localhost:3001/health
curl http://localhost:3001/api/monitoring/metrics
curl http://localhost:3001/api/validators/top/5
```

### Integration with Frontend
The backend automatically enhances the frontend when running:
- Real-time metrics via WebSocket connections
- Enhanced monitoring dashboards
- Professional-grade analytics and insights
- Automated operational status updates

## 📚 Documentation

- **[Local Testing Guide](./docs/LOCAL_TESTING.md)** - Complete local development workflow
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Test Results](./docs/ETF_TEST_RESULTS.md)** - Comprehensive testing documentation
- **[Project Structure](./PROJECT_STRUCTURE.md)** - Detailed codebase organization

## 🛡️ Security

- **Audited Dependencies** - Using OpenZeppelin battle-tested contracts
- **Reentrancy Protection** - SafeGuards on all critical functions
- **Access Control** - Proper permission management
- **Price Feed Validation** - Oracle manipulation resistance
- **Comprehensive Testing** - 100% test coverage on critical paths

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [Coming Soon]
- **Documentation**: [/docs](./docs/)
- **Core Blockchain**: [https://coredao.org/](https://coredao.org/)
- **Discord**: [Join our community]

---

**Built with ❤️ for the Core blockchain ecosystem**

*StakeBasket - Simplifying DeFi yield farming through professional ETF management*