# StakeBasket

**A multi-asset staking ETF platform on Core blockchain for CORE and lstBTC yield optimization.**

StakeBasket is a decentralized ETF (Exchange-Traded Fund) that allows users to deposit assets and automatically receive exposure to optimized staking strategies across the Core blockchain ecosystem. Users deposit native CORE tokens and receive BASKET tokens representing their proportional share of the fund's diversified staking portfolio.

## The CoreDAO DeFi Challenge

As the CoreDAO ecosystem grows, users face increasing complexity in identifying and managing optimal staking strategies for assets like CORE and lstBTC. This often leads to:

  * **Liquidity Fragmentation:** Suboptimal capital efficiency due to assets being spread across various staking protocols.
  * **High Complexity:** A deep understanding of DeFi mechanics and constant monitoring is required, creating a disjointed and time-consuming experience.
  * **Suboptimal Yields:** Manual management of multiple assets (native CORE staking and lstBTC) for yield optimization is challenging, leading to missed opportunities for maximized returns.

## Our Solution: StakeBasket

StakeBasket simplifies DeFi yield farming by providing a professionally managed, ETF-like solution on CoreDAO. We offer:

  * **Multi-Asset Staking ETF:** Diversified, optimized exposure to CORE and lstBTC staking yields through a single, liquid token (BASKET).
  * **Automated Yield Optimization:** Intelligent allocation and rebalancing across best-performing staking strategies within the CoreDAO ecosystem.
  * **Simplified DeFi Access:** Abstracting complex yield farming mechanics into a user-friendly, set-and-forget experience.
  * **Enhanced Capital Efficiency:** Maximizing returns by dynamically deploying capital across high-yield opportunities.

## How StakeBasket Works

StakeBasket streamlines the process of diversified staking and yield optimization. Users deposit native CORE and/or lstBTC into the StakeBasket smart contract and, in return, receive BASKET tokens, representing their proportional share of the underlying diversified fund. The StakeBasket smart contracts, managed by the StakingManager, automatically deploy these deposited assets into optimized staking strategies for CORE (delegation) and lstBTC (liquid staking platforms). Our optional backend services (or future decentralized automation) continuously monitor market conditions and validator performance, automatically rebalancing the portfolio to maximize yield and manage risk. Yields generated from the underlying strategies are compounded back into the fund, increasing the Net Asset Value (NAV) of each BASKET token over time. Users can redeem their BASKET tokens at any time to withdraw their share of the fund, including accumulated yields.

## Our Competitive Edge on CoreDAO

StakeBasket is positioned to be a leading solution for yield optimization within the CoreDAO ecosystem due to several key advantages:
  * **The First Multi-Asset Staking ETF on CoreDAO:** Pioneering a new standard for diversified, hands-off yield optimization specifically tailored for the CoreDAO blockchain.
  * **Optimized Exposure to CoreDAO Bluechips:** Directly connects users to the highest-performing staking opportunities for CORE and lstBTC without manual management.
  * **Professional-Grade Automation:** Our robust backend provides enterprise-level rebalancing, real-time monitoring, and risk management for superior fund performance.
  * **Enhanced Capital Efficiency:** Consolidates multiple staking positions into a single, liquid BASKET token, simplifying portfolio management and maximizing overall returns.
  * **Robust Security & Transparency:** Built with battle-tested OpenZeppelin contracts and comprehensive testing, ensuring a secure and verifiable investment vehicle.
  * **Seamless User Experience:** A modern, intuitive UI coupled with multi-wallet support makes DeFi yield farming accessible to a broader audience on CoreDAO.

## Why Now? The CoreDAO Opportunity

The timing is critical for StakeBasket on CoreDAO:
  * **Growing CoreDAO DeFi Ecosystem:** The CoreDAO blockchain's DeFi ecosystem is experiencing significant growth in TVL and user adoption, creating a ripe environment for advanced financial primitives like ETFs.
  * **Evolving Staking Landscape:** As restaking derivatives and diverse yield opportunities emerge on CoreDAO, users will increasingly seek simplified, optimized exposure rather than managing individual positions.
  * **Demand for lstBTC Optimization:** The rising prominence of liquid staked Bitcoin (lstBTC) on CoreDAO creates a clear demand for integrated solutions that can effectively manage and optimize yield for these multi-chain assets.
  * **Accessibility for All:** As CoreDAO solidifies its position, there is a growing need for user-friendly DeFi entry points that abstract complexity and offer professional-grade asset management to a wider audience.

-----

## Core Functionality

