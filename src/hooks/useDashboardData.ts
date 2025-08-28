import { useMemo } from 'react'
import { useStaticData } from './useStaticData'
// import { useSingletonData } from './useSingletonData'
// import { useTransactionHistory } from './useTransactionHistory'
// import { useContractHealth } from './useContractHealth'
// import { usePriceFeedManager } from './usePriceFeedManager'
import { useAccount } from 'wagmi'
import { useContracts } from './useContracts'

/**
 * Centralized dashboard data provider to reduce RPC calls
 * All dashboard components should use this instead of individual hooks
 */
export function useDashboardData(isInitialized: boolean = true) {
  const { address, isConnected: walletConnected } = useAccount()
  
  // Contracts configuration
  const { contracts: contractAddresses, config } = useContracts()
  
  // Core contract data - using static data to eliminate ALL RPC calls
  const contractData = useStaticData(isInitialized && address ? address : undefined)
  
  // Contract health - disabled to eliminate RPC calls
  const healthSummary = useMemo(() => ({
    healthPercentage: 100, 
    healthyContracts: 5, 
    totalContracts: 5 
  }), [])
  
  // Price feed management - disabled to eliminate RPC calls
  const priceFeedHooks = {
    updateCorePrice: async () => {},
    updateBTCPrice: async () => {},
    updateAllPrices: async () => {},
    updatePricesWithSwitchboard: async () => {},
    isUpdating: false,
    updateSuccess: false,
    isPriceStale: false,
    corePriceValid: true,
    btcPriceValid: true,
    apiPrices: {},
    updateHash: undefined
  }
  
  // Transaction history - DISABLED to prevent excessive RPC calls
  // const transactionHooks = useTransactionHistory(isInitialized ? address : undefined)
  const transactionHooks = {
    transactions: [],
    loading: false,
    error: null
  }
  
  // Portfolio calculations
  const portfolioValueUSD = useMemo(() => 
    contractData.basketBalance * contractData.corePrice * 1.085, 
    [contractData.basketBalance, contractData.corePrice]
  )
  
  const navPerShare = useMemo(() => 
    contractData.basketBalance > 0 ? portfolioValueUSD / contractData.basketBalance : 0,
    [portfolioValueUSD, contractData.basketBalance]
  )
  
  const estimatedAPY = useMemo(() => 8.5, []) // Static for now, can be calculated later
  
  return {
    // Account & Network
    address,
    walletConnected,
    contractAddresses,
    config,
    
    // Contract Data (from useContractData)
    ...contractData,
    
    // Health Data
    healthSummary,
    getHealthSummary: () => healthSummary,
    runFullHealthCheck: async () => {},
    isChecking: false,
    
    // Price Feed Data
    ...priceFeedHooks,
    
    // Transaction Data
    ...transactionHooks,
    
    // Calculated Values
    portfolioValueUSD,
    navPerShare,
    estimatedAPY,
    
    // State
    isInitialized
  }
}