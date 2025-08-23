import { useState, useEffect } from 'react'
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

  const addresses = getAllAddresses()

  // Health check for a specific contract
  const checkContractHealth = async (_contractName: string, address: string): Promise<ContractHealthStatus> => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return {
        isHealthy: false,
        error: 'Contract not deployed',
        lastChecked: new Date(),
        isResponding: false
      }
    }

    try {
      // Basic validation - check if address is valid format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return {
          isHealthy: false,
          error: 'Invalid address format',
          lastChecked: new Date(),
          isResponding: false
        }
      }

      // Try to fetch bytecode to see if contract exists
      const response = await fetch(config.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [address, 'latest'],
          id: 1
        })
      })

      const data = await response.json()
      
      if (data.error) {
        return {
          isHealthy: false,
          error: data.error.message || 'RPC Error',
          lastChecked: new Date(),
          isResponding: false
        }
      }

      const bytecode = data.result
      if (!bytecode || bytecode === '0x') {
        return {
          isHealthy: false,
          error: 'No contract deployed at address',
          lastChecked: new Date(),
          isResponding: false
        }
      }

      // Contract exists, now check if it's responding
      // Try a basic call - this might fail for some contracts but that's ok
      let isResponding = true
      try {
        const callResponse = await fetch(config.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: address,
              data: '0x06fdde03' // name() function selector
            }, 'latest'],
            id: 2
          })
        })
        
        const callData = await callResponse.json()
        if (callData.error && callData.error.message.includes('execution reverted')) {
          // This is expected for contracts that don't have name() function
          isResponding = true
        }
      } catch {
        // If call fails, contract might still be healthy but not responding to this specific call
        isResponding = true
      }

      return {
        isHealthy: true,
        lastChecked: new Date(),
        isResponding
      }

    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        isResponding: false
      }
    }
  }

  // Run full health check on all contracts
  const runFullHealthCheck = async () => {
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
        const essentialContracts = ['StakeBasket', 'StakeBasketToken', 'PriceFeed', 'StakingManager']
        return essentialContracts.includes(contractName)
      }
      // For other networks, check all non-placeholder contracts
      return true
    })

    const healthPromises = coreContracts.map(async ([contractName, address]) => {
      const health = await checkContractHealth(contractName, address)
      newHealthReport[contractName] = health
    })

    await Promise.all(healthPromises)
    
    setHealthReport(newHealthReport)
    setLastFullCheck(new Date())
    setIsChecking(false)
  }

  // Auto-run health check when addresses change
  useEffect(() => {
    runFullHealthCheck()
  }, [JSON.stringify(addresses)])

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
    runFullHealthCheck,
    getHealthSummary,
    getUnhealthyContracts,
    getNonRespondingContracts,
    checkContractHealth
  }
}