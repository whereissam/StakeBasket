import { useMemo } from 'react'
import { useContractData } from './useContractData'
import { useTransactionHistory } from './useTransactionHistory'
import { useContractHealth } from './useContractHealth'
import { usePriceFeedManager } from './usePriceFeedManager'
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
  
  // Core contract data - only fetch when initialized
  const contractData = useContractData(isInitialized ? address : undefined)
  
  // Contract health - only after initialization
  const healthHooks = useContractHealth()
  const healthSummary = useMemo(() => 
    isInitialized ? healthHooks.getHealthSummary() : { 
      healthPercentage: 0, 
      healthyContracts: 0, 
      totalContracts: 0 
    }, 
    [healthHooks.getHealthSummary, isInitialized]
  )
  
  // Price feed management
  const priceFeedHooks = usePriceFeedManager()
  
  // Transaction history - only after initialization
  const transactionHooks = useTransactionHistory(isInitialized ? address : undefined)
  
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
    ...healthHooks,
    
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