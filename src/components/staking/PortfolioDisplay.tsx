import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { PieChart, Target } from 'lucide-react'
import { DualStakeInfo, DualTier, TierInfo } from '../../types/staking'

interface PortfolioDisplayProps {
  stakeInfo: DualStakeInfo
  tierInfo: Record<DualTier, TierInfo>
  currentTierInfo: TierInfo
  calculateRatioBonus: (core: string, btc: string, tier: DualTier) => number
}

export function PortfolioDisplay({ stakeInfo, tierInfo, currentTierInfo, calculateRatioBonus }: PortfolioDisplayProps) {
  const currentRatioBonus = calculateRatioBonus(stakeInfo.coreStaked, stakeInfo.btcStaked, stakeInfo.tier as DualTier)
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-chart-3/5 border-2 border-dashed border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Your Dual Staking Basket
        </CardTitle>
        <CardDescription>
          Managed investment allocation maintaining optimal tier ratios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Asset Allocation */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Asset Allocation</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                    CORE
                  </span>
                  <span className="font-mono">
                    {((Number(stakeInfo.coreStaked) / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-chart-1 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((Number(stakeInfo.coreStaked) / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100) || 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                    BTC
                  </span>
                  <span className="font-mono">
                    {((Number(stakeInfo.btcStaked) * 50000 / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-chart-2 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((Number(stakeInfo.btcStaked) * 50000 / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100) || 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Achievement */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Tier Achievement</h4>
            <div className="space-y-3">
              {Object.entries(tierInfo)
                .filter(([tierKey]) => Number(tierKey) >= 0)
                .map(([tierKey, info]) => {
                const isActive = Number(tierKey) <= stakeInfo.tier && stakeInfo.tier >= 0
                const isCurrent = Number(tierKey) === stakeInfo.tier
                return (
                  <div key={tierKey} className={`flex items-center gap-3 p-2 rounded ${isCurrent ? 'bg-primary/20 border border-primary/30' : ''}`}>
                    <div className={`w-3 h-3 rounded-full transition-all ${
                      isActive ? 'bg-primary' : 'bg-muted border-2 border-muted-foreground'
                    }`}></div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${info.color}`}>
                        {info.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {info.apy} APY
                      </div>
                    </div>
                    {isCurrent && (
                      <Target className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Strategy Performance */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Strategy Performance</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Ratio</span>
                <span className="font-mono text-sm">
                  {stakeInfo.btcStaked !== '0' 
                    ? (Number(stakeInfo.coreStaked) / Number(stakeInfo.btcStaked)).toLocaleString(undefined, {maximumFractionDigits: 0})
                    : '0'}:1
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Target Tier</span>
                <span className={`text-sm font-medium ${currentTierInfo.color}`}>
                  {currentTierInfo.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Est. Annual Yield</span>
                <span className="text-sm font-medium text-chart-2">
                  {currentTierInfo.apy}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ratio Bonus</span>
                <span className="text-sm font-medium text-primary">
                  +{(currentRatioBonus * 100).toFixed(1)}%
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Basket Management</div>
                <div className="text-xs text-primary">
                  ✓ Auto-rebalancing enabled<br/>
                  ✓ Optimal ratio maintenance<br/>
                  ✓ Compound reward reinvestment
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}