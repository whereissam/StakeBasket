export interface NetworkConfig {
  id: number
  name: string
  shortName: string
  color: string
  icon: string
}

export const SUPPORTED_NETWORKS: NetworkConfig[] = [
  {
    id: 31337,
    name: 'Hardhat Local',
    shortName: 'Local',
    color: 'bg-gray-500',
    icon: '🔧'
  },
  {
    id: 1114,
    name: 'Core Testnet2',
    shortName: 'Core Test2',
    color: 'bg-orange-500',
    icon: '🧪'
  },
  {
    id: 1115,
    name: 'Core Testnet',
    shortName: 'Core Test',
    color: 'bg-blue-500',
    icon: '⚡'
  },
  {
    id: 1116,
    name: 'Core Mainnet',
    shortName: 'Core',
    color: 'bg-green-500',
    icon: '🚀'
  }
]

// Helper functions
export const getNetworkById = (chainId: number | undefined): NetworkConfig | undefined => {
  return SUPPORTED_NETWORKS.find(network => network.id === chainId)
}

export const isNetworkSupported = (chainId: number | undefined): boolean => {
  return !!getNetworkById(chainId)
}

export const getNetworkType = (chainId: number | undefined): 'local' | 'testnet' | 'mainnet' | 'unknown' => {
  if (chainId === 31337) {
    return 'local' // Hardhat default
  } else if (chainId === 1114 || chainId === 1115) {
    return 'testnet' // Core Testnets
  } else if (chainId === 1116) {
    return 'mainnet' // Core Mainnet
  }
  return 'unknown'
}

export const getNetworkName = (chainId: number | undefined): string => {
  const network = getNetworkById(chainId)
  return network?.name || 'Unknown Network'
}

export const getNetworkColor = (chainId: number | undefined): string => {
  const networkType = getNetworkType(chainId)
  switch (networkType) {
    case 'local': return 'bg-chart-4'
    case 'testnet': return 'bg-chart-1'
    case 'mainnet': return 'bg-chart-2'
    default: return 'bg-muted-foreground'
  }
}