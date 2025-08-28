import { useReadContract, useChainId, useBalance } from 'wagmi'
import { useMemo, useCallback } from 'react'
import { useContracts } from './useContracts'
import { useRealPriceData } from './useRealPriceData'

// Create a global cache to prevent duplicate requests across components
const globalCache = {
  data: {} as any,
  timestamp: 0,
  subscribers: new Set<() => void>()
}

const CACHE_DURATION = 30000 // 30 seconds
const PRICE_CACHE_DURATION = 60000 // 1 minute for prices

// Simple ABI for the functions we need
const CORE_TOKEN_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const ORACLE_ABI = [
  {
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "getPrice",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSupportedAssets",
    "outputs": [{"name": "", "type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const STAKE_BASKET_ABI = [
  {
    "inputs": [],
    "name": "totalPooledCore",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function useOptimizedContractData(userAddress?: string) {
  const chainId = useChainId()
  const { contracts } = useContracts()
  
  // Only enable if we have all required data
  const shouldFetch = useMemo(() => 
    !!userAddress && !!contracts.StakeBasket && !!contracts.StakeBasketToken,
    [userAddress, contracts.StakeBasket, contracts.StakeBasketToken]
  )
  
  // Create cache key
  const cacheKey = useMemo(() => 
    `${chainId}-${userAddress}-${contracts.StakeBasket}-${contracts.StakeBasketToken}`,
    [chainId, userAddress, contracts.StakeBasket, contracts.StakeBasketToken]
  )
  
  // Check if we can use cached data
  const canUseCache = useMemo(() => {
    if (!globalCache.data[cacheKey]) return false
    const age = Date.now() - globalCache.timestamp
    return age < CACHE_DURATION
  }, [cacheKey])
  
  // Price data with its own caching
  const realPriceData = useRealPriceData(shouldFetch)
  
  // Native balance with heavy caching
  const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
    address: userAddress as `0x${string}`,
    query: { 
      enabled: shouldFetch && !canUseCache,
      staleTime: CACHE_DURATION * 2, 
      gcTime: CACHE_DURATION * 4,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Basket balance with heavy caching
  const { data: basketBalance, refetch: refetchBasketBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: CORE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { 
      enabled: shouldFetch && !canUseCache,
      staleTime: CACHE_DURATION * 2,
      gcTime: CACHE_DURATION * 4,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Oracle prices with heavy caching
  const { data: oracleCorePrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { 
      enabled: shouldFetch && !!contracts.CoreOracle && !canUseCache,
      staleTime: PRICE_CACHE_DURATION * 3,
      gcTime: PRICE_CACHE_DURATION * 6,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })

  const { data: oracleBtcPrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['BTC'],
    query: { 
      enabled: shouldFetch && !!contracts.CoreOracle && !canUseCache,
      staleTime: PRICE_CACHE_DURATION * 3,
      gcTime: PRICE_CACHE_DURATION * 6,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Total pooled data
  const { data: totalPooledCore } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: STAKE_BASKET_ABI,
    functionName: 'totalPooledCore',
    query: { 
      enabled: shouldFetch && !canUseCache,
      staleTime: CACHE_DURATION * 2,
      gcTime: CACHE_DURATION * 4,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })

  const { data: supportedAssets } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getSupportedAssets',
    query: { 
      enabled: shouldFetch && !!contracts.CoreOracle && !canUseCache,
      staleTime: CACHE_DURATION * 10, // Very long cache for static data
      gcTime: CACHE_DURATION * 20,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Memoize the final data to prevent unnecessary re-renders
  const contractData = useMemo(() => {
    // If we can use cache, return cached data
    if (canUseCache && globalCache.data[cacheKey]) {
      return globalCache.data[cacheKey]
    }
    
    // Otherwise, compute new data
    const finalCoreBalance = nativeCoreBalance ? Number(nativeCoreBalance.value) / 1e18 : 0
    
    const newData = {
      // User balances
      coreBalance: finalCoreBalance,
      basketBalance: basketBalance ? Number(basketBalance) / 1e18 : 0,
      
      // Real-time prices
      corePrice: realPriceData.corePrice || (oracleCorePrice ? Number(oracleCorePrice) / 1e8 : 0),
      btcPrice: realPriceData.btcPrice || (oracleBtcPrice ? Number(oracleBtcPrice) / 1e8 : 0),
      
      // Price metadata
      priceLastUpdate: realPriceData.lastUpdate,
      priceError: realPriceData.error,
      priceLoading: realPriceData.isLoading,
      
      // Pool data
      totalPooledCore: totalPooledCore ? Number(totalPooledCore) / 1e18 : 0,
      
      // Oracle data
      supportedAssets: supportedAssets || [],
      
      // Contract addresses
      contracts,
      chainId,
      
      // Network status
      isConnected: !!contracts.StakeBasket,
      
      // Refetch functions
      refetchBasketBalance,
      refetchCoreBalance
    }
    
    // Cache the new data
    if (shouldFetch) {
      globalCache.data[cacheKey] = newData
      globalCache.timestamp = Date.now()
    }
    
    return newData
  }, [
    canUseCache, cacheKey, nativeCoreBalance, basketBalance, realPriceData, 
    oracleCorePrice, oracleBtcPrice, totalPooledCore, supportedAssets, 
    contracts, chainId, shouldFetch, refetchBasketBalance, refetchCoreBalance
  ])
  
  // Manual refetch function that clears cache
  const refetchAll = useCallback(() => {
    // Clear cache for this key
    delete globalCache.data[cacheKey]
    globalCache.timestamp = 0
    
    // Trigger refetches
    refetchCoreBalance?.()
    refetchBasketBalance?.()
    
    // Notify subscribers
    globalCache.subscribers.forEach(callback => callback())
  }, [cacheKey, refetchCoreBalance, refetchBasketBalance])

  return {
    ...contractData,
    refetchAll,
    isCached: canUseCache
  }
}