# StakeBasket Deployment Guide

## Prerequisites

1. **Get Core Testnet Tokens**
   - Visit [Core Testnet Faucet](https://scan.test2.btcs.network/faucet)
   - Get test CORE tokens for gas fees

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your private key (without 0x prefix)
   ```

## Local Testing

1. **Start Local Hardhat Network**
   ```bash
   npx hardhat node
   ```

2. **Run Tests**
   ```bash
   npx hardhat test
   ```

3. **Deploy to Local Network** (optional)
   ```bash
   npx hardhat run scripts/deploy.cjs --network localhost
   ```

## Core Testnet Deployment

1. **Deploy Contracts**
   ```bash
   npx hardhat run scripts/deploy.cjs --network coreTestnet
   ```

2. **Verify Contracts** (after deployment)
   ```bash
   npx hardhat verify --network coreTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
   ```

## Network Configuration

### Core Testnet
- RPC URL: `https://rpc.test.btcs.network`
- Chain ID: `1115`
- Explorer: `https://scan.test2.btcs.network`
- Faucet: `https://scan.test2.btcs.network/faucet`

### Core Mainnet
- RPC URL: `https://rpc.coredao.org/`
- Chain ID: `1116`
- Explorer: `https://scan.coredao.org`

## Contract Addresses (Update after deployment)

### Core Testnet
- PriceFeed: `TBD`
- StakingManager: `TBD`
- StakeBasketToken: `TBD`  
- StakeBasket: `TBD`

### Core Mainnet
- PriceFeed: `TBD`
- StakingManager: `TBD`
- StakeBasketToken: `TBD`
- StakeBasket: `TBD`

## Security Notes

- Never commit private keys to version control
- Use a dedicated deployment wallet with minimal funds
- Verify all contract addresses after deployment
- Test thoroughly on testnet before mainnet deployment

## Frontend Configuration

After deployment, update the contract addresses in:
- `src/config/contracts.ts` (if exists)
- `src/routes/contracts.tsx` (current implementation)