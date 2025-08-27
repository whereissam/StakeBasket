import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useChainId } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

// PriceFeed contract ABI for setting prices and Switchboard updates
const PRICE_FEED_ABI = [
  {
    "inputs": [
      {"name": "asset", "type": "string"},
      {"name": "price", "type": "uint256"}
    ],
    "name": "setPrice",
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
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "getPriceWithFallback",
    "outputs": [
      {"name": "price", "type": "uint256"},
      {"name": "isStale", "type": "bool"}
    ],
    "stateMutability": "view",
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

// API endpoints for live price data
const PRICE_API_ENDPOINTS = {
  CORE: 'https://api.coingecko.com/api/v3/simple/price?ids=coredaoorg&vs_currencies=usd',
  BTC: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
}

export function usePriceFeedManager() {
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  
  // State for tracking price staleness and API fallback
  const [isPriceStale, setIsPriceStale] = useState(false)
  const [apiPrices, setApiPrices] = useState<{ CORE?: number, BTC?: number }>({})
  
  // Write contract hooks
  const { writeContract: updatePriceContract, data: updateHash, error: updateError } = useWriteContract()
  
  // Read contract hooks to check price staleness
  const { data: corePriceValid } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'isPriceValid',
    args: ['CORE'],
    query: {
      enabled: !!contracts.CoreOracle,
      refetchInterval: 30000 // Check every 30 seconds
    }
  })
  
  const { data: btcPriceValid } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'isPriceValid',
    args: ['SolvBTC'],
    query: {
      enabled: !!contracts.CoreOracle,
      refetchInterval: 30000
    }
  })
  
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

  // Function to fetch live prices from API
  const fetchApiPrice = async (asset: 'CORE' | 'BTC'): Promise<number | null> => {
    try {
      const endpoint = PRICE_API_ENDPOINTS[asset]
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (asset === 'CORE') {
        return data.coredaoorg?.usd || null
      } else {
        return data.bitcoin?.usd || null
      }
    } catch (error) {
      console.error(`Failed to fetch ${asset} price from API:`, error)
      return null
    }
  }
  
  // Function to update CORE price with API fallback for stale prices
  const updateCorePrice = async () => {
    try {
      if (!contracts.CoreOracle) {
        throw new Error('PriceFeed contract not configured')
      }

      if (chainId !== 1114) {
        throw new Error('Please switch to Core Testnet2')
      }
      
      let priceToUse = 1.5 // Default fallback price
      
      // Check if price is stale, if so use API
      if (corePriceValid === false || isPriceStale) {
        const apiPrice = await fetchApiPrice('CORE')
        if (apiPrice) {
          priceToUse = apiPrice
          setApiPrices(prev => ({ ...prev, CORE: apiPrice }))
          toast.info(`Using live API price: $${apiPrice.toFixed(4)}`, { id: 'price-api-fallback' })
        } else {
          toast.warning('API price unavailable, using default price', { id: 'price-api-fallback' })
        }
      }

      console.log('🔄 Updating CORE price feed:', {
        contract: contracts.CoreOracle,
        asset: 'CORE',
        price: `${priceToUse} USD`,
        source: corePriceValid === false ? 'API (stale fallback)' : 'Default'
      })

      const priceWei = parseEther(priceToUse.toString())
      
      toast.loading('Please confirm price update in your wallet...', { id: 'price-update' })
      
      updatePriceContract({
        address: contracts.CoreOracle as `0x${string}`,
        abi: PRICE_FEED_ABI,
        functionName: 'setPrice',
        args: ['CORE', priceWei],
        gas: 100000n,
      })
    } catch (error) {
      console.error('Update price error:', error)
      toast.error(`Failed to update price: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'price-update' })
      throw error
    }
  }

  // Function to update BTC price with API fallback for stale prices
  const updateBTCPrice = async () => {
    try {
      if (!contracts.CoreOracle) {
        throw new Error('PriceFeed contract not configured')
      }

      if (chainId !== 1114) {
        throw new Error('Please switch to Core Testnet2')
      }
      
      let priceToUse = 95000 // Default fallback price
      
      // Check if BTC price is stale, if so use API
      if (btcPriceValid === false || isPriceStale) {
        const apiPrice = await fetchApiPrice('BTC')
        if (apiPrice) {
          priceToUse = apiPrice
          setApiPrices(prev => ({ ...prev, BTC: apiPrice }))
          toast.info(`Using live BTC API price: $${apiPrice.toLocaleString()}`, { id: 'btc-api-fallback' })
        } else {
          toast.warning('BTC API price unavailable, using default price', { id: 'btc-api-fallback' })
        }
      }

      const priceWei = parseEther(priceToUse.toString())
      
      updatePriceContract({
        address: contracts.CoreOracle as `0x${string}`,
        abi: PRICE_FEED_ABI,
        functionName: 'setPrice',
        args: ['SolvBTC', priceWei],
        gas: 100000n,
      })
    } catch (error) {
      console.error('Update BTC price error:', error)
      toast.error(`Failed to update BTC price: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'price-update' })
      throw error
    }
  }

  // Function to update all prices at once with staggered execution
  const updateAllPrices = async () => {
    try {
      await updateCorePrice()
      // Wait a bit before updating BTC to avoid nonce issues
      setTimeout(() => updateBTCPrice(), 2000)
    } catch (error) {
      console.error('Update all prices error:', error)
    }
  }

  // Effect to monitor price staleness
  useEffect(() => {
    setIsPriceStale(corePriceValid === false || btcPriceValid === false)
  }, [corePriceValid, btcPriceValid])
  
  // Function to update prices using Switchboard (preferred method)
  const updatePricesWithSwitchboard = async () => {
    try {
      if (!contracts.CoreOracle) {
        throw new Error('PriceFeed contract not configured')
      }
      
      toast.info('Switchboard update not yet implemented. Using manual price update with API fallback.', { id: 'switchboard-fallback' })
      
      // For now, fall back to manual update with API prices
      await updateAllPrices()
    } catch (error) {
      console.error('Switchboard update error:', error)
      toast.error(`Switchboard update failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'switchboard-error' })
    }
  }

  return {
    // Actions
    updateCorePrice,
    updateBTCPrice,
    updateAllPrices,
    updatePricesWithSwitchboard,
    
    // States
    isUpdating,
    updateSuccess,
    isPriceStale,
    
    // Price validity
    corePriceValid: corePriceValid as boolean,
    btcPriceValid: btcPriceValid as boolean,
    
    // API prices for display
    apiPrices,
    
    // Transaction hash
    updateHash,
  }
}