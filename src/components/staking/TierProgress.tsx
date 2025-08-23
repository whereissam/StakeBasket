import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface TierProgressProps {
  currentTierName: string
  nextTierName: string | null
  progress: number
  tokensNeeded: number
  nextThreshold: number
}

export function TierProgress({
  currentTierName,
  nextTierName,
  progress,
  tokensNeeded,
  nextThreshold: _nextThreshold
}: TierProgressProps) {
  if (!nextTierName) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tier Progress</CardTitle>
        <CardDescription>
          Progress towards {nextTierName} tier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>{currentTierName}</span>
          <span>{nextTierName}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {tokensNeeded > 0 ? (
            `${tokensNeeded.toLocaleString()} more BASKET tokens needed`
          ) : (
            'Tier requirement met!'
          )}
        </div>
      </CardContent>
    </Card>
  )
}