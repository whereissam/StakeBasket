import { toast } from 'sonner'

// Common transaction error types
export enum TransactionErrorType {
  USER_REJECTED = 'USER_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS', 
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  GAS_LIMIT_EXCEEDED = 'GAS_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  ALLOWANCE_ERROR = 'ALLOWANCE_ERROR',
  SLIPPAGE_ERROR = 'SLIPPAGE_ERROR',
  NONCE_ERROR = 'NONCE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface TransactionError {
  type: TransactionErrorType
  message: string
  originalError?: unknown
  userFriendlyMessage: string
  actionable: boolean
  suggestedAction?: string
}

/**
 * Analyze and categorize transaction errors
 */
export function analyzeTransactionError(error: unknown): TransactionError {
  const errorMessage = (error as any)?.message || (error as any)?.toString() || 'Unknown error'
  
  // User rejection patterns
  if (
    errorMessage.includes('User rejected') ||
    errorMessage.includes('User denied') ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('denied transaction signature') ||
    errorMessage.includes('User cancelled') ||
    errorMessage.includes('User canceled') ||
    errorMessage.includes('MetaMask Tx Signature: User denied') ||
    (error as any)?.code === 4001 ||
    (error as any)?.code === 'ACTION_REJECTED'
  ) {
    return {
      type: TransactionErrorType.USER_REJECTED,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'You cancelled the transaction. No tokens were transferred.',
      actionable: true,
      suggestedAction: 'Click the transaction button again when you\'re ready to proceed.'
    }
  }

  // Insufficient funds patterns
  if (
    errorMessage.includes('insufficient funds') ||
    errorMessage.includes('Insufficient funds') ||
    errorMessage.includes('insufficient balance') ||
    errorMessage.includes('balance too low') ||
    errorMessage.includes('InsufficientFundsError') ||
    errorMessage.includes('not enough balance')
  ) {
    return {
      type: TransactionErrorType.INSUFFICIENT_FUNDS,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Insufficient balance for this transaction.',
      actionable: true,
      suggestedAction: 'Reduce the amount or add more tokens to your wallet. Remember to keep some tokens for gas fees.'
    }
  }

  // Gas-related errors
  if (
    errorMessage.includes('gas required exceeds allowance') ||
    errorMessage.includes('out of gas') ||
    errorMessage.includes('intrinsic gas too low') ||
    errorMessage.includes('insufficient gas')
  ) {
    return {
      type: TransactionErrorType.INSUFFICIENT_GAS,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Transaction failed due to gas issues.',
      actionable: true,
      suggestedAction: 'Make sure you have enough tokens for gas fees and try again. If this persists, increase gas limit manually in your wallet.'
    }
  }

  // Gas limit exceeded
  if (
    errorMessage.includes('gas limit exceeded') ||
    errorMessage.includes('execution reverted') ||
    errorMessage.includes('transaction failed')
  ) {
    return {
      type: TransactionErrorType.GAS_LIMIT_EXCEEDED,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Transaction failed due to gas limit issues.',
      actionable: true,
      suggestedAction: 'The transaction requires more gas than allowed. Try again with a higher gas limit.'
    }
  }

  // Network errors
  if (
    errorMessage.includes('network error') ||
    errorMessage.includes('Network Error') ||
    errorMessage.includes('connection error') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch') ||
    (error as any)?.code === 'NETWORK_ERROR'
  ) {
    return {
      type: TransactionErrorType.NETWORK_ERROR,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Network connection issue occurred.',
      actionable: true,
      suggestedAction: 'Check your internet connection and try again. If on a custom RPC, try switching networks.'
    }
  }

  // Contract-specific errors  
  if (
    errorMessage.includes('execution reverted') ||
    errorMessage.includes('contract call failed') ||
    errorMessage.includes('revert') ||
    errorMessage.includes('require')
  ) {
    return {
      type: TransactionErrorType.CONTRACT_ERROR,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Smart contract rejected the transaction.',
      actionable: true,
      suggestedAction: 'The contract requirements were not met. Please check transaction parameters and contract state.'
    }
  }

  // Allowance/approval errors
  if (
    errorMessage.includes('allowance') ||
    errorMessage.includes('approve') ||
    errorMessage.includes('insufficient allowance')
  ) {
    return {
      type: TransactionErrorType.ALLOWANCE_ERROR,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Token allowance issue detected.',
      actionable: true,
      suggestedAction: 'You may need to approve token spending first. Try the approve button before proceeding.'
    }
  }

  // Nonce errors
  if (
    errorMessage.includes('nonce') ||
    errorMessage.includes('transaction nonce is too low') ||
    errorMessage.includes('replacement transaction underpriced')
  ) {
    return {
      type: TransactionErrorType.NONCE_ERROR,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Transaction ordering issue detected.',
      actionable: true,
      suggestedAction: 'Clear pending transactions in your wallet or wait for them to complete, then try again.'
    }
  }

  // Connection errors
  if (
    errorMessage.includes('wallet not connected') ||
    errorMessage.includes('no wallet') ||
    errorMessage.includes('connect wallet')
  ) {
    return {
      type: TransactionErrorType.CONNECTION_ERROR,
      message: errorMessage,
      originalError: error,
      userFriendlyMessage: 'Wallet connection issue.',
      actionable: true,
      suggestedAction: 'Please connect your wallet and ensure you\'re on the correct network.'
    }
  }

  // Default case
  return {
    type: TransactionErrorType.UNKNOWN_ERROR,
    message: errorMessage,
    originalError: error,
    userFriendlyMessage: 'An unexpected error occurred.',
    actionable: true,
    suggestedAction: 'Please try again. If the problem persists, check your wallet connection and network settings.'
  }
}

