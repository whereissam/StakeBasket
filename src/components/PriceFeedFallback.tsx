import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { useRealPriceData } from '../hooks/useRealPriceData'

interface PriceFeedFallbackProps {
  priceError: boolean
  onProceedAnyway: () => void
  chainId: number
}

export function PriceFeedFallback({ priceError, onProceedAnyway, chainId }: PriceFeedFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [livePrices, setLivePrices] = useState({ core: 0, btc: 0 })
  
  // Get real-time price data to show actual fallback prices
  const realPriceData = useRealPriceData()
  
  useEffect(() => {
    if (realPriceData.corePrice && realPriceData.btcPrice) {
      setLivePrices({
        core: realPriceData.corePrice,
        btc: realPriceData.btcPrice
      })
    }
  }, [realPriceData])
  
  if (!priceError) {
    return null // Don't show if no error
  }

  const isLocalNetwork = chainId === 31337
  
  // Format prices for display
  const formatPrice = (price: number, isCore: boolean = false) => {
    if (price === 0) return 'Loading...'
    return isCore ? `$${price.toFixed(4)}` : `$${price.toLocaleString()}`
  }
  
  // Get source info for display
  const getSourceDisplay = () => {
    switch (realPriceData.source) {
      case 'coingecko': return 'CoinGecko API'
      case 'core-api': return 'Core API' 
      case 'oracle': return 'Oracle (working)'
      case 'fallback': return 'Hardcoded fallback'
      default: return 'API fallback'
    }
  }

  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Price Oracle Temporary Issue
        </CardTitle>
        <CardDescription className="text-foreground">
          Switchboard oracle or API is temporarily unavailable, but staking continues with fallback prices
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* Status Information */}
        <Alert className="border-primary/50 bg-primary/10">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-foreground">
            <strong>Smart Fallback Active:</strong> Using real-time API prices when Switchboard is unavailable:
            <div className="mt-2 ml-4 space-y-1 text-sm">
              <div>• CORE: {formatPrice(livePrices.core, true)} ({getSourceDisplay()})</div>
              <div>• BTC: {formatPrice(livePrices.btc)} ({getSourceDisplay()})</div>
              <div>• Updates automatically every 30 seconds</div>
              {realPriceData.lastUpdate && (
                <div className="text-xs text-muted-foreground">Last updated: {new Date(realPriceData.lastUpdate).toLocaleTimeString()}</div>
              )}
            </div>
            Your transactions use current market prices, not stale data.
          </AlertDescription>
        </Alert>

        {/* What this means */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-chart-2 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">Staking Still Works</div>
              <div className="text-sm text-muted-foreground">
                You can deposit and receive BASKET tokens using fallback prices
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-chart-2 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">Withdrawals Still Work</div>
              <div className="text-sm text-muted-foreground">
                Use API-based withdrawal for accurate real-time pricing
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-chart-1 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">Real-Time Pricing Active</div>
              <div className="text-sm text-muted-foreground">
                API fallback ensures deposits use current market prices, not stale oracle data
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={onProceedAnyway}
            className="flex-1"
            variant="default"
          >
            <Zap className="h-4 w-4 mr-2" />
            Continue with API Prices
          </Button>
          
          <Button 
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {/* Technical Details */}
        {showDetails && (
          <div className="mt-4 p-3 bg-muted border border-border rounded text-xs space-y-2">
            <div><strong>Network:</strong> {isLocalNetwork ? 'Local Hardhat' : `Chain ${chainId}`}</div>
            <div><strong>Issue:</strong> Switchboard oracle temporarily unavailable or price staleness detected</div>
            <div><strong>Solution:</strong> Smart API fallback with real-time CoinGecko prices</div>
            <div><strong>Integration:</strong> Switchboard On-Demand + API fallback system</div>
            <div className="pt-2 border-t border-border">
              <strong>Smart Price Resolution:</strong>
              <pre className="text-xs mt-1 text-muted-foreground font-mono">
{`// 1. Try Switchboard On-Demand (preferred)
if (switchboard.updateFeeds(updates)) {
  price = switchboard.latestUpdate(feedId);
}
// 2. API fallback when stale/unavailable
else if (priceAge > 1 hour) {
  price = fetchApiPrice('coredaoorg'); // Real-time
}
// 3. Last known good price
else {
  price = lastKnownGoodPrice[asset];
}`}
              </pre>
            </div>
          </div>
        )}

        {/* Developer Instructions */}
        {isLocalNetwork && (
          <Alert className="border-accent/50 bg-accent/20">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-foreground text-sm">
              <strong>For Developers:</strong> Update Switchboard prices or test API fallback:
              <div className="space-y-1 mt-1">
                <code className="block p-2 bg-secondary rounded text-xs font-mono text-primary-foreground">
                  npm run update:switchboard
                </code>
                <code className="block p-2 bg-secondary rounded text-xs font-mono text-primary-foreground">
                  npm run setup:switchboard
                </code>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}