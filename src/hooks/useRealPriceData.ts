import { useState, useEffect } from 'react'
import { useChainId } from 'wagmi'
import { CoreApiClient } from '../utils/coreApi'

interface PriceData {
  corePrice: number
  btcPrice: number
  lastUpdate: string
  isLoading: boolean
  error?: string
  source: 'backend' | 'core-api' | 'fallback'
}

const BACKEND_URL = 'http://localhost:3001'

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
        // Try to fetch from your backend first (real Core API data)
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
        
        // Final fallback: Use realistic current market prices
        if (mounted) {
          setPriceData({
            corePrice: 0.546, // Current real CORE price
            btcPrice: 120000, // Current real BTC price (approximately)
            lastUpdate: new Date().toISOString(),
            isLoading: false,
            source: 'fallback',
            error: 'Using fallback prices - API unavailable'
          })
        }
        
      } catch (error) {
        console.warn('Price fetch error:', error)
        if (mounted) {
          // Use realistic fallback values
          setPriceData({
            corePrice: 0.546,
            btcPrice: 120000,
            lastUpdate: new Date().toISOString(),
            isLoading: false,
            source: 'fallback',
            error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }
    }

    fetchPriceData()
    
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPriceData, 30000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return priceData
}