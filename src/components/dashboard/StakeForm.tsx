import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { RefreshCw, AlertTriangle, XCircle, Info, TestTube, CheckCircle, X } from 'lucide-react'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'
import { useState, useEffect } from 'react'
import { useSimulateContract, useAccount, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { useContracts } from '../../hooks/useContracts'
import { useSwitchboardPriceUpdater } from '../../hooks/useSwitchboardPriceUpdater'

// StakeBasket contract ABI for deposit function
const STAKE_BASKET_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const

interface StakeFormProps {
  dashboardData: any
  chainId: number
  depositAmount: string
  setDepositAmount: (amount: string) => void
  handleDeposit: () => Promise<void>
  isDepositing: boolean
}

export function StakeForm({
  dashboardData,
  chainId: _chainId,
  depositAmount,
  setDepositAmount,
  handleDeposit,
  isDepositing
}: StakeFormProps) {
  const networkInfo = useNetworkInfo()
  const { address } = useAccount()
  const { contracts } = useContracts()
  
  // Show loading state if dashboardData is not yet loaded
  if (!dashboardData || dashboardData.coreBalance === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stake {networkInfo.tokenSymbol}</CardTitle>
          <CardDescription>Loading stake form...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Destructure from dashboardData
  const {
    coreBalance,
    corePrice
  } = dashboardData
  
  // Use Switchboard price updater for automatic price refreshing
  const switchboardUpdater = useSwitchboardPriceUpdater()
  
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  
  // Check if CORE price is stale in the contract
  const { data: isPriceValid } = useReadContract({
    address: contracts.CoreOracle as `0x${string}`,
    abi: [
      {
        "inputs": [{"name": "asset", "type": "string"}],
        "name": "isPriceValid",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'isPriceValid',
    args: ['CORE'],
    query: {
      enabled: !!contracts.CoreOracle,
      refetchInterval: 30000, // Check every 30 seconds
    }
  })
  
  // Use wagmi's useSimulateContract for proper contract simulation
  const { 
    data: simulateData, 
    error: simulateError, 
    isLoading: isSimulateLoading 
  } = useSimulateContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: STAKE_BASKET_ABI,
    functionName: 'deposit',
    args: depositAmount ? [parseEther(depositAmount)] : undefined,
    value: depositAmount ? parseEther(depositAmount) : undefined,
    account: address,
    query: {
      enabled: !!(depositAmount && parseFloat(depositAmount) > 0 && address && contracts.StakeBasket)
    }
  })
  
  // Auto re-simulate when price updates complete and there was a stale price error
  useEffect(() => {
    if (!switchboardUpdater.isUpdating && simulationResult?.type === 'issues') {
      const hasStaleError = simulationResult.issues.some((issue: any) => issue.canRefresh)
      if (hasStaleError && depositAmount && parseFloat(depositAmount) > 0) {
        // Small delay to allow price to propagate
        setTimeout(() => {
          runSimulation()
        }, 1000)
      }
    }
  }, [switchboardUpdater.isUpdating, simulationResult, depositAmount])
  
  const runSimulation = async (): Promise<{ hasIssues: boolean; issues?: any[]; result?: any }> => {
    try {
      const issues = []
      
      // Basic validation checks first
      if (parseFloat(depositAmount) > coreBalance) {
        issues.push({ type: 'error', text: 'Insufficient balance', icon: XCircle })
      }
      if (corePrice <= 0) {
        issues.push({ type: 'warning', text: 'Invalid price data (Core API may be failing)', icon: AlertTriangle })
      }
      if (!networkInfo.isSupported) {
        issues.push({ type: 'error', text: 'Unsupported network', icon: X })
      }
      if (parseFloat(depositAmount) < 1) {
        issues.push({ type: 'warning', text: 'Amount below minimum deposit', icon: AlertTriangle })
      }
      
      // Check wagmi contract simulation results
      if (simulateError) {
        const errorMessage = simulateError.message
        if (errorMessage.includes('PriceFeed: price data stale') || errorMessage.includes('price data stale')) {
          issues.push({ 
            type: 'error', 
            text: 'Price data is stale - contract requires fresh price updates', 
            icon: AlertTriangle,
            canRefresh: true
          })
        } else {
          issues.push({ type: 'error', text: `Contract simulation failed: ${errorMessage}`, icon: X })
        }
      } else if (!simulateData && !isSimulateLoading) {
        issues.push({ type: 'warning', text: 'Unable to simulate contract call', icon: AlertTriangle })
      }
      
      if (issues.length > 0) {
        const result = { type: 'issues', issues }
        setSimulationResult(result)
        return { hasIssues: true, issues, result }
      } else {
        const result = { 
          type: 'success', 
          text: `✅ Contract simulation successful! Ready to stake ${depositAmount} ${networkInfo.tokenSymbol}`,
          details: simulateData ? `Gas estimate: ${simulateData.request.gas?.toString() || 'N/A'}` : '',
          icon: CheckCircle 
        }
        setSimulationResult(result)
        return { hasIssues: false, result }
      }
    } catch (error) {
      const result = { type: 'error', text: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, icon: X }
      setSimulationResult(result)
      return { hasIssues: true, result }
    }
  }

  const handleDepositWithSimulation = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return
    
    // Show inline simulation loading
    setIsSimulating(true)
    setSimulationResult(null)
    
    // Check if price is stale and auto-update if needed
    if (isPriceValid === false) {
      console.log('🔄 Price is stale, auto-updating before staking...')
      try {
        const priceUpdated = await switchboardUpdater.ensureFreshPrice('CORE')
        if (!priceUpdated) {
          setIsSimulating(false)
          setSimulationResult({
            type: 'error',
            text: 'Failed to update price feed. Please try updating prices manually.',
            icon: XCircle
          })
          return
        }
        
        // Wait a moment for price to propagate
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('Auto price update failed:', error)
        setIsSimulating(false)
        setSimulationResult({
          type: 'error', 
          text: 'Price update failed. Please update prices manually before staking.',
          icon: XCircle
        })
        return
      }
    }
    
    // Run simulation after ensuring fresh prices
    const simulationCheck = await runSimulation()
    
    if (simulationCheck.hasIssues) {
      // Show simulation issues but don't proceed - keep loading state off
      setIsSimulating(false)
      return
    }
    
    // If simulation passes, clear simulation result and proceed with deposit
    setIsSimulating(false)
    setSimulationResult(null)
    
    // Call the actual deposit function (this may have its own loading states)
    await handleDeposit()
  }
  
  // Conditional rendering instead of early return
  if (!networkInfo.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staking Unavailable</CardTitle>
          <CardDescription>{networkInfo.error || 'This network is not supported'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stake {networkInfo.tokenSymbol} Tokens</CardTitle>
        <CardDescription>Stake native {networkInfo.stakingDescription} to earn BASKET tokens and yield rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount to Stake</label>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder={`Enter ${networkInfo.tokenSymbol} amount to stake`}
              value={depositAmount}
              onChange={(e) => {
                const value = e.target.value
                // Prevent negative values
                if (parseFloat(value) < 0 || value === '-') {
                  setDepositAmount('0')
                } else {
                  setDepositAmount(value)
                }
              }}
              className="flex-1"
            />
            <Button 
              onClick={handleDepositWithSimulation} 
              disabled={isSimulating || isDepositing || switchboardUpdater.isUpdating || !depositAmount || !networkInfo.isSupported}
              className="w-full sm:w-auto sm:whitespace-nowrap min-h-[44px]"
            >
              {switchboardUpdater.isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating Prices...
                </>
              ) : isSimulating ? (
                <>
                  <TestTube className="w-4 h-4 mr-2 animate-spin" />
                  Simulating...
                </>
              ) : isDepositing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Staking...
                </>
              ) : (
                `Stake Native ${networkInfo.tokenSymbol}`
              )}
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Available: {coreBalance.toFixed(4)} native {networkInfo.tokenSymbol} (${(coreBalance * corePrice).toFixed(2)})</span>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const maxSafe = Math.max(0, coreBalance - 0.02)
                  setDepositAmount(maxSafe.toFixed(4))
                }}
                className="text-primary hover:underline text-xs"
              >
                Max Safe
              </button>
              <button 
                onClick={() => setDepositAmount(coreBalance.toFixed(4))}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Use All
              </button>
            </div>
          </div>
          {coreBalance < 5.1 && coreBalance >= 1 && !networkInfo.isLocal && (
            <div className="text-yellow-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              For 5 {networkInfo.tokenSymbol} deposit, you need 5.02 {networkInfo.tokenSymbol} total (including gas). Try "Max Safe" button for your current balance.
            </div>
          )}
          {coreBalance < 1 && (
            <div className="text-red-600 mt-1 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Insufficient balance. {networkInfo.minimumDepositMessage}
            </div>
          )}
        </div>
        {/* <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />
          This ETF uses native {networkInfo.stakingDescription}. Your wallet balance shows your native tokens.
        </div> */}
        
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isPriceValid === false ? (
              <span className="text-orange-600 font-medium">Price data is stale - will auto-update before staking</span>
            ) : isPriceValid === true ? (
              <span className="text-green-600">Price data is current ✓</span>
            ) : (
              <span>Checking price freshness...</span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => switchboardUpdater.ensureFreshPrice('CORE')}
            disabled={switchboardUpdater.isUpdating}
            className="ml-auto"
          >
            {switchboardUpdater.isUpdating ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh Price
              </>
            )}
          </Button>
        </div>
        
        {/* Simulation Loading/Result */}
        {(isSimulating || simulationResult) && (
          <div className={`p-4 border rounded-lg shadow-sm ${
            isSimulating ? 'bg-muted border-border text-foreground' :
            simulationResult.type === 'success' ? 'bg-primary/10 border-primary text-primary' :
            simulationResult.type === 'error' ? 'bg-destructive/10 border-destructive text-destructive' :
            'bg-secondary/50 border-secondary-foreground/20 text-secondary-foreground'
          }`}>
            <div className="flex items-start gap-2">
              <TestTube className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSimulating ? 'animate-spin' : ''}`} />
              <div>
                <p className="text-sm font-medium">
                  {isSimulating ? 'Simulating Contract Call...' : 'Contract Simulation Result'}
                </p>
                {isSimulating && (
                  <div className="text-xs mt-1 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Validating transaction with blockchain...</span>
                    </div>
                  </div>
                )}
                {!isSimulating && simulationResult?.type === 'success' && (
                  <div className="text-xs mt-1">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{simulationResult.text}</span>
                    </div>
                    {simulationResult.details && (
                      <p className="text-xs opacity-75">{simulationResult.details}</p>
                    )}
                  </div>
                )}
                {!isSimulating && simulationResult?.type === 'error' && (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <X className="w-3 h-3" />
                    <span>{simulationResult.text}</span>
                  </div>
                )}
                {!isSimulating && simulationResult?.type === 'issues' && (
                  <div className="text-xs mt-1 space-y-1">
                    <p className="font-medium">Issues found:</p>
                    {simulationResult.issues.map((issue: any, index: number) => (
                      <div key={index} className="flex items-center gap-1">
                        <issue.icon className="w-3 h-3" />
                        <span>{issue.text}</span>
                      </div>
                    ))}
                    {simulationResult.issues.some((issue: any) => issue.canRefresh) && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3 pt-3 border-t border-current/20">
                        <Button 
                          onClick={() => switchboardUpdater.ensureFreshPrice('CORE')}
                          disabled={switchboardUpdater.isUpdating}
                          size="sm"
                          className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {switchboardUpdater.isUpdating ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Update Prices
                            </>
                          )}
                        </Button>
                        <span className="text-xs opacity-80">
                          {switchboardUpdater.isUpdating ? 'Updating prices... will auto-retry simulation' : 'Click to refresh price data and try again'}
                        </span>
                      </div>
                    )}
                    {simulationResult.issues.some((issue: any) => issue.text.includes('Core API may be failing')) && (
                      <div className="flex items-center gap-1 mt-2 font-medium">
                        <Info className="w-3 h-3" />
                        <span>Try refreshing price data or check your network connection</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {parseFloat(depositAmount) > 0 && (
          <div className="p-3 bg-primary/10 rounded-md">
            <p className="text-sm text-primary">
              You will receive approximately {(parseFloat(depositAmount) / 1.085).toFixed(4)} BASKET tokens
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}