### Core ETF Mechanics
  * **Multi-Asset ETF** - Diversified exposure to CORE and lstBTC staking. Users benefit from broad market exposure to key CoreDAO assets through a single investment.
  * **Automatic Rebalancing** - Optimized allocation across staking strategies. The fund intelligently adjusts its holdings to maintain target proportions or capitalize on yield opportunities without user intervention.
  * **NAV Tracking** - Real-time Net Asset Value calculations. Users can instantly see the current value of their BASKET tokens, reflecting the combined performance of the underlying assets and accrued yields.
  * **Yield Optimization** - Maximized returns through professional management. StakeBasket actively seeks and allocates capital to the highest-yielding, vetted strategies available within the CoreDAO ecosystem.
  * **Secure Architecture** - Battle-tested smart contracts with comprehensive testing. We prioritize security, building on audited libraries and conducting extensive internal tests to safeguard user funds.

### Current Staking Strategies Supported
  * **CORE Staking** - Delegate to validators with 8% APY target. StakeBasket automates the process of delegating CORE to reliable, high-performing validators, optimizing staking rewards.
  * **lstBTC Integration** - Liquid staked Bitcoin with auto-compounding. Users gain exposure to yield from liquid staked Bitcoin (lstBTC) assets, with rewards automatically reinvested to maximize compounding effects.
  * **Dynamic Allocation** - Responsive to market conditions and yields. The system dynamically reallocates funds to strategies offering the best risk-adjusted returns, adapting to changing market dynamics.
  * **Performance Tracking** - Transparent reporting of strategy performance. All underlying strategy performance is recorded and made accessible, ensuring full transparency for users.

## 🚀 Quick Start

### For Users (Frontend Only)

To get started with StakeBasket, users can simply:

1.  **Visit the Application**: Start the application using `npm install` followed by `npm run dev`.
2.  **Connect Your Wallet**: Install MetaMask or your preferred Web3 wallet, then connect to Core Testnet2 (Chain ID: 1114). From there, you can begin depositing native CORE tokens and earning yield\!

### For Developers (Full Setup)

For a full development environment setup:

1.  **Clone and Install**: `git clone <repository-url>` and `cd stakebasket && npm install`.
2.  **Local Development Environment**:
      * In Terminal 1, start the Hardhat local network: `npx hardhat node`.
      * In Terminal 2, deploy contracts with mocks: `node scripts/deploy-with-mocks.cjs`.
      * In Terminal 3, start the frontend: `npm run dev`.
      * (Optional) In Terminal 4, start backend services: `cd backend && bun install && bun run dev`.
3.  **Access the Application**:
      * Frontend: `http://localhost:5173`
      * Backend API: `http://localhost:3001`
      * Local blockchain: `http://127.0.0.1:8545` (Chain ID: `31337` for Hardhat local)

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

