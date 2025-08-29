import { useMemo } from 'react'
import { useChainId, useReadContract, useBalance } from 'wagmi'
import { useContracts } from './useContracts'
import { useRealPriceData } from './useRealPriceData'

// Complete ABI for all needed functions
const CORE_TOKEN_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
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

/**
 * Real data hook with optimized RPC calls
 * Fetches all real data with heavy caching to minimize network requests
 */
export function useStaticData(userAddress?: string) {
  const chainId = useChainId()
  const { contracts } = useContracts()
  
  // Only fetch user data when we have user address and contracts
  const shouldFetchUserData = !!userAddress && !!contracts.StakeBasket && !!contracts.StakeBasketToken
  
  // Price data should always be fetched regardless of wallet connection
  const shouldFetchPrices = !!contracts.StakeBasket
  const realPriceData = useRealPriceData(shouldFetchPrices)
  
  // Real native CORE balance
  const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
    address: userAddress as `0x${string}`,
    query: { 
      enabled: shouldFetchUserData,
      staleTime: 300000, // Cache for 5 minutes
      gcTime: 600000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Real basket token balance
  const { data: basketBalance, refetch: refetchBasketBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: CORE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { 
      enabled: shouldFetchUserData,
      staleTime: 300000,
      gcTime: 600000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Real total pooled amount
  const { data: totalPooledCore } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: STAKE_BASKET_ABI,
    functionName: 'totalPooledCore',
    query: { 
      enabled: !!contracts.StakeBasket,
      staleTime: 300000,
      gcTime: 600000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Real oracle prices
  const { data: oracleCorePrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { 
      enabled: shouldFetchPrices && !!contracts.CoreOracle,
      staleTime: 300000,
      gcTime: 600000,
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
      enabled: shouldFetchPrices && !!contracts.CoreOracle,
      staleTime: 300000,
      gcTime: 600000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Real supported assets
  const { data: supportedAssets } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getSupportedAssets',
    query: { 
      enabled: shouldFetchPrices && !!contracts.CoreOracle,
      staleTime: 600000, // Cache for 10 minutes (static data)
      gcTime: 1200000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  return useMemo(() => ({
    // User balances - REAL data from blockchain
    coreBalance: nativeCoreBalance ? Number(nativeCoreBalance.value) / 1e18 : 0,
    basketBalance: basketBalance ? Number(basketBalance) / 1e18 : 0,
    
    // Real prices from API/oracle with fallbacks
    corePrice: realPriceData.corePrice || (oracleCorePrice ? Number(oracleCorePrice) / 1e8 : 0),
    btcPrice: realPriceData.btcPrice || (oracleBtcPrice ? Number(oracleBtcPrice) / 1e8 : 0),
    
    // Price metadata - REAL
    priceLastUpdate: realPriceData.lastUpdate || new Date().toISOString(),
    priceError: realPriceData.error,
    priceLoading: realPriceData.isLoading,
    
    // Pool data - REAL from contract
    totalPooledCore: totalPooledCore ? Number(totalPooledCore) / 1e18 : 0,
    
    // Oracle data - REAL from contract
    supportedAssets: supportedAssets || ['CORE', 'BTC'],
    
    // Contract addresses (from config, not RPC)
    contracts,
    chainId,
    
    // Network status
    isConnected: !!contracts.StakeBasket,
    
    // Refetch functions - REAL
    refetchBasketBalance: refetchBasketBalance || (() => {}),
    refetchCoreBalance: refetchCoreBalance || (() => {}),
    refetchAll: () => {
      refetchCoreBalance?.()
      refetchBasketBalance?.()
    },
    
    // Debug info
    isStaticData: false,
    isRealData: true
  }), [
    contracts, chainId, nativeCoreBalance, basketBalance, realPriceData,
    oracleCorePrice, oracleBtcPrice, totalPooledCore, supportedAssets,
    refetchCoreBalance, refetchBasketBalance
  ])
}