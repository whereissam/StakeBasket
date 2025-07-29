import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export enum DualTier {
  Base = 0,
  Boost = 1,
  Super = 2,
  Satoshi = 3
}

export interface DualStakePosition {
  coreAmount: string
  btcAmount: string
  shares: string
  tier: DualTier
  ratio: number
  apy: number
  rewards: string
  lastClaimTime: number
}

export interface TierRequirements {
  ratio: number
  apy: number
  name: string
}

export interface DualStakingState {
  // User balances
  coreBalance: string
  btcBalance: string
  
  // Staking position
  position: DualStakePosition | null
  
  // Tier information
  tierRequirements: Record<DualTier, TierRequirements>
  
  // UI state
  isLoading: boolean
  selectedTier: DualTier | null
  needsRebalancing: boolean
  rebalanceThreshold: number
  
  // Transaction states
  isStaking: boolean
  isUnstaking: boolean
  isClaiming: boolean
  isRebalancing: boolean
  
  // Error handling
  error: string | null
  
  // Actions
  setBalances: (coreBalance: string, btcBalance: string) => void
  setPosition: (position: DualStakePosition) => void
  setSelectedTier: (tier: DualTier | null) => void
  setLoading: (loading: boolean) => void
  setTransactionState: (type: 'staking' | 'unstaking' | 'claiming' | 'rebalancing', state: boolean) => void
  setError: (error: string | null) => void
  setNeedsRebalancing: (needs: boolean) => void
  clearPosition: () => void
  
  // Computed values
  getCurrentRatio: () => number
  getTargetRatio: (tier: DualTier) => number
  calculateRequiredCore: (btcAmount: string, tier: DualTier) => string
  calculateOptimalTier: (coreAmount: string, btcAmount: string) => DualTier
  getAPYForTier: (tier: DualTier) => number
  getPositionValue: () => { totalValue: string; coreValue: string; btcValue: string }
}

const TIER_REQUIREMENTS: Record<DualTier, TierRequirements> = {
  [DualTier.Base]: { ratio: 0, apy: 8, name: 'Base' },
  [DualTier.Boost]: { ratio: 2000, apy: 12, name: 'Boost' },
  [DualTier.Super]: { ratio: 6000, apy: 16, name: 'Super' },
  [DualTier.Satoshi]: { ratio: 16000, apy: 20, name: 'Satoshi' }
}

