import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { RefreshCw, AlertTriangle, BarChart3, Wrench, Target, RotateCcw, Zap, Shield } from 'lucide-react'
import { useHybridRedemption } from '../../hooks/useHybridRedemption'
import { useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'

interface ApiWithdrawFormProps {
  chainId: number
}

export function ApiWithdrawForm({ chainId }: ApiWithdrawFormProps) {
  const networkInfo = useNetworkInfo()
  const [inputAmount, setInputAmount] = useState('')
  
  const {
    calculateRedemption,
    executeRedemption,
    calculatedReturn,
    usdValue,
    isPending,
    isConfirming,
    isSuccess,
    userBalance,
    priceData,
    canRedeem
  } = useHybridRedemption()

  // Calculate redemption amount when input changes
  useEffect(() => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      calculateRedemption(inputAmount)
    }
  }, [inputAmount, calculateRedemption])

  const handleRedeem = async () => {
    if (!inputAmount || !canRedeem(inputAmount)) return
    
    // CRITICAL SECURITY CHECK: Verify user is on correct network
    if (!networkInfo.isSupported) {
      console.error('❌ Network not supported for redemption:', chainId)
      alert(`⚠️ Wrong Network! You're on chain ${chainId}. Please switch to a supported network before making transactions.`)
      return
    }
    
    await executeRedemption(inputAmount)
  }

  // Clear input on success
  useEffect(() => {
    if (isSuccess) {
      setInputAmount('')
    }
  }, [isSuccess])

  const userBalanceFormatted = userBalance ? formatEther(BigInt(userBalance)) : '0'
  const canExecuteRedemption = inputAmount && 
    parseFloat(inputAmount) > 0 && 
    parseFloat(inputAmount) <= parseFloat(userBalanceFormatted) &&
    !isPending && 
    !isConfirming &&
    networkInfo.isSupported

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
              onClick={handleRedeem} 
              disabled={!canExecuteRedemption}
              className="w-full min-h-[44px]"
            >
              {isPending ? (
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