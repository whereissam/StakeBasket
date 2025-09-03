import { useCallback } from 'react'
import { DualTier } from '../types/staking'
import { 
  TIER_OPTIMAL_RATIOS, 
  TIER_USD_THRESHOLDS, 
  MIN_DEPOSIT_REQUIREMENTS, 
  TIER_MAX_BONUS 
} from '../config/dualStakingTiers'

export const useDualStakingTiers = (priceData: { corePrice: number; btcPrice: number }) => {
  
  const getAssetPrices = useCallback(() => ({
    CORE: priceData.corePrice || 1.5,
    BTC: priceData.btcPrice || 65000
  }), [priceData])

  const calculateTotalUSDValue = useCallback((core: string, btc: string): number => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    const prices = getAssetPrices()
    return (coreNum * prices.CORE) + (btcNum * prices.BTC)
  }, [getAssetPrices])

  const calculateTier = useCallback((core: string, btc: string): DualTier => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    if (coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE || btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC) {
      return DualTier.Base
    }
    
    const totalUSDValue = calculateTotalUSDValue(core, btc)
    
    if (totalUSDValue < MIN_DEPOSIT_REQUIREMENTS.USD_VALUE) {
      return DualTier.Base
    }
    
    if (totalUSDValue >= TIER_USD_THRESHOLDS[DualTier.Satoshi].min) {
      return DualTier.Satoshi
    } else if (totalUSDValue >= TIER_USD_THRESHOLDS[DualTier.Gold].min) {
      return DualTier.Gold
    } else if (totalUSDValue >= TIER_USD_THRESHOLDS[DualTier.Silver].min) {
      return DualTier.Silver
    } else if (totalUSDValue >= TIER_USD_THRESHOLDS[DualTier.Bronze].min) {
      return DualTier.Bronze
    } else if (totalUSDValue >= TIER_USD_THRESHOLDS[DualTier.Base].min) {
      return DualTier.Base
    }
    
    return DualTier.Base
  }, [calculateTotalUSDValue])

  const calculateRatioBonus = useCallback((core: string, btc: string, tier: DualTier): number => {
    if (tier === DualTier.Base) return 0
    
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    if (btcNum === 0) return 0
    
    const actualRatio = coreNum / btcNum
    const optimalRatio = TIER_OPTIMAL_RATIOS[tier]
    
    const ratioDiff = Math.abs(actualRatio - optimalRatio) / optimalRatio
    const ratioScore = Math.max(0, 1 - ratioDiff)
    
    const totalUSDValue = calculateTotalUSDValue(core, btc)
    const sizeMultiplier = Math.log10(Math.max(1, totalUSDValue / 1000)) / 2
    
    const maxBonus = TIER_MAX_BONUS[tier]
    return Math.min(maxBonus, ratioScore * maxBonus * (1 + sizeMultiplier))
  }, [calculateTotalUSDValue])

  const handleAutoCalculate = useCallback((targetTier: DualTier, setCoreAmount: (val: string) => void, setBtcAmount: (val: string) => void) => {
    if (targetTier === DualTier.Base) {
      setBtcAmount(MIN_DEPOSIT_REQUIREMENTS.BTC.toString())
      setCoreAmount(MIN_DEPOSIT_REQUIREMENTS.CORE.toString())
      return
    }
    
    const minUSDValue = TIER_USD_THRESHOLDS[targetTier].min
    const optimalRatio = TIER_OPTIMAL_RATIOS[targetTier]
    const prices = getAssetPrices()
    
    let btcAmount: number
    let minCoreForTier: number
    
    switch (targetTier) {
      case DualTier.Bronze:
        btcAmount = 0.01
        minCoreForTier = 1000
        break
      case DualTier.Silver:
        btcAmount = 0.1
        minCoreForTier = 5000
        break
      case DualTier.Gold:
        btcAmount = 0.5
        minCoreForTier = 25000
        break
      case DualTier.Satoshi:
        btcAmount = 2.0
        minCoreForTier = 100000
        break
      default:
        btcAmount = MIN_DEPOSIT_REQUIREMENTS.BTC
        minCoreForTier = MIN_DEPOSIT_REQUIREMENTS.CORE
    }
    
    const coreAmountForRatio = btcAmount * optimalRatio
    const currentUSDValue = (coreAmountForRatio * prices.CORE) + (btcAmount * prices.BTC)
    
    let finalCoreAmount = coreAmountForRatio
    if (currentUSDValue < minUSDValue) {
      const additionalCoreNeeded = (minUSDValue - currentUSDValue) / prices.CORE
      finalCoreAmount = coreAmountForRatio + additionalCoreNeeded
    }
    
    finalCoreAmount = Math.max(finalCoreAmount, minCoreForTier)
    
    setBtcAmount(btcAmount.toString())
    setCoreAmount(finalCoreAmount.toString())
  }, [getAssetPrices])

  return {
    calculateTier,
    calculateRatioBonus,
    calculateTotalUSDValue,
    handleAutoCalculate
  }
}