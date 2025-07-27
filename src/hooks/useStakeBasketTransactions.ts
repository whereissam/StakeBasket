import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { toast } from 'sonner'
import { useEffect } from 'react'


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
  }
] as const

export function useStakeBasketTransactions() {
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Write contract hooks (no approval needed for native CORE)
  const { writeContract: depositToBasket, data: depositHash } = useWriteContract()
  const { writeContract: redeemFromBasket, data: redeemHash } = useWriteContract()
  
  // Transaction receipt hooks
  const { isLoading: isDepositing, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  })
  
  const { isLoading: isRedeeming, isSuccess: redeemSuccess } = useWaitForTransactionReceipt({
    hash: redeemHash,
  })

  // Toast notifications for transaction states
  useEffect(() => {
    if (depositHash && isDepositing) {
      toast.loading('Confirming deposit transaction...', { id: 'deposit' })
    }
    if (depositSuccess) {
      toast.success('Deposit successful! BASKET tokens received.', { id: 'deposit' })
    }
  }, [depositHash, isDepositing, depositSuccess])

  useEffect(() => {
    if (redeemHash && isRedeeming) {
      toast.loading('Confirming redeem transaction...', { id: 'redeem' })
    }
    if (redeemSuccess) {
      toast.success('Redeem successful! CORE tokens received.', { id: 'redeem' })
    }
  }, [redeemHash, isRedeeming, redeemSuccess])

  const depositCore = async (amount: string) => {
    try {
      const amountWei = parseEther(amount)
      
      toast.loading('Please confirm transaction in your wallet...', { id: 'deposit' })
      
      depositToBasket({
        address: contracts.StakeBasket as `0x${string}`,
        abi: STAKE_BASKET_ABI,
        functionName: 'deposit',
        args: [amountWei],
        value: amountWei, // Send native CORE tokens
      })
    } catch (error) {
      console.error('Deposit error:', error)
      toast.error('Deposit failed. Please try again.', { id: 'deposit' })
      throw error
    }
  }

  const redeemBasket = async (shares: string) => {
    try {
      const sharesWei = parseEther(shares)
      
      toast.loading('Please confirm transaction in your wallet...', { id: 'redeem' })
      
      redeemFromBasket({
        address: contracts.StakeBasket as `0x${string}`,
        abi: STAKE_BASKET_ABI,
        functionName: 'redeem',
        args: [sharesWei],
      })
    } catch (error) {
      console.error('Redeem error:', error)
      toast.error('Redeem failed. Please try again.', { id: 'redeem' })
      throw error
    }
  }

  return {
    // Actions
    depositCore,
    redeemBasket,
    
    // States
    isDepositing,
    isRedeeming,
    
    // Success states
    depositSuccess,
    redeemSuccess,
    
    // Transaction hashes
    depositHash,
    redeemHash,
  }
}