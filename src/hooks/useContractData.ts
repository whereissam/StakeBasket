import { useReadContract, useChainId, useBalance } from 'wagmi'
import { useEffect, useMemo } from 'react'
import { useContracts } from './useContracts'
import { useRealPriceData } from './useRealPriceData'

// Simple ABI for the functions we need
const CORE_TOKEN_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol", 
    "outputs": [{"name": "", "type": "string"}],
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
  },
  {
    "inputs": [],
    "name": "totalPooledLstBTC",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function useContractData(userAddress?: string) {
  const chainId = useChainId()
  const { contracts } = useContracts()
  
  // Only enable RPC calls if user is actually connected and contracts are available
  const shouldFetchData = useMemo(() => 
    !!userAddress && !!contracts.StakeBasket && !!contracts.StakeBasketToken,
    [userAddress, contracts.StakeBasket, contracts.StakeBasketToken]
  )
  
  // Re-enabled real price data for testing - but only when needed
  const realPriceData = useRealPriceData(shouldFetchData)

  // Native CORE balance with aggressive caching
  const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
    address: userAddress as `0x${string}`,
    query: { 
      enabled: shouldFetchData,
      staleTime: 120000, // Cache for 2 minutes
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false // Disable automatic refetching
    }
  })

  // Core API balance removed to avoid excessive network requests
  
  useEffect(() => {
    // Skip Core API calls completely - use wagmi balance only for better performance
    // Core API polling was causing excessive network requests
    return
  }, [userAddress, chainId])

  // Basket token balance with aggressive caching
  const { data: basketBalance, refetch: refetchBasketBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: CORE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { 
      enabled: shouldFetchData,
      staleTime: 120000, // Cache for 2 minutes
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false // Disable automatic refetching
    }
  })

  // Oracle price calls with heavy caching
  const { data: oracleCorePrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { 
      enabled: shouldFetchData && !!contracts.CoreOracle,
      staleTime: 180000, // Cache for 3 minutes
      gcTime: 600000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false // Disable automatic refetching
    }
  })

  const { data: oracleBtcPrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['BTC'],
    query: { 
      enabled: shouldFetchData && !!contracts.CoreOracle,
      staleTime: 180000, // Cache for 3 minutes
      gcTime: 600000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false // Disable automatic refetching
    }
  })

  // Pool and asset data with heavy caching
  const { data: totalPooledCore } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: STAKE_BASKET_ABI,
    functionName: 'totalPooledCore',
    query: { 
      enabled: shouldFetchData && !!contracts.StakeBasket,
      staleTime: 120000, // Cache for 2 minutes
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false // Disable automatic refetching
    }
  })

  const { data: supportedAssets } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getSupportedAssets',
    query: { 
      enabled: shouldFetchData && !!contracts.CoreOracle,
      staleTime: 600000, // Cache for 10 minutes (assets don't change often)
      gcTime: 1200000, // Keep in cache for 20 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false // Disable automatic refetching
    }
  })

  // Use only wagmi balance for all networks to avoid API polling
  const finalCoreBalance = nativeCoreBalance ? Number(nativeCoreBalance.value) / 1e18 : 0
    
  // console.log('Balance debug:', {
  //   nativeCoreBalance: nativeCoreBalance?.value?.toString(),
  //   nativeCoreBalanceFormatted: nativeCoreBalance ? Number(nativeCoreBalance.value) / 1e18 : 0,
  //   coreApiBalance,
  //   finalCoreBalance,
  //   chainId,
  //   isLocal: chainId === 31337
  // })

  // console.log('Price debug:', {
  //   chainId,
  //   realPriceDataCorePrice: realPriceData.corePrice,
  //   realPriceDataSource: realPriceData.source,
  //   oracleCorePrice: oracleCorePrice ? Number(oracleCorePrice) / 1e8 : 0,
  //   finalCorePrice: realPriceData.corePrice || (oracleCorePrice ? Number(oracleCorePrice) / 1e8 : 0)
  // })

  return {
    // User balances - local network uses only wagmi, live networks prefer wagmi with API backup
    coreBalance: finalCoreBalance,
    basketBalance: basketBalance ? Number(basketBalance) / 1e18 : 0,
    
    // Real-time prices from Core APIs (preferred) with oracle fallback
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
}