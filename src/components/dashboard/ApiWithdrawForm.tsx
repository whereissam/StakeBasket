import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { RefreshCw } from 'lucide-react'
import { useApiBasedRedemption } from '../../hooks/useApiBasedRedemption'
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
  } = useApiBasedRedemption()

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
          <CardTitle>API Withdrawal Unavailable</CardTitle>
          <CardDescription>{networkInfo.error || 'This network is not supported'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API-Based Withdrawal</CardTitle>
        <CardDescription>
          Redeem BASKET tokens using real-time {chainId === 31337 ? 'CoinGecko' : 'API'} prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Price Information */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💰 Real-Time Prices</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• {networkInfo.tokenSymbol}: ${priceData.corePrice.toFixed(4)}</p>
            <p>• BTC: ${priceData.btcPrice.toLocaleString()}</p>
            <p>• Source: {priceData.source} • Updated: {priceData.lastUpdate ? new Date(priceData.lastUpdate).toLocaleTimeString() : 'Loading...'}</p>
            {priceData.error && <p>• ⚠️ {priceData.error}</p>}
          </div>
        </div>

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
                'Redeem with API Prices'
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
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h4 className="text-sm font-medium text-green-800 mb-2">📊 Redemption Preview</h4>
            <div className="text-xs text-green-700 space-y-1">
              <p>• You will receive: <strong>{parseFloat(calculatedReturn).toFixed(6)} {networkInfo.tokenSymbol}</strong></p>
              <p>• USD value: <strong>${usdValue.toFixed(2)}</strong></p>
              <p>• Rate: ${(usdValue / parseFloat(inputAmount)).toFixed(4)} per BASKET token</p>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="p-3 bg-accent/50 border border-border rounded-md">
          <h4 className="text-sm font-medium text-white mb-2">🔧 How API-Based Withdrawal Works</h4>
          <div className="space-y-2 text-xs text-white/90">
            <p>• Uses real-time prices from {chainId === 31337 ? 'CoinGecko API' : 'Core API & CoinGecko'}</p>
            <p>• Calculates fair redemption value based on actual asset prices</p>
            <p>• Bypasses problematic on-chain price oracle completely</p>
            <p>• More accurate and reliable than contract-based pricing</p>
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
}