import { create } from 'zustand'

interface StakeBasketState {
  // User portfolio
  stakeBasketTokenBalance: string
  coreBalance: string
  lstBTCBalance: string
  totalValueUSD: string
  
  // ETF statistics
  totalPoolSizeUSD: string
  currentAPY: string
  navPerShare: string
  totalHolders: number
  
  // Transaction state
  isDepositing: boolean
  isWithdrawing: boolean
  lastTransactionHash: string | null
  
  // Actions
  setStakeBasketTokenBalance: (balance: string) => void
  setCoreBalance: (balance: string) => void
  setLstBTCBalance: (balance: string) => void
  setTotalValueUSD: (value: string) => void
  setTotalPoolSizeUSD: (size: string) => void
  setCurrentAPY: (apy: string) => void
  setNavPerShare: (nav: string) => void
  setTotalHolders: (holders: number) => void
  setIsDepositing: (status: boolean) => void
  setIsWithdrawing: (status: boolean) => void
  setLastTransactionHash: (hash: string | null) => void
}

export const useStakeBasketStore = create<StakeBasketState>((set) => ({
  // Initial state
  stakeBasketTokenBalance: '0',
  coreBalance: '0',
  lstBTCBalance: '0',
  totalValueUSD: '0',
  totalPoolSizeUSD: '1,250,000',
  currentAPY: '8.5',
  navPerShare: '1.085',
  totalHolders: 247,
  isDepositing: false,
  isWithdrawing: false,
  lastTransactionHash: null,
  
  // Actions
  setStakeBasketTokenBalance: (balance) => set({ stakeBasketTokenBalance: balance }),
  setCoreBalance: (balance) => set({ coreBalance: balance }),
  setLstBTCBalance: (balance) => set({ lstBTCBalance: balance }),
  setTotalValueUSD: (value) => set({ totalValueUSD: value }),
  setTotalPoolSizeUSD: (size) => set({ totalPoolSizeUSD: size }),
  setCurrentAPY: (apy) => set({ currentAPY: apy }),
  setNavPerShare: (nav) => set({ navPerShare: nav }),
  setTotalHolders: (holders) => set({ totalHolders: holders }),
  setIsDepositing: (status) => set({ isDepositing: status }),
  setIsWithdrawing: (status) => set({ isWithdrawing: status }),
  setLastTransactionHash: (hash) => set({ lastTransactionHash: hash }),
}))