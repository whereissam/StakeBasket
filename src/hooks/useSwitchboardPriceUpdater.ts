import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useContracts } from './useContracts'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

// Switchboard price update ABI
const SWITCHBOARD_PRICE_FEED_ABI = [
  {
    "inputs": [
      {"name": "asset", "type": "string"},
      {"name": "updates", "type": "bytes[]"}
    ],
    "name": "updatePriceFromSwitchboard",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "isPriceValid",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "getPriceAge",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "asset", "type": "string"},
      {"name": "price", "type": "uint256"}
    ],
    "name": "setPrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

/**
 * Hook for updating price feeds using Switchboard or manual fallback
 */
export function useSwitchboardPriceUpdater() {
  const { contracts } = useContracts()
  const [isUpdating, setIsUpdating] = useState(false)
  
  const { writeContract: updatePrice, data: updateHash, error: updateError } = useWriteContract()
  const { isLoading: isTxPending, isSuccess: updateSuccess, error: txError } = useWaitForTransactionReceipt({
    hash: updateHash,
  })

  /**
   * Get current price from CoinGecko API as fallback
   */
  const fetchLivePrice = async (asset: 'CORE' | 'BTC'): Promise<number | null> => {
    try {
      const apiUrl = asset === 'CORE' 
        ? 'https://api.coingecko.com/api/v3/simple/price?ids=coredaoorg&vs_currencies=usd'
        : 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      return asset === 'CORE' ? data.coredaoorg?.usd : data.bitcoin?.usd
    } catch (error) {
      console.error(`Failed to fetch ${asset} price:`, error)
      return null
    }
  }

  /**
   * Update CORE price using Switchboard (with manual fallback)
   */
  const updateCorePrice = async (): Promise<boolean> => {
    if (!contracts.CoreOracle) {
      toast.error('Price feed contract not available')
      return false
    }

    setIsUpdating(true)
    
    try {
      // TODO: Implement actual Switchboard feed updates when available
      // For now, use manual price setting with live API data
      
      const livePrice = await fetchLivePrice('CORE')
      
      if (!livePrice) {
        toast.error('Unable to fetch current CORE price')
        setIsUpdating(false)
        return false
      }

      console.log('🔄 Updating CORE price:', {
        price: livePrice,
        source: 'CoinGecko API (Switchboard fallback)',
        contract: contracts.CoreOracle
      })

      // Convert price to Wei (18 decimals)
      const priceWei = BigInt(Math.round(livePrice * 1e18))

      toast.loading('Updating CORE price feed...', { id: 'core-price-update' })

      updatePrice({
        address: contracts.CoreOracle as `0x${string}`,
        abi: SWITCHBOARD_PRICE_FEED_ABI,
        functionName: 'setPrice',
        args: ['CORE', priceWei],
        gas: 150000n,
      })

      return true
    } catch (error) {
      console.error('CORE price update failed:', error)
      toast.error('Failed to update CORE price', { id: 'core-price-update' })
      setIsUpdating(false)
      return false
    }
  }

  /**
   * Update BTC price using Switchboard (with manual fallback)  
   */
  const updateBTCPrice = async (): Promise<boolean> => {
    if (!contracts.CoreOracle) {
      toast.error('Price feed contract not available')
      return false
    }

    setIsUpdating(true)
    
    try {
      const livePrice = await fetchLivePrice('BTC')
      
      if (!livePrice) {
        toast.error('Unable to fetch current BTC price')
        setIsUpdating(false)
        return false
      }

      const priceWei = BigInt(Math.round(livePrice * 1e18))

      toast.loading('Updating BTC price feed...', { id: 'btc-price-update' })

      updatePrice({
        address: contracts.CoreOracle as `0x${string}`,
        abi: SWITCHBOARD_PRICE_FEED_ABI,
        functionName: 'setPrice',
        args: ['SolvBTC', priceWei], // Using SolvBTC as primary BTC asset
        gas: 150000n,
      })

      return true
    } catch (error) {
      console.error('BTC price update failed:', error)
      toast.error('Failed to update BTC price', { id: 'btc-price-update' })
      setIsUpdating(false)
      return false
    }
  }

  /**
   * Auto-update price before staking if stale
   */
  const ensureFreshPrice = async (asset: 'CORE' | 'BTC' = 'CORE'): Promise<boolean> => {
    try {
      if (asset === 'CORE') {
        return await updateCorePrice()
      } else {
        return await updateBTCPrice()
      }
    } catch (error) {
      console.error('Price update failed:', error)
      return false
    }
  }

  // Handle transaction success
  useEffect(() => {
    if (updateSuccess) {
      toast.success('Price feed updated successfully!', { 
        id: updateHash ? 'core-price-update' : 'btc-price-update' 
      })
      setIsUpdating(false)
    }
  }, [updateSuccess, updateHash])

  // Handle transaction errors
  useEffect(() => {
    if (updateError || txError) {
      const error = updateError || txError
      console.error('Transaction error:', error)
      toast.error(`Price update failed: ${error?.message || 'Unknown error'}`)
      setIsUpdating(false)
    }
  }, [updateError, txError])

  return {
    // Actions
    updateCorePrice,
    updateBTCPrice,
    ensureFreshPrice,
    
    // States
    isUpdating: isUpdating || isTxPending,
    updateSuccess,
    updateError: updateError || txError,
    updateHash,
  }
}