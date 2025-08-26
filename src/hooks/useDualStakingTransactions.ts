import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { useEffect, useRef } from 'react'
import { handleTransactionError, createTransactionStateManager, TransactionErrorType } from '../utils/transactionErrorHandler'
import { validateNetworkForTransaction, NetworkValidationError } from '../utils/networkValidation'

// ERC-20 token ABI for approvals
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

// DualStaking Basket ABI
const DUAL_STAKING_BASKET_ABI = [
  {
    inputs: [{ name: 'btcAmount', type: 'uint256' }],
    name: 'depositNativeCORE',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'coreAmount', type: 'uint256' },
      { name: 'btcAmount', type: 'uint256' }
    ],
    name: 'depositTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  }
] as const

export function useDualStakingTransactions() {
  const chainId = useChainId()
  const { address } = useAccount()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Create transaction state managers for each operation
  const dualStakeStateManager = createTransactionStateManager('Dual Stake')
  const approveCoreStateManager = createTransactionStateManager('Approve CORE')
  const approveBtcStateManager = createTransactionStateManager('Approve BTC')
  
  // Track retry attempts to prevent infinite loops
  const retryAttempts = useRef<{
    dualStake: number
    approveCore: number
    approveBtc: number
  }>({
    dualStake: 0,
    approveCore: 0,
    approveBtc: 0
  })
  
  // Refs to track handled errors and prevent loops
  const handledErrors = useRef<{
    dualStakeWrite: any
    approveCoreWrite: any
    approveBtcWrite: any
    dualStakeReceipt: any
    approveCoreReceipt: any
    approveBtcReceipt: any
  }>({
    dualStakeWrite: null,
    approveCoreWrite: null,
    approveBtcWrite: null,
    dualStakeReceipt: null,
    approveCoreReceipt: null,
    approveBtcReceipt: null
  })
  
  // Get contract addresses
  const dualStakingBasketAddress = contracts.DualStakingBasket || contracts.StakeBasket
  const coreTokenAddress = contracts.MockCORE
  const btcTokenAddress = contracts.MockCoreBTC
  
  // Token allowance checks
  const { data: coreAllowance = 0n } = useReadContract({
    address: coreTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, dualStakingBasketAddress as `0x${string}`],
    query: { enabled: !!address && !!coreTokenAddress && !!dualStakingBasketAddress }
  })
  
  const { data: btcAllowance = 0n } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, dualStakingBasketAddress as `0x${string}`],
    query: { enabled: !!address && !!btcTokenAddress && !!dualStakingBasketAddress }
  })
  
  // Write contract hooks
  const { writeContract: dualStake, data: dualStakeHash, error: dualStakeWriteError } = useWriteContract()
  const { writeContract: approveCore, data: approveCoreHash, error: approveCoreError } = useWriteContract()
  const { writeContract: approveBtc, data: approveBtcHash, error: approveBtcError } = useWriteContract()
  
  // Transaction receipt hooks
  const { isLoading: isDualStaking, isSuccess: dualStakeSuccess, error: dualStakeError } = useWaitForTransactionReceipt({
    hash: dualStakeHash,
  })
  
  const { isLoading: isApprovingCore, isSuccess: approveCoreSuccess, error: approveCoreReceiptError } = useWaitForTransactionReceipt({
    hash: approveCoreHash,
  })
  
  const { isLoading: isApprovingBtc, isSuccess: approveBtcSuccess, error: approveBtcReceiptError } = useWaitForTransactionReceipt({
    hash: approveBtcHash,
  })
  
  // Check if tokens need approval
  const needsCoreApproval = (coreAmount: string) => {
    if (!coreAllowance || coreAllowance === 0n) return true
    const coreWei = parseEther(coreAmount)
    return coreAllowance < coreWei
  }
  
  const needsBtcApproval = (btcAmount: string) => {
    if (!btcAllowance || btcAllowance === 0n) return true
    const btcWei = parseEther(btcAmount)
    return btcAllowance < btcWei
  }
  
  // Enhanced error handling for dual staking transactions
  useEffect(() => {
    if (dualStakeHash && isDualStaking && !dualStakeError) {
      dualStakeStateManager.showLoadingToast('Confirming dual staking transaction on blockchain...')
    }
  }, [dualStakeHash, isDualStaking, dualStakeError])

  useEffect(() => {
    if (dualStakeSuccess) {
      dualStakeStateManager.showSuccessToast('Dual staking successful! You\'re now earning enhanced rewards.')
    }
  }, [dualStakeSuccess])

  useEffect(() => {
    if (dualStakeError && handledErrors.current.dualStakeReceipt !== dualStakeError) {
      handledErrors.current.dualStakeReceipt = dualStakeError
      dualStakeStateManager.handleError(dualStakeError)
    }
  }, [dualStakeError])

  // Handle write contract errors (immediate wallet/contract errors)
  useEffect(() => {
    if (dualStakeWriteError && handledErrors.current.dualStakeWrite !== dualStakeWriteError) {
      handledErrors.current.dualStakeWrite = dualStakeWriteError
      dualStakeStateManager.handleError(dualStakeWriteError)
    }
  }, [dualStakeWriteError])
  
  // Core approval error handling
  useEffect(() => {
    if (approveCoreError && handledErrors.current.approveCoreWrite !== approveCoreError) {
      handledErrors.current.approveCoreWrite = approveCoreError
      approveCoreStateManager.handleError(approveCoreError)
    }
  }, [approveCoreError])

  useEffect(() => {
    if (approveCoreHash && isApprovingCore && !approveCoreReceiptError) {
      approveCoreStateManager.showLoadingToast('Confirming CORE token approval on blockchain...')
    }
  }, [approveCoreHash, isApprovingCore, approveCoreReceiptError])

  useEffect(() => {
    if (approveCoreSuccess) {
      approveCoreStateManager.showSuccessToast('CORE tokens approved! You can now dual stake.')
    }
  }, [approveCoreSuccess])

  useEffect(() => {
    if (approveCoreReceiptError && handledErrors.current.approveCoreReceipt !== approveCoreReceiptError) {
      handledErrors.current.approveCoreReceipt = approveCoreReceiptError
      approveCoreStateManager.handleError(approveCoreReceiptError)
    }
  }, [approveCoreReceiptError])
  
  // BTC approval error handling
  useEffect(() => {
    if (approveBtcError && handledErrors.current.approveBtcWrite !== approveBtcError) {
      handledErrors.current.approveBtcWrite = approveBtcError
      approveBtcStateManager.handleError(approveBtcError)
    }
  }, [approveBtcError])

  useEffect(() => {
    if (approveBtcHash && isApprovingBtc && !approveBtcReceiptError) {
      approveBtcStateManager.showLoadingToast('Confirming BTC token approval on blockchain...')
    }
  }, [approveBtcHash, isApprovingBtc, approveBtcReceiptError])

  useEffect(() => {
    if (approveBtcSuccess) {
      approveBtcStateManager.showSuccessToast('BTC tokens approved! You can now dual stake.')
    }
  }, [approveBtcSuccess])

  useEffect(() => {
    if (approveBtcReceiptError && handledErrors.current.approveBtcReceipt !== approveBtcReceiptError) {
      handledErrors.current.approveBtcReceipt = approveBtcReceiptError
      approveBtcStateManager.handleError(approveBtcReceiptError)
    }
  }, [approveBtcReceiptError])
  
  const depositDualStake = async (coreAmount: string, btcAmount: string, useNativeCORE: boolean = true) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.dualStake === 0) {
        handledErrors.current.dualStakeWrite = null
        handledErrors.current.dualStakeReceipt = null
      }
      
      const coreWei = parseEther(coreAmount)
      const btcWei = parseEther(btcAmount)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!dualStakingBasketAddress) {
        throw new Error(`DualStaking contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 Dual Staking Transaction details:', {
        contractAddress: dualStakingBasketAddress,
        coreAmount,
        btcAmount,
        coreWei: coreWei.toString(),
        btcWei: btcWei.toString(),
        useNativeCORE,
        chainId,
        address
      })

      // Show wallet confirmation toast only once
      dualStakeStateManager.showLoadingToast('Please confirm dual staking transaction in your wallet...')
      
      if (useNativeCORE) {
        // Use native CORE + BTC tokens
        dualStake({
          address: dualStakingBasketAddress as `0x${string}`,
          abi: DUAL_STAKING_BASKET_ABI,
          functionName: 'depositNativeCORE',
          args: [btcWei],
          value: coreWei, // Send native CORE
          gas: BigInt(400000), // Higher gas limit for dual staking
          account: address as `0x${string}`,
        })
      } else {
        // Use ERC-20 CORE + BTC tokens  
        dualStake({
          address: dualStakingBasketAddress as `0x${string}`,
          abi: DUAL_STAKING_BASKET_ABI,
          functionName: 'depositTokens',
          args: [coreWei, btcWei],
          gas: BigInt(400000), // Higher gas limit for dual staking
          account: address as `0x${string}`,
        })
      }
      
      // Reset retry attempts on successful submission
      retryAttempts.current.dualStake = 0
      console.log('✅ Dual staking transaction submitted to wallet')
    } catch (error) {
      console.error('Dual staking error:', error)
      
      // Determine if error is retryable and check retry limit
      const analyzedError = handleTransactionError(error, 'Dual Staking', { showToast: false })
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
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.dualStake < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.dualStake += 1
        console.log(`🔄 Retrying dual staking (attempt ${retryAttempts.current.dualStake}/${maxRetries})`)
        
        handleTransactionError(error, 'Dual Staking', {
          showToast: true,
          onRetry: () => depositDualStake(coreAmount, btcAmount, useNativeCORE)
        })
      } else {
        // Final failure - reset retry attempts and show error without retry option
        retryAttempts.current.dualStake = 0
        handleTransactionError(error, 'Dual Staking', {
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
  
  const approveCoreTokens = async (coreAmount: string) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.approveCore === 0) {
        handledErrors.current.approveCoreWrite = null
        handledErrors.current.approveCoreReceipt = null
      }
      
      const coreWei = parseEther(coreAmount)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!coreTokenAddress) {
        throw new Error('CORE token contract not found')
      }
      
      if (!dualStakingBasketAddress) {
        throw new Error(`DualStaking contract not deployed on chain ${chainId}`)
      }
      
      // Show wallet confirmation toast
      approveCoreStateManager.showLoadingToast('Please approve CORE tokens in your wallet...')
      
      approveCore({
        address: coreTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [dualStakingBasketAddress as `0x${string}`, coreWei],
        gas: BigInt(80000), // Reasonable gas limit for approve function
        account: address as `0x${string}`,
      })
      
      // Reset retry attempts on successful submission
      retryAttempts.current.approveCore = 0
    } catch (error) {
      console.error('CORE approval error:', error)
      
      // Apply same retry logic as other functions
      const analyzedError = handleTransactionError(error, 'CORE Token Approval', { showToast: false })
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
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.approveCore < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.approveCore += 1
        console.log(`🔄 Retrying CORE approval (attempt ${retryAttempts.current.approveCore}/${maxRetries})`)
        
        handleTransactionError(error, 'CORE Token Approval', {
          showToast: true,
          onRetry: () => approveCoreTokens(coreAmount)
        })
      } else {
        retryAttempts.current.approveCore = 0
        handleTransactionError(error, 'CORE Token Approval', {
          showToast: true,
          onRetry: undefined
        })
        
        if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
          throw error
        }
      }
    }
  }
  
  const approveBtcTokens = async (btcAmount: string) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.approveBtc === 0) {
        handledErrors.current.approveBtcWrite = null
        handledErrors.current.approveBtcReceipt = null
      }
      
      const btcWei = parseEther(btcAmount)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!btcTokenAddress) {
        throw new Error('BTC token contract not found')
      }
      
      if (!dualStakingBasketAddress) {
        throw new Error(`DualStaking contract not deployed on chain ${chainId}`)
      }
      
      // Show wallet confirmation toast
      approveBtcStateManager.showLoadingToast('Please approve BTC tokens in your wallet...')
      
      approveBtc({
        address: btcTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [dualStakingBasketAddress as `0x${string}`, btcWei],
        gas: BigInt(80000), // Reasonable gas limit for approve function
        account: address as `0x${string}`,
      })
      
      // Reset retry attempts on successful submission
      retryAttempts.current.approveBtc = 0
    } catch (error) {
      console.error('BTC approval error:', error)
      
      // Apply same retry logic as other functions
      const analyzedError = handleTransactionError(error, 'BTC Token Approval', { showToast: false })
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
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.approveBtc < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.approveBtc += 1
        console.log(`🔄 Retrying BTC approval (attempt ${retryAttempts.current.approveBtc}/${maxRetries})`)
        
        handleTransactionError(error, 'BTC Token Approval', {
          showToast: true,
          onRetry: () => approveBtcTokens(btcAmount)
        })
      } else {
        retryAttempts.current.approveBtc = 0
        handleTransactionError(error, 'BTC Token Approval', {
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
    depositDualStake,
    approveCoreTokens,
    approveBtcTokens,
    
    // States
    isDualStaking,
    isApprovingCore,
    isApprovingBtc,
    
    // Success states
    dualStakeSuccess,
    approveCoreSuccess,
    approveBtcSuccess,
    
    // Transaction hashes
    dualStakeHash,
    approveCoreHash,
    approveBtcHash,
    
    // Approval checks
    needsCoreApproval,
    needsBtcApproval,
    coreAllowance: coreAllowance.toString(),
    btcAllowance: btcAllowance.toString(),
  }
}