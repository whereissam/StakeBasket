import { Button } from '../ui/button'
import { Info } from 'lucide-react'

interface ApprovalFlowProps {
  needsCoreApproval: boolean
  needsBtcApproval: boolean
  onApproveCORE: () => void
  onApproveBTC: () => void
  isApprovingCore?: boolean
  isApprovingBtc?: boolean
  isAwaitingCoreApproval?: boolean
  isAwaitingBtcApproval?: boolean
  coreTokenSymbol?: string
  className?: string
}

export function ApprovalFlow({
  needsCoreApproval,
  needsBtcApproval,
  onApproveCORE,
  onApproveBTC,
  isApprovingCore = false,
  isApprovingBtc = false,
  isAwaitingCoreApproval = false,
  isAwaitingBtcApproval = false,
  coreTokenSymbol = 'CORE',
  className = ""
}: ApprovalFlowProps) {
  if (!needsCoreApproval && !needsBtcApproval) {
    return null
  }

  return (
    <div className={`bg-chart-1/5 border border-chart-1/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-chart-1" />
        <span className="text-sm font-medium text-chart-1">
          Token Approval Required
        </span>
      </div>
      <p className="text-xs text-chart-1/80 mb-3">
        You need to approve the smart contract to use your tokens. This is a one-time action for security.
      </p>
      <div className="space-y-2">
        {needsCoreApproval && (
          <Button 
            onClick={onApproveCORE}
            disabled={isApprovingCore || isAwaitingCoreApproval}
            className="w-full"
            variant="outline"
          >
            {isApprovingCore ? `Approving ${coreTokenSymbol}...` : `✓ Approve ${coreTokenSymbol} Tokens`}
          </Button>
        )}
        {needsBtcApproval && (
          <Button 
            onClick={onApproveBTC}
            disabled={isApprovingBtc || isAwaitingBtcApproval}
            className="w-full"
            variant="outline"
          >
            {isApprovingBtc ? 'Approving BTC...' : '✓ Approve BTC Tokens'}
          </Button>
        )}
      </div>
    </div>
  )
}