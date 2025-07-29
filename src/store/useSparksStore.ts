import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export enum SparksTier {
  None = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4
}

export interface SparksRecord {
  timestamp: number
  amount: string
  reason: string
  isEarning: boolean
}

export interface SparksInfo {
  balance: string
  totalEarned: string
  tier: SparksTier
  feeReduction: number
  nextTierThreshold: string
}

export interface SparksState {
  // User Sparks data
  sparksInfo: SparksInfo
  history: SparksRecord[]
  
  // UI state
  isLoading: boolean
  error: string | null
  
  // Notifications
  recentAward: {
    amount: string
    reason: string
    timestamp: number
  } | null
  
  // Actions
  setSparksInfo: (info: SparksInfo) => void
  setHistory: (history: SparksRecord[]) => void
  addHistoryRecord: (record: SparksRecord) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setRecentAward: (award: { amount: string; reason: string; timestamp: number } | null) => void
  clearRecentAward: () => void
  
  // Computed values
  canUseFeature: (requiredTier: SparksTier) => boolean
  getNextTierProgress: () => number
  getTierBenefits: (tier: SparksTier) => string[]
  formatSparksAmount: (amount: string) => string
}

const TIER_THRESHOLDS = {
  [SparksTier.None]: 0,
  [SparksTier.Bronze]: 1000,
  [SparksTier.Silver]: 5000,
  [SparksTier.Gold]: 20000,
  [SparksTier.Platinum]: 100000
}

const TIER_BENEFITS = {
  [SparksTier.None]: ['Basic StakeBasket access'],
  [SparksTier.Bronze]: ['5% fee reduction', 'Basic support'],
  [SparksTier.Silver]: ['10% fee reduction', 'Priority support', 'Extended analytics'],
  [SparksTier.Gold]: ['25% fee reduction', 'Premium support', 'Early strategy access', 'Advanced analytics'],
  [SparksTier.Platinum]: ['50% fee reduction', 'VIP support', 'Exclusive strategies', 'Custom portfolio insights', 'Beta feature access']
}

export const useSparksStore = create<SparksState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sparksInfo: {
        balance: '0',
        totalEarned: '0',
        tier: SparksTier.None,
        feeReduction: 0,
        nextTierThreshold: '1000'
      },
      history: [],
      isLoading: false,
      error: null,
      recentAward: null,

      // Actions
      setSparksInfo: (info: SparksInfo) =>
        set({ sparksInfo: info }, false, 'setSparksInfo'),

      setHistory: (history: SparksRecord[]) =>
        set({ history }, false, 'setHistory'),

      addHistoryRecord: (record: SparksRecord) =>
        set(
          (state) => ({
            history: [record, ...state.history].slice(0, 100) // Keep last 100 records
          }),
          false,
          'addHistoryRecord'
        ),

      setLoading: (loading: boolean) =>
        set({ isLoading: loading }, false, 'setLoading'),

      setError: (error: string | null) =>
        set({ error }, false, 'setError'),

      setRecentAward: (award: { amount: string; reason: string; timestamp: number } | null) =>
        set({ recentAward: award }, false, 'setRecentAward'),

      clearRecentAward: () =>
        set({ recentAward: null }, false, 'clearRecentAward'),

      // Computed values
      canUseFeature: (requiredTier: SparksTier) => {
        const { sparksInfo } = get()
        return sparksInfo.tier >= requiredTier
      },

      getNextTierProgress: () => {
        const { sparksInfo } = get()
        const currentBalance = Number(sparksInfo.balance)
        const nextThreshold = Number(sparksInfo.nextTierThreshold)
        
        if (sparksInfo.tier === SparksTier.Platinum || nextThreshold === 0) {
          return 100
        }
        
        const currentTierThreshold = TIER_THRESHOLDS[sparksInfo.tier]
        const progress = ((currentBalance - currentTierThreshold) / (nextThreshold - currentTierThreshold)) * 100
        
        return Math.min(100, Math.max(0, progress))
      },

      getTierBenefits: (tier: SparksTier) => {
        return TIER_BENEFITS[tier] || []
      },

      formatSparksAmount: (amount: string) => {
        const num = Number(amount)
        if (num >= 1000000) {
          return `${(num / 1000000).toFixed(1)}M`
        } else if (num >= 1000) {
          return `${(num / 1000).toFixed(1)}K`
        }
        return num.toLocaleString()
      }
    }),
    {
      name: 'sparks-store'
    }
  )
)

// Selector hooks for performance optimization
export const useSparksInfo = () => useSparksStore((state) => state.sparksInfo)

export const useSparksHistory = () => useSparksStore((state) => ({
  history: state.history,
  isLoading: state.isLoading
}))

export const useSparksNotification = () => useSparksStore((state) => ({
  recentAward: state.recentAward,
  clearRecentAward: state.clearRecentAward
}))

export const useSparksTier = () => useSparksStore((state) => ({
  tier: state.sparksInfo.tier,
  feeReduction: state.sparksInfo.feeReduction,
  canUseFeature: state.canUseFeature,
  getTierBenefits: state.getTierBenefits
}))

// Utility functions
export const tierNames = {
  [SparksTier.None]: 'None',
  [SparksTier.Bronze]: 'Bronze',
  [SparksTier.Silver]: 'Silver',
  [SparksTier.Gold]: 'Gold',
  [SparksTier.Platinum]: 'Platinum'
}

export const tierColors = {
  [SparksTier.None]: 'text-gray-500',
  [SparksTier.Bronze]: 'text-amber-600',
  [SparksTier.Silver]: 'text-gray-500',
  [SparksTier.Gold]: 'text-yellow-500',
  [SparksTier.Platinum]: 'text-purple-500'
}

export const tierThresholds = TIER_THRESHOLDS

export const getReasonDisplayName = (reason: string): string => {
  const reasonMap: Record<string, string> = {
    'BASKET_HOLDING': 'Holding Reward',
    'STAKEBASKET_DEPOSIT': 'Deposit Bonus',
    'DUAL_STAKING': 'Dual Staking Bonus',
    'FEE_REDUCTION': 'Fee Reduction Used',
    'EXCLUSIVE_ACCESS': 'Exclusive Feature Access',
    'GOVERNANCE_PARTICIPATION': 'Governance Participation',
    'REFERRAL_BONUS': 'Referral Bonus',
    'COMMUNITY_EVENT': 'Community Event',
    'LOYALTY_BONUS': 'Loyalty Bonus'
  }
  
  return reasonMap[reason] || reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

export const calculateEstimatedEarnings = (basketBalance: string, days: number = 30): string => {
  const balance = Number(basketBalance)
  const dailyRate = 1 // 1 Spark per BASKET per day
  const estimated = balance * dailyRate * days
  return estimated.toString()
}