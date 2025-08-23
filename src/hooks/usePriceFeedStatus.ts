import { useReadContract } from 'wagmi'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'

// PriceFeed ABI for reading prices
const PRICE_FEED_ABI = [
  {
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "getPrice",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function usePriceFeedStatus() {
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Try to read CORE price to test if price feed is working
  const { data: corePrice, error: corePriceError, isLoading } = useReadContract({
    address: contracts.PriceFeed as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { 
      enabled: !!contracts.PriceFeed,
      retry: false, // Don't retry failed calls
    }
  })

  // Try to read BTC price as well
  const { data: btcPrice, error: btcPriceError } = useReadContract({
    address: contracts.PriceFeed as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'getPrice',
    args: ['BTC'],
    query: { 
      enabled: !!contracts.PriceFeed && !corePriceError,
      retry: false, // Don't retry failed calls
    }
  })
  
  const hasError = !!(corePriceError || btcPriceError)
  const isWorking = !hasError && !!corePrice && corePrice > 0n
  const hasFallbackPrices = true // StakeBasket contract always has fallback prices
  
  return {
    isLoading,
    isWorking,
    hasError,
    hasFallbackPrices,
    corePrice: corePrice ? Number(corePrice) / 1e8 : null, // Convert to human readable
    btcPrice: btcPrice ? Number(btcPrice) / 1e8 : null,
    errors: {
      core: corePriceError?.message,
      btc: btcPriceError?.message
    },
    // Fallback prices used by StakeBasket contract
    fallbackPrices: {
      core: 1.5, // $1.50
      btc: 95000 // $95,000
    }
  }
}