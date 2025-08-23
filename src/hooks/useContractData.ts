import { useReadContract, useChainId, useBalance } from 'wagmi'
import { useState, useEffect } from 'react'
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
  
  // Get real-time price data from Core APIs
  const realPriceData = useRealPriceData()

  // Get native CORE balance from wallet
  const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
    address: userAddress as `0x${string}`,
    query: { 
      enabled: !!userAddress,
      refetchInterval: 2000, // Refresh every 2 seconds
      staleTime: 0 // Don't use stale data
    }
  })

  // Also get balance from Core API for verification (only for live networks)
  const [coreApiBalance, setCoreApiBalance] = useState<number>(0)
  
  useEffect(() => {
    // Skip Core API calls for local network (31337)
    if (!userAddress || chainId === 31337 || chainId !== 1114) return
    
    const fetchCoreBalance = async () => {
      try {
        const apiKey = import.meta.env.VITE_CORE_TEST2_BTCS_KEY || '6f207a377c3b41d3aa74bd6832684cc7'
        const response = await fetch(
          `https://api.test2.btcs.network/api/accounts/core_balance_by_address/${userAddress}?apikey=${apiKey}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.status === '1') {
            setCoreApiBalance(Number(data.result) / 1e18)
          }
        }
      } catch (error) {
        console.log('Core API balance fetch failed:', error)
      }
    }
    
    fetchCoreBalance()
    const interval = setInterval(fetchCoreBalance, 10000) // Every 10 seconds
    
    return () => clearInterval(interval)
  }, [userAddress, chainId])

  // Get BASKET token balance (StakeBasketToken - the token you get from staking)
  const { data: basketBalance, refetch: refetchBasketBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: CORE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { 
      enabled: !!userAddress && !!contracts.StakeBasketToken,
      refetchInterval: 2000 // Refresh every 2 seconds
    }
  })

  // Get oracle prices (fallback only)
  const { data: oracleCorePrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { enabled: !!contracts.CoreOracle }
  })

  const { data: oracleBtcPrice } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: ['BTC'],
    query: { enabled: !!contracts.CoreOracle }
  })

  // Get total pooled CORE
  const { data: totalPooledCore } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: STAKE_BASKET_ABI,
    functionName: 'totalPooledCore',
    query: { 
      enabled: !!contracts.StakeBasket,
      refetchInterval: 2000 // Refresh every 2 seconds
    }
  })

  // Get supported assets
  const { data: supportedAssets } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getSupportedAssets',
    query: { enabled: !!contracts.CoreOracle }
  })

  // Debug logging
  const finalCoreBalance = chainId === 31337 
    ? (nativeCoreBalance ? Number(nativeCoreBalance.value) / 1e18 : 0) // For local, only use wagmi balance
    : (nativeCoreBalance ? Number(nativeCoreBalance.value) / 1e18 : coreApiBalance) // For live networks, prefer wagmi with API backup
    
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