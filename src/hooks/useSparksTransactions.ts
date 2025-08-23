import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { useEffect, useRef } from 'react'
import { handleTransactionError, createTransactionStateManager, TransactionErrorType } from '../utils/transactionErrorHandler'
import { validateNetworkForTransaction, NetworkValidationError } from '../utils/networkValidation'

// Sparks Manager ABI
const SPARKS_MANAGER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "string", name: "reason", type: "string" }
    ],
    name: "awardSparks",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "string", name: "reason", type: "string" }
    ],
    name: "deductSparks",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "string", name: "reason", type: "string" }
    ],
    name: "redeemSparks",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

export function useSparksTransactions() {
  const chainId = useChainId()
  const { address } = useAccount()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Create transaction state managers for each operation
  const redeemStateManager = createTransactionStateManager('Redeem Sparks')
  const claimStateManager = createTransactionStateManager('Claim Rewards')
  
  // Track retry attempts to prevent infinite loops
  const retryAttempts = useRef<{
    redeem: number
    claim: number
  }>({
    redeem: 0,
    claim: 0
  })
  
  // Refs to track handled errors and prevent loops
  const handledErrors = useRef<{
    redeemWrite: any
    claimWrite: any
    redeemReceipt: any
    claimReceipt: any
  }>({
    redeemWrite: null,
    claimWrite: null,
    redeemReceipt: null,
    claimReceipt: null
  })
  
  // Get contract addresses
  const sparksManagerAddress = contracts.SparksManager
  
  // Write contract hooks
  const { writeContract: redeemSparks, data: redeemHash, error: redeemWriteError } = useWriteContract()
  const { writeContract: claimRewards, data: claimHash, error: claimWriteError } = useWriteContract()
  
  // Transaction receipt hooks
  const { isLoading: isRedeeming, isSuccess: redeemSuccess, error: redeemError } = useWaitForTransactionReceipt({
    hash: redeemHash,
  })
  
  const { isLoading: isClaiming, isSuccess: claimSuccess, error: claimError } = useWaitForTransactionReceipt({
    hash: claimHash,
  })
  
  // Enhanced error handling for redeem transactions
  useEffect(() => {
    if (redeemHash && isRedeeming) {
      redeemStateManager.showLoadingToast('Confirming Sparks redemption on blockchain...')
    }
  }, [redeemHash, isRedeeming])

  useEffect(() => {
    if (redeemSuccess) {
      redeemStateManager.showSuccessToast('Sparks redeemed successfully! Benefits applied.')
    }
  }, [redeemSuccess])

  useEffect(() => {
    if (redeemError && handledErrors.current.redeemReceipt !== redeemError) {
      handledErrors.current.redeemReceipt = redeemError
      redeemStateManager.handleError(redeemError)
    }
  }, [redeemError])

  // Handle write contract errors (immediate wallet/contract errors)
  useEffect(() => {
    if (redeemWriteError && handledErrors.current.redeemWrite !== redeemWriteError) {
      handledErrors.current.redeemWrite = redeemWriteError
      redeemStateManager.handleError(redeemWriteError)
    }
  }, [redeemWriteError])
  
  // Enhanced error handling for claim transactions
  useEffect(() => {
    if (claimWriteError && handledErrors.current.claimWrite !== claimWriteError) {
      handledErrors.current.claimWrite = claimWriteError
      claimStateManager.handleError(claimWriteError)
    }
  }, [claimWriteError])

  useEffect(() => {
    if (claimHash && isClaiming) {
      claimStateManager.showLoadingToast('Confirming reward claim on blockchain...')
    }
  }, [claimHash, isClaiming])

  useEffect(() => {
    if (claimSuccess) {
      claimStateManager.showSuccessToast('Rewards claimed successfully!')
    }
  }, [claimSuccess])

  useEffect(() => {
    if (claimError && handledErrors.current.claimReceipt !== claimError) {
      handledErrors.current.claimReceipt = claimError
      claimStateManager.handleError(claimError)
    }
  }, [claimError])
  
  const redeemSparksPoints = async (amount: string, reason: string) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.redeem === 0) {
        handledErrors.current.redeemWrite = null
        handledErrors.current.redeemReceipt = null
      }
      
      const amountWei = parseEther(amount)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!sparksManagerAddress) {
        throw new Error(`SparksManager contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 Sparks Redemption Transaction details:', {
        contractAddress: sparksManagerAddress,
        amount,
        reason,
        amountWei: amountWei.toString(),
        chainId,
        address
      })

      // Show wallet confirmation toast
      redeemStateManager.showLoadingToast('Please confirm Sparks redemption in your wallet...')
      
      redeemSparks({
        address: sparksManagerAddress as `0x${string}`,
        abi: SPARKS_MANAGER_ABI,
        functionName: 'redeemSparks',
        args: [amountWei, reason],
        gas: BigInt(200000), // Reasonable gas limit for Sparks redemption
        account: address as `0x${string}`,
      })
      
      // Reset retry attempts on successful submission
      retryAttempts.current.redeem = 0
      console.log('✅ Sparks redemption transaction submitted to wallet')
    } catch (error) {
      console.error('Sparks redemption error:', error)
      
      // Determine if error is retryable and check retry limit
      const analyzedError = handleTransactionError(error, 'Sparks Redemption', { showToast: false })
      const isRetryableError = [
        TransactionErrorType.NETWORK_ERROR,
        TransactionErrorType.NONCE_ERROR,
        TransactionErrorType.INSUFFICIENT_GAS
      ].includes(analyzedError.type)
      
      // Don't retry permanent failures, contract errors, or user rejections
      const isNonRetryableError = [
        TransactionErrorType.USER_REJECTED,
        TransactionErrorType.PERMANENT_FAILURE,
        TransactionErrorType.CONTRACT_ERROR,
        TransactionErrorType.INSUFFICIENT_FUNDS,
        TransactionErrorType.ALLOWANCE_ERROR
      ].includes(analyzedError.type)
      
      const maxRetries = 2
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.redeem < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.redeem += 1
        console.log(`🔄 Retrying Sparks redemption (attempt ${retryAttempts.current.redeem}/${maxRetries})`)
        
        handleTransactionError(error, 'Sparks Redemption', {
          showToast: true,
          onRetry: () => redeemSparksPoints(amount, reason)
        })
      } else {
        // Final failure - reset retry attempts and show error without retry option
        retryAttempts.current.redeem = 0
        handleTransactionError(error, 'Sparks Redemption', {
          showToast: true,
          onRetry: undefined // No retry option
        })
        
        // Only re-throw if not user rejection
        if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
          throw error
        }
      }
    }
  }
  
  const claimSparksRewards = async () => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.claim === 0) {
        handledErrors.current.claimWrite = null
        handledErrors.current.claimReceipt = null
      }
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!sparksManagerAddress) {
        throw new Error(`SparksManager contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 Sparks Claim Transaction details:', {
        contractAddress: sparksManagerAddress,
        chainId,
        address
      })

      // Show wallet confirmation toast
      claimStateManager.showLoadingToast('Please confirm reward claim in your wallet...')
      
      claimRewards({
        address: sparksManagerAddress as `0x${string}`,
        abi: SPARKS_MANAGER_ABI,
        functionName: 'claimRewards',
        args: [address],
        gas: BigInt(150000), // Reasonable gas limit for claim
        account: address as `0x${string}`,
      })
      
      // Reset retry attempts on successful submission
      retryAttempts.current.claim = 0
      console.log('✅ Sparks claim transaction submitted to wallet')
    } catch (error) {
      console.error('Sparks claim error:', error)
      
      // Apply same retry logic as other functions
      const analyzedError = handleTransactionError(error, 'Reward Claim', { showToast: false })
      const isRetryableError = [
        TransactionErrorType.NETWORK_ERROR,
        TransactionErrorType.NONCE_ERROR,
        TransactionErrorType.INSUFFICIENT_GAS
      ].includes(analyzedError.type)
      
      const isNonRetryableError = [
        TransactionErrorType.USER_REJECTED,
        TransactionErrorType.PERMANENT_FAILURE,
        TransactionErrorType.CONTRACT_ERROR,
        TransactionErrorType.INSUFFICIENT_FUNDS,
        TransactionErrorType.ALLOWANCE_ERROR
      ].includes(analyzedError.type)
      
      const maxRetries = 2
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.claim < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.claim += 1
        console.log(`🔄 Retrying reward claim (attempt ${retryAttempts.current.claim}/${maxRetries})`)
        
        handleTransactionError(error, 'Reward Claim', {
          showToast: true,
          onRetry: () => claimSparksRewards()
        })
      } else {
        retryAttempts.current.claim = 0
        handleTransactionError(error, 'Reward Claim', {
          showToast: true,
          onRetry: undefined
        })
        
        if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
          throw error
        }
      }
    }
  }

  return {
    // Actions
    redeemSparksPoints,
    claimSparksRewards,
    
    // States
    isRedeeming,
    isClaiming,
    
    // Success states
    redeemSuccess,
    claimSuccess,
    
    // Transaction hashes
    redeemHash,
    claimHash,
  }
}