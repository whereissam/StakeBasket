import { useChainId } from 'wagmi'
import { useContractStore, useEnvironmentContracts } from '../store/useContractStore'
import { getNetworkByChainId } from '../config/contracts'
import { useEffect } from 'react'

/**
 * Universal hook for getting contract addresses across all components
 * This replaces the old getNetworkByChainId pattern with the new dynamic system
 */
export function useContracts() {
  const chainId = useChainId()
  const { setChainId, getAllAddresses, getContractAddress } = useContractStore()
  
  // Initialize environment variables
  useEnvironmentContracts()
  
  // Update store when chain changes
  useEffect(() => {
    if (chainId) {
      setChainId(chainId)
    }
  }, [chainId, setChainId])
  
  // Get network configuration (for RPC, explorer, etc.)
  const { config, network } = getNetworkByChainId(chainId || 31337)
  
  // Get all contract addresses from the store
  const contracts = getAllAddresses()
  
  return {
    // Contract addresses (dynamic, can be overridden)
    contracts,
    
    // Network configuration (static)
    config,
    network,
    chainId: chainId || 31337,
    
    // Utility functions
    getAddress: getContractAddress,
    
    // Legacy compatibility - individual contract getters
    StakeBasket: contracts.StakeBasket,
    StakeBasketToken: contracts.StakeBasketToken,
    MockDualStaking: contracts.MockDualStaking,
    MockCORE: contracts.MockCORE,
    MockCoreBTC: contracts.MockCoreBTC,
    CoreOracle: contracts.CoreOracle,
    PriceFeed: contracts.PriceFeed,
    StakingManager: contracts.StakingManager,
    BasketGovernance: contracts.BasketGovernance,
    BasketToken: contracts.BasketToken,
    CoreLiquidStakingManager: contracts.CoreLiquidStakingManager,
    StCoreToken: contracts.StCoreToken,
    DualStakingBasket: contracts.DualStakingBasket,
    SatoshiTierBasket: contracts.SatoshiTierBasket,
    UnbondingQueue: contracts.UnbondingQueue,
    SparksManager: contracts.SparksManager,
    StakeBasketWithSparks: contracts.StakeBasketWithSparks,
    
    // Status helpers
    isLocalNetwork: network === 'hardhat',
    isTestnet: network === 'coreTestnet2',
    isMainnet: network === 'coreMainnet'
  }
}