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
    MockCORE: '0x525C7063E7C20997BaaE9bDa922159152D0e8417',
    MockCoreBTC: '0x38a024C0b412B9d1db8BC398140D00F5Af3093D4',
    
    // Mock Staking
    MockCoreStaking: '0x8A93d247134d91e0de6f96547cB0204e5BE8e5D8',
    MockLstBTC: '0x38a024C0b412B9d1db8BC398140D00F5Af3093D4', // Using MockCoreBTC as lstBTC
    
    // StakeBasket Core (from local deployment)
    PriceFeed: '0x5fc748f1FEb28d7b76fa1c6B07D8ba2d5535177c',
    StakingManager: '0x2a810409872AfC346F9B5b26571Fd6eC42EA4849',
    StakeBasketToken: '0xB82008565FdC7e44609fA118A4a681E92581e680',
    StakeBasket: '0xb9bEECD1A582768711dE1EE7B0A1d582D9d72a6C',
    BasketStaking: '0xb9bEECD1A582768711dE1EE7B0A1d582D9d72a6C',
    CoreOracle: '0x5fc748f1FEb28d7b76fa1c6B07D8ba2d5535177c', // Using PriceFeed as oracle
    
    // Governance
    BasketGovernance: '0x0000000000000000000000000000000000000000',
    BasketToken: '0xB82008565FdC7e44609fA118A4a681E92581e680', // Using StakeBasketToken
    
    // Liquid Staking
    CoreLiquidStakingManager: '0x0000000000000000000000000000000000000000',
    StCoreToken: '0x0000000000000000000000000000000000000000',
    
    // Dual Staking Contracts (from local deployment)
    MockDualStaking: '0x8A93d247134d91e0de6f96547cB0204e5BE8e5D8',
    DualStakingBasket: '0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849',
    SatoshiTierBasket: '0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849', // Using DualStakingBasket
    
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