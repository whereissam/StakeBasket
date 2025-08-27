import { useState } from 'react'
import { parseUnits } from 'viem'
import { useWriteContract } from 'wagmi'
import { toast } from 'sonner'
import { getNetworkByChainId } from '../config/contracts'
import { useNetworkStore } from '../store/useNetworkStore'

/**
 * 🔄 Auto Price Refresh Hook
 * 
 * Solves the "stale price" problem by automatically refreshing prices
 * from CoinGecko API before any staking transaction.
 * 
 * Usage:
 * const { refreshPrices, isRefreshing } = usePriceRefresh()
 * await refreshPrices() // Always call before staking
 */
export function usePriceRefresh() {
  const { chainId } = useNetworkStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { writeContractAsync } = useWriteContract()
  
  const refreshPrices = async (): Promise<boolean> => {
    try {
      setIsRefreshing(true)
      console.log('🔄 Refreshing prices from CoinGecko...')
      
      // Get contract addresses
      const { contracts } = getNetworkByChainId(chainId || 31337)
      const priceFeedAddress = contracts.PriceFeed || contracts.CoreOracle
      
      if (!priceFeedAddress) {
        throw new Error('PriceFeed contract not found for this network')
      }
      
      // Fetch real-time prices from CoinGecko
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=coredaoorg,bitcoin&vs_currencies=usd',
        { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }
      
      const prices = await response.json()
      
      // Validate price data
      if (!prices.coredaoorg?.usd || !prices.bitcoin?.usd) {
        throw new Error('Invalid price data from CoinGecko')
      }
      
      const corePriceUSD = prices.coredaoorg.usd
      const btcPriceUSD = prices.bitcoin.usd
      
      console.log(`📊 Market Prices: CORE $${corePriceUSD}, BTC $${btcPriceUSD}`)
      
      // Convert to Wei (18 decimals)
      const corePriceWei = parseUnits(corePriceUSD.toString(), 18)
      const btcPriceWei = parseUnits(btcPriceUSD.toString(), 18)
      
      // PriceFeed ABI for setPrice function
      const priceFeedABI = [
        {
          name: 'setPrice',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'asset', type: 'string' },
            { name: 'price', type: 'uint256' }
          ],
          outputs: []
        }
      ] as const
      
      // Update CORE price
      console.log('Updating CORE price...')
      await writeContractAsync({
        address: priceFeedAddress as `0x${string}`,
        abi: priceFeedABI,
        functionName: 'setPrice',
        args: ['CORE', corePriceWei],
      })
      
      // Update BTC price 
      console.log('Updating BTC price...')
      await writeContractAsync({
        address: priceFeedAddress as `0x${string}`,
        abi: priceFeedABI,
        functionName: 'setPrice',
        args: ['BTC', btcPriceWei],
      })
      
      // Update related BTC assets with same price
      await writeContractAsync({
        address: priceFeedAddress as `0x${string}`,
        abi: priceFeedABI,
        functionName: 'setPrice',
        args: ['SolvBTC', btcPriceWei],
      })
      
      await writeContractAsync({
        address: priceFeedAddress as `0x${string}`,
        abi: priceFeedABI,
        functionName: 'setPrice',
        args: ['cbBTC', btcPriceWei],
      })
      
      await writeContractAsync({
        address: priceFeedAddress as `0x${string}`,
        abi: priceFeedABI,
        functionName: 'setPrice',
        args: ['coreBTC', btcPriceWei],
      })
      
      console.log('✅ All prices updated successfully!')
      toast.success('Prices updated with latest market data')
      
      return true
      
    } catch (error) {
      console.error('❌ Price refresh failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Price update failed: ${errorMessage}`)
      return false
      
    } finally {
      setIsRefreshing(false)
    }
  }
  
  return {
    refreshPrices,
    isRefreshing
  }
}