# 🧪 StakeBasket Protocol Testing Guide

Complete testing strategy to verify all contracts work correctly together.

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Start local node
npx hardhat node
```

### 2. Run Complete Test Suite
```bash
# Full deployment + integration tests
npx hardhat run scripts/deploy-and-test.js --network localhost

# Individual contract tests
npx hardhat run scripts/test-individual-contracts.js --network localhost

# Stress tests
npx hardhat run scripts/stress-test.js --network localhost
```

## 📋 Test Scenarios Covered

### ✅ **Deployment Tests**
- [x] Correct deployment order
- [x] Constructor parameter validation
- [x] Contract initialization
- [x] Cross-contract address setting
- [x] Default configuration

### ✅ **Integration Tests**

#### **StakeBasket ETF Flow**
```javascript
// Test: User deposits ETH → receives BASKET shares
await stakeBasket.connect(user).deposit(ethers.parseEther("1"), { 
    value: ethers.parseEther("1") 
});
```

#### **Governance Staking Flow**
```javascript
// Test: Stake BASKET → get tier benefits → voting power
await basketStaking.connect(user).stake(ethers.parseEther("150"));
const tier = await basketStaking.getUserTier(user.address);
const feeReduction = await basketStaking.getFeeReduction(user.address);
```

#### **Liquid Staking Flow**
```javascript
// Test: Stake ETH → receive stCORE → compound rewards
await coreLiquidStaking.connect(user).stake(ethers.ZeroAddress, { 
    value: ethers.parseEther("2") 
});
```

#### **Dual Staking Flow**
```javascript
// Test: Stake CORE+BTC → achieve optimal ratios → maximize yield
await mockDualStaking.connect(user).stakeCORE(ethers.parseEther("2000"));
await mockDualStaking.connect(user).stakeBTC(ethers.parseEther("1"));
```

### ✅ **Individual Contract Tests**

#### **PriceFeed**
- Price updates and validation
- Staleness checks
- Circuit breaker functionality
- Multi-asset price management

#### **UnbondingQueue**
- Queue position tracking
- Unbonding period enforcement
- Instant withdrawal eligibility
- Queue statistics

#### **BasketStaking**
- Tier calculation and benefits
- Fee reduction application
- Voting power multipliers
- Reward distribution

#### **MockCoreStaking**
- Validator management
- Delegation and rewards
- Risk scoring
- ETH handling

### ✅ **Stress Tests**

#### **High Volume Operations**
- 10+ concurrent users
- Simultaneous stake/unstake
- Performance measurement
- State consistency checks

#### **Edge Cases**
- Minimum amounts (1 wei)
- Maximum amounts (999,999 ETH)
- Zero balances
- Overflow protection

#### **Rapid State Changes**
- 20+ rapid stake/unstake cycles
- Flash loan attack simulation
- State consistency validation

#### **Gas Optimization**
- Gas usage measurement
- Batch operation efficiency
- Large-scale reward distribution

## 🎯 Expected Test Results

### **Successful Deployment Output**
```
🚀 Starting StakeBasket Protocol Deployment & Testing...

1️⃣ Deploying Core Infrastructure...
✅ PriceFeed deployed: 0x123...
✅ UnbondingQueue deployed: 0x456...

2️⃣ Deploying Mock Tokens...
✅ MockCoreToken deployed: 0x789...
✅ MockBTCToken deployed: 0xabc...

[... continued deployment logs ...]

8️⃣ Initializing Contracts...
✅ StakeBasketToken initialized
✅ StCoreToken initialized
✅ StakeBasket initialized

🎉 Deployment Complete! Starting Integration Tests...
```

### **Integration Test Results**
```
🧪 Running Integration Tests...

Test 1: StakeBasket ETF Flow
✅ User1 deposited 1.0 ETH, received 1.0 BASKET shares

Test 2: Governance Staking Flow  
✅ User1 staked 150.0 BASKET, achieved tier 1, fee reduction: 5%

Test 3: Liquid Staking Flow
✅ User2 staked 2.0 ETH, received 2.0 stCORE
✅ Current conversion rate: 1.0 CORE per stCORE

Test 4: Dual Staking Flow
✅ User1 dual staking: 2000.0 CORE + 1.0 BTC
✅ Achieved tier 2000000000000000000000 with 12.0% APY

Test 5: Governance Proposal Flow
✅ User1 created proposal ID: 1
✅ User1 voted with voting power: 165.0

🎉 All Integration Tests Passed!
```

## 🔍 Manual Testing Checklist

### **Pre-deployment Verification**
- [ ] All contracts compile without errors
- [ ] No circular import dependencies  
- [ ] Constructor parameters validated
- [ ] Interface implementations complete

### **Post-deployment Verification**
- [ ] All contracts deployed successfully
- [ ] Contract addresses saved correctly
- [ ] Initial parameters set properly
- [ ] Cross-contract references established

### **Functionality Testing**
- [ ] Users can deposit into StakeBasket
- [ ] BASKET tokens mint correctly
- [ ] Tier system works for governance staking
- [ ] Liquid staking produces stCORE tokens
- [ ] Price feeds update correctly
- [ ] Reward distribution functions

### **Security Testing**
- [ ] Reentrancy guards active
- [ ] Access control enforced
- [ ] Input validation working
- [ ] Emergency pause functions
- [ ] No unprotected external calls

## 🚨 Common Issues & Solutions

### **Deployment Failures**

#### Issue: Constructor parameter mismatch
```
Error: Invalid constructor arguments
```
**Solution:** Check deployment-config.json parameter order

#### Issue: Circular dependency
```  
Error: Contract not deployed yet
```
**Solution:** Follow deployment order in DeploymentScript.sol

### **Integration Issues**

#### Issue: Token transfer failures
```
Error: ERC20: insufficient allowance
```
**Solution:** Ensure proper approval before transfers

#### Issue: Staking tier not updating
```
Expected tier 1, got tier 0
```
**Solution:** Check minimum threshold requirements

### **Performance Issues**

#### Issue: High gas costs
```
Gas estimation failed
```
**Solution:** Optimize batch operations, check for loops

#### Issue: Transaction timeouts
```
Transaction timeout
```
**Solution:** Increase gas limit or split operations

## 📊 Success Metrics

### **Deployment Success**
- ✅ All 15+ contracts deployed
- ✅ Zero deployment failures
- ✅ All initializations complete
- ✅ Gas costs within reasonable limits

### **Integration Success**
- ✅ All 7 integration tests pass
- ✅ Cross-contract communication works
- ✅ State consistency maintained
- ✅ User flows complete end-to-end

### **Performance Success**
- ✅ <500K gas per major operation
- ✅ <10 second transaction times
- ✅ 10+ concurrent users supported
- ✅ 20+ rapid operations handled

## 🎉 Final Verification

After all tests pass, verify the protocol is production-ready:

1. **Review deployment addresses** in `deployment-addresses.json`
2. **Check all contract interactions** work as expected
3. **Validate economic parameters** are set correctly
4. **Confirm security measures** are active
5. **Test with real user wallets** if desired

The protocol is ready for mainnet deployment once all tests pass! 🚀