**👀 See [PROJECT\_STRUCTURE.md](https://www.google.com/search?q=./PROJECT_STRUCTURE.md) for detailed folder organization.**

## 🧪 Testing

### Run Comprehensive Tests

To run comprehensive tests for StakeBasket:

#### Smart Contract Tests

  * **Basic ETF functionality**: `npx hardhat run test/SimpleETFTest.cjs --network localhost`
  * **Complete system test**: `npx hardhat run test/FinalETFTest.cjs --network localhost`
  * **All integration tests**: `npx hardhat run test/FullIntegration.test.cjs --network localhost`

#### Backend Service Tests

From the `backend` directory:

  * **Test all backend services**: `bun run test/test-backend.ts`
  * **Test automation systems**: `bun run test/test-automation.ts`
  * **Test specific endpoints**: Use `curl http://localhost:3001/health`, `curl http://localhost:3001/api/monitoring/metrics`, etc.

### Test Results

  * ✅ **Token Faucets** - Working correctly
  * ✅ **ETF Deposits/Withdrawals** - Full functionality verified
  * ✅ **NAV Calculations** - Accurate and real-time
  * ✅ **Staking Rewards** - Simulation and distribution working
  * ✅ **Multi-User Scenarios** - Fair value distribution
  * ✅ **Frontend Integration** - Complete UI/contract integration

**📊 See [docs/ETF\_TEST\_RESULTS.md](https://www.google.com/search?q=./docs/ETF_TEST_RESULTS.md) for detailed test results.**

## 📋 Available Scripts

To manage the StakeBasket project:

  * **Frontend Development**:
      * `npm run dev` - Start development server
      * `npm run build` - Build for production
      * `npm run preview` - Preview production build
      * `npm run lint` - Run code quality checks
  * **Backend Services** (from `backend` directory):
      * `bun install` - Install backend dependencies
      * `bun run dev` - Start backend with hot reload
      * `bun run start` - Start backend in production
      * `bun run build` - Build backend for production
  * **Blockchain**:
      * `npx hardhat node` - Start local blockchain
      * `npx hardhat compile` - Compile smart contracts
      * `npx hardhat test` - Run smart contract tests

## 🌐 Network Configuration

### Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Hardhat Local | 31337 | ✅ Ready |
| Core Testnet2 | 1114 | ✅ Deployed |
| Core Mainnet | 1116 | 🎯 Target |

### Contract Addresses

**Core Testnet2 (Chain ID: 1114)**:

  * StakeBasket: `0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422`
  * StakeBasketToken: `0x65507FCcfe3daE3cfb456Eb257a2eaefd463336B`
  * StakingManager: `0x4dE3513095f841b06A01CC3FFd5C25b1dfb69019`
  * CoreOracle: `0xf630BC778a0030dd658F116b40cB23B4dd37051E`

**Local Development (Hardhat)**:

  * StakeBasket: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
  * StakeBasketToken: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
  * StakingManager: `0x0165878A594ca255338adfa4d48449f69242Eb8F`

*See [src/config/contracts.ts](https://www.google.com/search?q=./src/config/contracts.ts) for complete address configuration.*

## 🔧 Backend Services (Optional)

The StakeBasket backend provides enterprise-grade monitoring, automation, and operational intelligence. While the ETF functions without the backend, these services add professional fund management capabilities.

### What the Backend Provides

#### 🤖 **Automated Operations**

  * **Auto-Rebalancing** - Maintains target portfolio allocation (60% CORE, 40% lstBTC). The system intelligently adjusts asset distribution to optimize returns and risk.
  * **Liquidity Management** - Ensures optimal liquidity ratios for redemptions, guaranteeing users can always withdraw their funds efficiently.
  * **Dynamic Fee Adjustment** - Responds to market volatility automatically. Fees can be calibrated to market conditions for optimal protocol health.
  * **Risk Management** - Automated emergency responses and risk mitigation. Proactive measures to protect funds during unforeseen market events or protocol issues.

#### 📊 **Real-time Monitoring**

  * **Contract Metrics** - Live AUM, NAV, performance tracking. Comprehensive data on fund health and performance.
  * **Validator Performance** - Core network validator monitoring and scoring. Ensures CORE is delegated to reliable and high-performing validators.
  * **Price Feed Health** - Oracle reliability and freshness monitoring. Crucial for accurate NAV calculations and rebalancing decisions.
  * **Alert System** - Intelligent alerts with categorization and cooldowns. Provides timely notifications for critical events.

#### 🌐 **API Services**

  * **REST Endpoints** - `/api/monitoring`, `/api/alerts`, `/api/automation`. Standardized API for interacting with backend data.
  * **WebSocket Streaming** - Real-time data updates at `ws://localhost:8080`. Provides live insights for a dynamic user experience.
  * **Core Integration** - Direct Core blockchain API integration. Seamless interaction with the CoreDAO network.
  * **Management Interface** - Administrative controls and configurations. Tools for managing fund parameters and operations.

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

  * Real-time metrics via WebSocket connections
  * Enhanced monitoring dashboards
  * Professional-grade analytics and insights
  * Automated operational status updates

## 📚 Documentation

  * **[Local Testing Guide](https://www.google.com/search?q=./docs/LOCAL_TESTING.md)** - Complete local development workflow
  * **[Deployment Guide](https://www.google.com/search?q=./docs/DEPLOYMENT.md)** - Production deployment instructions
  * **[Test Results](https://www.google.com/search?q=./docs/ETF_TEST_RESULTS.md)** - Comprehensive testing documentation
  * **[Project Structure](https://www.google.com/search?q=./PROJECT_STRUCTURE.md)** - Detailed codebase organization

## 🛡️ Security

  * **Audited Dependencies** - Using OpenZeppelin battle-tested contracts. Leveraging industry-standard, battle-tested libraries for core contract functionality.
  * **Reentrancy Protection** - SafeGuards on all critical functions. Implementing best practices to prevent common smart contract vulnerabilities.
  * **Access Control** - Proper permission management. Strict control over who can perform sensitive operations within the protocol.
  * **Price Feed Validation** - Oracle manipulation resistance. Robust mechanisms to ensure the integrity and accuracy of price data.
  * **Comprehensive Testing** - 100% test coverage on critical paths. Extensive testing to ensure the reliability and security of all smart contract interactions.

## 🤝 Contributing

We welcome contributions\! To get started:

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/amazing-feature`.
3.  Commit your changes: `git commit -m 'Add amazing feature'`.
4.  Push to the branch: `git push origin feature/amazing-feature`.
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License 

## 🔗 Links
  * **Website**: [Coming Soon]
  * **Documentation**: [/docs](https://www.google.com/search?q=./docs/)
  * **Core Blockchain**: [https://coredao.org/](https://coredao.org/)

## 🛣️ Future Roadmap & Enhancements

This section outlines potential enhancements for StakeBasket, designed to deepen its integration with the CoreDAO EVM ecosystem and expand its utility.

### **I. Expanded EVM-Native Staking Strategies**

  * **CoreDAO DeFi LP Staking Integration:** Implement strategies to participate in high-yield liquidity pools on prominent CoreDAO decentralized exchanges (DEXs). This would allow StakeBasket to earn trading fees and liquidity incentives from pairs like CORE/USDT, CORE/ETH, or lstBTC/CORE, diversifying yield sources beyond pure staking.
  * **LRT/LSD Integration for CORE:** As the CoreDAO ecosystem matures, integrate with any emerging Liquid Restaking Tokens (LRTs) or new Liquid Staking Derivatives (LSDs) specifically designed for CORE. This would enable StakeBasket to access more complex and potentially higher-yielding DeFi primitives, reflecting the evolving landscape of CoreDAO's staking derivatives.
  * **Yield Aggregator Composability:** Explore integration with existing or future yield aggregation protocols on CoreDAO. By composing with other vaults, StakeBasket could automatically route deposited assets to the best-performing, vetted yield farms across the ecosystem, enhancing overall yield optimization.

### **II. Enhanced BASKET Token Utility & Governance**

  * **Decentralized Governance Module:** Implement a robust on-chain governance system for BASKET token holders. This would empower the community to vote on critical protocol parameters, including proposing and approving new staking strategies or asset inclusions; adjusting management or performance fee structures; controlling treasury funds or community grants; and approving smart contract upgrades and major protocol changes.
  * **BASKET Staking for Protocol Fee Sharing:** Introduce a mechanism where users can stake their BASKET tokens in a dedicated governance or fee-sharing module. Staked BASKET would earn a portion of the protocol's collected fees (management, performance, or swap fees), directly incentivizing long-term holding and participation.
  * **Tiered Benefits & Exclusive Access:** Develop a tiered system based on BASKET token holdings. Holding certain amounts of BASKET could unlock benefits such as reduced protocol fees, early access to experimental or higher-yield strategies, or increased voting power in governance.

### **III. Cross-Chain Interoperability & Broader Asset Support**

  * **Diverse BTC Asset Support:** While lstBTC is a strong foundation, expand beyond it by exploring integrations with secure and decentralized bridges to directly onboard other forms of Bitcoin (e.g., wrapped Bitcoin (wBTC) from Ethereum) into StakeBasket's yield strategies. This positions StakeBasket as a more comprehensive BTC yield hub on CoreDAO.
  * **EVM-Native Composability Showcase:** Actively demonstrate and promote how StakeBasket, as an EVM project, seamlessly composes with other EVM-compatible protocols and tools. This will highlight CoreDAO's strength as an EVM chain, facilitating easier integration for developers and broader interoperability for users.

### **IV. Advanced Risk Management & Transparency Features**

  * **Granular Risk Dashboards:** Provide users with comprehensive, real-time dashboards detailing the specific risk exposure associated with each underlying staking strategy (e.g., smart contract risk, impermanent loss, validator slashing risk). This empowers users with full transparency regarding their investment risks.
  * **Enhanced Oracle Integration:** Beyond the current `CoreOracle`, explore integrating with additional decentralized oracle networks (e.g., Chainlink, if available on CoreDAO, or other robust, multi-source price feeds). This will ensure even greater resilience and accuracy of asset valuations and performance metrics, mitigating single points of failure.
  * **Emergency Pause Mechanism:** Implement a robust and transparent emergency pause or circuit breaker function, controlled by a multi-signature wallet or decentralized governance. This feature allows for rapid response to critical vulnerabilities in integrated protocols or market black swan events, prioritizing fund protection.

### **V. User Experience & Accessibility Optimizations**

  * **Gas Abstraction & Efficiency:** Investigate and implement solutions for abstracting or significantly minimizing gas costs for users. This is particularly important for frequent rebalancing transactions or smaller deposits/withdrawals, addressing a common pain point on EVM chains.
  * **Proactive Notification System:** Develop an opt-in notification system (e.g., via email, Telegram, or push notifications through services like Push Protocol) to alert users about significant events like large rebalancing operations, new strategy deployments, or personal portfolio changes.
  * **Advanced Analytics & Reporting Tools:** Enhance the existing performance tracking with more in-depth analytics. This includes historical yield comparisons against relevant benchmarks, detailed breakdowns of yield sources and collected fees, and potentially simplified data for tax reporting.

