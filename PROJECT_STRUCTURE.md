# 📁 Project Structure

This document outlines the organized structure of the StakeBasket project.

## 🗂️ Root Directory Structure

```
staking/
├── 📱 Frontend (Vite + React + TypeScript)
│   ├── src/                     # Frontend source code
│   ├── public/                  # Static assets
│   ├── dist/                    # Build output (auto-generated)
│   ├── index.html               # HTML entry point
│   ├── vite.config.ts           # Vite configuration
│   └── tsconfig.json            # TypeScript configuration
│
├── 🔗 Smart Contracts
│   ├── contracts/               # Solidity contracts
│   ├── test/                    # Contract tests
│   ├── artifacts/               # Compiled contracts (auto-generated)
│   ├── cache/                   # Hardhat cache (auto-generated)
│   └── hardhat.config.cjs       # Hardhat configuration
│
├── 🛠️ Tools & Scripts
│   ├── tools/
│   │   ├── scripts/             # Utility scripts
│   │   ├── deployment/          # Deployment utilities
│   │   └── testing/             # Testing utilities
│   └── scripts/                 # Main scripts directory
│
├── 🖥️ Backend Services
│   └── backend/                 # API and monitoring services
│
├── 📊 Data & Deployments
│   ├── deployment-data/         # Deployment artifacts
│   └── logs/                    # Application logs
│
├── 📚 Documentation
│   ├── docs/                    # Project documentation
│   ├── README.md                # Main project README
│   └── *.md                     # Other documentation files
│
└── ⚙️ Configuration
    ├── .gitignore               # Git ignore patterns
    ├── package.json             # Node.js dependencies
    ├── components.json          # UI components config
    └── config-files/            # Additional config files
```

## 🔐 Security Features

### Protected Files (via .gitignore)
- ✅ Private keys (`*.key`, `*.pem`)
- ✅ Mnemonics and seeds (`*mnemonic*`, `*seed*`)
- ✅ Environment files (`.env*`)
- ✅ Wallet files (`wallet.json`, `keystore/`)
- ✅ Deployment secrets (`secrets.json`)
- ✅ Test accounts (`test-accounts.json`)

### Security Best Practices
- 🔑 All private keys use environment variables
- 🚫 No hardcoded secrets in source code
- 🔒 Sensitive scripts excluded from git
- 📝 Comprehensive .gitignore patterns

## 🚀 Quick Start

### Development
```bash
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
```

### Smart Contracts
```bash
npx hardhat compile                    # Compile contracts
npx hardhat test                      # Run tests
npx hardhat run scripts/deploy.cjs    # Deploy contracts
```

### Backend Services
```bash
cd backend
npm install         # Install backend dependencies
npm start          # Start backend services
```

## 📂 Key Directories

| Directory | Purpose | Auto-Generated |
|-----------|---------|----------------|
| `src/` | Frontend source code | ❌ |
| `contracts/` | Smart contracts | ❌ |
| `artifacts/` | Compiled contracts | ✅ |
| `dist/` | Frontend build output | ✅ |
| `node_modules/` | Dependencies | ✅ |
| `cache/` | Build cache | ✅ |
| `logs/` | Application logs | ✅ |

## 🧹 Maintenance

### Clean Build Artifacts
```bash
rm -rf artifacts/ cache/ dist/ node_modules/
npm install
npx hardhat compile
```

### Update Dependencies
```bash
npm update
npm audit fix
```

## 🔧 Configuration Files

- `hardhat.config.cjs` - Smart contract compilation and deployment
- `vite.config.ts` - Frontend build configuration  
- `tsconfig.json` - TypeScript compiler settings
- `package.json` - Node.js project configuration
- `components.json` - UI component library settings

## 📝 Notes

- **Auto-generated directories** should never be committed to git
- **Security-sensitive files** are protected by .gitignore
- **Environment variables** are required for deployment
- **Documentation** is kept in the `docs/` directory