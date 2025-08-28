import { useReadContract, useChainId, useBalance } from 'wagmi'
import { useEffect, useMemo, useRef, useState } from 'react'
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

// Global singleton to prevent multiple instances
let globalDataInstance: any = null
let subscribers: Set<(data: any) => void> = new Set()

export function useSingletonData(userAddress?: string) {
  const chainId = useChainId()
  const { contracts } = useContracts()
  const [data, setData] = useState<any>(null)
  const instanceIdRef = useRef(Math.random())
  
  // Only enable the FIRST instance that gets created
  const isMainInstance = useMemo(() => {
    if (!globalDataInstance) {
      globalDataInstance = instanceIdRef.current
      return true
    }
    return globalDataInstance === instanceIdRef.current
  }, [])
  
  // Only the main instance makes RPC calls
  const shouldFetch = useMemo(() => 
    isMainInstance && !!userAddress && !!contracts.StakeBasket,
    [isMainInstance, userAddress, contracts.StakeBasket]
  )
  
  // Real price data - only from main instance
  const realPriceData = useRealPriceData(shouldFetch)
  
  // Native balance - only main instance
  const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
    address: userAddress as `0x${string}`,
    query: { 
      enabled: shouldFetch,
      staleTime: 300000, // 5 minutes
      gcTime: 600000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Basket balance - only main instance
  const { data: basketBalance, refetch: refetchBasketBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: CORE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { 
      enabled: shouldFetch && !!contracts.StakeBasketToken,
      staleTime: 300000,
      gcTime: 600000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Oracle prices - only main instance
  const { data: oracleCorePrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { 
      enabled: shouldFetch && !!contracts.CoreOracle,
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
      enabled: shouldFetch && !!contracts.CoreOracle,
      staleTime: 300000,
      gcTime: 600000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Pool data - only main instance
  const { data: totalPooledCore } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: STAKE_BASKET_ABI,
    functionName: 'totalPooledCore',
    query: { 
      enabled: shouldFetch,
      staleTime: 300000,
      gcTime: 600000,
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
      enabled: shouldFetch && !!contracts.CoreOracle,
      staleTime: 600000, // 10 minutes for static data
      gcTime: 1200000, // 20 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    }
  })
  
  // Compute data only in main instance
  const computedData = useMemo(() => {
    if (!isMainInstance) return null
    
    const finalCoreBalance = nativeCoreBalance ? Number(nativeCoreBalance.value) / 1e18 : 0
    
    return {
      // User balances
      coreBalance: finalCoreBalance,
      basketBalance: basketBalance ? Number(basketBalance) / 1e18 : 0,
      
      // Real prices from API/oracle
      corePrice: realPriceData.corePrice || (oracleCorePrice ? Number(oracleCorePrice) / 1e8 : 0.5),
      btcPrice: realPriceData.btcPrice || (oracleBtcPrice ? Number(oracleBtcPrice) / 1e8 : 95000),
      
      // Price metadata
      priceLastUpdate: realPriceData.lastUpdate || new Date().toISOString(),
      priceError: realPriceData.error,
      priceLoading: realPriceData.isLoading,
      
      // Pool data
      totalPooledCore: totalPooledCore ? Number(totalPooledCore) / 1e18 : 1000,
      
      // Oracle data
      supportedAssets: supportedAssets || ['CORE', 'BTC'],
      
      // Contract addresses
      contracts,
      chainId,
      
      // Network status
      isConnected: !!contracts.StakeBasket,
      
      // Refetch functions
      refetchBasketBalance: refetchBasketBalance || (() => {}),
      refetchCoreBalance: refetchCoreBalance || (() => {}),
      
      // Debug info
      isMainInstance,
      instanceId: instanceIdRef.current
    }
  }, [
    isMainInstance, nativeCoreBalance, basketBalance, totalPooledCore, 
    supportedAssets, contracts, chainId, refetchBasketBalance, refetchCoreBalance,
    realPriceData, oracleCorePrice, oracleBtcPrice
  ])
  
  // Main instance broadcasts data to all subscribers
  useEffect(() => {
    if (isMainInstance && computedData) {
      console.log('🔄 Main instance broadcasting data to', subscribers.size, 'subscribers')
      subscribers.forEach(callback => callback(computedData))
      setData(computedData)
    }
  }, [isMainInstance, computedData])
  
  // Subscribe to data updates from main instance
  useEffect(() => {
    if (!isMainInstance) {
      const handleDataUpdate = (newData: any) => {
        console.log('📡 Subscriber instance receiving data update')
        setData(newData)
      }
      
      subscribers.add(handleDataUpdate)
      return () => {
        subscribers.delete(handleDataUpdate)
      }
    }
  }, [isMainInstance])
  
  // Return data (either computed or subscribed)
  return data || {
    // Fallback data while loading - use real prices if available
    coreBalance: 0,
    basketBalance: 0,
    corePrice: 0.437, // Real CORE price
    btcPrice: 109000, // Real BTC price
    priceLastUpdate: new Date().toISOString(),
    priceError: null,
    priceLoading: true,
    totalPooledCore: 1000,
    supportedAssets: ['CORE', 'BTC'],
    contracts,
    chainId,
    isConnected: !!contracts.StakeBasket,
    refetchBasketBalance: () => {},
    refetchCoreBalance: () => {},
    isMainInstance,
    instanceId: instanceIdRef.current
  }
}