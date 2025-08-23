import { toast } from 'sonner'

// Environment configuration
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || 
                      typeof window !== 'undefined' && 
                      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Supported networks
export const SUPPORTED_NETWORKS = {
  // Local development only
  HARDHAT: {
    chainId: 31337,
    name: 'Hardhat Local',
    symbol: 'ETH',
    rpcUrl: 'http://127.0.0.1:8545',
    isDevelopment: true,
    isProduction: false
  },
  // Core Testnet2
  CORE_TESTNET: {
    chainId: 1114,
    name: 'Core Testnet2',
    symbol: 'tCORE2',
    rpcUrl: 'https://rpcar.test2.btcs.network',
    isDevelopment: false,
    isProduction: false,
    addToWalletData: {
      chainName: 'Core Testnet2',
      nativeCurrency: {
        name: 'Core',
        symbol: 'tCORE2',
        decimals: 18
      },
      rpcUrls: ['https://rpcar.test2.btcs.network'],
      blockExplorerUrls: ['https://scan.test2.btcs.network']
    }
  },
  // Core Mainnet
  CORE_MAINNET: {
    chainId: 1116,
    name: 'Core Mainnet',
    symbol: 'CORE',
    rpcUrl: 'https://rpc.coredao.org/',
    isDevelopment: false,
    isProduction: true,
    addToWalletData: {
      chainName: 'Core Mainnet',
      nativeCurrency: {
        name: 'Core',
        symbol: 'CORE', 
        decimals: 18
      },
      rpcUrls: ['https://rpc.coredao.org/'],
      blockExplorerUrls: ['https://scan.coredao.org']
    }
  }
} as const

export type SupportedChainId = 31337 | 1114 | 1116

export interface NetworkValidationResult {
  isSupported: boolean
  isAvailable: boolean // Available in current environment (dev/prod)
  network?: typeof SUPPORTED_NETWORKS[keyof typeof SUPPORTED_NETWORKS]
  error?: string
  action?: 'switch' | 'add' | 'connect_wallet'
}

/**
 * Validate if the current network is supported
 */
export function validateNetwork(chainId?: number): NetworkValidationResult {
  if (!chainId) {
    return {
      isSupported: false,
      isAvailable: false,
      error: 'No network detected. Please connect your wallet.',
      action: 'connect_wallet'
    }
  }

  // Find the network
  const networkEntry = Object.values(SUPPORTED_NETWORKS).find(net => net.chainId === chainId)
  
  if (!networkEntry) {
    return {
      isSupported: false,
      isAvailable: false,
      error: `Unsupported network (Chain ID: ${chainId}). This app only supports CoreDAO networks.`,
      action: 'switch'
    }
  }

  // Check if network is available in current environment
  if (networkEntry.isDevelopment && !IS_DEVELOPMENT) {
    return {
      isSupported: true,
      isAvailable: false,
      network: networkEntry,
      error: 'Development network not available in production.',
      action: 'switch'
    }
  }

  return {
    isSupported: true,
    isAvailable: true,
    network: networkEntry
  }
}

/**
 * Get available networks for current environment
 */
export function getAvailableNetworks() {
  return Object.values(SUPPORTED_NETWORKS).filter(network => {
    if (IS_DEVELOPMENT) {
      return true // All networks available in development
    }
    return !network.isDevelopment // Only non-development networks in production
  })
}

/**
 * Get network info by chain ID
 */
export function getNetworkInfo(chainId: number) {
  return Object.values(SUPPORTED_NETWORKS).find(net => net.chainId === chainId)
}

/**
 * Switch to a supported network
 */
export async function switchToNetwork(chainId: SupportedChainId): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    toast.error('MetaMask not detected. Please install MetaMask.')
    return false
  }

  const network = getNetworkInfo(chainId)
  if (!network) {
    toast.error('Invalid network specified.')
    return false
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    })
    
    toast.success(`Switched to ${network.name}`)
    return true
  } catch (error: any) {
    // If network doesn't exist in wallet, try to add it
    if (error.code === 4902 || error.code === -32603) {
      return await addNetworkToWallet(chainId)
    }
    
    console.error('Failed to switch network:', error)
    toast.error(`Failed to switch to ${network.name}. Please switch manually in MetaMask.`)
    return false
  }
}

/**
 * Add network to wallet
 */
export async function addNetworkToWallet(chainId: SupportedChainId): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false
  }

  const network = getNetworkInfo(chainId)
  if (!network?.addToWalletData) {
    return false
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${chainId.toString(16)}`,
        ...network.addToWalletData
      }],
    })
    
    toast.success(`Added ${network.name} to MetaMask`)
    return true
  } catch (error) {
    console.error('Failed to add network:', error)
    toast.error(`Failed to add ${network.name} to MetaMask`)
    return false
  }
}

/**
 * Handle network validation with user feedback
 */
export function handleNetworkValidation(chainId?: number): NetworkValidationResult {
  const validation = validateNetwork(chainId)
  
  if (!validation.isSupported || !validation.isAvailable) {
    // Show appropriate toast message
    if (validation.error) {
      toast.error(validation.error, {
        duration: 6000,
        action: validation.action === 'switch' && chainId ? {
          label: 'Switch Network',
          onClick: () => {
            // Suggest switching to the preferred network
            const availableNetworks = getAvailableNetworks()
            const preferredNetwork = IS_DEVELOPMENT 
              ? availableNetworks.find(n => n.chainId === 1114) || availableNetworks[0] // Prefer testnet in dev
              : availableNetworks.find(n => n.isProduction) || availableNetworks[0] // Prefer mainnet in prod
            
            if (preferredNetwork) {
              switchToNetwork(preferredNetwork.chainId as SupportedChainId)
            }
          }
        } : undefined
      })
    }
  }
  
  return validation
}

/**
 * Get token symbol for display
 */
export function getTokenSymbol(chainId?: number): string {
  const network = chainId ? getNetworkInfo(chainId) : null
  return network?.symbol || 'TOKEN'
}

/**
 * Check if network is CoreDAO network
 */
export function isCoreDAONetwork(chainId?: number): boolean {
  return chainId === 1114 || chainId === 1116
}

/**
 * Check if network is local development network
 */
export function isLocalNetwork(chainId?: number): boolean {
  return chainId === 31337
}