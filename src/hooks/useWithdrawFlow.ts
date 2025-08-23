import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface WithdrawFlowState {
  isWithdrawing: boolean
  step: 'idle' | 'approval' | 'redemption' | 'completed' | 'error'
  error?: string
}

interface WithdrawFlowConfig {
  tokenName: string
  actionName: string
  approveText?: string
  redeemText?: string
  successText?: string
  errorText?: string
}

interface WithdrawFlowHooks {
  approveTokens: (amount: string) => Promise<void>
  redeemTokens: (amount: string) => Promise<void>
  needsApproval: (amount: string) => boolean
  isApproving: boolean
  isRedeeming: boolean
  approveSuccess: boolean
  redeemSuccess: boolean
}

export function useWithdrawFlow(config: WithdrawFlowConfig, hooks: WithdrawFlowHooks) {
  const [state, setState] = useState<WithdrawFlowState>({
    isWithdrawing: false,
    step: 'idle'
  })
  
  const pendingAmount = useRef<string | null>(null)
  const toastId = useRef<string | null>(null)
  
  const {
    approveTokens,
    redeemTokens,
    needsApproval,
    isApproving,
    isRedeeming,
    approveSuccess,
    redeemSuccess
  } = hooks


  // Default text configurations
  const approveText = config.approveText || `Approving ${config.tokenName} tokens...`
  const redeemText = config.redeemText || `Processing ${config.actionName.toLowerCase()}...`
  const successText = config.successText || `${config.actionName} completed successfully!`
  const errorText = config.errorText || `${config.actionName} failed. Please try again.`

  const startWithdrawal = async (amount: string) => {
    if (!amount || state.isWithdrawing) return
    
    try {
      pendingAmount.current = amount
      setState({
        isWithdrawing: true,
        step: needsApproval(amount) ? 'approval' : 'redemption'
      })
      
      // Clear any existing toasts (including conflicting ones from other hooks)
      if (toastId.current) {
        toast.dismiss(toastId.current)
      }
      // Dismiss any conflicting toasts from the transaction hooks
      toast.dismiss('redeem-wallet')
      toast.dismiss('redeem-tx')
      toast.dismiss('approve-wallet')
      toast.dismiss('approve-tx')
      
      
      if (needsApproval(amount)) {
        // Step 1: Approval needed
        toastId.current = 'withdraw-flow'
        toast.loading(`Step 1/2: ${approveText}`, { id: toastId.current })
        await approveTokens(amount)
      } else {
        // Direct redemption
        toastId.current = 'withdraw-flow'
        toast.loading(redeemText, { id: toastId.current })
        await redeemTokens(amount)
      }
    } catch (error) {
      console.error('Withdrawal flow error:', error)
      setState({
        isWithdrawing: false,
        step: 'error',
        error: error instanceof Error ? error.message : 'Withdrawal failed'
      })
      
      if (toastId.current) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      toast.error(errorText)
      pendingAmount.current = null
    }
  }

  // Handle approval success → proceed to redemption
  useEffect(() => {
    if (approveSuccess && state.step === 'approval' && pendingAmount.current) {
      const proceedToRedemption = async () => {
        try {
          setState(prev => ({ ...prev, step: 'redemption' }))
          
          if (toastId.current) {
            toast.dismiss(toastId.current)
          }
          // Dismiss any conflicting redemption toasts from the transaction hooks
          toast.dismiss('redeem-wallet')
          toast.dismiss('redeem-tx')
          
          toastId.current = 'withdraw-flow'
          toast.loading(`Step 2/2: ${redeemText}`, { id: toastId.current })
          
          // Small delay to ensure approval is processed
          await new Promise(resolve => setTimeout(resolve, 500))
          await redeemTokens(pendingAmount.current!)
        } catch (error) {
          console.error('Redemption after approval failed:', error)
          setState({
            isWithdrawing: false,
            step: 'error',
            error: 'Redemption failed after approval'
          })
          
          if (toastId.current) {
            toast.dismiss(toastId.current)
            toastId.current = null
          }
          toast.error(errorText)
          pendingAmount.current = null
        }
      }
      
      proceedToRedemption()
    }
  }, [approveSuccess, state.step, redeemTokens])

  // Handle redemption success
  useEffect(() => {
    if (redeemSuccess && (state.step === 'redemption' || state.step === 'approval')) {
      setState({
        isWithdrawing: false,
        step: 'completed'
      })
      
      // Immediately dismiss any conflicting toasts that might appear
      toast.dismiss('redeem-tx')
      toast.dismiss('redeem-wallet')
      
      if (toastId.current) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      toast.success(successText)
      pendingAmount.current = null
    }
  }, [redeemSuccess, state.step, successText])

  // Simple one-time suppression when transaction hooks become active
  useEffect(() => {
    if (state.isWithdrawing && (isRedeeming || isApproving)) {
      // Just dismiss once when transaction starts
      toast.dismiss('redeem-tx')
      toast.dismiss('redeem-wallet')  
      toast.dismiss('approve-tx')
      toast.dismiss('approve-wallet')
    }
  }, [state.isWithdrawing, isRedeeming, isApproving])

  // Update loading states based on hook states
  useEffect(() => {
    if (state.step === 'approval' && !isApproving && !approveSuccess) {
      // Approval failed or was cancelled
      setState({
        isWithdrawing: false,
        step: 'error',
        error: 'Approval was cancelled or failed'
      })
      
      if (toastId.current) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      pendingAmount.current = null
    }
    
    if (state.step === 'redemption' && !isRedeeming && !redeemSuccess) {
      // Redemption failed or was cancelled
      setState({
        isWithdrawing: false,
        step: 'error',
        error: 'Redemption was cancelled or failed'
      })
      
      if (toastId.current) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      pendingAmount.current = null
    }
  }, [state.step, isApproving, isRedeeming, approveSuccess, redeemSuccess])

  const resetFlow = () => {
    setState({
      isWithdrawing: false,
      step: 'idle'
    })
    pendingAmount.current = null
    
    // Clean up our controlled toast
    if (toastId.current) {
      toast.dismiss(toastId.current)
      toastId.current = null
    }
  }

  return {
    startWithdrawal,
    resetFlow,
    state,
    isWithdrawing: state.isWithdrawing,
    step: state.step,
    needsApproval
  }
}