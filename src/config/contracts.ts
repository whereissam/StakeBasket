// Contract addresses and configurations for different networks
export const NETWORKS = {
  hardhat: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    explorer: 'http://localhost:8545',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  coreTestnet2: {
    chainId: 1114,
    name: 'Core Testnet2',
    rpcUrl: 'https://rpc.test2.btcs.network',
    explorer: 'https://scan.test2.btcs.network',
    nativeCurrency: {
      name: 'Core',
      symbol: 'tCORE2',
      decimals: 18,
    },
  },
  coreMainnet: {
    chainId: 1116,
    name: 'Core Mainnet', 
    rpcUrl: 'https://rpc.coredao.org/',
    explorer: 'https://scan.coredao.org',
    nativeCurrency: {
      name: 'Core',
      symbol: 'CORE',
      decimals: 18,
    },
  },
} as const;

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
    CoreOracle: '', // Not deployed on hardhat
  },
  coreTestnet2: {
    // Core Testnet2 deployed contracts
    PriceFeed: '0x44bADCE57249649CD4ECa8852020527148323584',
    StakingManager: '0x4dE3513095f841b06A01CC3FFd5C25b1dfb69019',
    StakeBasketToken: '0x65507FCcfe3daE3cfb456Eb257a2eaefd463336B',
    StakeBasket: '0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422',
    MockCORE: '0x16a77F70571b099B659BD5255d341ae57e913F52',
    MockCoreBTC: '0x67eF484F426B92894eaE16DC1Aa3dba5B8F9f051',
    MockCoreStaking: '0x44Aa833Ad1a9aD19743Ee6CC7A1Cae096f5CDD9E',
    MockLstBTC: '0xfC802f5ce0bf76644874C2Eb5d8885fD852244bC',
    CoreOracle: '0xf630BC778a0030dd658F116b40cB23B4dd37051E',
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
    CoreOracle: '',
  },
} as const;

// Get network configuration by chain ID
export function getNetworkByChainId(chainId: number) {
  switch (chainId) {
    case 31337: // Hardhat
      return { network: 'hardhat', config: NETWORKS.hardhat, contracts: CONTRACT_ADDRESSES.hardhat };
    case 1114: // Core Testnet2
      return { network: 'coreTestnet2', config: NETWORKS.coreTestnet2, contracts: CONTRACT_ADDRESSES.coreTestnet2 };
    case 1116: // Core Mainnet
      return { network: 'coreMainnet', config: NETWORKS.coreMainnet, contracts: CONTRACT_ADDRESSES.coreMainnet };
    default:
      return { network: 'hardhat', config: NETWORKS.hardhat, contracts: CONTRACT_ADDRESSES.hardhat };
  }
}

// Get current network configuration (legacy - use wagmi hooks instead)
export function getCurrentNetwork() {
  // Default to hardhat for local development
  const chainId = typeof window !== 'undefined' && window.ethereum 
    ? parseInt(window.ethereum.chainId, 16)
    : 31337;
  
  return getNetworkByChainId(chainId);
}

// Helper functions
export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.hardhat) {
  const { contracts } = getCurrentNetwork();
  return contracts[contractName as keyof typeof contracts] || '';
}

export function isLocalNetwork() {
  const { network } = getCurrentNetwork();
  return network === 'hardhat';
}

export function getExplorerUrl(address: string) {
  const { config } = getCurrentNetwork();
  return `${config.explorer}/address/${address}`;
}

export function getTxUrl(hash: string) {
  const { config } = getCurrentNetwork();
  return `${config.explorer}/tx/${hash}`;
}