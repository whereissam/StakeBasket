import { DualTier, TierInfo } from '../types/staking'

// Target ratios for optimal bonus within each tier (5-tier system)
export const TIER_OPTIMAL_RATIOS: Record<DualTier, number> = {
  [DualTier.Base]: 10000,    // Base tier: 10,000:1 CORE:BTC for mid deposits
  [DualTier.Bronze]: 50000,  // Bronze tier: 50,000:1 CORE:BTC optimal
  [DualTier.Silver]: 50000,  // Silver tier: 50,000:1 CORE:BTC optimal  
  [DualTier.Gold]: 50000,    // Gold tier: 50,000:1 CORE:BTC optimal
  [DualTier.Satoshi]: 50000  // Platinum tier: 50,000:1 CORE:BTC optimal
}

// USD value thresholds for tier qualification (5-tier system)
export const TIER_USD_THRESHOLDS: Record<DualTier, { min: number; max: number }> = {
  [DualTier.Base]: { min: 1000, max: 10000 },      // Base tier: $1k-$10k total value
  [DualTier.Bronze]: { min: 10000, max: 100000 },  // Bronze tier: $10k-$100k total value
  [DualTier.Silver]: { min: 100000, max: 500000 }, // Silver tier: $100k-$500k total value
  [DualTier.Gold]: { min: 500000, max: 1000000 },  // Gold tier: $500k-$1M total value
  [DualTier.Satoshi]: { min: 1000000, max: Infinity } // Platinum tier: $1M+ total value
}

export const TIER_INFO: Record<DualTier, TierInfo> = {
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

// Base minimum deposit requirements (Base tier - very low barrier)
export const MIN_DEPOSIT_REQUIREMENTS = {
  CORE: 10,       // Minimum 10 CORE tokens (Base tier minimum)
  BTC: 0.001,     // Minimum 0.001 BTC tokens (Base tier minimum)
  USD_VALUE: 50   // Minimum $50 total USD value for Base tier
}

// Maximum bonus caps per tier (5-tier system with Base having small rewards)
export const TIER_MAX_BONUS: Record<DualTier, number> = {
  [DualTier.Base]: 0.05,     // Base tier: +5% yield for mid deposits ($1k-$10k)
  [DualTier.Bronze]: 0.10,   // Bronze tier: +10% max bonus ($10k+)
  [DualTier.Silver]: 0.25,   // Silver tier: +25% max bonus ($100k+)
  [DualTier.Gold]: 0.40,     // Gold tier: +40% max bonus ($500k+)
  [DualTier.Satoshi]: 0.50   // Platinum tier: +50% max bonus ($1M+)
}