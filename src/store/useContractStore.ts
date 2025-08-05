import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'
import { getNetworkByChainId } from '../config/contracts'

export interface ContractAddresses {
  // Core StakeBasket contracts
  PriceFeed: string
  StakingManager: string
  StakeBasketToken: string
  StakeBasket: string
  BasketStaking: string
  CoreOracle: string
  
  // Mock tokens for testing
  MockCORE: string
  MockCoreBTC: string
  MockCoreStaking: string
  MockLstBTC: string
  
  // Governance
  BasketGovernance: string
  BasketToken: string
  
  // Liquid Staking
  CoreLiquidStakingManager: string
  StCoreToken: string
  
  // Dual Staking Contracts
  MockDualStaking: string
  DualStakingBasket: string
  SatoshiTierBasket: string
  
  // Unbonding
  UnbondingQueue: string
  
  // Sparks System Contracts
  SparksManager: string
  StakeBasketWithSparks: string
}

interface ContractStore {
  // Current configuration
  currentChainId: number
  customAddresses: Partial<ContractAddresses>
  useCustomAddresses: boolean
  
  // Actions
  setChainId: (chainId: number) => void
  setCustomAddress: (contractName: keyof ContractAddresses, address: string) => void
  toggleCustomAddresses: (enabled: boolean) => void
  resetToDefault: () => void
  importConfiguration: (config: Partial<ContractAddresses>) => void
  exportConfiguration: () => Partial<ContractAddresses>
  
  // Getters
  getContractAddress: (contractName: keyof ContractAddresses) => string
  getAllAddresses: () => ContractAddresses
  isValidAddress: (address: string) => boolean
}

export const useContractStore = create<ContractStore>()(
  persist(
    (set, get) => ({
      currentChainId: 31337, // Default to hardhat for development
      customAddresses: {},
      useCustomAddresses: false,
      
      setChainId: (chainId: number) => {
        set({ currentChainId: chainId })
      },
      
      setCustomAddress: (contractName: keyof ContractAddresses, address: string) => {
        const state = get()
        set({
          customAddresses: {
            ...state.customAddresses,
            [contractName]: address
          }
        })
      },
      
      toggleCustomAddresses: (enabled: boolean) => {
        set({ useCustomAddresses: enabled })
      },
      
      resetToDefault: () => {
        set({
          customAddresses: {},
          useCustomAddresses: false
        })
      },
      
      importConfiguration: (config: Partial<ContractAddresses>) => {
        const state = get()
        set({
          customAddresses: {
            ...state.customAddresses,
            ...config
          },
          useCustomAddresses: true
        })
      },
      
      exportConfiguration: () => {
        return get().customAddresses
      },
      
      getContractAddress: (contractName: keyof ContractAddresses): string => {
        const state = get()
        
        // If using custom addresses and the custom address exists, return it
        if (state.useCustomAddresses && state.customAddresses[contractName]) {
          return state.customAddresses[contractName]!
        }
        
        // Otherwise return the default address for the current chain
        const { contracts } = getNetworkByChainId(state.currentChainId)
        return contracts[contractName] || ''
      },
      
      getAllAddresses: (): ContractAddresses => {
        const state = get()
        const { contracts } = getNetworkByChainId(state.currentChainId)
        
        // Merge default addresses with custom ones if enabled
        if (state.useCustomAddresses) {
          return {
            ...contracts,
            ...state.customAddresses
          } as ContractAddresses
        }
        
        return contracts as ContractAddresses
      },
      
      isValidAddress: (address: string): boolean => {
        // Basic Ethereum address validation
        return /^0x[a-fA-F0-9]{40}$/.test(address)
      }
    }),
    {
      name: 'contract-store',
      // Only persist custom addresses and settings, not chain ID
      partialize: (state) => ({
        customAddresses: state.customAddresses,
        useCustomAddresses: state.useCustomAddresses
      })
    }
  )
)

// Environment variable override hook
export function useEnvironmentContracts() {
  const store = useContractStore()
  
  // Load environment variables on mount
  useEffect(() => {
    const envOverrides: Partial<ContractAddresses> = {}
    
    // Check for environment variables
    const envMappings: Record<string, keyof ContractAddresses> = {
      VITE_STAKE_BASKET_ADDRESS: 'StakeBasket',
      VITE_BASKET_TOKEN_ADDRESS: 'StakeBasketToken',
      VITE_DUAL_STAKING_ADDRESS: 'MockDualStaking',
      VITE_CORE_ORACLE_ADDRESS: 'CoreOracle',
      VITE_PRICE_FEED_ADDRESS: 'PriceFeed',
      VITE_STAKING_MANAGER_ADDRESS: 'StakingManager',
      VITE_MOCK_CORE_ADDRESS: 'MockCORE',
      VITE_MOCK_BTC_ADDRESS: 'MockCoreBTC',
      VITE_BASKET_GOVERNANCE_ADDRESS: 'BasketGovernance',
      VITE_LIQUID_STAKING_MANAGER_ADDRESS: 'CoreLiquidStakingManager',
      VITE_STCORE_TOKEN_ADDRESS: 'StCoreToken',
    }

    Object.entries(envMappings).forEach(([envVar, contractKey]) => {
      const envValue = import.meta.env[envVar]
      if (envValue) {
        envOverrides[contractKey] = envValue
      }
    })
    
    // Apply environment overrides if any exist
    if (Object.keys(envOverrides).length > 0) {
      store.importConfiguration(envOverrides)
      console.log('Applied environment contract overrides:', envOverrides)
    }
  }, [])
  
  return store
}