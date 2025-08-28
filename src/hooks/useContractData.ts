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
      staleTime: 30000 // Use cached data for 30 seconds, no auto-refresh
    }
  })

  // Core API balance removed to avoid excessive network requests
  
  useEffect(() => {
    // Skip Core API calls completely - use wagmi balance only for better performance
    // Core API polling was causing excessive network requests
    return
  }, [userAddress, chainId])

  // Get BASKET token balance (StakeBasketToken - the token you get from staking)
  const { data: basketBalance, refetch: refetchBasketBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: CORE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { 
      enabled: !!userAddress && !!contracts.StakeBasketToken,
      staleTime: 30000 // Cache for 30 seconds, no auto-refresh
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
      staleTime: 30000 // Cache for 30 seconds, no auto-refresh
    }
  })

  // Get supported assets
  const { data: supportedAssets } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'getSupportedAssets',
    query: { enabled: !!contracts.CoreOracle }
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