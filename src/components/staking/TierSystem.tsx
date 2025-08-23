import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface TierInfo {
  name: string
  threshold: string
  multiplier: string
  benefits: string[]
  color: string
  bgColor: string
}

interface TierSystemProps {
  tierInfo: Record<number, TierInfo>
  currentTier: number
}

export function TierSystem({ tierInfo, currentTier }: TierSystemProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tier System</CardTitle>
        <CardDescription>
          Stake more BASKET tokens to unlock higher tiers and better benefits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(tierInfo).slice(1).map(([tierKey, info]: [string, TierInfo]) => (
            <div 
              key={tierKey}
              className={`p-4 rounded-lg border-2 bg-card ${
                Number(tierKey) === currentTier ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <div className={`font-semibold ${info.color} mb-2`}>
                {info.name}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Threshold: {info.threshold} BASKET
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                Multiplier: {info.multiplier}
              </div>
              <div className="space-y-1">
                {info.benefits.map((benefit: string, index: number) => (
                  <div key={index} className="text-xs flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${info.bgColor}`} />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}