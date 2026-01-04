// Production testnet configuration
const config = {
  network: "coreTestnet2",
  chainId: 1116,
  
  // Price feed configuration for production testing
  priceFeed: {
    stalenessCheckEnabled: true,  // ENABLED for production safety
    maxPriceAge: 3600,           // 1 hour for production
    prices: {
      CORE: "0.4481",            // Use real-time API prices
      BTC: "108916.96"           // Use real-time API prices  
    }
  },
  
  // Real contract addresses (from actual deployment)
  contracts: {
    stakeBasketToken: process.env.STAKE_BASKET_TOKEN_ADDRESS,
    priceFeed: process.env.PRICE_FEED_ADDRESS,
    stakeBasket: process.env.STAKE_BASKET_ADDRESS,
    dualStakingBasket: process.env.DUAL_STAKING_BASKET_ADDRESS,
    stakingManager: process.env.STAKING_MANAGER_ADDRESS,
    mockCORE: process.env.MOCK_CORE_ADDRESS,
    mockBTC: process.env.MOCK_BTC_ADDRESS
  },
  
  // Production testing parameters
  testing: {
    useEmergencySetup: false,    // Use proper two-step setup
    skipTimelock: false,         // Respect timelock delays
    useMockTokens: false,        // Use real tokens
    largeBalances: false         // Use realistic balances
  },
  
  // Realistic user setup for testnet
  users: {
    initialCoreBalance: "1000",  // 1K CORE (realistic)
    initialBtcBalance: "0.1",    // 0.1 BTC (realistic) 
    approvalAmount: "100"        // Reasonable approval amounts
  },
  
  // Production safety limits
  limits: {
    maxDepositCORE: "10000",     // 10K CORE max
    maxDepositBTC: "1",          // 1 BTC max
    maxTestUsers: 3              // Limit test users
  }
};

module.exports = config;