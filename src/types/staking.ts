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
  Base = 0,      // Minimal tier for small amounts (5% APY)
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Satoshi = 4
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
  [DualTier.Base]: 10000,     // Base tier: 10,000:1 CORE:BTC optimal
  [DualTier.Bronze]: 50000,   // Bronze tier: 50,000:1 CORE:BTC optimal
  [DualTier.Silver]: 50000,   // Silver tier: 50,000:1 CORE:BTC optimal
  [DualTier.Gold]: 50000,     // Gold tier: 50,000:1 CORE:BTC optimal
  [DualTier.Satoshi]: 50000   // Platinum tier: 50,000:1 CORE:BTC optimal
}

export const tierInfo: Record<DualTier, TierInfo> = {
  [DualTier.Base]: {
    name: '🔥 Base',
    ratio: '$1k-$10k total value',
    apy: '~5% + small bonus',
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    description: 'Base tier with enhanced rewards - Start earning with meaningful deposits'
  },
  [DualTier.Bronze]: {
    name: '🥉 Bronze',
    ratio: '$10k+ total value',
    apy: '~8% + 10% max bonus',
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/10',
    description: 'Solid tier - $10k+ total value, optimal 50,000:1 CORE:BTC ratio'
  },
  [DualTier.Silver]: {
    name: '🥈 Silver', 
    ratio: '$100k+ total value',
    apy: '~8% + 25% max bonus',
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    description: 'Premium tier - $100k+ total value, optimal 50,000:1 CORE:BTC ratio'
  },
  [DualTier.Gold]: {
    name: '🥇 Gold',
    ratio: '$500k+ total value',
    apy: '~8% + 40% max bonus',
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
    description: 'Elite tier - $500k+ total value, optimal 50,000:1 CORE:BTC ratio'
  },
  [DualTier.Satoshi]: {
    name: '💎 Platinum',
    ratio: '$1M+ total value',
    apy: '~8% + 50% max bonus',
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/10',
    description: 'Ultimate tier - $1M+ total value, optimal 50,000:1 CORE:BTC ratio'
  }
}