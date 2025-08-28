import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { RefreshCw, AlertTriangle, BarChart3, Wrench, Target, RotateCcw, Zap, Shield, TestTube, CheckCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatEther, parseEther } from 'viem'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'
import { useSimulateContract, useAccount } from 'wagmi'
import { useContracts } from '../../hooks/useContracts'

// DualStakingBasket ABI for redeem function
const DUAL_STAKING_BASKET_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "redeem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

interface ApiWithdrawFormProps {
  chainId: number
}

export function ApiWithdrawForm({ chainId }: ApiWithdrawFormProps) {
  const networkInfo = useNetworkInfo()
  const { address } = useAccount()
  const { contracts } = useContracts()
  const [inputAmount, setInputAmount] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  
  // TEMPORARILY DISABLED to reduce RPC calls - using mock data
  // const {
  //   calculateRedemption,
  //   executeRedemption,
  //   calculatedReturn,
  //   usdValue,
  //   isPending,
  //   isConfirming,
  //   isSuccess,
  //   userBalance,
  //   priceData,
  //   canRedeem
  // } = useHybridRedemption()
  
  // Mock hybrid redemption data
  const calculateRedemption = async (_amount: string) => {}
  const executeRedemption = async (_amount: string) => {}
  const calculatedReturn = inputAmount ? (parseFloat(inputAmount) * 0.95).toString() : '0'
  const usdValue = inputAmount ? parseFloat(inputAmount) * 0.95 * 0.5 : 0
  const isPending = false
  const isConfirming = false
  const isSuccess = false
  const userBalance = '10500000000000000000' // 10.5 BASKET tokens in wei
  const priceData = { source: 'Mock API', error: null }
  const canRedeem = (amount: string) => parseFloat(amount) > 0 && parseFloat(amount) <= 10.5

  // Use wagmi's useSimulateContract for proper contract simulation - optimized
  const { 
    data: simulateData, 
    error: simulateError, 
    isLoading: isSimulateLoading 
  } = useSimulateContract({
    address: (contracts.DualStakingBasket || contracts.StakeBasket) as `0x${string}`,
    abi: DUAL_STAKING_BASKET_ABI,
    functionName: 'redeem',
    args: inputAmount ? [parseEther(inputAmount)] : undefined,
    account: address,
    query: {
      enabled: !!(inputAmount && parseFloat(inputAmount) > 0 && address && (contracts.DualStakingBasket || contracts.StakeBasket)),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // Don't refetch on mount
      staleTime: 30 * 1000, // Consider data fresh for 30 seconds
      gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    }
  })

  // Calculate redemption amount when input changes
  useEffect(() => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      calculateRedemption(inputAmount)
    }
  }, [inputAmount, calculateRedemption])


  const runSimulation = async (): Promise<{ hasIssues: boolean; issues?: any[]; result?: any }> => {
    try {
      const issues = []
      const userBalanceFormatted = userBalance ? formatEther(BigInt(userBalance)) : '0'
      
      // Basic validation checks first
      if (parseFloat(inputAmount) > parseFloat(userBalanceFormatted)) {
        issues.push({ type: 'error', text: 'Insufficient BASKET token balance', icon: X })
      }
      if (!networkInfo.isSupported) {
        issues.push({ type: 'error', text: 'Unsupported network', icon: X })
      }
      if (!canRedeem(inputAmount)) {
        issues.push({ type: 'error', text: 'Cannot execute redemption (check network/balance)', icon: X })
      }
      if (priceData.error) {
        issues.push({ type: 'warning', text: `Price data error: ${priceData.error}`, icon: AlertTriangle })
      }
      if (!calculatedReturn || parseFloat(calculatedReturn) <= 0) {
        issues.push({ type: 'warning', text: 'Invalid calculated return amount', icon: AlertTriangle })
      }
      
      // Check wagmi contract simulation results
      if (simulateError) {
        issues.push({ type: 'error', text: `Contract simulation failed: ${simulateError.message}`, icon: X })
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
          text: `Contract simulation successful! Ready to redeem ${inputAmount} BASKET tokens`, 
          details: `Estimated return: ${calculatedReturn} ${networkInfo.tokenSymbol}\nUSD value: $${usdValue.toFixed(2)}\n${simulateData ? `Gas estimate: ${simulateData.request.gas?.toString() || 'N/A'}` : ''}`, 
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

  const handleRedeemWithSimulation = async () => {
    if (!inputAmount || !canRedeem(inputAmount)) return
    
    // CRITICAL SECURITY CHECK: Verify user is on correct network
    if (!networkInfo.isSupported) {
      console.error('Network not supported for redemption:', chainId)
      alert(`Wrong Network! You're on chain ${chainId}. Please switch to a supported network before making transactions.`)
      return
    }
    
    // Show inline simulation loading
    setIsSimulating(true)
    setSimulationResult(null)
    
    // Run simulation first
    const simulationCheck = await runSimulation()
    
    if (simulationCheck.hasIssues) {
      // Show simulation issues but don't proceed - keep loading state off
      setIsSimulating(false)
      return
    }
    
    // If simulation passes, clear simulation result and proceed with redemption
    setIsSimulating(false)
    setSimulationResult(null)
    
    // Call the actual redemption function (this may have its own loading states)
    await executeRedemption(inputAmount)
  }

  // Clear input on success
  useEffect(() => {
    if (isSuccess) {
      setInputAmount('')
      setSimulationResult(null)
    }
  }, [isSuccess])

  const userBalanceFormatted = userBalance ? formatEther(BigInt(userBalance)) : '0'

  // Conditional rendering instead of early return
  if (!networkInfo.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Withdrawal Unavailable</CardTitle>
          <CardDescription>{networkInfo.error || 'This network is not supported'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Withdrawal</CardTitle>
        <CardDescription>
          Redeem BASKET tokens using contract prices with API fallback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        

        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">BASKET Tokens to Redeem</label>
          <div className="flex flex-col space-y-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="Enter BASKET amount"
              value={inputAmount}
              onChange={(e) => {
                const value = e.target.value
                if (parseFloat(value) < 0 || value === '-') {
                  setInputAmount('0')
                } else {
                  setInputAmount(value)
                }
              }}
              className="flex-1"
            />
            
            <Button 
              onClick={handleRedeemWithSimulation} 
              disabled={isSimulating || isPending || isConfirming || !inputAmount || !networkInfo.isSupported || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > parseFloat(userBalanceFormatted)}
              className="w-full min-h-[44px]"
            >
              {isSimulating ? (
                <>
                  <TestTube className="w-4 h-4 mr-2 animate-spin" />
                  Simulating...
                </>
              ) : isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Confirming in Wallet...
                </>
              ) : isConfirming ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing Transaction...
                </>
              ) : (
                'Smart Redeem'
              )}
            </Button>
          </div>
        </div>
        
        {/* Balance Info */}
        <div className="text-xs text-muted-foreground">
          Available: {parseFloat(userBalanceFormatted).toFixed(4)} BASKET
        </div>

        {/* Simulation Loading/Result */}
        {(isSimulating || simulationResult) && (
          <div className={`p-3 border rounded-md ${
            isSimulating ? 'bg-muted border-border' :
            simulationResult.type === 'success' ? 'bg-primary/10 border-primary text-primary' :
            simulationResult.type === 'error' ? 'bg-destructive/10 border-destructive text-destructive' :
            'bg-secondary border-secondary-foreground/20 text-secondary-foreground'
          }`}>
            <div className="flex items-start gap-2">
              <TestTube className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSimulating ? 'animate-spin' : ''}`} />
              <div>
                <p className="text-sm font-medium">
                  {isSimulating ? 'Simulating Redemption...' : 'Redemption Simulation Result'}
                </p>
                {isSimulating && (
                  <div className="text-xs mt-1 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Validating redemption with blockchain...</span>
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
                      <pre className="text-xs whitespace-pre-wrap opacity-75">{simulationResult.details}</pre>
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
                    {simulationResult.issues.some((issue: any) => issue.text.includes('Price data error')) && (
                      <div className="flex items-center gap-1 mt-2 font-medium">
                        <Target className="w-3 h-3" />
                        <span>API fallback will be used if contract prices fail</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Redemption Preview */}
        {calculatedReturn && inputAmount && (
          <div className="p-3 bg-card border border-border rounded-md">
            <h4 className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Redemption Preview
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• You will receive: <strong className="text-foreground">{parseFloat(calculatedReturn).toFixed(6)} {networkInfo.tokenSymbol}</strong></p>
              <p>• USD value: <strong className="text-foreground">${usdValue.toFixed(2)}</strong></p>
              <p>• Rate: <strong className="text-foreground">${(usdValue / parseFloat(inputAmount)).toFixed(4)}</strong> per BASKET token</p>
              <p>• Price source: <strong className="text-foreground">{priceData.source}</strong></p>
              {priceData.error && (
                <p className="flex items-center gap-1 text-destructive">
                  • <AlertTriangle className="w-3 h-3" /> {priceData.error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="p-3 bg-muted border border-border rounded-md">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
            <Wrench className="w-4 h-4" />
            How Smart Withdrawal Works
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1">
              <Target className="w-3 h-3" /> First attempts to use contract prices from Switchboard oracle
            </p>
            <p className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Falls back to API prices if contract oracle fails
            </p>
            <p className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> Ensures you always get accurate pricing for redemptions
            </p>
            <p className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Best of both worlds: reliable contract data with API backup
            </p>
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
}