import * as React from 'react'

interface PriceDataIndicatorProps {
  priceData: {
    source?: string
    corePrice?: number
    btcPrice?: number
    error?: string
  }
}

export const PriceDataIndicator = React.memo(({ priceData }: PriceDataIndicatorProps) => {
  const getStatusColor = () => {
    if (!priceData.error) return 'bg-chart-2' // Green from index.css
    return 'bg-chart-4' // Yellow from index.css
  }

  const getSourceName = () => {
    switch (priceData.source) {
      case 'oracle': return 'Switchboard Oracle'
      case 'coingecko': return 'CoinGecko API'  
      case 'core-api': return 'Core API'
      case 'fallback': return 'Fallback Data'
      default: return 'Loading...'
    }
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm font-medium">Price Source: {getSourceName()}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <div>CORE: ${priceData.corePrice?.toFixed(3)} | BTC: ${priceData.btcPrice?.toLocaleString()}</div>
          {priceData.error && <div className="text-chart-4">⚠ {priceData.error}</div>}
        </div>
      </div>
    </div>
  )
})