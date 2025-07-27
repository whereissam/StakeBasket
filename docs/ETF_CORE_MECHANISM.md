# StakeBasket ETF Core Mechanism Documentation

## 🎯 Overview

The StakeBasket ETF is a sophisticated multi-asset staking Exchange-Traded Fund built on the Core blockchain that allows users to gain exposure to Core ecosystem assets while automatically generating yield through validator staking and liquid staking protocols.

## 🏗️ Core Architecture

### **Primary Components**

1. **StakeBasket.sol** - Main ETF contract managing deposits, withdrawals, NAV calculation, and fee collection
2. **StakeBasketToken.sol** - ERC-20 token representing proportional ETF shares (BASKET tokens)
3. **StakingManager.sol** - Handles external staking operations for yield generation
4. **PriceFeed.sol** - Oracle integration for real-time asset pricing
5. **UnbondingQueue.sol** - Manages withdrawal queues during unbonding periods

## 🔄 ETF Mechanism Deep Dive

### **1. Deposit Mechanism**

When users deposit assets into the ETF:

```solidity
// Core mechanism in StakeBasket.sol:67-85
function deposit(uint256 amount) external payable nonReentrant whenNotPaused {
    require(amount > 0, "StakeBasket: amount must be greater than 0");
    require(msg.value == amount, "StakeBasket: sent value must equal amount");
    
    // Calculate shares based on current NAV
    uint256 sharesToMint = _calculateSharesToMint(amount);
    
    // Update total pooled assets
    totalPooledCore += amount;
    
    // Mint proportional ETF shares
    etfToken.mint(msg.sender, sharesToMint);
    
    emit Deposited(msg.sender, amount, sharesToMint);
}
```

**Flow:**
1. User sends CORE tokens to the contract
2. Contract calculates fair share allocation based on current NAV
3. BASKET tokens are minted to user's wallet
4. Assets are added to the total pool for staking

### **2. Share Calculation Algorithm**

The ETF uses a proportional share calculation system:

```solidity
// Share calculation logic in StakeBasket.sol:140-162
function _calculateSharesToMint(uint256 coreAmount) internal view returns (uint256) {
    if (etfToken.totalSupply() == 0) {
        return coreAmount; // Initial deposit: 1 CORE = 1 share
    }
    
    uint256 corePrice = priceFeed.getCorePrice();
    uint256 lstBTCPrice = priceFeed.getLstBTCPrice();
    
    uint256 totalAssetValue = (totalPooledCore * corePrice + totalPooledLstBTC * lstBTCPrice) / 1e18;
    uint256 newAssetValue = (coreAmount * corePrice) / 1e18;
    
    return (newAssetValue * etfToken.totalSupply()) / totalAssetValue;
}
```

**Formula:**
```
Shares to Mint = (New Asset Value × Total Shares) ÷ Total Asset Value
```

### **3. NAV (Net Asset Value) Calculation**

The ETF's NAV per share is calculated as:

```solidity
// NAV calculation in StakeBasket.sol:223-242
function _getNAVPerShare() internal view returns (uint256) {
    if (etfToken.totalSupply() == 0) {
        return 1e18; // Initial NAV = 1 USD
    }
    
    uint256 corePrice = priceFeed.getCorePrice();
    uint256 lstBTCPrice = priceFeed.getLstBTCPrice();
    
    uint256 totalAssetValue = (totalPooledCore * corePrice + totalPooledLstBTC * lstBTCPrice) / 1e18;
    return (totalAssetValue * 1e18) / etfToken.totalSupply();
}
```

**Formula:**
```
NAV per Share = Total Asset Value (USD) ÷ Total BASKET Supply
```

### **4. Yield Generation Mechanism**

The ETF generates yield through multiple strategies:

#### **A. Core Validator Staking**
- Assets are delegated to Core validators through `StakingManager.sol`
- Validators generate staking rewards (typically 5-15% APY)
- Rewards are automatically compounded back into the pool

#### **B. Liquid Staking (lstBTC)**
- coreBTC assets are converted to lstBTC for liquid staking
- Generates yield while maintaining liquidity
- No lockup periods for this portion

#### **C. Automated Compounding**
```solidity
// Reward compounding in StakeBasket.sol:247-257
function claimAndReinvestRewards() external onlyOwner {
    if (address(stakingManager) == address(0)) return;
    
    uint256 totalRewards = stakingManager.claimCoreRewards();
    
    if (totalRewards > 0) {
        totalPooledCore += totalRewards;
        emit RewardsCompounded(totalRewards);
    }
}
```

### **5. Withdrawal Mechanism**

The ETF supports two withdrawal methods:

