import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Unlock } from 'lucide-react'
import { TokenAmountInput } from '../shared/TokenAmountInput'

interface UnstakeBasketFormProps {
  unstakeAmount: string
  setUnstakeAmount: (amount: string) => void
  handleUnstake: () => void
  isContractPending: boolean
  isConfirming: boolean
  stakedAmount: string
}

export function UnstakeBasketForm({
  unstakeAmount,
  setUnstakeAmount,
  handleUnstake,
  isContractPending,
  isConfirming,
  stakedAmount
}: UnstakeBasketFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlock className="h-5 w-5" />
          Unstake BASKET
        </CardTitle>
        <CardDescription>
          Unstake your BASKET tokens (may lose tier benefits)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TokenAmountInput
          value={unstakeAmount}
          onChange={setUnstakeAmount}
          maxValue={stakedAmount}
          tokenSymbol="BASKET"
          label="Amount to Unstake"
          placeholder="0.00"
        />
        
        <Button 
          onClick={handleUnstake}
          disabled={isContractPending || isConfirming || !unstakeAmount || Number(unstakeAmount) <= 0}
          variant="outline"
          className="w-full"
        >
          {isContractPending ? 'Submitting...' : 
           isConfirming ? 'Confirming...' : 
           'Unstake BASKET'}
        </Button>
      </CardContent>
    </Card>
  )
}