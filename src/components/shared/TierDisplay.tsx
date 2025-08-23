import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Target, Award } from 'lucide-react'
import { DualTier, TierInfo } from '../../types/staking'

interface TierDisplayProps {
  tiers: Record<DualTier, TierInfo>
  currentTier: DualTier
  onTierSelect?: (tier: DualTier) => void
  showSelection?: boolean
  className?: string
}

export function TierDisplay({ 
  tiers, 
  currentTier, 
  onTierSelect, 
  showSelection = false,
  className = ""
}: TierDisplayProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Available Yield Tiers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(tiers)
            .filter(([tierKey]) => Number(tierKey) !== DualTier.None)
            .map(([tierKey, info]) => {
              const tierNum = Number(tierKey) as DualTier
              const isCurrent = tierNum === currentTier
              const isSelectable = showSelection && onTierSelect
              
              const CardWrapper = isSelectable ? 'button' : 'div'
              
              return (
                <CardWrapper
                  key={tierKey}
                  className={`p-4 rounded-lg border-2 bg-card transition-all text-left ${
                    isCurrent 
                      ? 'border-primary bg-primary/10 shadow-lg' 
                      : 'border-border hover:border-primary/30'
                  } ${isSelectable ? 'hover:shadow-md cursor-pointer' : ''}`}
                  onClick={isSelectable ? () => onTierSelect(tierNum) : undefined}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`font-semibold ${info.color}`}>
                      {info.name}
                    </div>
                    {isCurrent && (
                      <div className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        <Target className="h-3 w-3" />
                        Current
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Required Ratio:</span>
                      <span className="text-sm font-mono">{info.ratio}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Yield:</span>
                      <span className="text-sm font-semibold text-chart-2">{info.apy}</span>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {info.description}
                      </div>
                    </div>
                  </div>
                </CardWrapper>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
}