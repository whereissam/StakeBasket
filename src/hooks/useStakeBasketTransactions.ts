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
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

// StakeBasket contract ABI - uses native CORE tokens (payable)
const STAKE_BASKET_ABI = [
  {
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable", 
    "type": "function"
  },
  {
    "inputs": [{"name": "shares", "type": "uint256"}],
    "name": "redeem", 
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "requestId", "type": "uint256"}],
    "name": "processWithdrawal", 
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserWithdrawalRequests", 
    "outputs": [
      {"name": "requestIds", "type": "uint256[]"},
      {"name": "amounts", "type": "uint256[]"},
      {"name": "timestamps", "type": "uint256[]"},
      {"name": "canProcess", "type": "bool[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "coreAmount", "type": "uint256"},
      {"indexed": false, "name": "sharesIssued", "type": "uint256"}
    ],
    "name": "Deposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "sharesBurned", "type": "uint256"},
      {"indexed": false, "name": "coreAmount", "type": "uint256"}
    ],
    "name": "Redeemed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "shares", "type": "uint256"},
      {"indexed": false, "name": "requestId", "type": "uint256"},
      {"indexed": false, "name": "requestTime", "type": "uint256"}
    ],
    "name": "WithdrawalRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "shares", "type": "uint256"},
      {"indexed": false, "name": "coreAmount", "type": "uint256"}
    ],
    "name": "InstantRedeemExecuted",
    "type": "event"
  }
] as const

