import { useState, useEffect } from 'react'
import { useChainId } from 'wagmi'
import { CoreApiClient } from '../utils/coreApi'

interface PriceData {
  corePrice: number
  btcPrice: number
  lastUpdate: string
  isLoading: boolean
  error?: string
  source: 'backend' | 'core-api' | 'coingecko' | 'fallback'
}

const BACKEND_URL = 'http://localhost:3001'
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price'

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
  const [priceData, setPriceData] = useState<PriceData>({
    corePrice: 0,
    btcPrice: 0,
    lastUpdate: '',
    isLoading: true,
    source: 'fallback'
  })

  useEffect(() => {
    let mounted = true
    const coreApiClient = new CoreApiClient(chainId)

    const fetchPriceData = async () => {
      try {
        // For local network (31337), fetch real ETH prices from CoinGecko
        if (chainId === 31337) {
          const coinGeckoData = await fetchCoinGeckoPrice()
          
          if (coinGeckoData && mounted) {
            setPriceData({
              corePrice: coinGeckoData.ethPrice, // Use real ETH price for local testing
              btcPrice: coinGeckoData.btcPrice, // Use real BTC price for testing
              lastUpdate: new Date().toISOString(),
              isLoading: false,
              source: 'coingecko',
              error: undefined
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

        // For live networks, try to fetch from your backend first (real Core API data)
        try {
          const response = await fetch(`${BACKEND_URL}/api/oracle/price`, {
            signal: AbortSignal.timeout(5000)
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && mounted) {
              // Calculate BTC price from CORE/BTC ratio
              const btcPrice = coreApiClient.calculateBtcPrice(data.data.coreusd, data.data.corebtc)
              
              setPriceData({
                corePrice: data.data.coreusd,
                btcPrice: btcPrice,
                lastUpdate: data.data.lastUpdate.usd,
                isLoading: false,
                source: 'backend'
              })
              return
            }
          }
        } catch (backendError) {
          console.log('Backend not available, trying Core API directly')
        }
        
        // Fallback: Fetch directly from Core API (universal endpoint based on chainId)
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
            source: 'core-api'
          })
          return
        }
        
        // Try CoinGecko as fallback before using hardcoded values
        const coinGeckoData = await fetchCoinGeckoPrice()
        
        if (coinGeckoData && mounted) {
          setPriceData({
            corePrice: coinGeckoData.corePrice || 0.546, // Use CoinGecko CORE price or fallback
            btcPrice: coinGeckoData.btcPrice, 
            lastUpdate: new Date().toISOString(),
            isLoading: false,
            source: 'coingecko',
            error: 'Core API unavailable - using CoinGecko prices'
          })
          return
        }
        
        // Final fallback: Use hardcoded prices only if everything fails
        if (mounted) {
          setPriceData({
            corePrice: 0.546, // Current real CORE price
            btcPrice: 95000, // Current real BTC price (approximately)
            lastUpdate: new Date().toISOString(),
            isLoading: false,
            source: 'fallback',
            error: 'All APIs unavailable - using fallback prices'
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