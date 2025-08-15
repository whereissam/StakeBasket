# Smart Contract Documentation

## Overview
The Dual Staking Basket ecosystem consists of several interconnected smart contracts that provide automated, professionally managed cryptocurrency investment strategies focused on CoreDAO's dual staking mechanism.

## Core Contracts

### 1. DualStakingBasket.sol
**Purpose**: The main investment strategy contract that manages a dual-asset basket optimized for CoreDAO staking tiers.

**What it does for users**:
- Automatically maintains optimal CORE:BTC ratios to achieve the highest possible staking rewards
- Provides professional portfolio management without requiring users to understand complex ratio calculations
- Continuously rebalances the portfolio to maintain tier eligibility
- Compounds rewards automatically to maximize returns
- Offers a simple deposit/withdraw interface for complex multi-asset staking strategies

**Key Features**:
- **Tier Optimization**: Automatically targets Satoshi tier (16,000:1 CORE:BTC ratio) for maximum 20% APY
- **Auto-Rebalancing**: Smart contract monitors and adjusts asset ratios when they drift beyond threshold
- **Reward Compounding**: Claims and reinvests all staking rewards back into the strategy
- **Circuit Breakers**: Built-in safety mechanisms to pause operations during market volatility
- **Slippage Protection**: Ensures fair execution of all rebalancing trades

**User Journey**:
1. User deposits CORE and/or BTC tokens
2. Contract calculates optimal allocation for target tier
3. Assets are automatically staked in CoreDAO dual staking protocol
4. Contract monitors and rebalances to maintain optimal ratios
5. Users can withdraw their proportional share of the basket at any time

### 2. StakeBasketToken.sol
**Purpose**: ERC-20 token representing shares in the dual staking basket strategy.

**What it does for users**:
- Provides liquid ownership of their position in the managed strategy
- Allows users to track their investment performance over time
- Enables easy withdrawal of proportional assets
- Potentially tradeable on secondary markets (if enabled)

**Key Features**:
- **Proportional Ownership**: Each token represents a fixed percentage of the total basket
- **Yield-Bearing**: Token value increases as the underlying strategy generates returns
- **Liquid Representation**: Users can easily see their position size and value
- **Access Control**: Only the basket contract can mint/burn tokens for security

**Example**: If you own 1,000 basket tokens and there are 100,000 total tokens, you own 1% of the entire dual staking basket strategy.

### 3. PriceFeed.sol
**Purpose**: Secure and reliable price oracle system with multiple safety mechanisms.

**What it does for users**:
- Ensures accurate valuation of CORE and BTC assets in the basket
- Protects against price manipulation attacks
- Provides backup data sources for maximum reliability
- Enables fair calculation of deposit and withdrawal amounts

**Key Features**:
- **Circuit Breakers**: Automatically pauses operations if price data appears manipulated
- **Staleness Checks**: Ensures price data is recent and valid
- **Multiple Oracle Support**: Can use Chainlink, Band Protocol, or custom oracles
- **Price Deviation Protection**: Detects and prevents execution during extreme price swings

### 4. ProperDualStaking.sol / MockDualStaking.sol
**Purpose**: Interface to CoreDAO's dual staking mechanism (MockDualStaking for testing).

**What it does for users**:
- Handles the actual staking of CORE and BTC tokens with CoreDAO validators
- Manages tier calculations and reward distributions
- Provides the underlying yield generation for the basket strategy
- Tracks individual and aggregate staking positions

**Key Features**:
- **Tier Management**: Calculates and maintains staking tier status
- **Reward Distribution**: Handles CORE token rewards based on tier performance
- **Stake/Unstake Operations**: Manages deposit and withdrawal from CoreDAO staking
- **Position Tracking**: Monitors individual user positions and total pool status

## Supporting Contracts

### 5. BasketGovernance.sol
**Purpose**: Decentralized governance system for basket strategy parameters.

**User Benefits**:
- Allows basket token holders to vote on strategy parameters
- Ensures transparent and democratic management of the investment strategy
- Enables protocol upgrades and improvements over time

### 6. StakingManager.sol / CoreLiquidStakingManager.sol
**Purpose**: Advanced staking management with liquid staking token integration.

**User Benefits**:
- Provides additional yield optimization strategies
- Manages liquid staking token (LST) positions
- Enables more sophisticated DeFi integrations

### 7. UnbondingQueue.sol
**Purpose**: Manages the withdrawal process for staked assets with unbonding periods.

**User Benefits**:
- Handles CoreDAO's unbonding period requirements transparently
- Optimizes withdrawal timing to minimize waiting periods
- Provides predictable withdrawal timelines

## Security Features Across All Contracts

### Access Controls
- **Owner-only Functions**: Critical parameters can only be changed by authorized addresses
- **Multi-signature Support**: Important operations require multiple signatures
- **Role-based Permissions**: Different contracts have specific, limited permissions

### Safety Mechanisms
- **Reentrancy Protection**: Prevents common smart contract attack vectors
- **Pausable Operations**: Ability to halt operations during emergencies
- **Rate Limiting**: Prevents excessive operations that could destabilize the system
- **Slippage Protection**: Ensures users get fair execution prices

### Monitoring & Alerts
- **Event Logging**: All important operations emit events for transparency
- **Circuit Breakers**: Automatic pausing when abnormal conditions are detected
- **Performance Metrics**: Detailed tracking of strategy performance and health

## Technical Architecture

### Integration Flow
```
User Deposits → DualStakingBasket → StakeBasketToken (minted)
                       ↓
                PriceFeed (valuation) → ProperDualStaking (staking)
                       ↓
            Automatic Rebalancing & Reward Compounding
                       ↓
            User Withdraws → Proportional Asset Return
```

### Gas Optimization
- **Batch Operations**: Multiple actions combined to reduce transaction costs
- **Efficient Storage**: Optimized data structures to minimize gas usage
- **Smart Rebalancing**: Only rebalances when necessary to avoid unnecessary fees

## Risk Management

### Smart Contract Risks
- **Audited Code**: All contracts undergo security audits
- **Immutable Core Logic**: Critical functions cannot be changed
- **Upgrade Paths**: Controlled upgrade mechanisms for non-critical improvements

### Market Risks
- **Diversification**: Dual-asset strategy reduces single-token risk
- **Professional Management**: Automated strategies remove emotional decision-making
- **Liquidity Management**: Maintains sufficient liquidity for user withdrawals

### Operational Risks
- **Redundant Systems**: Multiple oracle sources and backup mechanisms
- **Monitoring**: 24/7 automated monitoring of all system components
- **Emergency Procedures**: Established protocols for handling extreme scenarios

## For Developers

### Integration Points
- **Web3 Interface**: Standard ERC-20 and custom function interfaces
- **Event Monitoring**: Rich event system for building user interfaces
- **View Functions**: Comprehensive read-only functions for displaying data

### Testing Infrastructure
- **Mock Contracts**: Full testing environment with simulated conditions
- **Unit Tests**: Comprehensive test coverage for all functions
- **Integration Tests**: End-to-end testing of complete user journeys

This architecture provides users with sophisticated, institutional-grade investment management while maintaining the transparency and decentralization benefits of blockchain technology.