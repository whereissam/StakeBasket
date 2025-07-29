// Contract ABIs for frontend interaction

export const STAKEBASKET_ABI = [
  // Read functions
  'function getTotalAUM() public view returns (uint256)',
  'function totalPooledCore() public view returns (uint256)',
  'function totalPooledLstBTC() public view returns (uint256)',
  'function managementFeeBasisPoints() public view returns (uint256)',
  'function performanceFeeBasisPoints() public view returns (uint256)',
  'function owner() public view returns (address)',
  
  // Write functions
  'function deposit(uint256 amount) external payable',
  'function redeem(uint256 shares) external',
  'function pause() external',
  'function unpause() external',
  
  // Events
  'event Deposited(address indexed user, uint256 amount, uint256 shares)',
  'event Redeemed(address indexed user, uint256 shares, uint256 amount)',
] as const;

export const STAKEBASKET_TOKEN_ABI = [
  // ERC20 standard functions
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) public returns (bool)',
  
  // Custom functions
  'function stakeBasketContract() public view returns (address)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const MOCK_CORE_ABI = [
  // ERC20 functions
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transfer(address to, uint256 amount) public returns (bool)',
  
  // Faucet function
  'function faucet() external',
  'function mint(address to, uint256 amount) external',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const MOCK_CORE_BTC_ABI = [
  // ERC20 functions  
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transfer(address to, uint256 amount) public returns (bool)',
  
  // Faucet function
  'function faucet() external',
  'function mint(address to, uint256 amount) external',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const MOCK_LSTBTC_ABI = [
  // ERC20 functions
  'function name() public view returns (string)',
  'function symbol() public view returns (string)', 
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  
  // lstBTC specific functions
  'function mint(uint256 coreBTCAmount) external returns (uint256)',
  'function redeem(uint256 lstBTCAmount) external returns (uint256)',
  'function getExchangeRate() external view returns (uint256)',
  'function lstBTCToCoreBTC(uint256 lstBTCAmount) external view returns (uint256)',
  'function coreBTCToLstBTC(uint256 coreBTCAmount) external view returns (uint256)',
  'function getTotalValueLocked() external view returns (uint256)',
  'function getAPY() external pure returns (uint256)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Minted(address indexed user, uint256 coreBTCAmount, uint256 lstBTCAmount)',
  'event Redeemed(address indexed user, uint256 lstBTCAmount, uint256 coreBTCAmount)',
] as const;

export const PRICE_FEED_ABI = [
  // Price functions
  'function getCorePrice() external view returns (uint256)',
  'function getLstBTCPrice() external view returns (uint256)',
  'function setPrices(string[] memory assets, uint256[] memory prices) external',
  
  // Events
  'event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp)',
] as const;

export const MOCK_DUAL_STAKING_ABI = [
  // Staking functions
  'function stake(uint256 coreAmount, uint256 btcAmount) external',
  'function unstake(uint256 shares) external',
  'function claimRewards() external',
  
  // View functions
  'function getTierStatus(address user) external view returns (uint8 tier, uint256 coreStaked, uint256 btcStaked, uint256 ratio, uint256 rewards, uint256 apy)',
  'function getUserStakeInfo(address user) external view returns (uint256 coreStaked, uint256 btcStaked, uint256 shares, uint256 rewards, uint256 lastClaimTime)',
  'function getTierRequirements(uint8 tier) external view returns (uint256 ratio, uint256 apy, string memory name)',
  'function calculateTier(uint256 coreAmount, uint256 btcAmount) external pure returns (uint8)',
  'function estimateRewards(address user) external view returns (uint256)',
  
  // Tier ratios (CORE:BTC)
  'function TIER_RATIOS(uint8) external view returns (uint256)',
  'function TIER_APYS(uint8) external view returns (uint256)',
  
  // Events
  'event Staked(address indexed user, uint256 coreAmount, uint256 btcAmount, uint8 tier, uint256 shares)',
  'event Unstaked(address indexed user, uint256 shares, uint256 coreAmount, uint256 btcAmount)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
] as const;

export const SATOSHI_TIER_BASKET_ABI = [
  // Main functions
  'function depositForSatoshiTier(uint256 coreAmount, uint256 btcAmount) external',
  'function withdraw(uint256 shares) external',
  'function rebalance() external',
  
  // View functions
  'function getSatoshiTierStatus() external view returns (bool isSatoshiTier, uint256 currentRatio, uint256 targetRatio, uint256 rewardsEarned, uint256 estimatedAPY, bool needsRebalance, uint256 nextRebalanceThreshold)',
  'function estimateRequiredCORE(uint256 btcAmount) external pure returns (uint256)',
  'function validateSatoshiDeposit(uint256 coreAmount, uint256 btcAmount) external pure returns (bool valid, uint256 requiredCore, string memory reason)',
  'function needsRebalancing() external view returns (bool)',
  'function totalPooledCORE() external view returns (uint256)',
  'function totalPooledBTC() external view returns (uint256)',
  'function targetTier() external view returns (uint8)',
  'function getUserShares(address user) external view returns (uint256)',
  'function calculateShareValue(uint256 shares) external view returns (uint256 coreValue, uint256 btcValue)',
  
  // Constants
  'function SATOSHI_TIER_RATIO() external pure returns (uint256)',
  'function REBALANCE_THRESHOLD() external pure returns (uint256)',
  
  // Events
  'event DepositedForSatoshiTier(address indexed user, uint256 coreAmount, uint256 btcAmount, uint256 shares)',
  'event Withdrawn(address indexed user, uint256 shares, uint256 coreAmount, uint256 btcAmount)',
  'event Rebalanced(uint256 newCoreAmount, uint256 newBtcAmount, uint256 newRatio)',
] as const;

export const SPARKS_MANAGER_ABI = [
  // Core Sparks functions
  'function awardSparks(address user, uint256 amount, string calldata reason) external',
  'function spendSparks(address user, uint256 amount, string calldata reason) external returns (bool success)',
  'function getSparksBalance(address user) external view returns (uint256 balance)',
  'function getTotalSparksEarned(address user) external view returns (uint256 totalEarned)',
  'function hasEnoughSparks(address user, uint256 requiredAmount) external view returns (bool hasEnough)',
  
  // Tier and benefits
  'function getFeeReduction(address user) external view returns (uint256 reductionPercent)',
  'function getUserTier(address user) external view returns (uint256 tier)',
  'function getUserSparksInfo(address user) external view returns (uint256 balance, uint256 totalEarned, uint256 tier, uint256 feeReduction, uint256 nextTierThreshold)',
  
  // History and management
  'function getSparksHistory(address user, uint256 offset, uint256 limit) external view returns (tuple(uint256 timestamp, uint256 amount, string reason, bool isEarning)[] memory history)',
  'function updateBasketHoldingSparks(address user, uint256 basketBalance) external',
  
  // Constants
  'function BASKET_HOLDING_RATE() external view returns (uint256)',
  'function BRONZE_THRESHOLD() external view returns (uint256)',
  'function SILVER_THRESHOLD() external view returns (uint256)',
  'function GOLD_THRESHOLD() external view returns (uint256)',
  'function PLATINUM_THRESHOLD() external view returns (uint256)',
  
  // Events
  'event SparksAwarded(address indexed user, uint256 amount, string reason)',
  'event SparksSpent(address indexed user, uint256 amount, string reason)',
] as const;

export const STAKEBASKET_WITH_SPARKS_ABI = [
  // Core StakeBasket functions with Sparks integration
  'function deposit(uint256 amount) external payable',
  'function redeem(uint256 shares) external',
  'function updateUserSparks(address user) external',
  
  // View functions
  'function getTotalAUM() external view returns (uint256)',
  'function getNAVPerShare() external view returns (uint256)',
  'function etfToken() external view returns (address)',
  'function sparksManager() external view returns (address)',
  
  // Sparks integration
  'function getUserSparksInfo(address user) external view returns (uint256 sparksBalance, uint256 totalEarned, uint256 tier, uint256 feeReduction, uint256 nextTierThreshold)',
  'function lastSparksUpdate(address user) external view returns (uint256)',
  
  // Events with Sparks
  'event Deposited(address indexed user, uint256 coreAmount, uint256 sharesIssued, uint256 sparksAwarded)',
  'event Redeemed(address indexed user, uint256 sharesBurned, uint256 coreAmount)',
  'event SparksUpdated(address indexed user, uint256 basketBalance)',
  'event FeeReductionApplied(address indexed user, uint256 originalFee, uint256 reducedFee, uint256 reductionPercent)',
] as const;