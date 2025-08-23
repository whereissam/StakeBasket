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
    
    // StakeBasket Core (REDEPLOYED - 2025-08-23 after node restart)
    PriceFeed: '0x1343248Cbd4e291C6979e70a138f4c774e902561',
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
    // Core Testnet2 deployed contracts - DUAL STAKING DEPLOYMENT 2025-08-15 WITH MINTER FIX
    PriceFeed: '0x92d36203C9e13f839Fb5668655b123d678bC8049',
    StakingManager: '0x076A2418F51fc1eBd54e30030FD670709f8735B4', // Keep existing
    StakeBasketToken: '0x78B9B8e98d3df0F05cB0f7790524fB1432d430fD', // Actual token address used by StakeBasket
    StakeBasket: '0x13F8b7693445c180Ec11f211d9Af425920B795Af', // Original StakeBasket for native CORE deposits
    BasketStaking: '0xC2072F6546Af5FfE732707De5Db2925C55a2975B', // Keep existing
    MockCORE: '0x191e94fa59739e188dce837f7f6978d84727ad01', // WCORE on Core Testnet2
    MockCoreBTC: '0xB85d3F7E9AB21A113710E197082cEE752c52BC95', // Updated TestBTC
    MockCoreStaking: '0x19D3d383f362CdE3Ee4D5b351A05f8a789F71Fc2', // Keep existing
    MockLstBTC: '0xB85d3F7E9AB21A113710E197082cEE752c52BC95', // Same as TestBTC
    CoreOracle: '0x92d36203C9e13f839Fb5668655b123d678bC8049', // Using new PriceFeed
    
    // Governance
    BasketGovernance: '0x43e9E9f5DA3dF1e0E0659be7E321e9397E41aa8e', // Keep existing
    BasketToken: '0xBF609d32481229F68313073738836Fe39BFc2b9f', // Updated to new StakeBasketToken
    CoreDAOGovernanceProxy: '0x0000000000000000000000000000000000000000', // To be deployed
    
    // Liquid Staking
    CoreLiquidStakingManager: '0x0925Df2ae2eC60f0abFF0e7E4dCA6f4B16351c0E', // Keep existing
    StCoreToken: '0x19640421A039E231312c2C0941D8b112e02876C5', // Keep existing
    
    // Dual Staking Contracts - UPDATED WITH MINTER FIX
    MockDualStaking: '0x2b44f71B6EB9f2F981B08EA9Af582157075B34B9', // Deployer address as placeholder
    DualStakingBasket: '0xe7D1fF015ba6Af089063B6a5B2DD9203EabBFEfa', // NEW: Fixed minter authorization
    SatoshiTierBasket: '0xe7D1fF015ba6Af089063B6a5B2DD9203EabBFEfa', // Using new DualStakingBasket
    
    // Test Tokens and Faucet
    TestBTC: '0xB85d3F7E9AB21A113710E197082cEE752c52BC95', // New TestBTC token
    SimpleBTCFaucet: '0x71C75968d5A8a1634552F4B5352CBf996bA9b3E0', // Faucet for TestBTC
    
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