export const useDualStakingStore = create<DualStakingState>()(
  devtools(
    (set, get) => ({
      // Initial state
      coreBalance: '0',
      btcBalance: '0',
      position: null,
      tierRequirements: TIER_REQUIREMENTS,
      isLoading: false,
      selectedTier: null,
      needsRebalancing: false,
      rebalanceThreshold: 5, // 5% threshold
      isStaking: false,
      isUnstaking: false,
      isClaiming: false,
      isRebalancing: false,
      error: null,

      // Actions
      setBalances: (coreBalance: string, btcBalance: string) =>
        set({ coreBalance, btcBalance }, false, 'setBalances'),

      setPosition: (position: DualStakePosition) => {
        const currentRatio = get().getCurrentRatio()
        const targetRatio = get().getTargetRatio(position.tier)
        const threshold = get().rebalanceThreshold
        
        // Check if rebalancing is needed
        const ratioDeviation = Math.abs((currentRatio - targetRatio) / targetRatio) * 100
        const shouldRebalance = ratioDeviation > threshold && targetRatio > 0
        
        set({ 
          position, 
          needsRebalancing: shouldRebalance 
        }, false, 'setPosition')
      },

      setSelectedTier: (tier: DualTier | null) =>
        set({ selectedTier: tier }, false, 'setSelectedTier'),

      setLoading: (loading: boolean) =>
        set({ isLoading: loading }, false, 'setLoading'),

      setTransactionState: (type: 'staking' | 'unstaking' | 'claiming' | 'rebalancing', state: boolean) => {
        const updates: Partial<DualStakingState> = {}
        
        switch (type) {
          case 'staking':
            updates.isStaking = state
            break
          case 'unstaking':
            updates.isUnstaking = state
            break
          case 'claiming':
            updates.isClaiming = state
            break
          case 'rebalancing':
            updates.isRebalancing = state
            break
        }
        
        set(updates, false, `setTransactionState-${type}`)
      },

      setError: (error: string | null) =>
        set({ error }, false, 'setError'),

      setNeedsRebalancing: (needs: boolean) =>
        set({ needsRebalancing: needs }, false, 'setNeedsRebalancing'),

      clearPosition: () =>
        set({ 
          position: null, 
          selectedTier: null, 
          needsRebalancing: false 
        }, false, 'clearPosition'),

      // Computed values
      getCurrentRatio: () => {
        const { position } = get()
        if (!position || Number(position.btcAmount) === 0) return 0
        return Number(position.coreAmount) / Number(position.btcAmount)
      },

      getTargetRatio: (tier: DualTier) => {
        const { tierRequirements } = get()
        return tierRequirements[tier].ratio
      },

      calculateRequiredCore: (btcAmount: string, tier: DualTier) => {
        const btcNum = Number(btcAmount) || 0
        const targetRatio = get().getTargetRatio(tier)
        return (btcNum * targetRatio).toString()
      },

      calculateOptimalTier: (coreAmount: string, btcAmount: string) => {
        const core = Number(coreAmount) || 0
        const btc = Number(btcAmount) || 0
        
        if (btc === 0) return DualTier.Base
        
        const ratio = core / btc
        
        if (ratio >= 16000) return DualTier.Satoshi
        if (ratio >= 6000) return DualTier.Super
        if (ratio >= 2000) return DualTier.Boost
        return DualTier.Base
      },

      getAPYForTier: (tier: DualTier) => {
        const { tierRequirements } = get()
        return tierRequirements[tier].apy
      },

      getPositionValue: () => {
        const { position } = get()
        if (!position) {
          return { totalValue: '0', coreValue: '0', btcValue: '0' }
        }
        
        // For now, assume 1:1 value ratio (would need price feeds in production)
        const coreValue = Number(position.coreAmount)
        const btcValue = Number(position.btcAmount) * 50000 // Mock BTC price
        const totalValue = coreValue + btcValue
        
        return {
          totalValue: totalValue.toFixed(2),
          coreValue: coreValue.toFixed(2),
          btcValue: btcValue.toFixed(2)
        }
      }
    }),
    {
      name: 'dual-staking-store'
    }
  )
)

// Selector hooks for performance optimization
export const useDualStakingBalances = () => useDualStakingStore((state) => ({
  coreBalance: state.coreBalance,
  btcBalance: state.btcBalance
}))

export const useDualStakingPosition = () => useDualStakingStore((state) => state.position)

export const useDualStakingTier = () => useDualStakingStore((state) => ({
  selectedTier: state.selectedTier,
  currentTier: state.position?.tier || DualTier.Base,
  tierRequirements: state.tierRequirements
}))

export const useDualStakingTransactions = () => useDualStakingStore((state) => ({
  isStaking: state.isStaking,
  isUnstaking: state.isUnstaking,
  isClaiming: state.isClaiming,
  isRebalancing: state.isRebalancing
}))

export const useDualStakingRebalancing = () => useDualStakingStore((state) => ({
  needsRebalancing: state.needsRebalancing,
  rebalanceThreshold: state.rebalanceThreshold,
  getCurrentRatio: state.getCurrentRatio,
  getTargetRatio: state.getTargetRatio
}))

// Utility functions for external use
export const tierNames = {
  [DualTier.Base]: 'Base',
  [DualTier.Boost]: 'Boost', 
  [DualTier.Super]: 'Super',
  [DualTier.Satoshi]: 'Satoshi'
}

export const tierColors = {
  [DualTier.Base]: 'text-gray-600',
  [DualTier.Boost]: 'text-orange-600',
  [DualTier.Super]: 'text-purple-600',
  [DualTier.Satoshi]: 'text-yellow-600'
}

export const formatRatio = (ratio: number): string => {
  if (ratio === 0) return '0:1'
  return `${ratio.toLocaleString()}:1`
}

export const formatAPY = (apy: number): string => {
  return `${apy}%`
}