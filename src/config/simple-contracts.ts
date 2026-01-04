// Simple contract configuration for the rewritten staking system
// Follows Linus's "good taste" principles - minimal, clean, focused

export const SIMPLE_CONTRACT_ADDRESSES = {
  localhost: {
    SimplePriceFeed: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    SimpleBasketToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', 
    SimpleStaking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    // For testing - you can deploy mock BTC token
    BtcToken: '0x0000000000000000000000000000000000000000', // Set after BTC token deployment
  },
  coreTestnet2: {
    SimplePriceFeed: '0x0000000000000000000000000000000000000000', // Deploy to testnet
    SimpleBasketToken: '0x0000000000000000000000000000000000000000',
    SimpleStaking: '0x0000000000000000000000000000000000000000',
    BtcToken: '0x0000000000000000000000000000000000000000', // Real BTC token on Core testnet
  },
} as const;

export const SIMPLE_ABIS = {
  SimplePriceFeed: [
    {
      "inputs": [{"name": "asset", "type": "bytes32"}],
      "name": "getPrice",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "asset", "type": "bytes32"}, {"name": "updates", "type": "bytes[]"}],
      "name": "updatePrice",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCorePrice", 
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getBtcPrice",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const,

  SimpleStaking: [
    {
      "inputs": [{"name": "btcAmount", "type": "uint256"}],
      "name": "deposit",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{"name": "shares", "type": "uint256"}],
      "name": "withdraw", 
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPoolInfo",
      "outputs": [
        {"name": "totalCore", "type": "uint256"},
        {"name": "totalBtc", "type": "uint256"}, 
        {"name": "totalShares", "type": "uint256"},
        {"name": "sharePrice", "type": "uint256"},
        {"name": "currentRatio", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "needsRebalancing",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "rebalance",
      "outputs": [],
      "stateMutability": "nonpayable", 
      "type": "function"
    },
    {
      "inputs": [{"name": "_ratio", "type": "uint256"}],
      "name": "setTargetRatio",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const,

  SimpleBasketToken: [
    {
      "inputs": [{"name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view", 
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "approve",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const,

  BtcToken: [
    {
      "inputs": [{"name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "approve", 
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const
} as const;

// Network configuration
export const SIMPLE_NETWORKS = {
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  coreTestnet2: {
    chainId: 1114,
    name: 'Core Testnet2', 
    rpcUrl: 'https://rpcar.test2.btcs.network',
    nativeCurrency: { name: 'Core', symbol: 'tCORE2', decimals: 18 }
  }
} as const;

// Helper to get current network contracts
export function getSimpleContracts(network: keyof typeof SIMPLE_CONTRACT_ADDRESSES = 'localhost') {
  return SIMPLE_CONTRACT_ADDRESSES[network];
}

// Asset identifiers for price feed
export const PRICE_ASSETS = {
  CORE: '0x434f524500000000000000000000000000000000000000000000000000000000', // keccak256("CORE") 
  BTC: '0x4254430000000000000000000000000000000000000000000000000000000000',  // keccak256("BTC")
} as const;