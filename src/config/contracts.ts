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
    MockCORE: '0x95401dc811bb5740090279Ba06cfA8fcF6113778',
    MockCoreBTC: '0x998abeb3E57409262aE5b751f60747921B33613E',
    
    // Mock Staking
    MockCoreStaking: '0x8F4ec854Dd12F1fe79500a1f53D0cbB30f9b6134',
    MockLstBTC: '0xaB7B4c595d3cE8C85e16DA86630f2fc223B05057', // Using coreBTC as lstBTC
    
    // StakeBasket Core
    PriceFeed: '0x2b5A4e5493d4a54E717057B127cf0C000C876f9B',
    StakingManager: '0x12Bcb546bC60fF39F1Adfc7cE4605d5Bd6a6A876',
    StakeBasketToken: '0xeF31027350Be2c7439C1b0BE022d49421488b72C',
    StakeBasket: '0xaC47e91215fb80462139756f43438402998E4A3a',
    BasketStaking: '0x5133BBdfCCa3Eb4F739D599ee4eC45cBCD0E16c5',
    CoreOracle: '', // Not deployed on hardhat
    
    // Governance
    BasketGovernance: '0x71089Ba41e478702e1904692385Be3972B2cBf9e',
    BasketToken: '0xAD523115cd35a8d4E60B3C0953E0E0ac10418309', // BASKET governance token
    
    // Liquid Staking
    CoreLiquidStakingManager: '0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F',
    StCoreToken: '0xc96825EB7Cf77649A9324562d9dE5Ed9605EAA0A',
    
    // Dual Staking Contracts
    MockDualStaking: '0xf4B146FbA71F41E0592668ffbF264F1D186b2Ca8', // ProperDualStaking contract
    DualStakingBasket: '0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3',
    SatoshiTierBasket: '0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3', // Using DualStakingBasket
    
    // Unbonding
    UnbondingQueue: '0x1780bCf4103D3F501463AD3414c7f4b654bb7aFd',
    
    // Sparks System Contracts
    SparksManager: '0x0000000000000000000000000000000000000000', // To be deployed
    StakeBasketWithSparks: '0x0000000000000000000000000000000000000000', // To be deployed
  },
  coreTestnet2: {
    // Core Testnet2 deployed contracts
    PriceFeed: '0x44bADCE57249649CD4ECa8852020527148323584',
    StakingManager: '0x4dE3513095f841b06A01CC3FFd5C25b1dfb69019',
    StakeBasketToken: '0x65507FCcfe3daE3cfb456Eb257a2eaefd463336B',
    StakeBasket: '0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422',
    BasketStaking: '0x0000000000000000000000000000000000000000', // To be deployed
    MockCORE: '0x16a77F70571b099B659BD5255d341ae57e913F52',
    MockCoreBTC: '0x67eF484F426B92894eaE16DC1Aa3dba5B8F9f051',
    MockCoreStaking: '0x44Aa833Ad1a9aD19743Ee6CC7A1Cae096f5CDD9E',
    MockLstBTC: '0xfC802f5ce0bf76644874C2Eb5d8885fD852244bC',
    CoreOracle: '0xf630BC778a0030dd658F116b40cB23B4dd37051E',
    
    // Governance
    BasketGovernance: '0x0000000000000000000000000000000000000000', // To be deployed
    BasketToken: '0x0000000000000000000000000000000000000000', // To be deployed
    
    // Liquid Staking
    CoreLiquidStakingManager: '0x0000000000000000000000000000000000000000', // To be deployed
    StCoreToken: '0x0000000000000000000000000000000000000000', // To be deployed
    
    // Dual Staking Contracts
    MockDualStaking: '0x0000000000000000000000000000000000000000', // To be deployed
    DualStakingBasket: '0x0000000000000000000000000000000000000000', // To be deployed
    SatoshiTierBasket: '0x0000000000000000000000000000000000000000', // To be deployed
    
    // Unbonding
    UnbondingQueue: '0x0000000000000000000000000000000000000000', // To be deployed
    
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