# 🧪 StakeBasket Interactive Testing Guide

This guide will help you deploy and interactively test all StakeBasket Protocol contracts on a local network.

## 🚀 Quick Start

### 1. Start Local Network
```bash
# Terminal 1: Start Hardhat node
npm run node:start
```

### 2. Deploy Contracts
```bash
# Terminal 2: Deploy all contracts
npm run deploy:local
```

### 3. Start Interactive Testing
```bash
# Terminal 2: Start interactive testing suite
npm run test:interactive
```

### 4. Or Run Everything at Once
```bash
# Compile, deploy, and test (run after node is started)
npm run test:all
```

## 📋 What Gets Deployed

The deployment script creates a complete StakeBasket ecosystem:

### 🏗️ Infrastructure
- **MockTokens**: BASKET, CORE, lstBTC test tokens
- **PriceFeed**: Oracle system with initial prices ($1.5 CORE, $95K BTC)
- **UnbondingQueue**: 7-day unstaking queue management

### 🏛️ Governance Layer
- **BasketStaking**: Tiered staking (Bronze/Silver/Gold/Platinum)
- **BasketGovernance**: Proposal, voting, and execution system

### 💧 Liquid Staking
- **CoreLiquidStakingManager**: CORE → stCORE conversion
- **StCoreToken**: Liquid staking token with dynamic rates
- **MockCoreStaking**: Validator simulation with 5 test validators

### 🧺 ETF System
- **StakeBasket**: Multi-asset ETF (CORE + lstBTC)
- **StakeBasketToken**: ETF share tokens
- **StakingManager**: External protocol coordination
- **DualStakingBasket**: Optimized dual staking strategies

## 🎯 Interactive Testing Features

### 👤 User Management
- Switch between 5 test accounts (Alice, Bob, Charlie, Dave, Deployer)
- Each account pre-funded with test tokens:
  - 50,000 BASKET tokens
  - 100,000 CORE tokens
  - 10 lstBTC tokens

### 🏛️ Governance Testing
- **Stake BASKET**: Test all 4 tiers (100/1K/10K/100K BASKET)
- **Create Proposals**: Submit governance proposals with custom parameters
- **Vote**: Cast votes with tier-based multipliers (1x to 1.5x)
- **Execute**: Execute passed proposals after delay period
- **Check Voting Power**: View staking tier and voting multipliers

### 💧 Liquid Staking Testing
- **Stake CORE**: Convert CORE to stCORE with dynamic rates
- **Request Unstaking**: Start 7-day unbonding process
- **Claim Unstaked**: Withdraw after unbonding period
- **Check Rates**: View current CORE ↔ stCORE conversion rate
- **Claim Rewards**: Collect staking rewards

### 🧺 ETF Testing
- **Deposit Assets**: Add CORE + lstBTC to get ETF shares
- **Withdraw**: Redeem ETF shares for underlying assets
- **Check NAV**: View current Net Asset Value
- **Check Holdings**: See ETF's asset breakdown
- **Trigger Rebalancing**: Force portfolio rebalancing

### 📊 Price Feed Testing
- **View Prices**: See current CORE/BTC/SolvBTC prices
- **Update Prices**: Simulate price changes for testing
- **Circuit Breakers**: Test price deviation protection

### 🔄 Complete Workflow Testing
Automated end-to-end user journey:
1. Stake BASKET → Achieve Gold tier (25% fee reduction)
2. Stake CORE → Get liquid stCORE tokens
3. Deposit to ETF → Get diversified exposure
4. Create Governance Proposal → Participate in protocol governance

## 🎮 Testing Scenarios

### Scenario 1: Governance Power User
```
1. Switch to Alice
2. Stake 100,000 BASKET → Platinum tier
3. Create proposal for price feed update
4. Vote on proposal (1.5x voting power)
5. Execute proposal after delay
```

### Scenario 2: Liquid Staking Journey
```
1. Switch to Bob
2. Stake 50,000 CORE → Get stCORE
3. Check conversion rate improvement over time
4. Request unstaking of 10,000 stCORE
5. Wait 7 days and claim unstaked CORE
```

### Scenario 3: ETF Investor
```
1. Switch to Charlie
2. Stake 10,000 BASKET → Gold tier (25% fee discount)
3. Deposit 20,000 CORE + 5 lstBTC to ETF
4. Monitor NAV changes with price updates
5. Withdraw portion of ETF shares
```

### Scenario 4: Multi-Protocol User
```
1. Use complete workflow feature
2. Achieve multiple tier benefits simultaneously
3. Test cross-protocol integrations
4. Verify fee reductions apply across all protocols
```

## 🔍 System Monitoring

The interactive suite provides comprehensive system status:
- **Current Prices**: Real-time price feed data
- **Contract Balances**: ETF holdings and distributions
- **Total Value Locked**: Across all protocols
- **Staking Statistics**: Total stCORE supply and conversion rates

## 🛠️ Advanced Testing

### Custom Scenarios
You can extend the testing suite by:
1. Adding new test accounts with specific token allocations
2. Creating complex governance proposals
3. Simulating market conditions with price updates
4. Testing edge cases and error conditions

### Integration Testing
The suite supports testing contract integrations:
- Governance voting power from staking tiers
- ETF fee discounts from BASKET staking
- Liquid staking rewards compounding
- Cross-protocol value transfers

## 🔧 Configuration

### Price Settings
Default prices (adjustable via price feed testing):
- CORE: $1.50
- BTC: $95,000
- SolvBTC: $96,000 (slight premium)

### Staking Tiers
- **Bronze**: 100 BASKET (5% fee reduction, 1.0x voting)
- **Silver**: 1,000 BASKET (10% fee reduction, 1.1x voting)
- **Gold**: 10,000 BASKET (25% fee reduction, 1.25x voting)
- **Platinum**: 100,000 BASKET (50% fee reduction, 1.5x voting)

### Protocol Parameters
- Management Fee: 0.5%
- Performance Fee: 10%
- Proposal Threshold: 100 BASKET
- Voting Period: 3 days
- Execution Delay: 1 day

## 🎯 Testing Checklist

- [ ] All contracts deploy successfully
- [ ] Test accounts receive initial token allocations
- [ ] Governance staking works across all tiers
- [ ] Proposal creation, voting, and execution functions
- [ ] Liquid staking CORE → stCORE conversion
- [ ] Unbonding queue 7-day wait period
- [ ] ETF deposit and withdrawal mechanics
- [ ] NAV calculations with price changes
- [ ] Fee discounts apply based on staking tiers
- [ ] Price feed updates trigger rebalancing
- [ ] Complete user workflow succeeds end-to-end

## 🚨 Troubleshooting

### Common Issues

**"Deployment info not found"**
- Make sure to run `npm run deploy:local` before testing
- Ensure Hardhat node is running in another terminal

**"Transaction reverted"**
- Check token balances before transactions
- Ensure proper token approvals for contract interactions
- Verify you're using the correct user account

**"Price feed stale"**
- Price feeds may have staleness protection
- Update prices via price feed testing menu

**"Insufficient voting power"**
- Stake BASKET tokens first to gain voting rights
- Higher tiers provide voting multipliers

## 📈 Next Steps

After interactive testing:
1. Deploy to Core Testnet2 for integration testing
2. Connect frontend to deployed contracts
3. Perform load testing with multiple users
4. Security audit preparation
5. Mainnet deployment planning

---

*This testing suite provides comprehensive coverage of all StakeBasket Protocol features in a local development environment.*