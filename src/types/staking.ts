export interface DualStakeInfo {
  coreStaked: string
  btcStaked: string
  shares: string
  rewards: string
  tier: number
  ratio: string
  apy: string
}

export enum DualTier {
  None = -1,
  Bronze = 0,
  Silver = 1,
  Gold = 2,
  Satoshi = 3
}

export interface TierInfo {
  name: string
  ratio: string
  apy: string
  color: string
  bgColor: string
  description: string
}

export const TIER_RATIOS = {
  [DualTier.None]: 0,
  [DualTier.Bronze]: 5000,
  [DualTier.Silver]: 10000,
  [DualTier.Gold]: 20000,
  [DualTier.Satoshi]: 25000
}

export const tierInfo: Record<DualTier, TierInfo> = {
  [DualTier.None]: {
    name: 'Not Qualified',
    ratio: '< $1,000 total value',
    apy: '0%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    description: 'Minimum $1,000 total value required to qualify for dual staking rewards'
  },
  [DualTier.Bronze]: {
    name: 'Bronze Pool',
    ratio: '$1k - $10k total value',
    apy: '8% + up to 25% bonus',
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/10',
    description: 'Entry tier with ratio bonuses - Optimal 5,000:1 CORE:BTC ratio'
  },
  [DualTier.Silver]: {
    name: 'Silver Pool', 
    ratio: '$10k - $100k total value',
    apy: '12% + up to 35% bonus',
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    description: 'Enhanced tier with higher base yields - Optimal 10,000:1 CORE:BTC ratio'
  },
  [DualTier.Gold]: {
    name: 'Gold Pool',
    ratio: '$100k - $500k total value',
    apy: '16% + up to 50% bonus',
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
    description: 'Premium tier with maximum bonuses - Optimal 20,000:1 CORE:BTC ratio'
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi Pool',
    ratio: '$500k+ total value',
    apy: '20% + up to 60% bonus',
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/10',
    description: 'Elite tier for whale stakers - Optimal 25,000:1 CORE:BTC ratio'
  }
}