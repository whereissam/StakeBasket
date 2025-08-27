import { useState, useEffect } from 'react'
import { useChainId, useReadContract } from 'wagmi'
import { CoreApiClient } from '../utils/coreApi'
import { getNetworkByChainId } from '../config/contracts'

interface PriceData {
  corePrice: number
  btcPrice: number
  lastUpdate: string
  isLoading: boolean
  error?: string
  source: 'oracle' | 'switchboard' | 'backend' | 'core-api' | 'coingecko' | 'fallback'
}

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price'

// PriceFeed contract ABI for price checking
const PRICE_FEED_ABI = [
  {
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "getPrice",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
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
  }
] as const

// CoinGecko API helper
async function fetchCoinGeckoPrice() {
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}?ids=ethereum,bitcoin,coredaoorg&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    )
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      ethPrice: data.ethereum?.usd || 0,
      btcPrice: data.bitcoin?.usd || 0,
      corePrice: data.coredaoorg?.usd || 0
    }
  } catch (error) {
    console.warn('CoinGecko API failed:', error)
    return null
  }
}

export function useRealPriceData(): PriceData {
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  
  const [priceData, setPriceData] = useState<PriceData>({
    corePrice: 0,
    btcPrice: 0,
    lastUpdate: '',
    isLoading: true,
    source: 'fallback'
  })
  
  // Try to get prices from Switchboard oracle first (only if contract exists)
  const oracleAddress = contracts?.CoreOracle || contracts?.PriceFeed
  const shouldUseOracle = !!oracleAddress && chainId !== 31337 // Skip oracle for local network
  
  const { data: corePriceOracle, error: coreOracleError } = useReadContract({
    address: oracleAddress as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { 
      enabled: shouldUseOracle,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false
    }
  })
  
  const { data: btcPriceOracle, error: btcOracleError } = useReadContract({
    address: oracleAddress as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'getPrice',
    args: ['BTC'],
    query: { 
      enabled: shouldUseOracle,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false
    }
  })
  
  const { data: corePriceValid } = useReadContract({
    address: oracleAddress as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'isPriceValid',
    args: ['CORE'],
    query: { 
      enabled: shouldUseOracle,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false
    }
  })
  
  const { data: btcPriceValid } = useReadContract({
    address: oracleAddress as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'isPriceValid',
    args: ['BTC'],
    query: { 
      enabled: shouldUseOracle,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false
    }
  })

  useEffect(() => {
    let mounted = true
    const coreApiClient = new CoreApiClient(chainId)

    const fetchPriceData = async () => {
      try {
        // 1. First priority: Try Switchboard oracle from contract (if available and valid)
        if (shouldUseOracle && corePriceOracle && btcPriceOracle && corePriceValid && btcPriceValid) {
          const corePrice = Number(corePriceOracle) / 1e18 // Convert from wei
          const btcPrice = Number(btcPriceOracle) / 1e18   // Convert from wei
          
          if (corePrice > 0 && btcPrice > 0 && mounted) {
            setPriceData({
              corePrice,
              btcPrice,
              lastUpdate: new Date().toISOString(),
              isLoading: false,
              source: 'oracle'
              // No error - oracle is working!
            })
            return
          }
        }
        
        // 2. Oracle failed/stale - show this in error for user awareness
        let oracleStatus = ''
        if (shouldUseOracle) {
          if (coreOracleError || btcOracleError) {
            oracleStatus = 'Oracle contract error'
          } else if (corePriceValid === false || btcPriceValid === false) {
            oracleStatus = 'Oracle prices are stale'
          }
        } else if (!oracleAddress) {
          oracleStatus = 'No oracle configured'
        }
        
        // 3. For local network (31337), fetch real ETH prices from CoinGecko
        if (chainId === 31337) {
          const coinGeckoData = await fetchCoinGeckoPrice()
          
          if (coinGeckoData && mounted) {
            setPriceData({
              corePrice: coinGeckoData.ethPrice, // Use real ETH price for local testing
              btcPrice: coinGeckoData.btcPrice, // Use real BTC price for testing
              lastUpdate: new Date().toISOString(),
              isLoading: false,
              source: 'coingecko',
              error: oracleStatus ? `${oracleStatus} - using CoinGecko fallback` : undefined
            })
            return
          }
          
          // Fallback for local if CoinGecko fails
          if (mounted) {
            setPriceData({
              corePrice: 3900, // Fallback ETH price
              btcPrice: 95000, // Fallback BTC price
              lastUpdate: new Date().toISOString(),
              isLoading: false,
              source: 'fallback',
              error: 'CoinGecko API unavailable - using fallback prices'
            })
          }
          return
        }

        // 4. Try Core API as secondary fallback
        try {
          const coreApiData = await coreApiClient.getCorePrice()
          
          if (coreApiData.status === '1' && mounted) {
            const coreUsdPrice = parseFloat(coreApiData.result.coreusd)
            const coreBtcPrice = parseFloat(coreApiData.result.corebtc)
            const btcPrice = coreApiClient.calculateBtcPrice(coreUsdPrice, coreBtcPrice)
            
            setPriceData({
              corePrice: coreUsdPrice,
              btcPrice: btcPrice,
              lastUpdate: new Date(parseInt(coreApiData.result.coreusd_timestamp)).toISOString(),
              isLoading: false,
              source: 'core-api',
              error: oracleStatus ? `${oracleStatus} - using Core API fallback` : undefined
            })
            return
          }
        } catch (coreApiError) {
          console.warn('Core API failed:', coreApiError)
        }
        
        // 5. Try CoinGecko as tertiary fallback
        const coinGeckoData = await fetchCoinGeckoPrice()
        
        if (coinGeckoData && mounted) {
          setPriceData({
            corePrice: coinGeckoData.corePrice || 0.437, // Use real CoinGecko CORE price
            btcPrice: coinGeckoData.btcPrice, 
            lastUpdate: new Date().toISOString(),
            isLoading: false,
            source: 'coingecko',
            error: oracleStatus ? `${oracleStatus} - using CoinGecko fallback` : undefined
          })
          return
        }
        
        // 6. Final fallback: Use hardcoded prices only if everything fails
        if (mounted) {
          setPriceData({
            corePrice: 0.437, // Current real CORE price
            btcPrice: 111000, // Current real BTC price
            lastUpdate: new Date().toISOString(),
            isLoading: false,
            source: 'fallback',
            error: `All price sources failed${oracleStatus ? ` (${oracleStatus})` : ''} - using hardcoded fallback`
          })
        }
        
      } catch (error) {
        console.warn('Price fetch error:', error)
        
        // Last resort: try CoinGecko even in error cases
        try {
          const coinGeckoData = await fetchCoinGeckoPrice()
          
          if (coinGeckoData && mounted) {
            setPriceData({
              corePrice: chainId === 31337 ? coinGeckoData.ethPrice : (coinGeckoData.corePrice || 0.546),
              btcPrice: coinGeckoData.btcPrice,
              lastUpdate: new Date().toISOString(),
              isLoading: false,
              source: 'coingecko',
              error: `Primary APIs failed - using CoinGecko: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
            return
          }
        } catch (coinGeckoError) {
          console.warn('CoinGecko also failed:', coinGeckoError)
        }
        
        if (mounted) {
          // Ultimate fallback values
          setPriceData({
            corePrice: chainId === 31337 ? 3900 : 0.546, // ETH price for local, CORE price for testnet
            btcPrice: 95000,
            lastUpdate: new Date().toISOString(),
            isLoading: false,
            source: 'fallback',
            error: `All price sources failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }
    }

    fetchPriceData()
    
    // Refresh prices every 30 seconds (but skip for local network)
    const interval = chainId === 31337 ? null : setInterval(fetchPriceData, 30000)
    
    return () => {
      mounted = false
      if (interval) clearInterval(interval)
    }
  }, [chainId])

  return priceData
}