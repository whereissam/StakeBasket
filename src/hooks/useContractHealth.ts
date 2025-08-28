import { useState, useEffect, useCallback, useRef } from 'react'
import { useContractStore } from '../store/useContractStore'
import { useChainId } from 'wagmi'
import { getNetworkByChainId } from '../config/contracts'

interface ContractHealthStatus {
  isHealthy: boolean
  error?: string
  lastChecked: Date
  blockNumber?: number
  isResponding: boolean
}

interface ContractHealthReport {
  [contractName: string]: ContractHealthStatus
}


export function useContractHealth() {
  const { getAllAddresses } = useContractStore()
  const chainId = useChainId()
  const { config } = getNetworkByChainId(chainId)
  const [healthReport, setHealthReport] = useState<ContractHealthReport>({})
  const [isChecking, setIsChecking] = useState(false)
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null)
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cacheRef = useRef<{ [key: string]: { result: ContractHealthStatus, timestamp: number } }>({})
  
  const addresses = getAllAddresses()
  const CACHE_DURATION = 30000 // 30 seconds cache

  // Health check for a specific contract with caching
  const checkContractHealth = useCallback(async (contractName: string, address: string): Promise<ContractHealthStatus> => {
    // Check cache first
    const cacheKey = `${contractName}-${address}`
    const cached = cacheRef.current[cacheKey]
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result
    }
    
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      const result = {
        isHealthy: false,
        error: 'Contract not deployed',
        lastChecked: new Date(),
        isResponding: false
      }
      cacheRef.current[cacheKey] = { result, timestamp: Date.now() }
      return result
    }

    try {
      // Basic validation - check if address is valid format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        const result = {
          isHealthy: false,
          error: 'Invalid address format',
          lastChecked: new Date(),
          isResponding: false
        }
        cacheRef.current[cacheKey] = { result, timestamp: Date.now() }
        return result
      }

      // Batch RPC requests to reduce network calls
      const batchRequest = {
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: Date.now()
      }

      const response = await fetch(config.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchRequest)
      })

      const data = await response.json()
      
      if (data.error) {
        const result = {
          isHealthy: false,
          error: data.error.message || 'RPC Error',
          lastChecked: new Date(),
          isResponding: false
        }
        cacheRef.current[cacheKey] = { result, timestamp: Date.now() }
        return result
      }

      const bytecode = data.result
      if (!bytecode || bytecode === '0x') {
        const result = {
          isHealthy: false,
          error: 'No contract deployed at address',
          lastChecked: new Date(),
          isResponding: false
        }
        cacheRef.current[cacheKey] = { result, timestamp: Date.now() }
        return result
      }

      // Contract exists - assume it's responding to avoid extra RPC calls
      const result = {
        isHealthy: true,
        lastChecked: new Date(),
        isResponding: true
      }
      
      cacheRef.current[cacheKey] = { result, timestamp: Date.now() }
      return result

    } catch (error) {
      const result = {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        isResponding: false
      }
      cacheRef.current[cacheKey] = { result, timestamp: Date.now() }
      return result
    }
  }, [config.rpcUrl])

  // Run full health check on all contracts with debouncing
  const runFullHealthCheck = useCallback(async () => {
    if (isChecking) return // Prevent concurrent checks
    
    setIsChecking(true)
    const newHealthReport: ContractHealthReport = {}

    // Filter out placeholder addresses and focus on core contracts
    const coreContracts = Object.entries(addresses).filter(([contractName, address]) => {
      // Skip placeholder addresses
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        return false
      }
      // For local development, only check essential contracts
      if (chainId === 31337) {
        const essentialContracts = ['StakeBasket', 'StakeBasketToken', 'PriceFeed']
        return essentialContracts.includes(contractName)
      }
      // For other networks, check all non-placeholder contracts
      return true
    })

    // Limit concurrent requests to prevent overwhelming the RPC
    const BATCH_SIZE = 2
    for (let i = 0; i < coreContracts.length; i += BATCH_SIZE) {
      if (!isChecking) break // Allow early exit if component unmounts
      
      const batch = coreContracts.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map(async ([contractName, address]) => {
        const health = await checkContractHealth(contractName, address)
        return { contractName, health }
      })
      
      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(({ contractName, health }) => {
        newHealthReport[contractName] = health
      })
      
      // Small delay between batches
      if (i + BATCH_SIZE < coreContracts.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    setHealthReport(newHealthReport)
    setLastFullCheck(new Date())
    setIsChecking(false)
  }, [checkContractHealth]) // Remove circular dependencies

  // Manual trigger for health check - avoid automatic re-runs
  const triggerHealthCheck = useCallback(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current)
    }
    
    checkTimeoutRef.current = setTimeout(() => {
      runFullHealthCheck()
    }, 500)
  }, [runFullHealthCheck])
  
  // Only run once on mount, not on every address change
  useEffect(() => {
    triggerHealthCheck()
  }, []) // Empty dependencies - only run on mount
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [])

  // Get summary statistics
  const getHealthSummary = () => {
    // Count only the contracts that were actually checked
    const checkedContracts = Object.keys(healthReport)
    const healthyCount = Object.values(healthReport).filter(h => h.isHealthy).length
    const totalCount = checkedContracts.length
    const respondingCount = Object.values(healthReport).filter(h => h.isResponding).length
    
    return {
      totalContracts: totalCount,
      healthyContracts: healthyCount,
      respondingContracts: respondingCount,
      healthPercentage: totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0,
      lastChecked: lastFullCheck
    }
  }

  // Get contracts with issues
  const getUnhealthyContracts = () => {
    return Object.entries(healthReport)
      .filter(([_, health]) => !health.isHealthy)
      .map(([contractName, health]) => ({
        contractName,
        address: addresses[contractName as keyof typeof addresses],
        error: health.error,
        lastChecked: health.lastChecked
      }))
  }

  // Get contracts that are deployed but not responding
  const getNonRespondingContracts = () => {
    return Object.entries(healthReport)
      .filter(([_, health]) => health.isHealthy && !health.isResponding)
      .map(([contractName, health]) => ({
        contractName,
        address: addresses[contractName as keyof typeof addresses],
        lastChecked: health.lastChecked
      }))
  }

  return {
    healthReport,
    isChecking,
    lastFullCheck,
    runFullHealthCheck: triggerHealthCheck, // Use the debounced trigger
    getHealthSummary,
    getUnhealthyContracts,
    getNonRespondingContracts,
    checkContractHealth
  }
}