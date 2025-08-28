import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { useEffect, useRef } from 'react'
import { handleTransactionError, createTransactionStateManager } from '../utils/transactionErrorHandler'
import { validateNetworkForTransaction, NetworkValidationError } from '../utils/networkValidation'
// Import the compiled DualStaking Basket ABI
import DualStakingBasketABI from '../abis/DualStakingBasketABI.json'

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

export function useDualStakingTransactions() {
  const chainId = useChainId()
  const { address } = useAccount()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Create transaction state managers for each operation
  const dualStakeStateManager = createTransactionStateManager('Dual Stake')
  const approveCoreStateManager = createTransactionStateManager('Approve CORE')
  const approveBtcStateManager = createTransactionStateManager('Approve BTC')
  
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
  const btcTokenAddress = chainId === 1114 
    ? (contracts as any).SimpleBTCFaucet || contracts.MockCoreBTC 
    : contracts.MockCoreBTC
  
  // Token allowance checks
  const { data: coreAllowance = 0n } = useReadContract({
    address: coreTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, dualStakingBasketAddress as `0x${string}`],
    query: { 
      enabled: !!address && !!coreTokenAddress && !!dualStakingBasketAddress,
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 120000, // Keep in cache for 2 minutes
      refetchOnWindowFocus: false,
      refetchInterval: false // Disable automatic refetching
    }
  })
  
  const { data: btcAllowance = 0n } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, dualStakingBasketAddress as `0x${string}`],
    query: { 
      enabled: !!address && !!btcTokenAddress && !!dualStakingBasketAddress,
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 120000, // Keep in cache for 2 minutes
      refetchOnWindowFocus: false,
      refetchInterval: false // Disable automatic refetching
    }
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
      // Reset error tracking for new transaction
      handledErrors.current.dualStakeWrite = null
      handledErrors.current.dualStakeReceipt = null
      
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
        coreAmount: `${coreAmount} CORE`,
        btcAmount: `${btcAmount} BTC`,
        coreWei: coreWei.toString(),
        btcWei: btcWei.toString(),
        coreWeiHex: `0x${coreWei.toString(16)}`,
        btcWeiHex: `0x${btcWei.toString(16)}`,
        useNativeCORE,
        chainId,
        address
      })

      // Show wallet confirmation toast
      dualStakeStateManager.showLoadingToast('Please confirm dual staking transaction in your wallet...')
      
      if (useNativeCORE) {
        // Use native CORE + BTC tokens
        dualStake({
          address: dualStakingBasketAddress as `0x${string}`,
          abi: DualStakingBasketABI,
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
          abi: DualStakingBasketABI,
          functionName: 'deposit',
          args: [coreWei, btcWei],
          gas: BigInt(400000), // Higher gas limit for dual staking
          account: address as `0x${string}`,
        })
      }
      
      console.log('✅ Dual staking transaction submitted to wallet')
    } catch (error) {
      console.error('Dual staking error:', error)
      
      // Simple error handling without retry mechanism
      handleTransactionError(error, 'Dual Staking', {
        showToast: true,
        onRetry: undefined // No retry option
      })
      
      // Re-throw error for caller to handle
      throw error
    }
  }
  
  const approveCoreTokens = async (coreAmount: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.approveCoreWrite = null
      handledErrors.current.approveCoreReceipt = null
      
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
      
    } catch (error) {
      console.error('CORE approval error:', error)
      
      // Simple error handling without retry mechanism
      handleTransactionError(error, 'CORE Token Approval', {
        showToast: true,
        onRetry: undefined
      })
      
      // Re-throw error for caller to handle
      throw error
    }
  }
  
  const approveBtcTokens = async (btcAmount: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.approveBtcWrite = null
      handledErrors.current.approveBtcReceipt = null
      
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
      
    } catch (error) {
      console.error('BTC approval error:', error)
      
      // Simple error handling without retry mechanism
      handleTransactionError(error, 'BTC Token Approval', {
        showToast: true,
        onRetry: undefined
      })
      
      // Re-throw error for caller to handle
      throw error
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