#### **A. Instant Withdrawal (When Liquidity Available)**
```solidity
// Instant redemption in StakeBasket.sol:91-110
function redeem(uint256 shares) external nonReentrant whenNotPaused {
    require(shares > 0, "StakeBasket: shares must be greater than 0");
    
    uint256 coreAmount = _calculateCoreToReturn(shares);
    require(address(this).balance >= coreAmount, "StakeBasket: insufficient liquidity");
    
    totalPooledCore -= coreAmount;
    etfToken.burn(msg.sender, shares);
    
    (bool success, ) = payable(msg.sender).call{value: coreAmount}("");
    require(success, "StakeBasket: transfer failed");
}
```

#### **B. Queue-Based Withdrawal (For Staked Assets)**
- Handled by `UnbondingQueue.sol` for assets that require unbonding
- Users join a queue and wait for the unbonding period
- Maintains fair withdrawal ordering (FIFO)

### **6. Fee Structure**

The ETF implements two types of fees:

#### **A. Management Fee**
- Annual fee of 0.5% (50 basis points)
- Calculated continuously and collected periodically
- Covers operational costs and fund management

#### **B. Performance Fee**
- 10% (1000 basis points) of profits above benchmark
- Only charged on gains, not principal
- Incentivizes optimal fund performance

```solidity
// Fee collection in StakeBasket.sol:262-291
function collectFees() external {
    uint256 currentTime = block.timestamp;
    uint256 timeSinceLastCollection = currentTime - lastFeeCollection;
    
    uint256 totalAssetValue = getTotalAUM();
    uint256 managementFee = (totalAssetValue * managementFeeBasisPoints * timeSinceLastCollection) / 
                           (10000 * 365 days);
    
    uint256 totalFees = managementFee + performanceFee;
    
    if (totalFees > 0) {
        uint256 feeShares = _calculateSharesToMint(totalFees);
        etfToken.mint(feeRecipient, feeShares);
        emit FeesCollected(feeRecipient, totalFees);
    }
    
    lastFeeCollection = currentTime;
}
```

## 🔒 Security Features

### **1. Reentrancy Protection**
- All external functions use `nonReentrant` modifier
- Prevents malicious contracts from draining funds

### **2. Access Controls**
- Owner-only functions for critical operations
- Multi-signature wallet recommended for production

### **3. Pausability**
- Emergency pause mechanism for critical situations
- Allows temporary suspension of deposits/withdrawals

### **4. Input Validation**
- Comprehensive validation of all user inputs
- Prevents edge cases and potential exploits

## 📊 Economic Model

### **Value Accrual Mechanism**
1. **Staking Rewards** → Increase in totalPooledCore → Higher NAV per share
2. **Price Appreciation** → Oracle price updates → Increased asset value
3. **Compound Interest** → Reinvested rewards → Exponential growth

### **Risk Management**
1. **Diversification** → Multiple asset types (CORE, lstBTC)
2. **Liquidity Buffers** → Reserve pools for instant withdrawals
3. **Validator Selection** → Distributed staking across multiple validators

## 🚀 Operational Flow

### **Daily Operations**
1. **Price Updates** → Oracle feeds update asset prices
2. **Reward Collection** → Automatic claiming from validators
3. **Rebalancing** → Maintain target asset allocations
4. **Fee Collection** → Periodic fee extraction

### **User Experience**
1. **Deposit** → Instant BASKET token issuance
2. **Hold** → Automatic yield generation and compounding
3. **Monitor** → Real-time NAV and portfolio tracking
4. **Withdraw** → Instant or queued redemption options

## 🎯 Key Benefits

### **For Users**
- **Diversified Exposure** → Single token for multiple Core assets
- **Automated Management** → No need for manual staking operations
- **Liquid Shares** → BASKET tokens are transferable ERC-20 tokens
- **Professional Management** → Optimized staking strategies

### **For Core Ecosystem**
- **Capital Efficiency** → Aggregated staking power
- **Validator Support** → Distributed delegation
- **Ecosystem Growth** → Easier participation for new users

## 📈 Performance Metrics

### **Target Returns**
- **Base Staking Yield**: 8-12% APY from Core validators
- **Liquid Staking Premium**: Additional 2-4% from lstBTC
- **Total Target APY**: 10-16% (before fees)

### **Risk Metrics**
- **Maximum Drawdown**: Limited by underlying asset volatility
- **Liquidity Risk**: Mitigated by unbonding queue system
- **Smart Contract Risk**: Minimized through audits and testing

## 🔧 Technical Specifications

### **Supported Assets**
- **Primary**: CORE tokens (Core blockchain native)
- **Secondary**: coreBTC (via Core bridge)
- **Future**: Additional Core ecosystem tokens

### **Oracle Requirements**
- **CORE/USD** price feed
- **BTC/USD** price feed  
- **lstBTC/USD** price discovery
- **Update frequency**: Every 60 seconds minimum

### **Gas Optimization**
- Batch operations where possible
- Efficient storage patterns
- Minimal external calls

---

**The StakeBasket ETF represents a sophisticated, production-ready investment vehicle that democratizes access to Core ecosystem staking while providing professional-grade fund management and automated yield optimization.**