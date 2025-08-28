import { useState, useCallback, useRef, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { useRealPriceData } from './useRealPriceData'
import { calculateRedemptionAmount } from '../utils/redemptionCalculator'
import { toast } from 'sonner'
import { createTransactionStateManager } from '../utils/transactionErrorHandler'

// PriceFeed ABI for getting prices from contract
const PRICE_FEED_ABI = [
  {
    "inputs": [],
    "name": "getCorePrice",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPrimaryBTCPrice", 
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// StakeBasket ABI for redeem function
const REDEEM_ABI = [
  {
    "inputs": [{"name": "shares", "type": "uint256"}],
    "name": "redeem", 
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

// StakeBasketToken ABI for reading data
const TOKEN_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// StakeBasket ABI for reading pool data
const POOL_ABI = [
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

interface PriceSource {
  corePrice: number
  btcPrice: number
  source: string
  lastUpdate?: number | string
  error?: string
}

export function useHybridRedemption() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  const apiPriceData = useRealPriceData()
  
  const [redemptionAmount, setRedemptionAmount] = useState<string>('')
  const [calculatedReturn, setCalculatedReturn] = useState<string>('')
  const [usdValue, setUsdValue] = useState<number>(0)
  const [priceSource, setPriceSource] = useState<PriceSource>({
    corePrice: 0,
    btcPrice: 0,
    source: 'Loading...'
  })
  
  // Track if we've already shown success notification for this transaction
  const successNotificationShown = useRef<Set<string>>(new Set())
  
  // Create transaction state manager
  const transactionState = createTransactionStateManager('Hybrid Redemption')

  // Try to get prices from contract first - with caching
  const { data: contractCorePrice, error: contractCorePriceError } = useReadContract({
    address: contracts.PriceFeed as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'getCorePrice',
    query: {
      enabled: !!contracts.PriceFeed,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false
    }
  })

  const { data: contractBTCPrice, error: contractBTCPriceError } = useReadContract({
    address: contracts.PriceFeed as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'getPrimaryBTCPrice',
    query: {
      enabled: !!contracts.PriceFeed,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false
    }
  })

  // Read contract data for pool calculations - with caching
  const { data: userBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && !!contracts.StakeBasketToken,
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 120000, // Keep in cache for 2 minutes
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false
    }
  })

  const { data: totalSupply } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!contracts.StakeBasketToken,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false
    }
  })

  const { data: totalPooledCore } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'totalPooledCore',
    query: {
      enabled: !!contracts.StakeBasket,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false
    }
  })

  const { data: totalPooledLstBTC } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'totalPooledLstBTC',
    query: {
      enabled: !!contracts.StakeBasket,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000, // Keep in cache for 5 minutes
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false
    }
  })

  // Write contract hook
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  // Get best available prices (contract first, API fallback)
  const getBestPrices = useCallback((): PriceSource => {
    // Try contract prices first
    if (contractCorePrice && contractBTCPrice && !contractCorePriceError && !contractBTCPriceError) {
      try {
        // Convert from wei (18 decimals) to regular price
        const corePrice = parseFloat(formatEther(contractCorePrice))
        const btcPrice = parseFloat(formatEther(contractBTCPrice))
        
        // Validate prices are reasonable
        if (corePrice > 0 && btcPrice > 0) {
          return {
            corePrice,
            btcPrice,
            source: 'Contract (Switchboard)',
            lastUpdate: Date.now()
          }
        }
      } catch (error) {
        console.warn('❌ Failed to parse contract prices, falling back to API:', error)
      }
    }

    // Fallback to API prices
    if (apiPriceData.corePrice > 0 && apiPriceData.btcPrice > 0) {
      return {
        corePrice: apiPriceData.corePrice,
        btcPrice: apiPriceData.btcPrice,
        source: `API Fallback (${apiPriceData.source})`,
        lastUpdate: apiPriceData.lastUpdate,
        error: contractCorePriceError || contractBTCPriceError ? 'Contract oracle failed' : undefined
      }
    }

    // No valid prices available
    return {
      corePrice: 0,
      btcPrice: 0,
      source: 'No Price Data',
      error: 'Both contract and API pricing failed'
    }
  }, [contractCorePrice, contractBTCPrice, contractCorePriceError, contractBTCPriceError, apiPriceData])

  // Calculate redemption amount using hybrid pricing
  const calculateRedemption = useCallback((shares: string) => {
    if (!shares || !totalSupply || !totalPooledCore) {
      setCalculatedReturn('')
      setUsdValue(0)
      return
    }

    const bestPrices = getBestPrices()
    setPriceSource(bestPrices)

    if (bestPrices.corePrice === 0 || bestPrices.btcPrice === 0) {
      setCalculatedReturn('')
      setUsdValue(0)
      toast.error('Unable to get price data for redemption calculation')
      return
    }

    try {
      const result = calculateRedemptionAmount({
        sharesToRedeem: shares,
        totalBasketSupply: totalSupply.toString(),
        totalPooledCore: totalPooledCore.toString(),
        totalPooledLstBTC: totalPooledLstBTC?.toString() || '0',
        corePrice: bestPrices.corePrice,
        btcPrice: bestPrices.btcPrice
      })

      setCalculatedReturn(result.coreToReturn)
      setUsdValue(result.usdValue)

      console.log('✅ Redemption calculated using hybrid pricing:', {
        shares,
        willReceive: `${result.coreToReturn} ${chainId === 31337 ? 'ETH' : 'CORE'}`,
        usdValue: `$${result.usdValue.toFixed(2)}`,
        priceSource: bestPrices.source,
        prices: {
          core: bestPrices.corePrice,
          btc: bestPrices.btcPrice
        }
      })

    } catch (error) {
      console.error('❌ Redemption calculation failed:', error)
      setCalculatedReturn('')
      setUsdValue(0)
      toast.error('Failed to calculate redemption amount')
    }
  }, [totalSupply, totalPooledCore, totalPooledLstBTC, getBestPrices, chainId])

  // Execute redemption
  const executeRedemption = useCallback(async (shares: string) => {
    if (!address || !contracts.StakeBasket || !shares) {
      transactionState.handleError(new Error('Missing required data for redemption'))
      return
    }

    if (!userBalance || parseFloat(shares) <= 0) {
      transactionState.handleError(new Error('Invalid redemption amount'))
      return
    }

    if (parseEther(shares) > BigInt(userBalance)) {
      transactionState.handleError(new Error('Insufficient BASKET token balance'))
      return
    }

    try {
      const sharesWei = parseEther(shares)
      const currentPrices = getBestPrices()

      // Show appropriate loading message based on price source
      const loadingMessage = currentPrices.source.includes('Contract') 
        ? '⚡ Processing redemption with contract prices...'
        : '🔄 Processing redemption with API fallback prices...'
      
      transactionState.showLoadingToast(loadingMessage)

      console.log('🚀 Executing hybrid redemption:', {
        shares,
        sharesWei: sharesWei.toString(),
        contractAddress: contracts.StakeBasket,
        userAddress: address,
        userBalance: userBalance,
        priceSource: currentPrices.source
      })

      writeContract({
        address: contracts.StakeBasket as `0x${string}`,
        abi: REDEEM_ABI,
        functionName: 'redeem',
        args: [sharesWei],
      })

    } catch (error) {
      console.error('❌ Redemption execution failed:', error)
      transactionState.handleError(error, () => executeRedemption(shares))
    }
  }, [address, contracts.StakeBasket, writeContract, transactionState, userBalance, getBestPrices])

  // Handle transaction success with duplicate prevention
  useEffect(() => {
    if (isSuccess && receipt && receipt.transactionHash) {
      const txHash = receipt.transactionHash
      
      // Only show notification if we haven't shown it for this transaction
      if (!successNotificationShown.current.has(txHash)) {
        successNotificationShown.current.add(txHash)
        transactionState.showSuccessToast('🎉 Redemption successful! Tokens received.')
        console.log('✅ Redemption completed:', {
          hash: txHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          priceSource: priceSource.source
        })
      }
    }
  }, [isSuccess, receipt, transactionState, priceSource.source])

  // Handle transaction error
  if (error) {
    transactionState.handleError(error)
  }

  return {
    // State
    redemptionAmount,
    setRedemptionAmount,
    calculatedReturn,
    usdValue,
    
    // Functions
    calculateRedemption,
    executeRedemption,
    
    // Transaction state
    isPending,
    isConfirming,
    isSuccess,
    hash,
    
    // Data
    userBalance: userBalance?.toString() || '0',
    priceData: priceSource,
    
    // Utility
    canRedeem: (shares: string) => {
      if (!userBalance || !shares) return false
      return parseEther(shares) <= userBalance
    }
  }
}