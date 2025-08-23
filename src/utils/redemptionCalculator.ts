import { parseEther, formatEther } from 'viem'

interface RedemptionCalculationParams {
  sharesToRedeem: string // Amount of BASKET tokens to redeem
  totalBasketSupply: string // Total BASKET token supply
  totalPooledCore: string // Total pooled CORE in contract
  totalPooledLstBTC: string // Total pooled lstBTC in contract
  corePrice: number // CORE price in USD from API
  btcPrice: number // BTC price in USD from API
}

interface RedemptionResult {
  coreToReturn: string // Amount of CORE/ETH to return (in ETH units)
  usdValue: number // USD value of the redemption
  breakdown: {
    coreValue: number // USD value from CORE portion
    btcValue: number // USD value from BTC portion
    totalAssetValue: number // Total portfolio value in USD
    shareOfPool: number // Percentage of pool being redeemed
  }
}

/**
 * Calculate redemption amount using real API prices instead of contract PriceFeed
 * This bypasses the problematic on-chain price calculation
 */
export function calculateRedemptionAmount(params: RedemptionCalculationParams): RedemptionResult {
  const {
    sharesToRedeem,
    totalBasketSupply,
    totalPooledCore,
    totalPooledLstBTC,
    corePrice,
    btcPrice
  } = params

  // Convert string inputs to BigInt for precise calculation
  const shares = parseEther(sharesToRedeem)
  const totalSupply = parseEther(totalBasketSupply)
  const pooledCore = parseEther(totalPooledCore)
  const pooledBTC = parseEther(totalPooledLstBTC)

  // Validate inputs
  if (totalSupply === 0n) {
    throw new Error('Total supply cannot be zero')
  }
  
  if (shares > totalSupply) {
    throw new Error('Cannot redeem more shares than total supply')
  }

  if (corePrice <= 0 || btcPrice <= 0) {
    throw new Error('Invalid prices - must be positive')
  }

  // Calculate USD values of each asset in the pool
  const coreValueUSD = Number(formatEther(pooledCore)) * corePrice
  const btcValueUSD = Number(formatEther(pooledBTC)) * btcPrice
  const totalAssetValueUSD = coreValueUSD + btcValueUSD

  // Calculate share of the pool being redeemed
  const sharePercentage = Number(formatEther(shares)) / Number(formatEther(totalSupply))
  
  // Calculate USD value of the shares being redeemed
  const redemptionValueUSD = totalAssetValueUSD * sharePercentage

  // Calculate CORE amount to return
  // For local testnet, return ETH equivalent to USD value divided by CORE price
  // For testnets/mainnet, return actual CORE tokens
  const coreToReturn = redemptionValueUSD / corePrice
  const coreToReturnWei = parseEther(coreToReturn.toString())

  console.log('📊 Redemption Calculation:', {
    shares: formatEther(shares),
    totalSupply: formatEther(totalSupply),
    sharePercentage: `${(sharePercentage * 100).toFixed(2)}%`,
    corePrice: `$${corePrice}`,
    btcPrice: `$${btcPrice.toLocaleString()}`,
    totalAssetValueUSD: `$${totalAssetValueUSD.toFixed(2)}`,
    redemptionValueUSD: `$${redemptionValueUSD.toFixed(2)}`,
    coreToReturn: `${coreToReturn.toFixed(6)} CORE/ETH`
  })

  return {
    coreToReturn: formatEther(coreToReturnWei),
    usdValue: redemptionValueUSD,
    breakdown: {
      coreValue: coreValueUSD,
      btcValue: btcValueUSD,
      totalAssetValue: totalAssetValueUSD,
      shareOfPool: sharePercentage * 100
    }
  }
}

/**
 * Validate if a redemption can be fulfilled given contract balance
 */
export function canFulfillRedemption(
  coreToReturn: string,
  contractBalance: string
): { canFulfill: boolean; shortfall?: string } {
  const requiredAmount = parseEther(coreToReturn)
  const availableAmount = parseEther(contractBalance)

  if (availableAmount >= requiredAmount) {
    return { canFulfill: true }
  }

  const shortfall = formatEther(requiredAmount - availableAmount)
  return {
    canFulfill: false,
    shortfall
  }
}

/**
 * Simple redemption calculator for when we want 1:1 ratio (emergency fallback)
 */
export function calculateSimpleRedemption(sharesToRedeem: string): RedemptionResult {
  return {
    coreToReturn: sharesToRedeem, // 1:1 ratio
    usdValue: Number(sharesToRedeem) * 1.5, // Assume $1.5 per token
    breakdown: {
      coreValue: Number(sharesToRedeem) * 1.5,
      btcValue: 0,
      totalAssetValue: Number(sharesToRedeem) * 1.5,
      shareOfPool: 100
    }
  }
}