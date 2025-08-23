import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { BookOpen } from 'lucide-react'
import { getTokenSymbol } from '../../utils/networkHandler'

interface HowItWorksSectionProps {
  chainId: number
  tokenSymbol?: string
}

export function HowItWorksSection({ chainId, tokenSymbol: propTokenSymbol }: HowItWorksSectionProps) {
  const tokenSymbol = propTokenSymbol || getTokenSymbol(chainId)
  
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          How It Works
        </CardTitle>
        <CardDescription>
          Simple, automated DeFi earning designed for everyone
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-primary font-bold">1</span>
            </div>
            <h3 className="font-semibold">Deposit Your Tokens</h3>
            <p className="text-sm text-muted-foreground">
              Add your {tokenSymbol} and BTC tokens to the smart contract. We handle the optimal ratio calculations automatically.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-chart-2/10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-chart-2 font-bold">2</span>
            </div>
            <h3 className="font-semibold">We Optimize & Stake</h3>
            <p className="text-sm text-muted-foreground">
              Our smart contract automatically stakes your {chainId === 31337 ? `${tokenSymbol} (for testing)` : 'tokens with CoreDAO validators'} at the highest reward tier.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-chart-3/10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-chart-3 font-bold">3</span>
            </div>
            <h3 className="font-semibold">Earn & Compound</h3>
            <p className="text-sm text-muted-foreground">
              Rewards are automatically collected and reinvested. Your position grows through compound interest.
            </p>
          </div>
        </div>
        
        <div className="mt-8 bg-muted/30 rounded-lg p-6">
          <h3 className="font-semibold mb-4 text-center">Smart Contract Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-chart-2 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Auto-Rebalancing</div>
                  <div className="text-muted-foreground text-xs">Maintains optimal 16,000:1 CORE:BTC ratio for maximum 20% APY</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Compound Rewards</div>
                  <div className="text-muted-foreground text-xs">All staking rewards automatically reinvested to grow your position</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-chart-3 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Liquid Shares</div>
                  <div className="text-muted-foreground text-xs">Receive basket tokens representing your proportional ownership</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-chart-1 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Anytime Withdrawal</div>
                  <div className="text-muted-foreground text-xs">Exit the strategy at any time and receive your proportional assets</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-chart-2 mb-2">Why Use This Strategy?</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Higher yields than individual staking</li>
                <li>✓ No manual ratio management needed</li>
                <li>✓ Professional-grade optimization</li>
                <li>✓ Fully automated and transparent</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-chart-1 mb-2">Important to Know</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>⚠ Smart contract and market risks apply</li>
                <li>⚠ APY rates are estimates, not guarantees</li>
                <li>⚠ May have CoreDAO unbonding periods</li>
                <li>⚠ Experimental DeFi protocol</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}