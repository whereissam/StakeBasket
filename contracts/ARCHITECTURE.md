# StakeBasket Protocol Architecture

## Recent Updates

**✅ OpenZeppelin v5 Compatibility (Latest Update)**
- All contracts updated to work with OpenZeppelin v5.x
- Fixed constructor patterns for `Ownable` contracts requiring `initialOwner` parameter
- Updated function calls for ERC20 methods with proper `super.` prefix
- Resolved interface compatibility and address casting issues
- Core Testnet2 configuration updated (Chain ID: 1114, RPC: https://rpc.test2.btcs.network)

**✅ Contract Deployment Status**
- Individual contract tests: ✅ All passing
- Core compilation: ✅ No errors
- Basic deployment: ✅ Working
- Legacy integration tests: ⚠️ May need v5 updates

## System Architecture Diagram

```
                            ┌─────────────────────────────────────────────────────────────┐
                            │                  STAKEBASKET PROTOCOL                       │
                            └─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    GOVERNANCE LAYER                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│  ┌─────────────────────┐              ┌─────────────────────┐              ┌─────────────────────┐      │
│  │   BasketGovernance  │◄────────────►│   BasketStaking     │◄────────────►│ CoreDAOGovernance   │      │
│  │                     │              │                     │              │     Proxy          │      │
│  │ • Proposals         │              │ • Tiered Benefits   │              │ • CoreDAO Bridge    │      │
│  │ • Voting            │              │ • Fee Reductions    │              │ • Vote Aggregation  │      │
│  │ • Execution         │              │ • Voting Multiplier │              │ • Validator Delegation │   │
│  │ • 3-day periods     │              │ • ETH Rewards       │              │ • Hash Power Mgmt   │      │
│  └─────────────────────┘              └─────────────────────┘              └─────────────────────┘      │
│           │                                     │                                     │                 │
│           └──────────── Voting Power ──────────┘                                     │                 │
│                              Multipliers                                             │                 │
└─────────────────────────────────────────────────────────────────────────────────────┼─────────────────┘
                                                                                        │
                                                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                LIQUID STAKING LAYER                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│  ┌─────────────────────┐              ┌─────────────────────┐              ┌─────────────────────┐      │
│  │CoreLiquidStaking    │◄────────────►│    StCoreToken      │              │   UnbondingQueue    │      │
│  │     Manager         │              │                     │              │                     │      │
│  │                     │              │ • Liquid stCORE     │              │ • 7-day unbonding   │      │
│  │ • CORE Staking      │              │ • Dynamic Rate      │              │ • Queue Management  │      │
│  │ • Validator Mgmt    │              │ • Reward Compound   │              │ • Instant Withdraw  │      │
│  │ • Auto Rebalance    │              │ • ERC20 Standard    │              │ • Position Tracking │      │
│  │ • Reward Collection │              └─────────────────────┘              └─────────────────────┘      │
│  └─────────────────────┘                        │                                     │                 │
│           │                                     │                                     │                 │
│           └──────────── Minting/Burning ───────┘                                     │                 │
│                                                                                       │                 │
└─────────────────────────────────────────────────────────────────────────────────────┼─────────────────┘
                                                                                        │
                                                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  MULTI-ASSET ETF LAYER                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│  ┌─────────────────────┐              ┌─────────────────────┐              ┌─────────────────────┐      │
│  │    StakeBasket      │◄────────────►│ StakeBasketToken    │              │ DualStakingBasket   │      │
│  │                     │              │                     │              │                     │      │
│  │ • Multi-Asset ETF   │              │ • ETF Shares        │              │ • Dual Staking Opt  │      │
│  │ • CORE + lstBTC     │              │ • NAV-based Pricing │              │ • CORE:BTC Ratios   │      │
│  │ • Fee Discounts     │              │ • Proportional Own  │              │ • 4 Yield Tiers     │      │
│  │ • Automatic Rebal   │              └─────────────────────┘              │ • DEX Integration   │      │
│  └─────────────────────┘                        │                         └─────────────────────┘      │
│           │                                     │                                     │                 │
│           └──────────── Share Minting ─────────┘                                     │                 │
│           │                                                                           │                 │
│           ▼                                                                           ▼                 │
│  ┌─────────────────────┐                                                    ┌─────────────────────┐      │
│  │   StakingManager    │                                                    │    PriceFeed        │      │
│  │                     │                                                    │                     │      │
│  │ • External Staking  │                                                    │ • Oracle Integration│      │
│  │ • Validator Coord   │                                                    │ • CORE/BTC/lstBTC   │      │
│  │ • lstBTC Mint/Burn  │                                                    │ • Circuit Breakers  │      │
│  │ • Auto Rebalancing  │                                                    │ • Staleness Check   │      │
│  └─────────────────────┘                                                    └─────────────────────┘      │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL INTEGRATIONS                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│  ┌─────────────────────┐              ┌─────────────────────┐              ┌─────────────────────┐      │
│  │  MockCoreStaking    │              │   CoreDAO Network   │              │    DEX Routers      │      │
│  │                     │              │                     │              │                     │      │
│  │ • Validator Sim     │              │ • Real Validators   │              │ • Token Swaps       │      │
│  │ • Reward Simulation │              │ • Actual Staking    │              │ • Liquidity Pools   │      │
│  │ • Risk Scoring      │              │ • Network Security  │              │ • Price Discovery   │      │
│  │ • Testing Infra     │              │ • Governance        │              │ • Slippage Control  │      │
│  └─────────────────────┘              └─────────────────────┘              └─────────────────────┘      │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
                                          USER INTERACTIONS
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
            ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
            │   GOVERNANCE  │           │ LIQUID STAKING│           │   ETF DEPOSIT │
            │               │           │               │           │               │
            │ 1. Stake      │           │ 1. Deposit    │           │ 1. Deposit    │
            │    BASKET     │           │    CORE       │           │    CORE+lstBTC│
            │ 2. Get Tier   │           │ 2. Receive    │           │ 2. Receive    │
            │    Benefits   │           │    stCORE     │           │    ETF Shares │
            │ 3. Vote on    │           │ 3. Earn       │           │ 3. Earn       │
            │    Proposals  │           │    Rewards    │           │    Yield      │
            └───────────────┘           └───────────────┘           └───────────────┘
                    │                           │                           │
                    ▼                           ▼                           ▼
            ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
            │ TIER BENEFITS │           │   VALIDATORS  │           │  YIELD SOURCES│
            │               │           │               │           │               │
            │ • Fee Reduction│          │ • Delegation  │           │ • CORE Staking│
            │ • Voting Power│           │ • Rebalancing │           │ • lstBTC Yield│
            │ • Priority    │           │ • Rewards     │           │ • Dual Staking│
            │   Access      │           │   Collection  │           │   Bonuses     │
            └───────────────┘           └───────────────┘           └───────────────┘
                    │                           │                           │
                    └───────────────────────────┼───────────────────────────┘
                                                │
                                                ▼
                                      ┌───────────────┐
                                      │ PROTOCOL FEES │
                                      │               │
                                      │ • Management  │
                                      │ • Performance │
                                      │ • Distribution│
                                      │   to Stakers  │
                                      └───────────────┘
```

## Contract Interaction Matrix

```
                 ┌─BG─┬─BS─┬─SB─┬─SBT┬─SM─┬─CLM┬─SCT┬─DSB┬─PF─┬─UQ─┬─CDP┬─MCS┐
BasketGovernance │ ● │ ◆ │   │   │   │   │   │   │   │   │ ◆ │   │ BG
BasketStaking    │ ◆ │ ● │ ◆ │   │   │   │   │   │   │   │   │   │ BS 
StakeBasket      │   │ ◆ │ ● │ ◆ │ ◆ │   │   │   │ ◆ │   │   │   │ SB 
StakeBasketToken │   │   │ ◆ │ ● │   │   │   │   │   │   │   │   │ SBT
StakingManager   │   │   │ ◆ │   │ ● │   │   │   │ ◆ │   │   │ ◆ │ SM 
CoreLiquidStaking│   │   │   │   │   │ ● │ ◆ │   │   │ ◆ │   │ ◆ │ CLM
StCoreToken      │   │   │   │   │   │ ◆ │ ● │   │   │   │   │   │ SCT
DualStakingBasket│   │   │   │ ◆ │   │   │   │ ● │ ◆ │   │   │   │ DSB
PriceFeed        │   │   │ ◆ │   │ ◆ │   │   │ ◆ │ ● │   │   │   │ PF 
UnbondingQueue   │   │   │   │   │   │ ◆ │   │   │   │ ● │   │   │ UQ 
CoreDAOProxy     │ ◆ │   │   │   │   │   │   │   │   │   │ ● │ ◆ │ CDP
MockCoreStaking  │   │   │   │   │ ◆ │ ◆ │   │   │   │   │ ◆ │ ● │ MCS

Legend: ● = Self  ◆ = Direct Integration  ○ = Indirect Integration
```

## Yield Optimization Flow

```
                          ┌─────────────────────────────────────────┐
                          │           YIELD SOURCES                 │
                          └─────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
        ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
        │    CORE STAKING     │   │    lstBTC YIELD     │   │   DUAL STAKING      │
        │                     │   │                     │   │     BONUSES         │
        │ • Base APY: ~8%     │   │ • Bitcoin Staking   │   │                     │
        │ • Validator Rewards │   │ • Liquid Derivative │   │ • 2000:1 → +20%     │
        │ • Auto-Compound    │   │ • Cross-chain Yield │   │ • 6000:1 → +35%     │
        │ • Risk Management   │   │ • Restaking Rewards │   │ • 16000:1 → +50%    │
        └─────────────────────┘   └─────────────────────┘   └─────────────────────┘
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────────────┐
                              │        OPTIMIZATION ENGINE              │
                              │                                         │
                              │ • Real-time Ratio Monitoring           │
                              │ • Automated DEX Rebalancing            │
                              │ • Validator Performance Tracking       │
                              │ • Risk-Adjusted Allocations            │
                              │ • Fee Minimization via Tiers           │
                              └─────────────────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────────────┐
                              │         USER BENEFITS                   │
                              │                                         │
                              │ • Maximized Yield (up to 12%+ APY)     │
                              │ • Reduced Fees (up to 50% discount)    │
                              │ • Automated Management                  │
                              │ • Diversified Risk Exposure             │
                              │ • Liquid Positions (tradeable tokens)  │
                              └─────────────────────────────────────────┘
```

## Security Architecture

```
                              ┌─────────────────────────────────────────┐
                              │          SECURITY LAYERS                │
                              └─────────────────────────────────────────┘
                                              │
                ┌─────────────────────────────┼─────────────────────────────┐
                │                             │                             │
                ▼                             ▼                             ▼
    ┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
    │   ACCESS CONTROL    │       │   REENTRANCY        │       │   CIRCUIT BREAKERS  │
    │                     │       │   PROTECTION        │       │                     │
    │ • Ownable           │       │                     │       │ • Price Deviation   │
    │ • Role-based Auth   │       │ • ReentrancyGuard   │       │ • Staleness Checks  │
    │ • Multi-sig Ready   │       │ • State Locks       │       │ • Emergency Pause   │
    │ • Timelock Delays   │       │ • CEI Pattern       │       │ • Risk Thresholds   │
    └─────────────────────┘       └─────────────────────┘       └─────────────────────┘
                │                             │                             │
                └─────────────────────────────┼─────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────────────┐
                              │        GOVERNANCE SAFEGUARDS            │
                              │                                         │
                              │ • Proposal Thresholds                  │
                              │ • Voting Periods (3 days)              │
                              │ • Execution Delays (1 day)             │
                              │ • Quorum Requirements (10%)            │
                              │ • Emergency Veto Powers                │
                              └─────────────────────────────────────────┘
```

---

**Legend:**
- **BG**: BasketGovernance
- **BS**: BasketStaking  
- **SB**: StakeBasket
- **SBT**: StakeBasketToken
- **SM**: StakingManager
- **CLM**: CoreLiquidStakingManager
- **SCT**: StCoreToken
- **DSB**: DualStakingBasket
- **PF**: PriceFeed
- **UQ**: UnbondingQueue
- **CDP**: CoreDAOGovernanceProxy
- **MCS**: MockCoreStaking

---

## Technical Implementation Details

### **OpenZeppelin v5 Migration Summary**

**Constructor Updates:**
- `StCoreToken`: Added `initialOwner` parameter to constructor
- `CoreLiquidStakingManager`: Added `initialOwner` parameter to constructor  
- `CoreDAOGovernanceProxy`: Updated address parameters to `address payable`
- All `Ownable` contracts now properly initialize with `Ownable(initialOwner)`

**Function Call Updates:**
- `StCoreToken.getTokenInfo()`: Fixed `name()`, `symbol()`, `decimals()`, `totalSupply()` with `super.` prefix
- `PriceFeed`: Updated `getLstBTCPrice()` to `getSolvBTCPrice()` across all contracts
- `ICoreStaking`: Fixed `claimRewards()` to `claimReward()` (singular)
- `StakingManager.delegateCore()`: Made function `payable` for ETH transfers

**Network Configuration:**
- Core Testnet2: Chain ID 1114 (updated from 1115)
- RPC URL: https://rpc.test2.btcs.network (updated from test.btcs.network)
- Faucet: https://scan.test2.btcs.network/faucet

### **Testing Status**

**✅ Verified Working Components:**
- Price feed oracle integration (CORE $1.5, BTC $95k)
- Unbonding queue with 7-day periods
- Token transfers and ERC20 functionality
- Validator delegation and reward simulation
- Tiered staking benefits (Bronze to Platinum)
- Liquid staking token conversions
- Contract compilation with OpenZeppelin v5

**✅ Recently Updated Components:**
- Legacy ETF integration tests → Modernized with OpenZeppelin v5 compatibility
- Stress testing scenarios → Enhanced with new governance test scenarios
- Frontend contract integration verification → Updated with new hooks and state management

**⚠️ Components Needing Updates:**
- Performance optimization for large-scale voting scenarios
- Cross-chain governance integration testing
- Enhanced security audit scenarios