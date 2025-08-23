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
  Base = 0,
  Boost = 1,
  Super = 2,
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
  [DualTier.Base]: 0,
  [DualTier.Boost]: 2000,
  [DualTier.Super]: 6000,
  [DualTier.Satoshi]: 16000
}

export const tierInfo: Record<DualTier, TierInfo> = {
  [DualTier.None]: {
    name: 'Not Staking',
    ratio: '0:0',
    apy: '0%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    description: 'No active stakes - Start staking to earn rewards'
  },
  [DualTier.Base]: {
    name: 'Base Tier',
    ratio: 'Any + 0.0005 BTC min',
    apy: '8%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Entry level - Minimal BTC commitment required'
  },
  [DualTier.Boost]: {
    name: 'Boost Tier',
    ratio: '2,000:1 + 0.002 BTC min',
    apy: '12%',
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/10',
    description: 'Enhanced rewards - Meaningful BTC stake required'
  },
  [DualTier.Super]: {
    name: 'Super Tier',
    ratio: '6,000:1 + 0.005 BTC min',
    apy: '16%',
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    description: 'Premium yields - Substantial BTC commitment needed'
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi Tier',
    ratio: '16,000:1 + 0.01 BTC min',
    apy: '20%',
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    description: 'Maximum rewards - Significant BTC holdings required'
  }
}