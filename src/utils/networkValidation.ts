import { validateNetwork } from './networkHandler'
import { toast } from 'sonner'

export function validateNetworkForTransaction(chainId: number): { isValid: boolean; error?: string } {
  const validation = validateNetwork(chainId)
  
  if (!validation.isSupported || !validation.isAvailable) {
    const errorMessage = validation.error || `Please switch to a supported CoreDAO network. Current chain: ${chainId}`
    toast.error(errorMessage)
    return { isValid: false, error: errorMessage }
  }
  
  return { isValid: true }
}

export class NetworkValidationError extends Error {
  constructor(message: string, public chainId: number) {
    super(message)
    this.name = 'NetworkValidationError'
  }
}