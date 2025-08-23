import { useChainId } from 'wagmi'
import { getSafeNetworkInfo, getPriceSourceDescription, getMinimumDepositMessage, getStakingDescription } from '../utils/networkDetection'

/**
 * Hook for safe network information that handles unsupported networks
 */
export function useNetworkInfo() {
  const chainId = useChainId()
  const networkInfo = getSafeNetworkInfo(chainId)
  
  return {
    ...networkInfo,
    // Convenience methods
    priceSourceDescription: getPriceSourceDescription(chainId),
    minimumDepositMessage: getMinimumDepositMessage(chainId),
    stakingDescription: getStakingDescription(chainId)
  }
}