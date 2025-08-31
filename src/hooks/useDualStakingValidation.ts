import { useCallback } from 'react'
import { toast } from 'sonner'
import { MIN_DEPOSIT_REQUIREMENTS } from '../config/dualStakingTiers'
import { DualTier } from '../types/staking'

export const useDualStakingValidation = (
  currentChainId: number,
  tokenSymbol: string,
  coreBalanceFormatted: string,
  btcBalanceFormatted: string,
  calculateTotalUSDValue: (core: string, btc: string) => number,
  logWalletError: (title: string, data: any) => void,
  priceData: { corePrice?: number; btcPrice?: number }
) => {
  
  const validateDeposit = useCallback((
    coreAmount: string, 
    btcAmount: string, 
    address: string | undefined,
    calculateTier: (core: string, btc: string) => DualTier
  ): boolean => {
    const coreNum = Number(coreAmount) || 0
    const btcNum = Number(btcAmount) || 0
    
    if (coreNum === 0 && btcNum === 0) {
      logWalletError('Invalid Amounts', { coreAmount, btcAmount, reason: 'Both amounts are zero' })
      toast.error('Please enter CORE and/or BTC amounts to deposit')
      return false
    }
    
    if (coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE) {
      logWalletError('Insufficient CORE Amount', { required: MIN_DEPOSIT_REQUIREMENTS.CORE, provided: coreNum, tokenSymbol })
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.CORE} ${tokenSymbol} required for dual staking`)
      return false
    }
    
    if (btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC) {
      logWalletError('Insufficient BTC Amount', { required: MIN_DEPOSIT_REQUIREMENTS.BTC, provided: btcNum })
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.BTC} BTC required for dual staking`)
      return false
    }
    
    const totalUSDValue = calculateTotalUSDValue(coreAmount, btcAmount)
    if (totalUSDValue < MIN_DEPOSIT_REQUIREMENTS.USD_VALUE) {
      logWalletError('Insufficient USD Value', { 
        required: MIN_DEPOSIT_REQUIREMENTS.USD_VALUE, 
        calculated: totalUSDValue, 
        coreAmount: coreNum, 
        btcAmount: btcNum 
      })
      toast.error(`Minimum $${MIN_DEPOSIT_REQUIREMENTS.USD_VALUE} total value required for dual staking`)
      return false
    }
    
    if (!address) {
      logWalletError('Wallet Not Connected', { chainId: currentChainId })
      toast.error('Please connect your wallet')
      return false
    }
    
    const coreBalance = Number(coreBalanceFormatted)
    if (coreNum > coreBalance) {
      logWalletError('Insufficient CORE Balance', { required: coreNum, available: coreBalance, tokenSymbol })
      toast.error(`Insufficient CORE balance. You have ${coreBalance.toFixed(4)} ${tokenSymbol}`)
      return false
    }
    
    const btcBalance = Number(btcBalanceFormatted)
    if (btcNum > btcBalance) {
      logWalletError('Insufficient BTC Balance', { required: btcNum, available: btcBalance })
      toast.error(`Insufficient BTC balance. You have ${btcBalance.toFixed(4)} BTC`)
      return false
    }
    
    if (!priceData.corePrice || !priceData.btcPrice) {
      logWalletError('Price Data Unavailable', { corePrice: priceData.corePrice, btcPrice: priceData.btcPrice })
      toast.error('Price data unavailable. Please wait for prices to load.')
      return false
    }
    
    return true
  }, [
    currentChainId, 
    tokenSymbol, 
    coreBalanceFormatted, 
    btcBalanceFormatted, 
    calculateTotalUSDValue, 
    logWalletError, 
    priceData
  ])

  return { validateDeposit }
}