export function useStakeBasketTransactions() {
  const chainId = useChainId()
  const { address } = useAccount()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Create transaction state managers for each operation
  const depositStateManager = createTransactionStateManager('Stake')
  const redeemStateManager = createTransactionStateManager('Withdraw')
  const approveStateManager = createTransactionStateManager('Approve')
  
  // Refs to track handled errors and prevent loops
  const handledErrors = useRef<{
    depositWrite: any
    redeemWrite: any
    approveWrite: any
    depositReceipt: any
    redeemReceipt: any
    approveReceipt: any
  }>({
    depositWrite: null,
    redeemWrite: null,
    approveWrite: null,
    depositReceipt: null,
    redeemReceipt: null,
    approveReceipt: null
  })
  
  // Get StakeBasketToken address from contracts
  const basketTokenAddress = contracts.StakeBasketToken
  
  // BASKET token approval check
  const { data: basketAllowance = 0n } = useReadContract({
    address: basketTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, contracts.StakeBasket as `0x${string}`],
    query: { enabled: !!address && !!basketTokenAddress && !!contracts.StakeBasket }
  })
  
  
  // Write contract hooks (no approval needed for native CORE)
  const { writeContract: depositToBasket, data: depositHash, error: depositWriteError } = useWriteContract()
  const { writeContract: redeemFromBasket, data: redeemHash, error: redeemWriteError } = useWriteContract()
  const { writeContract: approveBasket, data: approveHash, error: approveError } = useWriteContract()
  
  // Transaction receipt hooks
  const { isLoading: isDepositing, isSuccess: depositSuccess, error: depositError } = useWaitForTransactionReceipt({
    hash: depositHash,
  })
  
  const { isLoading: isRedeeming, isSuccess: redeemSuccess, error: redeemError } = useWaitForTransactionReceipt({
    hash: redeemHash,
  })
  
  
  const { isLoading: isApprovingBasket, isSuccess: approveSuccess, error: approveReceiptError } = useWaitForTransactionReceipt({
    hash: approveHash,
  })
  

  // Check if BASKET tokens need approval
  const needsBasketApproval = (sharesAmount: string) => {
    if (!basketAllowance || basketAllowance === 0n) return true
    const sharesWei = parseEther(sharesAmount)
    return basketAllowance < sharesWei
  }

  // Enhanced error handling for deposit transactions
  useEffect(() => {
    if (depositHash && isDepositing) {
      depositStateManager.showLoadingToast('Confirming staking transaction on blockchain...')
    }
  }, [depositHash, isDepositing])

  useEffect(() => {
    if (depositSuccess) {
      depositStateManager.showSuccessToast('Staking successful! BASKET tokens received.')
    }
  }, [depositSuccess])

  useEffect(() => {
    if (depositError && handledErrors.current.depositReceipt !== depositError) {
      handledErrors.current.depositReceipt = depositError
      depositStateManager.handleError(depositError)
    }
  }, [depositError])

  // Handle write contract errors (immediate wallet/contract errors)
  useEffect(() => {
    if (depositWriteError && handledErrors.current.depositWrite !== depositWriteError) {
      handledErrors.current.depositWrite = depositWriteError
      depositStateManager.handleError(depositWriteError)
    }
  }, [depositWriteError])

  // Enhanced error handling for redeem transactions
  useEffect(() => {
    if (redeemWriteError && handledErrors.current.redeemWrite !== redeemWriteError) {
      handledErrors.current.redeemWrite = redeemWriteError
      redeemStateManager.handleError(redeemWriteError)
    }
  }, [redeemWriteError])

  useEffect(() => {
    if (redeemHash && isRedeeming) {
      redeemStateManager.showLoadingToast('Confirming withdrawal on blockchain...')
    }
  }, [redeemHash, isRedeeming])

  useEffect(() => {
    if (redeemSuccess) {
      redeemStateManager.showSuccessToast('Withdrawal successful! CORE tokens received immediately.')
    }
  }, [redeemSuccess])

  useEffect(() => {
    if (redeemError && handledErrors.current.redeemReceipt !== redeemError) {
      handledErrors.current.redeemReceipt = redeemError
      redeemStateManager.handleError(redeemError)
    }
  }, [redeemError])
  
  
  // Enhanced error handling for approval transactions
  useEffect(() => {
    if (approveError && handledErrors.current.approveWrite !== approveError) {
      handledErrors.current.approveWrite = approveError
      approveStateManager.handleError(approveError)
    }
  }, [approveError])

  useEffect(() => {
    if (approveHash && isApprovingBasket) {
      approveStateManager.showLoadingToast('Confirming BASKET token approval on blockchain...')
    }
  }, [approveHash, isApprovingBasket])

  useEffect(() => {
    if (approveSuccess) {
      approveStateManager.showSuccessToast('BASKET tokens approved! You can now redeem.')
    }
  }, [approveSuccess])

  useEffect(() => {
    if (approveReceiptError && handledErrors.current.approveReceipt !== approveReceiptError) {
      handledErrors.current.approveReceipt = approveReceiptError
      approveStateManager.handleError(approveReceiptError)
    }
  }, [approveReceiptError])

  const depositCore = async (amount: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.depositWrite = null
      handledErrors.current.depositReceipt = null
      
      const amountWei = parseEther(amount)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!contracts.StakeBasket) {
        throw new Error(`StakeBasket contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 Transaction details:', {
        contractAddress: contracts.StakeBasket,
        amount,
        amountWei: amountWei.toString(),
        chainId,
        address
      })

      // Show wallet confirmation toast
      depositStateManager.showLoadingToast('Please confirm staking transaction in your wallet...')
      
      // Explicitly specify the account in the transaction
      depositToBasket({
        address: contracts.StakeBasket as `0x${string}`,
        abi: STAKE_BASKET_ABI,
        functionName: 'deposit',
        args: [amountWei],
        value: amountWei, // Send native tokens (ETH in local, CORE in testnet)
        gas: BigInt(300000), // Reasonable gas limit for deposit function
        account: address as `0x${string}`, // Explicitly set the account
      })
      
      console.log('✅ Transaction submitted to wallet')
    } catch (error) {
      console.error('Deposit error:', error)
      const analyzedError = handleTransactionError(error, 'Staking', {
        showToast: true,
        onRetry: () => depositCore(amount)
      })
      
      // Only re-throw if not user rejection
      if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
        throw error
      }
    }
  }

  const redeemBasket = async (shares: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.redeemWrite = null
      handledErrors.current.redeemReceipt = null
      
      const sharesWei = parseEther(shares)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!contracts.StakeBasket) {
        throw new Error(`StakeBasket contract not deployed on chain ${chainId}`)
      }
      
      // Show wallet confirmation toast
      redeemStateManager.showLoadingToast('Please confirm withdrawal in your wallet...')
      
      redeemFromBasket({
        address: contracts.StakeBasket as `0x${string}`,
        abi: STAKE_BASKET_ABI,
        functionName: 'redeem',
        args: [sharesWei],
        gas: BigInt(250000), // Reasonable gas limit for redeem function
        account: address as `0x${string}`, // Explicitly set the account
      })
    } catch (error) {
      console.error('Redeem error:', error)
      const analyzedError = handleTransactionError(error, 'Withdrawal', {
        showToast: true,
        onRetry: () => redeemBasket(shares)
      })
      
      // Only re-throw if not user rejection
      if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
        throw error
      }
    }
  }
  
  
  const approveBasketTokens = async (sharesAmount: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.approveWrite = null
      handledErrors.current.approveReceipt = null
      
      const sharesWei = parseEther(sharesAmount)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!basketTokenAddress) {
        throw new Error('BASKET token contract not found')
      }
      
      if (!contracts.StakeBasket) {
        throw new Error(`StakeBasket contract not deployed on chain ${chainId}`)
      }
      
      // Show wallet confirmation toast
      approveStateManager.showLoadingToast('Please approve BASKET tokens in your wallet...')
      
      approveBasket({
        address: basketTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contracts.StakeBasket as `0x${string}`, sharesWei],
        gas: BigInt(100000), // Reasonable gas limit for approve function
        account: address as `0x${string}`, // Explicitly set the account
      })
    } catch (error) {
      console.error('BASKET approval error:', error)
      const analyzedError = handleTransactionError(error, 'Token Approval', {
        showToast: true,
        onRetry: () => approveBasketTokens(sharesAmount)
      })
      
      // Only re-throw if not user rejection
      if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
        throw error
      }
    }
  }

  return {
    // Actions
    depositCore,
    redeemBasket,
    approveBasketTokens,
    
    // States
    isDepositing,
    isRedeeming,
    isApprovingBasket,
    
    // Success states
    depositSuccess,
    redeemSuccess,
    approveSuccess,
    
    // Transaction hashes
    depositHash,
    redeemHash,
    approveHash,
    
    // Approval checks
    needsBasketApproval,
    basketAllowance: basketAllowance.toString(),
  }
}