import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Lock } from 'lucide-react'
import { TokenAmountInput } from '../shared/TokenAmountInput'

interface StakeBasketFormProps {
  stakeAmount: string
  setStakeAmount: (amount: string) => void
  handleStake: () => void
  handleApprove: () => void
  needsApproval: boolean
  isContractPending: boolean
  isConfirming: boolean
  isApproving: boolean
  basketBalance: string
  currentAllowance: bigint | undefined
}

export function StakeBasketForm({
  stakeAmount,
  setStakeAmount,
  handleStake,
  handleApprove,
  needsApproval,
  isContractPending,
  isConfirming,
  isApproving,
  basketBalance,
  currentAllowance
}: StakeBasketFormProps) {
  const formatEther = (value: bigint) => {
    return (Number(value) / 1e18).toString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Stake BASKET
        </CardTitle>
        <CardDescription>
          Stake your BASKET tokens to earn protocol fees and tier benefits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TokenAmountInput
          value={stakeAmount}
          onChange={setStakeAmount}
          maxValue={basketBalance}
          tokenSymbol="BASKET"
          label="Amount to Stake"
          placeholder="0.00"
        />
        
        {needsApproval ? (
          <Button 
            onClick={handleApprove}
            disabled={isContractPending || isConfirming || !stakeAmount || Number(stakeAmount) <= 0}
            className="w-full"
          >
            {isContractPending && isApproving ? 'Approving...' : 
             isConfirming && isApproving ? 'Confirming Approval...' : 
             'Approve BASKET'}
          </Button>
        ) : (
          <Button 
            onClick={handleStake}
            disabled={isContractPending || isConfirming || !stakeAmount || Number(stakeAmount) <= 0}
            className="w-full"
          >
            {isContractPending && !isApproving ? 'Staking...' : 
             isConfirming && !isApproving ? 'Confirming Stake...' : 
             'Stake BASKET'}
          </Button>
        )}
        
        {/* Debug info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Debug: needsApproval={needsApproval.toString()}, isApproving={isApproving.toString()}</div>
          <div>Allowance: {currentAllowance ? formatEther(currentAllowance) : 'Loading...'} BASKET</div>
          <div>Pending: {isContractPending.toString()}, Confirming: {isConfirming.toString()}</div>
        </div>
      </CardContent>
    </Card>
  )
}