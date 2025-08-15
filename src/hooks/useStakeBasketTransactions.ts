import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'


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
  
  // Refs to track toast states and prevent duplicates
  const toastRefs = useRef({
    depositWallet: false,
    depositTx: false,
    redeemWallet: false,
    redeemTx: false,
    approveWallet: false,
    approveTx: false
  })

  // Refs to track handled errors and prevent loops
  const handledErrors = useRef({
    depositWrite: null,
    redeemWrite: null,
    approveWrite: null,
    depositReceipt: null,
    redeemReceipt: null,
    approveReceipt: null
  })
  
  // Get StakeBasketToken address from contracts
  const basketTokenAddress = contracts.StakeBasketToken || contracts.stakeBasketToken
  
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
  
  // Helper function to reset all toast states (prevents loops)
  const resetAllToastStates = () => {
    toastRefs.current.depositWallet = false
    toastRefs.current.depositTx = false
    toastRefs.current.redeemWallet = false
    toastRefs.current.redeemTx = false
    toastRefs.current.approveWallet = false
    toastRefs.current.approveTx = false
    toast.dismiss()
  }

  // Check if BASKET tokens need approval
  const needsBasketApproval = (sharesAmount: string) => {
    if (!basketAllowance || basketAllowance === 0n) return true
    const sharesWei = parseEther(sharesAmount)
    return basketAllowance < sharesWei
  }

  // Toast notifications for transaction states
  useEffect(() => {
    if (depositHash && isDepositing && !toastRefs.current.depositTx) {
      // Clear wallet confirmation and show blockchain confirmation
      toastRefs.current.depositWallet = false
      toast.dismiss('deposit-wallet')
      
      toastRefs.current.depositTx = true
      toast.loading('Confirming staking transaction...', { id: 'deposit-tx' })
    }
  }, [depositHash, isDepositing])

  useEffect(() => {
    if (depositSuccess) {
      toastRefs.current.depositTx = false
      toastRefs.current.depositWallet = false
      toast.dismiss('deposit-tx')
      toast.success('Staking successful! BASKET tokens received.', { id: 'deposit-success' })
    }
  }, [depositSuccess])

  useEffect(() => {
    if (depositError && handledErrors.current.depositReceipt !== depositError) {
      handledErrors.current.depositReceipt = depositError
      console.error('Deposit transaction failed:', depositError)
      
      // Reset all deposit toast states
      toastRefs.current.depositTx = false
      toastRefs.current.depositWallet = false
      toast.dismiss('deposit-tx')
      toast.dismiss('deposit-wallet')
      
      toast.error('Staking transaction failed. Please check your balance and try again.', { id: 'deposit-error' })
    }
  }, [depositError])

  // Handle write contract errors (immediate wallet/contract errors)
  useEffect(() => {
    if (depositWriteError && handledErrors.current.depositWrite !== depositWriteError) {
      handledErrors.current.depositWrite = depositWriteError
      console.error('Deposit write error:', depositWriteError)
      
      // Reset all deposit toast states
      toastRefs.current.depositWallet = false
      toastRefs.current.depositTx = false
      toast.dismiss('deposit-wallet')
      toast.dismiss('deposit-tx')
      
      if (depositWriteError.message.includes('insufficient funds') || depositWriteError.message.includes('Insufficient funds')) {
        toast.error('Insufficient ETH balance. You need more ETH to cover the staking amount plus gas fees.', { id: 'deposit-write-error', duration: 5000 })
      } else {
        toast.error(`Transaction failed: ${depositWriteError.message}`, { id: 'deposit-write-error', duration: 5000 })
      }
    }
  }, [depositWriteError])

  useEffect(() => {
    if (redeemWriteError && handledErrors.current.redeemWrite !== redeemWriteError) {
      handledErrors.current.redeemWrite = redeemWriteError
      console.error('Redeem write error:', redeemWriteError)
      
      // Reset redeem toast states
      toastRefs.current.redeemWallet = false
      toastRefs.current.redeemTx = false
      toast.dismiss('redeem-wallet')
      toast.dismiss('redeem-tx')
      
      toast.error(`Failed to submit transaction: ${redeemWriteError.message}`, { id: 'redeem-write-error', duration: 5000 })
    }
  }, [redeemWriteError])

  useEffect(() => {
    if (redeemHash && isRedeeming && !toastRefs.current.redeemTx) {
      toastRefs.current.redeemWallet = false
      toast.dismiss('redeem-wallet')
      
      toastRefs.current.redeemTx = true
      toast.loading('Confirming withdrawal...', { id: 'redeem-tx' })
    }
  }, [redeemHash, isRedeeming])

  useEffect(() => {
    if (redeemSuccess) {
      toastRefs.current.redeemTx = false
      toastRefs.current.redeemWallet = false
      toast.dismiss('redeem-tx')
      toast.success('Withdrawal successful! CORE tokens received immediately.', { id: 'redeem-success' })
    }
  }, [redeemSuccess])

  useEffect(() => {
    if (redeemError && handledErrors.current.redeemReceipt !== redeemError) {
      handledErrors.current.redeemReceipt = redeemError
      console.error('Redeem transaction failed:', redeemError)
      
      // Reset all redeem toast states
      toastRefs.current.redeemTx = false
      toastRefs.current.redeemWallet = false
      toast.dismiss('redeem-tx')
      toast.dismiss('redeem-wallet')
      
      toast.error('Withdrawal request failed. Please try again.', { id: 'redeem-error' })
    }
  }, [redeemError])
  
  
  // Toast notifications for BASKET approval
  useEffect(() => {
    if (approveError && handledErrors.current.approveWrite !== approveError) {
      handledErrors.current.approveWrite = approveError
      console.error('BASKET approve write error:', approveError)
      
      // Reset approve toast states
      toastRefs.current.approveWallet = false
      toastRefs.current.approveTx = false
      toast.dismiss('approve-wallet')
      toast.dismiss('approve-tx')
      
      toast.error(`Failed to submit BASKET approval: ${approveError.message}`, { id: 'approve-write-error', duration: 5000 })
    }
  }, [approveError])

  useEffect(() => {
    if (approveHash && isApprovingBasket && !toastRefs.current.approveTx) {
      toastRefs.current.approveWallet = false
      toast.dismiss('approve-wallet')
      
      toastRefs.current.approveTx = true
      toast.loading('Confirming BASKET token approval...', { id: 'approve-tx' })
    }
  }, [approveHash, isApprovingBasket])

  useEffect(() => {
    if (approveSuccess) {
      toastRefs.current.approveTx = false
      toastRefs.current.approveWallet = false
      toast.dismiss('approve-tx')
      toast.success('BASKET tokens approved! You can now redeem.', { id: 'approve-success' })
    }
  }, [approveSuccess])

  useEffect(() => {
    if (approveReceiptError && handledErrors.current.approveReceipt !== approveReceiptError) {
      handledErrors.current.approveReceipt = approveReceiptError
      console.error('BASKET approval transaction failed:', approveReceiptError)
      
      // Reset all approve toast states
      toastRefs.current.approveTx = false
      toastRefs.current.approveWallet = false
      toast.dismiss('approve-tx')
      toast.dismiss('approve-wallet')
      
      toast.error('BASKET approval failed. Please try again.', { id: 'approve-error' })
    }
  }, [approveReceiptError])

  const depositCore = async (amount: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.depositWrite = null
      handledErrors.current.depositReceipt = null
      
      const amountWei = parseEther(amount)
      
      if (!address) {
        throw new Error('Wallet not connected')
      }
      
      if (!contracts.StakeBasket || contracts.StakeBasket === '0x0000000000000000000000000000000000000000') {
        throw new Error(`StakeBasket contract not deployed on chain ${chainId}`)
      }
      
      if (chainId !== 1114 && chainId !== 31337) {
        throw new Error(`Please switch to Core Testnet2 (Chain ID: 1114) or Local Hardhat (Chain ID: 31337). Current: ${chainId}`)
      }
      
      // Clear any existing toasts first, then show wallet confirmation
      if (!toastRefs.current.depositWallet) {
        toast.dismiss() // Clear any existing toasts
        toastRefs.current.depositWallet = true
        toast.loading('Please confirm staking transaction in your wallet...', { id: 'deposit-wallet' })
      }
      
      // Explicitly specify the account in the transaction
      depositToBasket({
        address: contracts.StakeBasket as `0x${string}`,
        abi: STAKE_BASKET_ABI,
        functionName: 'deposit',
        args: [amountWei],
        value: amountWei, // Send native tokens (ETH in local, CORE in testnet)
        // Let the network estimate gas automatically
        account: address as `0x${string}`, // Explicitly set the account
      })
    } catch (error) {
      console.error('Deposit error:', error)
      // Reset all deposit toast states to prevent loops
      toastRefs.current.depositWallet = false
      toastRefs.current.depositTx = false
      toast.dismiss('deposit-wallet')
      toast.dismiss('deposit-tx')
      toast.error(`Staking failed: ${error instanceof Error ? error.message : 'Please try again'}`, { id: 'deposit-catch-error', duration: 5000 })
      throw error
    }
  }

  const redeemBasket = async (shares: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.redeemWrite = null
      handledErrors.current.redeemReceipt = null
      
      const sharesWei = parseEther(shares)
      
      // Clear any existing toasts first, then show wallet confirmation
      if (!toastRefs.current.redeemWallet) {
        toast.dismiss() // Clear any existing toasts
        toastRefs.current.redeemWallet = true
        toast.loading('Please confirm withdrawal in your wallet...', { id: 'redeem-wallet' })
      }
      
      redeemFromBasket({
        address: contracts.StakeBasket as `0x${string}`,
        abi: STAKE_BASKET_ABI,
        functionName: 'redeem',
        args: [sharesWei],
      })
    } catch (error) {
      console.error('Redeem error:', error)
      toastRefs.current.redeemWallet = false
      toast.dismiss('redeem-wallet')
      toast.error('Withdrawal request failed. Please try again.', { id: 'redeem-catch-error', duration: 5000 })
      throw error
    }
  }
  
  
  const approveBasketTokens = async (sharesAmount: string) => {
    try {
      // Reset error tracking for new transaction
      handledErrors.current.approveWrite = null
      handledErrors.current.approveReceipt = null
      
      const sharesWei = parseEther(sharesAmount)
      
      // Clear any existing toasts first, then show approval request
      if (!toastRefs.current.approveWallet) {
        toast.dismiss()
        toastRefs.current.approveWallet = true
        toast.loading('Please approve BASKET tokens in your wallet...', { id: 'approve-wallet' })
      }
      
      approveBasket({
        address: basketTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contracts.StakeBasket as `0x${string}`, sharesWei],
      })
    } catch (error) {
      console.error('BASKET approval error:', error)
      // Reset all approval toast states to prevent loops
      toastRefs.current.approveWallet = false
      toastRefs.current.approveTx = false
      toast.dismiss('approve-wallet')
      toast.dismiss('approve-tx')
      toast.error('BASKET approval failed. Please try again.', { id: 'approve-catch-error', duration: 5000 })
      throw error
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