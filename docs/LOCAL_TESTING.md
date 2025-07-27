# StakeBasket Local Testing Workflow

This guide explains how to set up and test StakeBasket locally using Hardhat network.

## Prerequisites

- Node.js and npm installed
- Git repository cloned
- Dependencies installed (`npm install`)

## 1. Start Hardhat Local Network

```bash
# Terminal 1: Start Hardhat network
npx hardhat node
```

This will:
- Start a local Ethereum network on `http://127.0.0.1:8545`
- Create 20 test accounts with 10,000 ETH each
- Display account addresses and private keys for testing

## 2. Deploy Smart Contracts

```bash
# Terminal 2: Deploy contracts to local network
node deploy-with-mocks.cjs
```

This script deploys:
- **Mock Tokens**: MockCORE, MockCoreBTC (with faucet functionality)
- **Mock Staking**: MockCoreStaking (8% APY), MockLstBTC (6% APY)
- **Core Contracts**: PriceFeed, StakingManager, StakeBasketToken, StakeBasket

Contract addresses are saved to deployment logs and configured in `src/config/contracts.ts`.

## 3. Start Frontend Development Server

```bash
# Terminal 3: Start frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` (or next available port).

## 4. Connect Wallet and Test

### Setup MetaMask for Local Testing

1. **Add Local Network to MetaMask**:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Test Account**:
   - Copy a private key from the Hardhat node output
   - Import into MetaMask using "Import Account"

### Available Test Features

#### 1. Dashboard (`/dashboard`)
- **Faucet Functionality**: Get test CORE and coreBTC tokens
- **Portfolio Overview**: View your BASKET balance and total AUM
- **Deposit/Withdraw**: Deposit ETH to receive BASKET tokens, redeem BASKET for assets

#### 2. Contract Information (`/contracts`)
- View all deployed contract addresses
- Copy addresses to clipboard
- Link to local blockchain explorer (if available)

### Test Scenarios

#### Basic Flow Testing
1. **Get Test Tokens**:
   ```
   Navigate to Dashboard → Use faucet to get Mock CORE and coreBTC
   ```

2. **Deposit Assets**:
   ```
   Enter amount in Deposit section → Click "Deposit ETH"
   Confirm transaction in MetaMask
   ```

3. **Check Balance**:
   ```
   Verify BASKET token balance increases
   Check updated NAV per share
   ```

4. **Withdraw Assets**:
   ```
   Enter BASKET amount in Withdraw section → Click "Withdraw"
   Confirm transaction in MetaMask
   ```

#### Advanced Testing
1. **Mock Staking Rewards**:
   - Mock contracts automatically compound rewards
   - NAV per share should increase over time

2. **Multi-Asset Portfolio**:
   - Test different combinations of CORE and coreBTC
   - Verify portfolio rebalancing

## 5. Contract Verification

### Integration Tests
```bash
# Run comprehensive integration tests
node test/FullIntegration.test.cjs
```

Tests cover:
- Mock token functionality and faucets
- Staking reward calculations
- Deposit and withdrawal flows
- NAV calculations
- Portfolio rebalancing

### Manual Contract Interaction

Using Hardhat console:
```bash
npx hardhat console --network localhost
```

```javascript
// Example: Check BASKET token balance
const StakeBasketToken = await ethers.getContractAt("StakeBasketToken", "CONTRACT_ADDRESS");
const balance = await StakeBasketToken.balanceOf("USER_ADDRESS");
console.log(ethers.utils.formatEther(balance));
```

## 6. Network Configuration

The frontend automatically detects network and loads appropriate contract addresses:

- **Chain ID 31337**: Hardhat local network (mock contracts enabled)
- **Chain ID 1115**: Core Testnet (when deployed)
- **Chain ID 1116**: Core Mainnet (when deployed)

## 7. Troubleshooting

### Common Issues

1. **MetaMask Connection Issues**:
   - Ensure Hardhat network is running
   - Reset MetaMask account if needed
   - Check RPC URL and Chain ID

2. **Transaction Failures**:
   - Verify sufficient ETH balance for gas
   - Check contract addresses in browser console
   - Restart Hardhat network if needed

3. **Frontend Build Errors**:
   - Run `npm run build` to check TypeScript errors
   - Run `npm run lint` to check code quality

### Reset Environment
```bash
# Stop all processes
pkill -f "hardhat node"
pkill -f "npm run dev"

# Restart from step 1
npx hardhat node
```

## 8. Development Workflow

1. **Make Contract Changes**:
   - Edit contracts in `contracts/` directory
   - Redeploy using `node deploy-with-mocks.cjs`
   - Update contract addresses if needed

2. **Make Frontend Changes**:
   - Hot reload will update automatically
   - Check browser console for errors
   - Test with MetaMask transactions

3. **Run Tests**:
   - Integration tests: `node test/FullIntegration.test.cjs`
   - Frontend build: `npm run build`
   - Linting: `npm run lint`

## Next Steps

After local testing is complete:
1. Deploy to Core Testnet
2. Conduct public testing
3. Security audit
4. Deploy to Core Mainnet

---

## Contract Addresses (Local)

After deployment, contract addresses will be:
- StakeBasket: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- StakeBasketToken: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- StakingManager: `0x0165878A594ca255338adfa4d48449f69242Eb8F`
- PriceFeed: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- MockCORE: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- MockCoreBTC: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- MockCoreStaking: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- MockLstBTC: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`

These addresses are automatically configured in the frontend for seamless integration.