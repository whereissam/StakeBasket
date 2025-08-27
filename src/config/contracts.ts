// Contract addresses and configurations for different networks
// CACHE BUSTER: v2.1 - Updated dual staking addresses
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
    // Use proxy in development, direct endpoint in production
    rpcUrl: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? '/api/rpc' 
      : 'https://rpcar.test2.btcs.network',
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
    // Mock Tokens (from local deployment)
    MockCORE: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    MockCoreBTC: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    
    // Mock Staking
    MockCoreStaking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MockLstBTC: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    
    // StakeBasket Core (UPDATED - 2025-08-25 with Pyth Network integration)
    PriceFeed: '0x2c8ED11fd7A058096F2e5828799c68BE88744E2F',
    StakingManager: '0x547382C0D1b23f707918D3c83A77317B71Aa8470',
    StakeBasketToken: '0x22a9B82A6c3D2BFB68F324B2e8367f346Dd6f32a',
    StakeBasket: '0x7C8BaafA542c57fF9B2B90612bf8aB9E86e22C09',
    BasketStaking: '0xa82ff9afd8f496c3d6ac40e2a0f282e47488cfc9',
    CoreOracle: '0x1343248Cbd4e291C6979e70a138f4c774e902561', // Using PriceFeed as oracle
    
    // Governance (newly deployed)
    BasketGovernance: '0xe70f935c32dA4dB13e7876795f1e175465e6458e',
    BasketToken: '0xe039608E695D21aB11675EBBA00261A0e750526c', // Using newly deployed StakeBasketToken
    CoreDAOGovernanceProxy: '0x3904b8f5b0F49cD206b7d5AABeE5D1F37eE15D8d',
    
    // Liquid Staking
    CoreLiquidStakingManager: '0x0000000000000000000000000000000000000000',
    StCoreToken: '0x0000000000000000000000000000000000000000',
    
    // Dual Staking Contracts (FRESH DEPLOYMENT - 2025-08-23)
    MockDualStaking: '0x871ACbEabBaf8Bed65c22ba7132beCFaBf8c27B5',
    DualStakingBasket: '0x6A59CC73e334b018C9922793d96Df84B538E6fD5',
    SatoshiTierBasket: '0x6A59CC73e334b018C9922793d96Df84B538E6fD5', // Using DualStakingBasket
    
    // Unbonding
    UnbondingQueue: '0x0000000000000000000000000000000000000000',
    
    // Sparks System Contracts
    SparksManager: '0x0000000000000000000000000000000000000000', // To be deployed
    StakeBasketWithSparks: '0x0000000000000000000000000000000000000000', // To be deployed
  },
  coreTestnet2: {
    // Core Testnet2 deployed contracts - LATEST DEPLOYMENT with Switchboard integration
    PriceFeed: '0xd3fC275555C46Ffa4a6F9d15380D4edA9D9fb06b',
    StakingManager: '0x3185E363446163581Fcc1ed3D85029b1C7A7520A', 
    StakeBasketToken: '0xf98167f5f4BFC87eD67D8eAe3590B00630f864b6',
    StakeBasket: '0x958C634b197fE5F09ba3012D45B4281F0C278821',
    BasketStaking: '0x958C634b197fE5F09ba3012D45B4281F0C278821', // Using new StakeBasket
    MockCORE: '0xa41575D35563288d6C59d8a02603dF9E2e171eeE',
    MockCoreBTC: '0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7',
    MockCoreStaking: '0xd7c4D6f6f0aFCABaAa3B2c514Fb1C2f62cf8326A',
    MockLstBTC: '0xE03484f1682fa55c2AB9bbCF8e451b857EcE6DA8',
    CoreOracle: '0xd3fC275555C46Ffa4a6F9d15380D4edA9D9fb06b', // Using updated PriceFeed with Switchboard
    
    // Governance
    BasketGovernance: '0x43e9E9f5DA3dF1e0E0659be7E321e9397E41aa8e', // Keep existing
    BasketToken: '0xBF609d32481229F68313073738836Fe39BFc2b9f', // Updated to new StakeBasketToken
    CoreDAOGovernanceProxy: '0x0000000000000000000000000000000000000000', // To be deployed
    
    // Liquid Staking
    CoreLiquidStakingManager: '0x0925Df2ae2eC60f0abFF0e7E4dCA6f4B16351c0E', // Keep existing
    StCoreToken: '0x19640421A039E231312c2C0941D8b112e02876C5', // Keep existing
    
    // Dual Staking Contracts - DEPLOYED 2025-08-27 (SWITCHBOARD INTEGRATION)
    MockDualStaking: '0xd7c4D6f6f0aFCABaAa3B2c514Fb1C2f62cf8326A', // MockCoreStaking
    DualStakingBasket: '0x0DD17d450968DafF1Cf9E2e8945E934B77CA4a4a', // SWITCHBOARD REAL-TIME PRICES
    SatoshiTierBasket: '0x0DD17d450968DafF1Cf9E2e8945E934B77CA4a4a', // Using DualStakingBasket
    
    // Test Tokens and Faucet
    TestBTC: '0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7', // MockCoreBTC
    SimpleBTCFaucet: '0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7', // MockCoreBTC has faucet
    
    // Unbonding
    UnbondingQueue: '0x0A4a6dB1718A515EA613873271b505BA5b1aB256', // Keep existing
    
    // Sparks System Contracts
    SparksManager: '0x0000000000000000000000000000000000000000', // To be deployed
    StakeBasketWithSparks: '0x0000000000000000000000000000000000000000', // To be deployed
  },
  coreMainnet: {
    // To be updated when deploying to Core Mainnet
    PriceFeed: '',
    StakingManager: '',
    StakeBasketToken: '',
    StakeBasket: '',
    BasketStaking: '',
    MockCORE: '',
    MockCoreBTC: '',
    MockCoreStaking: '',
    MockLstBTC: '',
    CoreOracle: '',
    
    // Governance
    BasketGovernance: '',
    BasketToken: '',
    CoreDAOGovernanceProxy: '',
    
    // Liquid Staking
    CoreLiquidStakingManager: '',
    StCoreToken: '',
    
    // Dual Staking Contracts
    MockDualStaking: '',
    DualStakingBasket: '',
    SatoshiTierBasket: '',
    
    // Unbonding
    UnbondingQueue: '',
    
    // Sparks System Contracts
    SparksManager: '',
    StakeBasketWithSparks: '',
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
      // Return hardhat config as fallback, but transactions will be blocked by network validation
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