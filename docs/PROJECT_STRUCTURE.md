# StakeBasket Project Structure

This document outlines the organized structure of the StakeBasket project.

## 📁 Root Directory Structure

```
stakebasket/
├── 📄 README.md                    # Main project documentation
├── 📄 package.json                 # Node.js dependencies and scripts
├── 📄 package-lock.json            # Locked dependency versions
├── 📄 hardhat.config.cjs           # Hardhat blockchain configuration
├── 📄 index.html                   # Main HTML entry point
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 vite.config.ts              # Vite build tool configuration
├── 📄 PROJECT_STRUCTURE.md        # This file
│
├── 📁 docs/                       # Documentation files
│   ├── CHECKLIST.md               # Development checklist
│   ├── DEPLOYMENT.md              # Deployment instructions
│   ├── ETF_TEST_RESULTS.md        # Comprehensive test results
│   ├── LOCAL_TESTING.md           # Local testing workflow
│   ├── MOCK_STAKING_SUMMARY.md    # Mock staking implementation guide
│   ├── core.md                    # Core blockchain information
│   └── plam.md                    # Additional planning notes
│
├── 📁 config-files/               # Configuration files
│   ├── eslint.config.js           # ESLint code quality rules
│   ├── postcss.config.js          # PostCSS processing
│   ├── tailwind.config.js         # Tailwind CSS styling
│   ├── components.json            # Shadcn/ui components config
│   ├── tsconfig.app.json          # TypeScript app configuration
│   └── tsconfig.node.json         # TypeScript Node.js configuration
│
├── 📁 build-tools/                # Build artifacts and cache
│   ├── artifacts/                 # Compiled smart contract artifacts
│   ├── cache/                     # Hardhat compilation cache
│   └── bun.lockb                  # Bun package manager lockfile
│
├── 📁 contracts/                  # Smart contract source files
│   ├── StakeBasket.sol            # Main ETF contract
│   ├── StakeBasketToken.sol       # ERC-20 token for ETF shares
│   ├── StakingManager.sol         # External staking management
│   ├── PriceFeed.sol              # Oracle price feed integration
│   ├── MockCoreStaking.sol        # Mock CORE staking for testing
│   ├── MockLstBTC.sol             # Mock liquid staked Bitcoin
│   └── MockTokens.sol             # Mock CORE and coreBTC tokens
│
├── 📁 scripts/                    # Deployment and utility scripts
│   ├── deploy.cjs                 # Main deployment script
│   └── deploy-with-mocks.cjs      # Local testing deployment
│
├── 📁 test/                       # Test suite
│   ├── StakeBasket.test.cjs       # Core contract tests
│   ├── FullIntegration.test.cjs   # Complete integration tests
│   ├── SimpleETFTest.cjs          # Basic ETF functionality test
│   ├── FinalETFTest.cjs           # Comprehensive ETF test
│   ├── ETFRewardsTest.cjs         # Staking rewards test
│   ├── ETFStakingTest.cjs         # Advanced staking test
│   └── StakingRewardsTest.cjs     # Detailed rewards test
│
├── 📁 src/                        # Frontend source code
│   ├── 📄 main.tsx                # React application entry point
│   ├── 📄 index.css               # Global CSS styles
│   ├── 📄 App.css                 # Application-specific styles
│   ├── 📄 vite-env.d.ts           # Vite environment types
│   ├── 📄 routeTree.gen.ts        # Generated routing tree
│   │
│   ├── 📁 components/             # React components
│   │   ├── ConnectWallet.tsx      # Wallet connection component
│   │   ├── Dashboard.tsx          # Original dashboard
│   │   ├── DashboardV2.tsx        # Enhanced dashboard with contract integration
│   │   ├── ContractsInfo.tsx      # Contract information display
│   │   ├── TransactionHistory.tsx # Transaction history viewer
│   │   ├── mobile-nav.tsx         # Mobile navigation
│   │   ├── theme-provider.tsx     # Theme management
│   │   ├── theme-toggle.tsx       # Dark/light mode toggle
│   │   └── ui/                    # Reusable UI components
│   │       ├── button.tsx         # Button component
│   │       ├── card.tsx           # Card component
│   │       ├── input.tsx          # Input component
│   │       └── select.tsx         # Select component
│   │
│   ├── 📁 pages/                  # Page components
│   │   ├── Home.tsx               # Landing page
│   │   └── About.tsx              # About page
│   │
│   ├── 📁 routes/                 # Route definitions
│   │   ├── __root.tsx             # Root layout
│   │   ├── index.tsx              # Home route
│   │   ├── about.tsx              # About route
│   │   ├── dashboard.tsx          # Dashboard route
│   │   ├── contracts.tsx          # Contracts info route
│   │   └── features.tsx           # Features route
│   │
│   ├── 📁 config/                 # Configuration files
│   │   ├── contracts.ts           # Contract addresses and network config
│   │   ├── abis.ts                # Smart contract ABIs
│   │   ├── chains.ts              # Blockchain network definitions
│   │   └── wagmi.ts               # Web3 provider configuration
│   │
│   ├── 📁 providers/              # React context providers
│   │   └── Web3Provider.tsx       # Web3 and wallet connection
│   │
│   ├── 📁 store/                  # State management
│   │   └── useStakeBasketStore.ts # Zustand store for app state
│   │
│   ├── 📁 lib/                    # Utility functions
│   │   └── utils.ts               # Common utility functions
│   │
│   └── 📁 assets/                 # Static assets
│       └── react.svg              # React logo
│
├── 📁 public/                     # Public static files
│   └── vite.svg                   # Vite logo
│
├── 📁 dist/                       # Production build output
├── 📁 node_modules/               # Node.js dependencies
```

