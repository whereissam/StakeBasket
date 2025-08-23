import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { RefreshCw, Key, CheckCircle, ClipboardList } from 'lucide-react'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'

interface WithdrawFormProps {
  chainId: number
  withdrawAmount: string
  setWithdrawAmount: (amount: string) => void
  handleWithdraw: () => Promise<void>
  isRedeeming: boolean
  isApprovingBasket: boolean
  basketBalance: number
  portfolioValueUSD: number
  needsBasketApproval: (amount: string) => boolean
  basketAllowance: string
  contractAddresses: {
    StakeBasketToken: string
    StakeBasket: string
  }
}

export function WithdrawForm({
  chainId: _chainId,
  withdrawAmount,
  setWithdrawAmount,
  handleWithdraw,
  isRedeeming,
  isApprovingBasket,
  basketBalance,
  portfolioValueUSD,
  needsBasketApproval,
  basketAllowance,
  contractAddresses
}: WithdrawFormProps) {
  const networkInfo = useNetworkInfo()
  
  // Conditional rendering instead of early return
  if (!networkInfo.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Unavailable</CardTitle>
          <CardDescription>{networkInfo.error || 'This network is not supported'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw Assets</CardTitle>
        <CardDescription>Redeem your BASKET tokens for {networkInfo.tokenSymbol} tokens immediately</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">BASKET Tokens to Redeem</label>
          <div className="flex flex-col space-y-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="Enter BASKET amount"
              value={withdrawAmount}
              onChange={(e) => {
                const value = e.target.value
                // Prevent negative values
                if (parseFloat(value) < 0 || value === '-') {
                  setWithdrawAmount('0')
                } else {
                  setWithdrawAmount(value)
                }
              }}
              className="flex-1"
            />
            
            <Button 
              onClick={handleWithdraw} 
              disabled={isRedeeming || isApprovingBasket || !withdrawAmount}
              className="w-full min-h-[44px]"
            >
              {isApprovingBasket ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Approving BASKET Tokens...
                </>
              ) : isRedeeming ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                'Redeem BASKET Tokens'
              )}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Available: {basketBalance.toFixed(4)} BASKET (${portfolioValueUSD.toFixed(2)})
        </div>
        
        {/* BASKET Token Status */}
        <div className="p-3 bg-muted border border-border rounded-md">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
            <Key className="w-4 h-4" />
            BASKET Token Status
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            {needsBasketApproval(withdrawAmount || '1') ? (
              <p>• BASKET tokens will be approved automatically when you redeem</p>
            ) : (
              <p className="flex items-center gap-1">
                • <CheckCircle className="w-3 h-3 text-green-500" /> BASKET tokens approved (allowance: {parseFloat(basketAllowance).toFixed(4)})
              </p>
            )}
            <p>• BASKET Token: {contractAddresses.StakeBasketToken}</p>
            <p>• Spender: {contractAddresses.StakeBasket}</p>
          </div>
        </div>
        
        {/* Withdrawal explanation */}
        <div className="p-3 bg-accent/50 border border-border rounded-md">
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
            <ClipboardList className="w-4 h-4" />
            How Withdrawal Works
          </h4>
          <div className="space-y-2 text-xs text-white/90">
            <p>• BASKET tokens are redeemed immediately for {networkInfo.tokenSymbol} tokens</p>
            <p>• Withdrawal amount depends on current Net Asset Value (NAV)</p>
            <p>• Requires BASKET token approval before redemption</p>
          </div>
        </div>
        
        {parseFloat(withdrawAmount) > 0 && (
          <div className="p-3 bg-secondary/50 rounded-md">
            <p className="text-sm text-secondary-foreground">
              You will receive approximately {(parseFloat(withdrawAmount) / 1.085).toFixed(4)} {networkInfo.tokenSymbol}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Actual amount depends on current NAV per share
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}