import { Coins, DollarSign, Award, Gift } from 'lucide-react'
import { BalanceCard } from '../shared/BalanceCard'

interface StakingOverviewProps {
  stakedAmount: string
  pendingRewards: string
  currentTier: string
  availableBalance: string
  tierColor: string
  tierMultiplier: string
}

export function StakingOverview({
  stakedAmount,
  pendingRewards,
  currentTier,
  availableBalance,
  tierColor,
  tierMultiplier
}: StakingOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <BalanceCard
        title="Staked Amount"
        value={Number(stakedAmount).toLocaleString()}
        subtitle="BASKET tokens"
        icon={<Coins className="h-4 w-4" />}
      />
      
      <BalanceCard
        title="Pending Rewards"
        value={Number(pendingRewards).toFixed(4)}
        subtitle="ETH"
        icon={<DollarSign className="h-4 w-4" />}
      />
      
      <BalanceCard
        title="Current Tier"
        value={currentTier}
        subtitle={`${tierMultiplier} rewards`}
        icon={<Award className="h-4 w-4" />}
        className={`${tierColor}`}
      />
      
      <BalanceCard
        title="Available Balance"
        value={Number(availableBalance).toLocaleString()}
        subtitle="BASKET tokens"
        icon={<Gift className="h-4 w-4" />}
      />
    </div>
  )
}