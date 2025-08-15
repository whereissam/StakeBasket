import * as fs from 'fs'
import * as path from 'path'

// Load deployment addresses dynamically from various deployment files
function loadDeploymentAddresses(network: 'local' | 'testnet' | 'mainnet') {
  const deploymentFiles = {
    local: '../deployment-data/local-deployment.json',
    testnet: '../deployment-data/testnet-deployment.json', 
    mainnet: '../deployment-data/mainnet-deployment.json'
  }
  
  try {
    const deploymentPath = path.join(process.cwd(), deploymentFiles[network])
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
      console.log(`✅ Loaded ${network} deployment from: ${deploymentPath}`)
      
      return {
        MockCORE: deployment.contracts?.mockCORE || deployment.contracts?.MockCORE,
        MockCoreBTC: deployment.contracts?.mockCoreBTC || deployment.contracts?.MockCoreBTC,
        PriceFeed: deployment.contracts?.priceFeed || deployment.contracts?.PriceFeed,
        StakingManager: deployment.contracts?.stakingManager || deployment.contracts?.StakingManager,
        StakeBasketToken: deployment.contracts?.stakeBasketToken || deployment.contracts?.StakeBasketToken,
        StakeBasket: deployment.contracts?.stakeBasket || deployment.contracts?.StakeBasket,
        MockCoreStaking: deployment.contracts?.mockDualStaking || deployment.contracts?.MockCoreStaking,
        MockLstBTC: deployment.contracts?.mockLstBTC || deployment.contracts?.MockLstBTC,
        DualStakingBasket: deployment.contracts?.dualStakingBasket || deployment.contracts?.DualStakingBasket,
      }
    }
  } catch (error) {
    console.log(`⚠️  Failed to load ${network} deployment:`, error.message)
  }
  
  return null
}

// Get current environment
function getCurrentEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const network = process.env.NETWORK || 'hardhat'
  
  if (network === 'coreMainnet' || nodeEnv === 'production') return 'mainnet'
  if (network === 'coreTestnet2' || network === 'testnet') return 'testnet'
  return 'local'
}

// Centralized contract configuration
const environment = getCurrentEnvironment()
console.log(`🌍 Environment: ${environment}`)

// Load contracts based on environment
const dynamicAddresses = loadDeploymentAddresses(environment)

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  hardhat: dynamicAddresses || {
    // Fallback local addresses
    MockCORE: '0x04C89607413713Ec9775E14b954286519d836FEf',
    MockCoreBTC: '0x4C4a2f8c81640e47606d3fd77B353E87Ba015584',
    MockCoreStaking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MockLstBTC: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    PriceFeed: '0x21dF544947ba3E8b3c32561399E88B52Dc8b2823',
    StakingManager: '0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43',
    StakeBasketToken: '0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2',
    StakeBasket: '0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD',
    DualStakingBasket: '0x36b58F5C1969B7b6591D752ea6F5486D069010AB',
  },
  coreTestnet2: dynamicAddresses || {
    // Fallback testnet addresses - Core Testnet2  
    PriceFeed: '0x6383a1E50b86573ADe785A94Da4117673E6970B8',
    StakingManager: '0xF5624f3cf0bfa5595dFCF9d31D252720840A6514',
    StakeBasketToken: '0x8F541be038FDd36112f554aea3EE1aC1aa5CDB02',
    StakeBasket: '0xB16DD7cAAE9Ed2f498F68EE3EAdbC6c8289EB4b4',
    // No mock tokens in production deployment
    MockCORE: '0x0000000000000000000000000000000000000000',
    MockCoreBTC: '0x0000000000000000000000000000000000000000',
    MockCoreStaking: '0x0000000000000000000000000000000000000000',
    MockLstBTC: '0x0000000000000000000000000000000000000000',
    DualStakingBasket: '0x0000000000000000000000000000000000000000',
  },
  coreMainnet: dynamicAddresses || {
    // Fallback mainnet addresses - To be updated when deploying to Core Mainnet
    PriceFeed: '',
    StakingManager: '',
    StakeBasketToken: '',
    StakeBasket: '',
    MockCORE: '',
    MockCoreBTC: '',
    MockCoreStaking: '',
    MockLstBTC: '',
    DualStakingBasket: '',
  },
} as const

// Network configurations
export const NETWORKS = {
  hardhat: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
  },
  coreTestnet2: {
    chainId: 1114,
    name: 'Core Testnet2',
    rpcUrl: 'https://rpc.test2.btcs.network',
  },
  coreMainnet: {
    chainId: 1116,
    name: 'Core Mainnet',
    rpcUrl: 'https://rpc.coredao.org/',
  },
} as const