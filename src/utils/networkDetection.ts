import { validateNetwork, getTokenSymbol, SupportedChainId } from './networkHandler'

/**
 * Safe network detection that handles unsupported networks gracefully
 */
export function getSafeNetworkInfo(chainId?: number) {
  // Validate network first
  const validation = validateNetwork(chainId)
  
  if (!validation.isSupported || !validation.isAvailable) {
    return {
      isSupported: false,
      tokenSymbol: 'UNKNOWN',
      networkName: 'Unsupported Network',
      isLocal: false,
      isCoreDAO: false,
      error: validation.error
    }
  }
  
  const tokenSymbol = getTokenSymbol(chainId)
  
  return {
    isSupported: true,
    tokenSymbol,
    networkName: getNetworkName(chainId),
    isLocal: chainId === 31337,
    isCoreDAO: chainId === 1114 || chainId === 1116,
    chainId: chainId as SupportedChainId
  }
}

/**
 * Get network name safely
 */
export function getNetworkName(chainId?: number): string {
  switch (chainId) {
    case 31337:
      return 'Hardhat Local'
    case 1114:
      return 'Core Testnet2'
    case 1116:
      return 'Core Mainnet'
    default:
      return `Unknown Network (${chainId})`
  }
}

/**
 * Get appropriate price source description
 */
export function getPriceSourceDescription(chainId?: number): string {
  switch (chainId) {
    case 31337:
      return 'CoinGecko API'
    case 1114:
    case 1116:
      return 'Core API & CoinGecko'
    default:
      return 'Unknown price source'
  }
}

/**
 * Get minimum deposit messages safely
 */
export function getMinimumDepositMessage(chainId?: number): string {
  const networkInfo = getSafeNetworkInfo(chainId)
  if (!networkInfo.isSupported) {
    return 'Network not supported'
  }
  
  if (networkInfo.isLocal) {
    return 'Get more ETH for local testing.'
  } else if (networkInfo.isCoreDAO) {
    return 'Get more tCORE2 from faucet to make deposits.'
  }
  
  return 'Check your balance for this network.'
}

/**
 * Get network-specific staking description
 */
export function getStakingDescription(chainId?: number): string {
  const networkInfo = getSafeNetworkInfo(chainId)
  if (!networkInfo.isSupported) {
    return 'Network not supported'
  }
  
  if (networkInfo.isLocal) {
    return `${networkInfo.tokenSymbol} tokens for local testing`
  } else if (networkInfo.isCoreDAO) {
    return 'CORE tokens (not MockCORE ERC-20)'
  }
  
  return 'Native tokens'
}

/**
 * Safe replacement for the fragile chainId === 31337 ? 'ETH' : 'CORE' pattern
 */
export function getTokenSymbolSafe(chainId?: number): string {
  const networkInfo = getSafeNetworkInfo(chainId)
  return networkInfo.tokenSymbol
}