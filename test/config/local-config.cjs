// Local testing configuration
const config = {
  network: "localhost",
  chainId: 31337,
  
  // Price feed configuration for local testing
  priceFeed: {
    stalenessCheckEnabled: false, // Disabled for local testing
    maxPriceAge: 3600, // 1 hour
    prices: {
      CORE: "0.4481", // Current market price
      BTC: "108916.96"  // Current market price
    }
  },
  
  // Contract addresses (will be populated after deployment)
  contracts: {
    stakeBasketToken: null,
    priceFeed: null,
    stakeBasket: null,
    dualStakingBasket: null,
    stakingManager: null,
    mockCORE: null,
    mockBTC: null
  },
  
  // Test parameters
  testing: {
    useEmergencySetup: true, // Use emergency functions for immediate setup
    skipTimelock: true,      // Skip timelock delays
    useMockTokens: true,     // Use mock tokens instead of real ones
    largeBalances: true      // Mint large test balances
  },
  
  // User setup
  users: {
    initialCoreBalance: "1000000", // 1M CORE for testing
    initialBtcBalance: "100",      // 100 BTC for testing
    approvalAmount: "100000"       // Large approval amounts
  }
};

module.exports = config;