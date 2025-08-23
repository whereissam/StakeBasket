import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { RefreshCw } from 'lucide-react'
import { PriceStalenessIndicator } from '../PriceStalenessIndicator'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'

interface StakeFormProps {
  chainId: number
  depositAmount: string
  setDepositAmount: (amount: string) => void
  handleDeposit: () => Promise<void>
  isDepositing: boolean
  coreBalance: number
  corePrice: number
  updateCorePrice: () => void
  isPriceUpdating: boolean
}

export function StakeForm({
  chainId: _chainId,
  depositAmount,
  setDepositAmount,
  handleDeposit,
  isDepositing,
  coreBalance,
  corePrice,
  updateCorePrice,
  isPriceUpdating
}: StakeFormProps) {
  const networkInfo = useNetworkInfo()
  console.log('networkInfo', networkInfo)
  
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
              onClick={handleDeposit} 
              disabled={isDepositing || !depositAmount || !networkInfo.isSupported}
              className="w-full sm:w-auto sm:whitespace-nowrap min-h-[44px]"
            >
              {isDepositing ? (
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
            <div className="text-yellow-600 mt-1">
              ⚠️ For 5 {networkInfo.tokenSymbol} deposit, you need 5.02 {networkInfo.tokenSymbol} total (including gas). Try "Max Safe" button for your current balance.
            </div>
          )}
          {coreBalance < 1 && (
            <div className="text-red-600 mt-1">
              ❌ Insufficient balance. {networkInfo.minimumDepositMessage}
            </div>
          )}
        </div>
        <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
          ℹ️ This ETF uses native {networkInfo.stakingDescription}. Your wallet balance shows your native tokens.
        </div>
        
        <PriceStalenessIndicator 
          onUpdatePrice={updateCorePrice}
          isUpdating={isPriceUpdating}
        />
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