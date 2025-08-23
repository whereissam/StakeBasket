import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { TrendingUp } from 'lucide-react'

interface ClaimRewardsProps {
  pendingRewards: string
  lastClaimTime: number
  handleClaimRewards: () => void
  isContractPending: boolean
  isConfirming: boolean
}

export function ClaimRewards({
  pendingRewards,
  lastClaimTime,
  handleClaimRewards,
  isContractPending,
  isConfirming
}: ClaimRewardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Claim Rewards
        </CardTitle>
        <CardDescription>
          Claim your accumulated protocol fee rewards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{Number(pendingRewards).toFixed(6)} ETH</div>
            <p className="text-sm text-muted-foreground">
              Last claimed: {lastClaimTime ? 
                new Date(lastClaimTime).toLocaleDateString() : 'Never'}
            </p>
          </div>
          <Button 
            onClick={handleClaimRewards}
            disabled={isContractPending || isConfirming || Number(pendingRewards) <= 0}
          >
            {isContractPending ? 'Submitting...' : 
             isConfirming ? 'Confirming...' : 
             'Claim Rewards'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}