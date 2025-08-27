import { useState } from 'react'
import { useWriteContract } from 'wagmi'
import { toast } from 'sonner'
import { getNetworkByChainId } from '../config/contracts'
import { useNetworkStore } from '../store/useNetworkStore'

/**
 * 🚀 Switchboard Real-time Price Hook with Smart Caching
 * 
 * Features:
 * - Pull fresh prices on-demand from Switchboard
 * - 30-second smart caching (no unnecessary updates)
 * - Automatic fallback to cached prices when fresh
 * - User-friendly loading states
 */
export function useSwitchboardPrices() {
  const { chainId } = useNetworkStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Record<string, number>>({})
  
  const { writeContractAsync } = useWriteContract()
  
  /**
   * Smart price update - only fetch if needed (>30 seconds old)
   */
  const updatePricesIfNeeded = async (assets: string[] = ['CORE', 'BTC']): Promise<boolean> => {
    try {
      setIsUpdating(true)
      
      // Get contract addresses
      const { contracts } = getNetworkByChainId(chainId || 31337)
      const priceFeedAddress = contracts.PriceFeed || contracts.CoreOracle
      
      if (!priceFeedAddress) {
        throw new Error('PriceFeed contract not found for this network')
      }
      
      // Check which assets actually need updating (>30 seconds old)
      const now = Date.now()
      const thirtySeconds = 30 * 1000
      const assetsToUpdate = assets.filter(asset => {
        const lastUpdateTime = lastUpdate[asset] || 0
        return (now - lastUpdateTime) > thirtySeconds
      })
      
      if (assetsToUpdate.length === 0) {
        console.log('⚡ All prices are fresh (using 30-second cache)')
        toast.success('Using fresh cached prices', { duration: 2000 })
        return true
      }
      
      console.log(`🔄 Updating ${assetsToUpdate.length} stale prices:`, assetsToUpdate)
      toast.loading(`Fetching fresh prices for ${assetsToUpdate.join(', ')}...`)
      
      // Fetch fresh update data from Switchboard API
      const updatePromises = assetsToUpdate.map(async (asset) => {
        const response = await fetch(`/api/switchboard-updates/${asset.toLowerCase()}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${asset} update data`)
        }
        return {
          asset,
          updates: await response.json()
        }
      })
      
      const updateData = await Promise.all(updatePromises)
      
      // Smart contract ABI for smart price updates
      const smartUpdateABI = [
        {
          name: 'smartUpdatePrices',
          type: 'function',
          stateMutability: 'payable',
          inputs: [
            { name: 'assets', type: 'string[]' },
            { name: 'updates', type: 'bytes[][]' }
          ],
          outputs: [
            { name: 'updatedAssets', type: 'bool[]' }
          ]
        }
      ] as const
      
      // Call smart update function (only updates stale prices)
      const result = await writeContractAsync({
        address: priceFeedAddress as `0x${string}`,
        abi: smartUpdateABI,
        functionName: 'smartUpdatePrices',
        args: [
          updateData.map(d => d.asset),
          updateData.map(d => d.updates)
        ],
        value: BigInt(0) // Switchboard fee will be calculated by contract
      })
      
      // Update our cache timestamps
      const updatedTime = Date.now()
      assetsToUpdate.forEach(asset => {
        lastUpdate[asset] = updatedTime
      })
      setLastUpdate(prev => ({ ...prev, ...Object.fromEntries(assetsToUpdate.map(asset => [asset, updatedTime])) }))
      
      console.log('✅ Smart price update completed!')
      toast.success('Prices updated with real-time market data')
      
      return true
      
    } catch (error) {
      console.error('❌ Switchboard price update failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Price update failed: ${errorMessage}`)
      return false
      
    } finally {
      setIsUpdating(false)
    }
  }
  
  /**
   * Force update prices (ignore cache)
   */
  const forceUpdatePrices = async (assets: string[] = ['CORE', 'BTC']): Promise<boolean> => {
    // Reset cache to force update
    setLastUpdate(prev => ({
      ...prev,
      ...Object.fromEntries(assets.map(asset => [asset, 0]))
    }))
    
    return updatePricesIfNeeded(assets)
  }
  
  /**
   * Check if prices are fresh (within 30 seconds)
   */
  const arePricesFresh = (assets: string[] = ['CORE', 'BTC']): boolean => {
    const now = Date.now()
    const thirtySeconds = 30 * 1000
    
    return assets.every(asset => {
      const lastUpdateTime = lastUpdate[asset] || 0
      return (now - lastUpdateTime) <= thirtySeconds
    })
  }
  
  return {
    updatePricesIfNeeded,
    forceUpdatePrices,
    isUpdating,
    arePricesFresh,
    lastUpdate
  }
}