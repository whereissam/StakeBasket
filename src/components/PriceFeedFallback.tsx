import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'

interface PriceFeedFallbackProps {
  priceError: boolean
  onProceedAnyway: () => void
  chainId: number
}

export function PriceFeedFallback({ priceError, onProceedAnyway, chainId }: PriceFeedFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  if (!priceError) {
    return null // Don't show if no error
  }

  const isLocalNetwork = chainId === 31337

  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          PriceFeed Contract Issue Detected
        </CardTitle>
        <CardDescription className="text-foreground">
          The price oracle is not responding, but staking can still work with fallback prices
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* Status Information */}
        <Alert className="border-primary/50 bg-primary/10">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-foreground">
            <strong>Good News:</strong> The StakeBasket contract has built-in fallback prices:
            <div className="mt-2 ml-4 space-y-1 text-sm">
              <div>• CORE: $1.50 (fallback price)</div>
              <div>• BTC: $95,000 (fallback price)</div>
            </div>
            Staking will use these prices if the oracle fails.
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
              <div className="font-semibold text-foreground">Share Calculation Impact</div>
              <div className="text-sm text-muted-foreground">
                New deposits will use fallback prices instead of live market prices
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
            Continue with Fallback Prices
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
            <div><strong>Issue:</strong> PriceFeed.getPrice() returning empty data</div>
            <div><strong>Solution:</strong> Contract uses hardcoded fallback values</div>
            <div><strong>Code Location:</strong> StakeBasket._calculateSharesToMint()</div>
            <div className="pt-2 border-t border-border">
              <strong>Fallback Logic:</strong>
              <pre className="text-xs mt-1 text-muted-foreground font-mono">
{`if (address(priceFeed) != address(0)) {
  corePrice_ = priceFeed.getPrice("CORE") * 1e10;
  lstBTCPrice_ = priceFeed.getPrice("BTC") * 1e10;
} else {
  // Fallback to mock prices
  corePrice_ = 15e17;  // $1.5 CORE
  lstBTCPrice_ = 95000e18; // $95k BTC
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
              <strong>For Developers:</strong> You can fix the price feed by redeploying or running:
              <code className="block mt-1 p-2 bg-secondary rounded text-xs font-mono text-primary-foreground">
                npx hardhat run scripts/setup-price-feed.cjs --network localhost
              </code>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}