/**
 * Handle transaction errors with user-friendly notifications
 */
export function handleTransactionError(
  error: unknown, 
  context: string = 'Transaction',
  options: {
    showToast?: boolean
    toastId?: string
    duration?: number
    onRetry?: () => void
  } = {}
): TransactionError {
  
  const {
    showToast = true,
    toastId,
    duration = 5000,
    onRetry
  } = options

  const analyzedError = analyzeTransactionError(error)
  
  // Log for debugging
  console.error(`${context} Error:`, {
    type: analyzedError.type,
    message: analyzedError.message,
    originalError: error
  })

  // Show user-friendly toast notification
  if (showToast) {
    const toastOptions: Record<string, any> = {
      id: toastId || `error-${Date.now()}`,
      duration: analyzedError.type === TransactionErrorType.USER_REJECTED ? 3000 : duration
    }

    // Add action button for actionable errors
    if (analyzedError.actionable && onRetry && analyzedError.type !== TransactionErrorType.USER_REJECTED) {
      toastOptions.action = {
        label: 'Retry',
        onClick: onRetry
      }
    }

    // Different toast styles based on error type
    switch (analyzedError.type) {
      case TransactionErrorType.USER_REJECTED:
        toast.info(analyzedError.userFriendlyMessage, toastOptions)
        break
      case TransactionErrorType.INSUFFICIENT_FUNDS:
      case TransactionErrorType.INSUFFICIENT_GAS:
        toast.warning(analyzedError.userFriendlyMessage, toastOptions)
        break
      case TransactionErrorType.NETWORK_ERROR:
      case TransactionErrorType.CONNECTION_ERROR:
        toast.error(`${analyzedError.userFriendlyMessage} ${analyzedError.suggestedAction || ''}`, toastOptions)
        break
      default:
        toast.error(`${context} failed: ${analyzedError.userFriendlyMessage}`, toastOptions)
        break
    }
  }

  return analyzedError
}

/**
 * Enhanced transaction wrapper with automatic error handling
 */
export async function executeTransactionWithErrorHandling<T>(
  transactionFn: () => Promise<T>,
  context: string = 'Transaction',
  options: {
    onSuccess?: (result: T) => void
    onError?: (error: TransactionError) => void
    showToast?: boolean
    retryable?: boolean
  } = {}
): Promise<T | null> {
  
  const { onSuccess, onError, showToast = true, retryable = false } = options

  try {
    const result = await transactionFn()
    if (onSuccess) {
      onSuccess(result)
    }
    return result
  } catch (error) {
    const analyzedError = handleTransactionError(error, context, {
      showToast,
      onRetry: retryable ? () => executeTransactionWithErrorHandling(transactionFn, context, options) : undefined
    })
    
    if (onError) {
      onError(analyzedError)
    }
    
    return null
  }
}

/**
 * Create a transaction state manager for consistent error handling
 */
export function createTransactionStateManager(context: string) {
  let currentToastId: string | null = null

  const clearToasts = () => {
    if (currentToastId) {
      toast.dismiss(currentToastId)
      currentToastId = null
    }
  }

  const showLoadingToast = (message: string) => {
    clearToasts()
    // Also dismiss any other toasts that might be showing
    toast.dismiss()
    currentToastId = `${context.toLowerCase()}-loading`
    toast.loading(message, { id: currentToastId })
  }

  const showSuccessToast = (message: string) => {
    clearToasts()
    currentToastId = `${context.toLowerCase()}-success`
    toast.success(message, { id: currentToastId })
  }

  const handleError = (error: unknown, onRetry?: () => void) => {
    clearToasts()
    // Also dismiss any other toasts that might be showing
    toast.dismiss()
    return handleTransactionError(error, context, {
      showToast: true,
      toastId: `${context.toLowerCase()}-error`,
      onRetry
    })
  }

  return {
    clearToasts,
    showLoadingToast,
    showSuccessToast, 
    handleError
  }
}