import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { toast } from 'sonner'
import { useEffect } from 'react'

// PriceFeed contract ABI for updating prices
const PRICE_FEED_ABI = [
  {
    "inputs": [
      {"name": "asset", "type": "string"},
      {"name": "price", "type": "uint256"}
    ],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "updatePriceFromOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "asset", "type": "string"},
      {"indexed": false, "name": "price", "type": "uint256"},
      {"indexed": false, "name": "timestamp", "type": "uint256"}
    ],
    "name": "PriceUpdated",
    "type": "event"
  }
] as const

export function usePriceFeedManager() {
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Write contract hooks
  const { writeContract: updatePriceContract, data: updateHash, error: updateError } = useWriteContract()
  
  // Transaction receipt hook
  const { isLoading: isUpdating, isSuccess: updateSuccess, error: updateReceiptError } = useWaitForTransactionReceipt({
    hash: updateHash,
  })

  // Handle transaction results
  useEffect(() => {
    if (updateHash && isUpdating) {
      toast.loading('Updating price feed...', { id: 'price-update' })
    }
  }, [updateHash, isUpdating])

  useEffect(() => {
    if (updateSuccess) {
      toast.success('Price feed updated successfully!', { id: 'price-update' })
    }
  }, [updateSuccess])

  useEffect(() => {
    if (updateError) {
      console.error('Price update error:', updateError)
      toast.error(`Price update failed: ${updateError.message}`, { id: 'price-update' })
    }
  }, [updateError])

  useEffect(() => {
    if (updateReceiptError) {
      console.error('Price update transaction failed:', updateReceiptError)
      toast.error('Price update transaction failed', { id: 'price-update' })
    }
  }, [updateReceiptError])

  // Function to update CORE price to current market price (~$1.50)
  const updateCorePrice = async () => {
    try {
      if (!contracts.CoreOracle || contracts.CoreOracle === '0x0000000000000000000000000000000000000000') {
        throw new Error('PriceFeed contract not configured')
      }

      if (chainId !== 1114) {
        throw new Error('Please switch to Core Testnet2')
      }

      console.log('🔄 Updating CORE price feed:', {
        contract: contracts.CoreOracle,
        asset: 'CORE',
        price: '1.50 USD'
      })

      // Update CORE price to $1.50 (1.5 * 10^18)
      const priceWei = parseEther('1.5') // $1.50 in wei format
      
      toast.loading('Please confirm price update in your wallet...', { id: 'price-update' })
      
      updatePriceContract({
        address: contracts.CoreOracle as `0x${string}`,
        abi: PRICE_FEED_ABI,
        functionName: 'updatePrice',
        args: ['CORE', priceWei],
        gas: 100000n, // Set gas limit
      })
    } catch (error) {
      console.error('Update price error:', error)
      toast.error(`Failed to update price: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'price-update' })
      throw error
    }
  }

  // Function to update BTC price to current market price (~$95,000)
  const updateBTCPrice = async () => {
    try {
      if (!contracts.CoreOracle || contracts.CoreOracle === '0x0000000000000000000000000000000000000000') {
        throw new Error('PriceFeed contract not configured')
      }

      if (chainId !== 1114) {
        throw new Error('Please switch to Core Testnet2')
      }

      // Update SolvBTC price to $95,000
      const priceWei = parseEther('95000') // $95,000 in wei format
      
      updatePriceContract({
        address: contracts.CoreOracle as `0x${string}`,
        abi: PRICE_FEED_ABI,
        functionName: 'updatePrice',
        args: ['SolvBTC', priceWei],
        gas: 100000n,
      })
    } catch (error) {
      console.error('Update BTC price error:', error)
      toast.error(`Failed to update BTC price: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'price-update' })
      throw error
    }
  }

  // Function to update all prices at once
  const updateAllPrices = async () => {
    try {
      await updateCorePrice()
      // Wait a bit before updating BTC to avoid nonce issues
      setTimeout(() => updateBTCPrice(), 2000)
    } catch (error) {
      console.error('Update all prices error:', error)
    }
  }

  return {
    // Actions
    updateCorePrice,
    updateBTCPrice,
    updateAllPrices,
    
    // States
    isUpdating,
    updateSuccess,
    
    // Transaction hash
    updateHash,
  }
}