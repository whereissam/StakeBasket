export const TEST_WALLET = {
  // WARNING: These are well-known test values from Hardhat/Anvil
  // NEVER use on mainnet - they are public knowledge!
  mnemonic: process.env.TEST_WALLET_MNEMONIC || 'test test test test test test test test test test test junk',
  address: process.env.TEST_WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  // Note: Private key intentionally not included for security
}

export const TEST_AMOUNTS = {
  stake: {
    small: '0.1',
    medium: '1',
    large: '5',
  },
  withdraw: {
    partial: '0.5',
    full: 'max',
  },
}

export const CONTRACT_ADDRESSES = {
  // These will be dynamically loaded from your config
  StakeBasket: '',
  DualStakingBasket: '',
  StakeBasketToken: '',
}

export const TEST_NETWORKS = {
  localhost: {
    name: 'Localhost',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
  },
  coreTestnet2: {
    name: 'Core Testnet',
    chainId: 1115,
    rpcUrl: 'https://rpc.test2.btcs.network',
  },
}

export const SELECTORS = {
  // Navigation and layout
  connectWallet: 'button:has-text("Connect Wallet")',
  walletAddress: 'text=/0x[a-fA-F0-9]{40}/',
  
  // Dashboard specific
  dashboardTitle: 'h1:has-text("StakeBasket Dashboard")',
  contractHealth: 'text=Contract Health:',
  checkHealthButton: 'button:has-text("Check Health")',
  
  // Staking form (dashboard)
  stakeForm: '.space-y-2:has(input[type="number"])',
  stakeInput: 'input[placeholder*="Enter"][placeholder*="amount"]',
  stakeButton: 'button:has-text("Stake Native")',
  maxSafeButton: 'button:has-text("Max Safe")',
  useAllButton: 'button:has-text("Use All")',
  
  // Withdrawal form
  withdrawForm: 'text=Smart Withdrawal',
  withdrawInput: 'input[placeholder*="BASKET"]',
  withdrawButton: 'button:has-text("Smart Redeem")',
  
  // Portfolio and balance info
  portfolioOverview: 'text=Portfolio Overview',
  coreBalance: 'text=/Available:.*CORE/',
  basketBalance: 'text=/BASKET/',
  
  // Network and contract info
  networkStatus: 'text=/Chain:/',
  contractInfo: 'text=/Contract Addresses/',
  
  // Transaction history
  transactionHistory: 'text=Recent Transactions',
  
  // BASKET staking page
  basketStakingTitle: 'h1:has-text("BASKET Staking")',
  
  // Dual staking page
  dualStakingInterface: 'text=Dual Staking',
  
  // Common UI elements
  loadingSpinner: '.animate-spin',
  errorMessage: 'text=/Error/',
  successMessage: 'text=/Success/',
}