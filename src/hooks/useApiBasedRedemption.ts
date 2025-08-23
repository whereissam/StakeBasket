import { useState, useCallback } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { useRealPriceData } from './useRealPriceData'
import { calculateRedemptionAmount } from '../utils/redemptionCalculator'
import { toast } from 'sonner'
import { createTransactionStateManager } from '../utils/transactionErrorHandler'

// Simple StakeBasket ABI - we only need the redeem function that bypasses internal pricing
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

export function useApiBasedRedemption() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  const priceData = useRealPriceData()
  
  const [redemptionAmount, setRedemptionAmount] = useState<string>('')
  const [calculatedReturn, setCalculatedReturn] = useState<string>('')
  const [usdValue, setUsdValue] = useState<number>(0)
  
  // Create transaction state manager for consistent error handling
  const transactionState = createTransactionStateManager('API Redemption')

  // Read contract data
  const { data: userBalance } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  })

  const { data: totalSupply } = useReadContract({
    address: contracts.StakeBasketToken as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
  })

  const { data: totalPooledCore } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'totalPooledCore',
  })

  const { data: totalPooledLstBTC } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'totalPooledLstBTC',
  })

  // Write contract hook
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  // Calculate redemption amount using API prices
  const calculateRedemption = useCallback((shares: string) => {
    if (!shares || !totalSupply || !totalPooledCore || !priceData.corePrice) {
      setCalculatedReturn('')
      setUsdValue(0)
      return
    }

    try {
      const result = calculateRedemptionAmount({
        sharesToRedeem: shares,
        totalBasketSupply: totalSupply.toString(),
        totalPooledCore: totalPooledCore.toString(),
        totalPooledLstBTC: totalPooledLstBTC?.toString() || '0',
        corePrice: priceData.corePrice,
        btcPrice: priceData.btcPrice
      })

      setCalculatedReturn(result.coreToReturn)
      setUsdValue(result.usdValue)

      console.log('✅ Redemption calculated using API prices:', {
        shares,
        willReceive: `${result.coreToReturn} ${chainId === 31337 ? 'ETH' : 'CORE'}`,
        usdValue: `$${result.usdValue.toFixed(2)}`,
        priceSource: priceData.source
      })

    } catch (error) {
      console.error('❌ Redemption calculation failed:', error)
      setCalculatedReturn('')
      setUsdValue(0)
      toast.error('Failed to calculate redemption amount')
    }
  }, [totalSupply, totalPooledCore, totalPooledLstBTC, priceData, chainId])

  // Execute redemption with enhanced error handling
  const executeRedemption = useCallback(async (shares: string) => {
    if (!address || !contracts.StakeBasket || !shares) {
      transactionState.handleError(new Error('Missing required data for redemption'))
      return
    }

    // Additional validation
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

      // Show loading toast with better icon
      transactionState.showLoadingToast('⚡ Processing redemption with real-time prices...')

      console.log('🚀 Executing API-based redemption:', {
        shares,
        sharesWei: sharesWei.toString(),
        contractAddress: contracts.StakeBasket,
        userAddress: address,
        userBalance: userBalance,
        priceSource: priceData.source
      })

      writeContract({
        address: contracts.StakeBasket as `0x${string}`,
        abi: REDEEM_ABI,
        functionName: 'redeem',
        args: [sharesWei],
        // Remove explicit gas limit to let wallet estimate properly
      })

    } catch (error) {
      console.error('❌ Redemption execution failed:', error)
      transactionState.handleError(error, () => executeRedemption(shares))
    }
  }, [address, contracts.StakeBasket, writeContract, priceData, transactionState, userBalance])

  // Handle transaction success
  if (isSuccess && receipt) {
    transactionState.showSuccessToast('🎉 Redemption successful! Tokens received.')
    console.log('✅ Redemption completed:', {
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    })
  }

  // Handle transaction error with improved error handling
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
    priceData,
    
    // Utility
    canRedeem: (shares: string) => {
      if (!userBalance || !shares) return false
      return parseEther(shares) <= userBalance
    }
  }
}