## 🎯 Key Components Overview

### Smart Contracts (`/contracts/`)
- **StakeBasket.sol**: Main ETF contract handling deposits, withdrawals, and NAV calculations
- **StakeBasketToken.sol**: ERC-20 token representing shares in the ETF
- **StakingManager.sol**: Manages external staking interactions with CORE and lstBTC
- **PriceFeed.sol**: Oracle integration for real-time asset pricing
- **Mock Contracts**: Testing implementations for local development

### Frontend (`/src/`)
- **React + TypeScript**: Modern frontend framework with type safety
- **TanStack Router**: File-based routing system
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: High-quality React components
- **Wagmi + Viem**: Web3 integration for blockchain interactions
- **RainbowKit**: Wallet connection interface

### Configuration (`/config-files/`)
- **TypeScript**: Strict type checking and modern JavaScript features
- **ESLint**: Code quality and consistency enforcement
- **Tailwind**: Responsive design and utility classes
- **PostCSS**: CSS processing and optimization

### Testing (`/test/`)
- **Integration Tests**: End-to-end functionality verification
- **Unit Tests**: Individual component testing
- **Local Network Tests**: Hardhat-based testing environment
- **Comprehensive Coverage**: ETF mechanics, staking rewards, multi-user scenarios

### Documentation (`/docs/`)
- **Development Guides**: Step-by-step implementation instructions
- **Testing Documentation**: Comprehensive test results and procedures
- **Deployment Instructions**: Production deployment workflows
- **Technical Specifications**: Detailed protocol documentation

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Local Development**:
   ```bash
   # Terminal 1: Start Hardhat network
   npx hardhat node
   
   # Terminal 2: Deploy contracts
   node scripts/deploy-with-mocks.cjs
   
   # Terminal 3: Start frontend
   npm run dev
   ```

3. **Run Tests**:
   ```bash
   # Run comprehensive tests
   npx hardhat run test/FinalETFTest.cjs --network localhost
   ```

## 📋 Build and Deploy

- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Preview**: `npm run preview`

## 🔧 Configuration Files

All configuration files are organized in `/config-files/` for better project structure:
- ESLint, PostCSS, Tailwind configurations
- TypeScript project configurations
- Component library settings

This organized structure ensures maintainability, scalability, and ease of development for the StakeBasket project.