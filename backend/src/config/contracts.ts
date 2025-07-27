// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  hardhat: {
    // Mock Tokens
    MockCORE: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    MockCoreBTC: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    
    // Mock Staking
    MockCoreStaking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MockLstBTC: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    
    // StakeBasket Core
    PriceFeed: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    StakingManager: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    StakeBasketToken: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    StakeBasket: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  },
  coreTestnet: {
    // To be updated when deploying to Core Testnet
    PriceFeed: '',
    StakingManager: '',
    StakeBasketToken: '',
    StakeBasket: '',
    MockCORE: '',
    MockCoreBTC: '',
    MockCoreStaking: '',
    MockLstBTC: '',
  },
  coreMainnet: {
    // To be updated when deploying to Core Mainnet
    PriceFeed: '',
    StakingManager: '',
    StakeBasketToken: '',
    StakeBasket: '',
    MockCORE: '',
    MockCoreBTC: '',
    MockCoreStaking: '',
    MockLstBTC: '',
  },
} as const

// Network configurations
export const NETWORKS = {
  hardhat: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
  },
  coreTestnet: {
    chainId: 1115,
    name: 'Core Testnet',
    rpcUrl: 'https://rpc.test.btcs.network',
  },
  coreMainnet: {
    chainId: 1116,
    name: 'Core Mainnet',
    rpcUrl: 'https://rpc.coredao.org/',
  },
} as const