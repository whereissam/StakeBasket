import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getNetworkType, getNetworkName, getNetworkColor } from '../config/networks'

export type NetworkType = 'local' | 'testnet' | 'mainnet' | 'unknown'

interface ContractAddresses {
  governance: string
  basketToken: string
  liquidStakingManager: string
  stCoreToken: string
}

interface NetworkState {
  // Current network status
  networkStatus: NetworkType
  chainId: number | undefined
  
  // Contract addresses for each network
  contracts: {
    local: ContractAddresses
    testnet: ContractAddresses
    mainnet: ContractAddresses
  }
  
  // Actions
  setChainId: (chainId: number | undefined) => void
  setNetworkStatus: (status: NetworkType) => void
  updateContracts: (network: NetworkType, contracts: Partial<ContractAddresses>) => void
  getCurrentContracts: () => ContractAddresses
  getNetworkName: () => string
  getNetworkColor: () => string
  isContractDeployed: (contractType: keyof ContractAddresses) => boolean
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      networkStatus: 'unknown',
      chainId: undefined,
      
      contracts: {
        local: {
          governance: import.meta.env.VITE_GOVERNANCE_CONTRACT_LOCAL || '',
          basketToken: import.meta.env.VITE_BASKET_TOKEN_LOCAL || '',
          liquidStakingManager: import.meta.env.VITE_LIQUID_STAKING_MANAGER_LOCAL || '',
          stCoreToken: import.meta.env.VITE_STCORE_TOKEN_LOCAL || ''
        },
        testnet: {
          governance: import.meta.env.VITE_GOVERNANCE_CONTRACT_TESTNET || '',
          basketToken: import.meta.env.VITE_BASKET_TOKEN_TESTNET || '',
          liquidStakingManager: import.meta.env.VITE_LIQUID_STAKING_MANAGER_TESTNET || '',
          stCoreToken: import.meta.env.VITE_STCORE_TOKEN_TESTNET || ''
        },
        mainnet: {
          governance: import.meta.env.VITE_GOVERNANCE_CONTRACT_MAINNET || '',
          basketToken: import.meta.env.VITE_BASKET_TOKEN_MAINNET || '',
          liquidStakingManager: import.meta.env.VITE_LIQUID_STAKING_MANAGER_MAINNET || '',
          stCoreToken: import.meta.env.VITE_STCORE_TOKEN_MAINNET || ''
        }
      },
      
      setChainId: (chainId) => {
        set({ chainId })
        
        // Auto-detect network based on chain ID using centralized config
        const networkStatus = getNetworkType(chainId)
        set({ networkStatus })
      },
      
      setNetworkStatus: (status) => set({ networkStatus: status }),
      
      updateContracts: (network, newContracts) => {
        set((state) => ({
          contracts: {
            ...state.contracts,
            [network]: {
              ...(state.contracts[network as keyof typeof state.contracts] || state.contracts.local),
              ...newContracts
            }
          }
        }))
      },
      
      getCurrentContracts: () => {
        const { networkStatus, contracts } = get()
        if (networkStatus === 'unknown') {
          return contracts.local
        }
        return contracts[networkStatus]
      },
      
      getNetworkName: () => {
        const { chainId } = get()
        return getNetworkName(chainId)
      },
      
      getNetworkColor: () => {
        const { chainId } = get()
        return getNetworkColor(chainId)
      },
      
      isContractDeployed: (contractType) => {
        const contracts = get().getCurrentContracts()
        return !!contracts[contractType]
      }
    }),
    {
      name: 'network-store',
      partialize: (state) => ({ 
        contracts: state.contracts,
        // Don't persist network status as it should be detected fresh each time
      })
    }
  )
)

// Hook to initialize network detection
export const useNetworkDetection = () => {
  const { setChainId } = useNetworkStore()
  
  // This would be called from your main App component or Web3Provider
  const initializeNetwork = (chainId: number | undefined) => {
    setChainId(chainId)
  }
  
  return { initializeNetwork }
}