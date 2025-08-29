import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useState, useEffect, useMemo, useCallback } from 'react'
import * as React from 'react'
import { ArrowLeftRight, AlertTriangle, Award, Target } from 'lucide-react'
import { useAccount, useReadContract, useBalance } from 'wagmi'
import { formatEther, erc20Abi } from 'viem'
import { useDualStakingTransactions } from '../hooks/useDualStakingTransactions'
import { useRealPriceData } from '../hooks/useRealPriceData'
import { BalanceCard } from './shared/BalanceCard'
import { TierDisplay } from './shared/TierDisplay'
import { ContractInformation } from './shared/ContractInformation'
import { DualStakingHero } from './staking/DualStakingHero'
import { PortfolioDisplay } from './staking/PortfolioDisplay'
import { DualStakingForm } from './staking/DualStakingForm'
import { HowItWorksSection } from './staking/HowItWorksSection'
import { SafetyNotice } from './staking/SafetyNotice'
import { useContracts } from '../hooks/useContracts'
import { useNetworkStore } from '../store/useNetworkStore'
import { toast } from 'sonner'
import { useWalletLogger } from '../hooks/useWalletLogger'
import { getNetworkByChainId } from '../config/contracts'
import { validateNetwork, getTokenSymbol } from '../utils/networkHandler'
import { DualTier, DualStakeInfo, TierInfo } from '../types/staking'

// Target ratios for optimal bonus within each tier
const TIER_OPTIMAL_RATIOS: Record<DualTier, number> = {
  [DualTier.None]: 0,
  [DualTier.Base]: 1000,     // 1,000:1 CORE:BTC minimal for Base
  [DualTier.Bronze]: 5000,   // 5,000:1 CORE:BTC optimal for Bronze
  [DualTier.Silver]: 10000,  // 10,000:1 CORE:BTC optimal for Silver  
  [DualTier.Gold]: 20000,    // 20,000:1 CORE:BTC optimal for Gold
  [DualTier.Satoshi]: 25000  // 25,000:1 CORE:BTC optimal for Satoshi
}

// USD value thresholds for tier qualification
const TIER_USD_THRESHOLDS: Record<DualTier, { min: number; max: number }> = {
  [DualTier.None]: { min: 0, max: 50 },
  [DualTier.Base]: { min: 50, max: 1000 },      // $50-$1000 for base tier
  [DualTier.Bronze]: { min: 1000, max: 10000 },
  [DualTier.Silver]: { min: 10000, max: 100000 },
  [DualTier.Gold]: { min: 100000, max: 500000 },
  [DualTier.Satoshi]: { min: 500000, max: Infinity }
}

const TIER_INFO: Record<DualTier, TierInfo> = {
  [DualTier.None]: {
    name: 'Not Qualified',
    ratio: 'Below minimum requirements',
    apy: '0%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    description: 'Does not meet minimum staking requirements'
  },
  [DualTier.Base]: {
    name: 'Base Pool',
    ratio: '$50 - $1k total value',
    apy: '3%',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Minimal rewards for small amounts - Start earning with any valid deposit'
  },
  [DualTier.Bronze]: {
    name: 'Bronze Pool',
    ratio: '$1k - $10k total value',
    apy: '8% + up to 25% bonus',
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/10',
    description: 'Entry tier with ratio bonuses - Optimal 5,000:1 CORE:BTC ratio'
  },
  [DualTier.Silver]: {
    name: 'Silver Pool', 
    ratio: '$10k - $100k total value',
    apy: '12% + up to 35% bonus',
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    description: 'Enhanced tier with higher base yields - Optimal 10,000:1 CORE:BTC ratio'
  },
  [DualTier.Gold]: {
    name: 'Gold Pool',
    ratio: '$100k - $500k total value',
    apy: '16% + up to 50% bonus',
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
    description: 'Premium tier with maximum bonuses - Optimal 20,000:1 CORE:BTC ratio'
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi Pool',
    ratio: '$500k+ total value',
    apy: '20% + up to 60% bonus',
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/10',
    description: 'Elite tier for whale stakers - Optimal 25,000:1 CORE:BTC ratio'
  }
}

// Base minimum deposit requirements (prevents dust gaming)
const MIN_DEPOSIT_REQUIREMENTS = {
  CORE: 10,       // Minimum 10 CORE tokens (reduced for base tier)
  BTC: 0.001,     // Minimum 0.001 BTC tokens (reduced for base tier)
  USD_VALUE: 50   // Minimum $50 total USD value for base tier
}

// Dynamic price function using real data - moved inside component to be memoized

// Maximum bonus caps per tier (prevents excessive rewards)
const TIER_MAX_BONUS: Record<DualTier, number> = {
  [DualTier.None]: 0,
  [DualTier.Base]: 0,        // No bonus for base tier
  [DualTier.Bronze]: 0.25,   // +25% max bonus
  [DualTier.Silver]: 0.35,   // +35% max bonus
  [DualTier.Gold]: 0.50,     // +50% max bonus
  [DualTier.Satoshi]: 0.60   // +60% max bonus
}

export const DualStakingInterface = React.memo(() => {
  const { address } = useAccount()
  const { chainId: storeChainId } = useNetworkStore()
  const { chainId } = useContracts()
  
  // Use real data - no mocks
  const currentChainId = chainId || storeChainId || 31337
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  
  // Delay data loading to prevent initial API spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDataLoaded(true)
    }, 1500) // 1.5 second delay
    
    return () => clearTimeout(timer)
  }, [])
  
  // Get token symbol first (needed for all cases)
  const tokenSymbol = getTokenSymbol(currentChainId)
  
  // Enhanced wallet logging
  const {
    logTransactionStart,
    logTransactionSuccess,
    logTransactionError,
    logContractCall,
    logWalletError
  } = useWalletLogger()
  
  // Use unified dual staking transaction system - re-enabled
  const {
    depositDualStake,
    approveBtcTokens,
    isDualStaking,
    isApprovingCore,
    isApprovingBtc,
    approveCoreSuccess,
    approveBtcSuccess,
    dualStakeSuccess
  } = useDualStakingTransactions()
  
  // Real-time price data from multiple sources - re-enabled
  const priceData = useRealPriceData(isDataLoaded)
  
  // Validate network support
  const networkValidation = validateNetwork(currentChainId)
  
  // Get contract addresses from centralized config
  const { contracts } = getNetworkByChainId(currentChainId)
  const stakingContractAddress = contracts.DualStakingBasket
  const btcTokenAddress = currentChainId === 1114 
    ? (contracts as any).SimpleBTCFaucet || contracts.MockCoreBTC 
    : contracts.MockCoreBTC
  
  // CORE is native token like ETH - no token contract needed
  const isNativeCORE = true
  
  const [stakeInfo] = useState<DualStakeInfo>({
    coreStaked: '0',
    btcStaked: '0',
    shares: '0',
    rewards: '0',
    tier: DualTier.None,
    ratio: '0',
    apy: '0'
  })
  const [coreAmount, setCoreAmount] = useState('')
  const [btcAmount, setBtcAmount] = useState(MIN_DEPOSIT_REQUIREMENTS.BTC.toString())
  const [needsRebalancing] = useState(false)
  // CORE approval not needed for native token
  const [isAwaitingBtcApproval, setIsAwaitingBtcApproval] = useState(false);
  
  // Memoize price calculation to prevent excessive re-calculations
  const getAssetPrices = useCallback((priceData: { corePrice: number; btcPrice: number }) => ({
    CORE: priceData.corePrice || 1.5,      // Use real CORE price or fallback
    BTC: priceData.btcPrice || 65000       // Use real BTC price or fallback
  }), [])

  // Native ETH balance (for local hardhat) - TEMPORARILY DISABLED FOR DEBUGGING
  // const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
  //   address: address,
  //   query: {
  //     enabled: !!address && isNativeCORE && isDataLoaded, // Only load after delay
  //     staleTime: 30000, // Cache for 30 seconds
  //     gcTime: 120000, // Keep in cache for 2 minutes
  //     refetchOnWindowFocus: false
  //   },
  // })

  // Real balance data - re-enabled
  const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
    address: address as `0x${string}`,
    query: {
      enabled: !!address && isDataLoaded,
      staleTime: 30000, // Cache for 30 seconds  
      gcTime: 120000, // Keep in cache for 2 minutes
      refetchOnWindowFocus: false
    },
  })

  // CORE is native token - use native balance
  const coreBalanceData = nativeCoreBalance?.value
  
  const { data: btcBalanceData, refetch: refetchBtcBalance } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!btcTokenAddress && isDataLoaded,
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 120000, // Keep in cache for 2 minutes
      refetchOnWindowFocus: false
    },
  })
  
  // CORE is native token - no allowance needed (like ETH)
  // Remove unnecessary allowance check since CORE is native

  // const { data: btcAllowance, refetch: refetchBtcAllowance } = useReadContract({
  //   address: btcTokenAddress as `0x${string}`,
  //   abi: erc20Abi,
  //   functionName: 'allowance',
  //   args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
  //   query: {
  //     enabled: !!address && !!btcTokenAddress && !!stakingContractAddress,
  //     staleTime: 30000, // Cache for 30 seconds
  //     gcTime: 120000, // Keep in cache for 2 minutes
  //     refetchOnWindowFocus: false
  //   }
  // })
  
  const { data: btcAllowance, refetch: refetchBtcAllowance } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!btcTokenAddress && !!stakingContractAddress,
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 120000, // Keep in cache for 2 minutes
      refetchOnWindowFocus: false
    }
  })


  const parsedBtcAmount = useMemo(() => {
    try {
      const val = parseFloat(btcAmount)
      if (isNaN(val)) return 0n
      // Use 18 decimals to match ERC20 standard (not 8 decimals for BTC)
      return BigInt(Math.floor(val * 10**18))
    } catch {
      return 0n
    }
  }, [btcAmount])

  // Old transaction hooks removed - now using unified useDualStakingTransactions hook
  

  const needsBtcApprovalCheck = useMemo(() => {
    const debugInfo = {
      isAwaitingBtcApproval,
      parsedBtcAmount: parsedBtcAmount.toString(),
      btcAllowance: btcAllowance?.toString(),
      btcAmount,
      btcAllowanceExists: btcAllowance !== undefined,
      btcAllowanceNumber: btcAllowance ? Number(btcAllowance) : 0,
      parsedBtcNumber: Number(parsedBtcAmount),
      needsApproval: btcAllowance !== undefined && (btcAllowance as bigint) < parsedBtcAmount
    }
    console.log('🔍 BTC Approval Check:', debugInfo)
    
    if (isAwaitingBtcApproval) return false;
    if (!parsedBtcAmount || parsedBtcAmount === 0n) return false
    
    // BTC tokens always need approval unless there's sufficient allowance
    if (btcAllowance === undefined || btcAllowance === null) {
      console.log('⚠️ BTC allowance undefined/null - requiring approval')
      return true
    }
    
    // Compare allowance with required amount
    const needsApproval = (btcAllowance as bigint) < parsedBtcAmount
    console.log(`🔍 BTC allowance: ${btcAllowance?.toString()}, needed: ${parsedBtcAmount.toString()}, approval needed: ${needsApproval}`)
    
    return needsApproval
    
  }, [btcAllowance, parsedBtcAmount, isAwaitingBtcApproval, btcAmount])

  // Consolidated transaction effects - simplified since these variables are not defined
  // Transaction success/error handling is managed by the useDualStakingTransactions hook
  
  // CORE approval effects not needed for native token

  // BTC approval transaction handling is managed by the hook

  useEffect(() => {
    if (approveBtcSuccess) {
      logTransactionSuccess('BTC Token Approval Success', '')
      toast.success('BTC tokens approved!')
      setIsAwaitingBtcApproval(false);
      refetchBtcAllowance();
    }
  }, [approveBtcSuccess, refetchBtcAllowance, logTransactionSuccess])

  // Refresh balances after successful deposit
  useEffect(() => {
    if (dualStakeSuccess) {
      logTransactionSuccess('Dual Staking Deposit Success', '')
      
      // Refresh both CORE and BTC balances
      refetchCoreBalance()
      refetchBtcBalance()
      
      // Clear form amounts to show updated balances
      setCoreAmount('')
      setBtcAmount(MIN_DEPOSIT_REQUIREMENTS.BTC.toString())
      
      toast.success('🎉 Dual staking deposit successful! Your balances have been updated.')
    }
  }, [dualStakeSuccess, refetchCoreBalance, refetchBtcBalance, logTransactionSuccess])

  // Memoize USD value calculation to prevent excessive re-calculations
  const calculateTotalUSDValue = useCallback((core: string, btc: string): number => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    const prices = getAssetPrices(priceData)
    return (coreNum * prices.CORE) + (btcNum * prices.BTC)
  }, [priceData, getAssetPrices])
  
  // Memoize ratio bonus calculation to prevent excessive re-calculations
  const calculateRatioBonus = useCallback((core: string, btc: string, tier: DualTier): number => {
    if (tier === DualTier.None) return 0
    
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    if (btcNum === 0) return 0
    
    const actualRatio = coreNum / btcNum
    const optimalRatio = TIER_OPTIMAL_RATIOS[tier]
    
    // Calculate how close to optimal (1.0 = perfect, 0.0 = very far)
    const ratioDiff = Math.abs(actualRatio - optimalRatio) / optimalRatio
    const ratioScore = Math.max(0, 1 - ratioDiff)
    
    // Apply logarithmic scaling for larger stakes
    const totalUSDValue = calculateTotalUSDValue(core, btc)
    const sizeMultiplier = Math.log10(Math.max(1, totalUSDValue / 1000)) / 2 // Logarithmic bonus scaling
    
    const maxBonus = TIER_MAX_BONUS[tier]
    return Math.min(maxBonus, ratioScore * maxBonus * (1 + sizeMultiplier))
  }, [calculateTotalUSDValue])
  
  // Memoize tier calculation to prevent excessive re-calculations
  const calculateTier = useCallback((core: string, btc: string): DualTier => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    // Must have both assets and meet minimum requirements
    if (coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE || btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC) {
      return DualTier.None
    }
    
    // Calculate total USD value
    const totalUSDValue = calculateTotalUSDValue(core, btc)
    
    // Must meet minimum USD value requirement
    if (totalUSDValue < MIN_DEPOSIT_REQUIREMENTS.USD_VALUE) {
      return DualTier.None
    }
    
    // Assign tier based on total USD value
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
    
    return DualTier.None
  }, [calculateTotalUSDValue])

  const handleAutoCalculate = (targetTier: DualTier) => {
    // Handle None tier - show minimal example for Base tier
    if (targetTier === DualTier.None) {
      setBtcAmount(MIN_DEPOSIT_REQUIREMENTS.BTC.toString())
      setCoreAmount(MIN_DEPOSIT_REQUIREMENTS.CORE.toString())
      return
    }
    
    // Get the minimum USD value for this tier
    const minUSDValue = TIER_USD_THRESHOLDS[targetTier].min
    const optimalRatio = TIER_OPTIMAL_RATIOS[targetTier]
    const prices = getAssetPrices(priceData)
    
    // Start with minimum BTC requirement
    let btcAmount = Math.max(MIN_DEPOSIT_REQUIREMENTS.BTC, minUSDValue * 0.1 / prices.BTC)
    
    // For Base tier, keep amounts small but valid
    if (targetTier === DualTier.Base) {
      btcAmount = Math.max(MIN_DEPOSIT_REQUIREMENTS.BTC, 0.001) // Small BTC amount
    }
    
    // Calculate CORE amount for optimal ratio
    const coreAmountForRatio = btcAmount * optimalRatio
    
    // Ensure we meet minimum USD value requirement
    const currentUSDValue = (coreAmountForRatio * prices.CORE) + (btcAmount * prices.BTC)
    
    let finalCoreAmount = coreAmountForRatio
    if (currentUSDValue < minUSDValue) {
      // Add more CORE to reach minimum USD value
      const additionalCoreNeeded = (minUSDValue - currentUSDValue) / prices.CORE
      finalCoreAmount = coreAmountForRatio + additionalCoreNeeded
    }
    
    // Ensure we meet minimum CORE requirement
    finalCoreAmount = Math.max(finalCoreAmount, MIN_DEPOSIT_REQUIREMENTS.CORE)
    
    setBtcAmount(btcAmount.toString())
    setCoreAmount(finalCoreAmount.toString())
  }

  const handleApproveCORE = () => {
    // CORE is native token - no approval needed
    console.log('CORE is native token - no approval required')
  }

  const handleApproveBTC = async () => {
    if (!btcAmount) return
    
    logTransactionStart('BTC Token Approval', {
      amount: btcAmount,
      token: 'BTC',
      spender: stakingContractAddress
    })
    
    try {
      logContractCall('MockCoreBTC', 'approve', {
        spender: stakingContractAddress,
        amount: parsedBtcAmount.toString()
      })
      
      await approveBtcTokens(btcAmount)  
    } catch (error) {
      logTransactionError('BTC Token Approval', error, {
        amount: btcAmount,
        token: 'BTC',
        contract: stakingContractAddress
      })
    }
  }

  const handleDualStake = async () => {
    // Check minimum deposit requirements - allow depositing just CORE or just BTC
    const coreNum = Number(coreAmount) || 0
    const btcNum = Number(btcAmount) || 0
    
    logTransactionStart('Dual Staking Deposit', {
      coreAmount,
      btcAmount,
      chainId: currentChainId,
      address,
      tier: calculateTier(coreAmount, btcAmount)
    })
    
    // Must have at least one asset for dual staking
    if (coreNum === 0 && btcNum === 0) {
      logWalletError('Invalid Amounts', {
        coreAmount,
        btcAmount,
        reason: 'Both amounts are zero'
      })
      toast.error('Please enter CORE and/or BTC amounts to deposit')
      return
    }
    
    // Check minimum requirements for dual staking
    if (coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE) {
      logWalletError('Insufficient CORE Amount', {
        required: MIN_DEPOSIT_REQUIREMENTS.CORE,
        provided: coreNum,
        tokenSymbol
      })
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.CORE} ${tokenSymbol} required for dual staking`)
      return
    }
    
    if (btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC) {
      logWalletError('Insufficient BTC Amount', {
        required: MIN_DEPOSIT_REQUIREMENTS.BTC,
        provided: btcNum
      })
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.BTC} BTC required for dual staking`)  
      return
    }
    
    // Check minimum USD value requirement
    const totalUSDValue = calculateTotalUSDValue(coreAmount, btcAmount)
    if (totalUSDValue < MIN_DEPOSIT_REQUIREMENTS.USD_VALUE) {
      logWalletError('Insufficient USD Value', {
        required: MIN_DEPOSIT_REQUIREMENTS.USD_VALUE,
        calculated: totalUSDValue,
        coreAmount: coreNum,
        btcAmount: btcNum,
        prices: getAssetPrices(priceData)
      })
      toast.error(`Minimum $${MIN_DEPOSIT_REQUIREMENTS.USD_VALUE} total value required for dual staking`)
      return
    }
    
    if (!address) {
      logWalletError('Wallet Not Connected', {
        chainId: currentChainId
      })
      toast.error('Please connect your wallet')
      return
    }
    
    // Check CORE balance (native)
    const coreBalance = Number(coreBalanceFormatted)
    if (coreNum > coreBalance) {
      logWalletError('Insufficient CORE Balance', {
        required: coreNum,
        available: coreBalance,
        tokenSymbol
      })
      toast.error(`Insufficient CORE balance. You have ${coreBalance.toFixed(4)} ${tokenSymbol}`)
      return
    }
    
    // Check BTC balance  
    const btcBalance = Number(btcBalanceFormatted)
    if (btcNum > btcBalance) {
      logWalletError('Insufficient BTC Balance', {
        required: btcNum,
        available: btcBalance
      })
      toast.error(`Insufficient BTC balance. You have ${btcBalance.toFixed(4)} BTC`)
      return
    }
    
    // CORE is native token - no approval needed for CORE
    // Only check BTC approval if depositing BTC
    
    if (btcNum > 0 && needsBtcApprovalCheck) {
      logWalletError('BTC Approval Required', {
        btcAmount: btcNum,
        allowance: btcAllowance?.toString() || '0'
      })
      toast.error('Please approve BTC tokens first')
      return
    }
    
    try {
      // Check if we have valid price data
      if (!priceData.corePrice || !priceData.btcPrice) {
        logWalletError('Price Data Unavailable', {
          corePrice: priceData.corePrice,
          btcPrice: priceData.btcPrice,
          source: priceData.source,
          error: priceData.error
        })
        toast.error('Price data unavailable. Please wait for prices to load.')
        return
      }
      
      // Use unified dual staking transaction system
      // Determine if using native CORE (chainId 1114 for Core testnet) or ERC20 CORE (local hardhat)  
      const useNativeCORE = currentChainId === 1114 || currentChainId === 1116
      
      logContractCall('DualStakingBasket', 'depositDualStake', {
        coreAmount,
        btcAmount,
        useNativeCORE,
        chainId: currentChainId,
        tier: calculateTier(coreAmount, btcAmount),
        totalUSDValue
      })
      
      await depositDualStake(coreAmount, btcAmount, useNativeCORE)
      
    } catch (error) {
      logTransactionError('Dual Staking Deposit', error, {
        coreAmount,
        btcAmount,
        chainId: currentChainId,
        address,
        useNativeCORE: currentChainId === 1114 || currentChainId === 1116
      })
    }
  }

  const handleUnstake = () => {
    toast.error('Unstaking not available - basic StakeBasket contract does not support unstaking')
  }

  const handleClaimRewards = () => {
    toast.error('Claim rewards not available - basic StakeBasket contract does not support reward claims')
  }

  // Network validation check
  if (!networkValidation.isSupported || !networkValidation.isAvailable) {
    return (
      <div className="p-6 min-h-screen bg-background text-foreground">
        <Card className="bg-card shadow-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Network Not Supported
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {networkValidation.error || 'Please switch to a supported network to use this feature.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!address) {
    return (
      <div className="p-6 min-h-screen bg-background text-foreground">
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Dual Staking Basket
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your wallet to join the managed dual staking investment strategy
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Format balances - Both CORE and BTC tokens use 18 decimals
  const coreBalanceFormatted = coreBalanceData ? formatEther(coreBalanceData as bigint) : '0'
  const btcBalanceFormatted = btcBalanceData ? formatEther(btcBalanceData as bigint) : '0'
  
  const currentTierInfo = TIER_INFO[stakeInfo.tier as DualTier]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DualStakingHero />
      
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BalanceCard
            title="CORE Staked"
            value={Number(stakeInfo.coreStaked).toLocaleString()}
            subtitle="CORE tokens"
            icon={<Award className="h-4 w-4 text-chart-1" />}
          />
          <BalanceCard
            title="BTC Staked"
            value={Number(stakeInfo.btcStaked).toLocaleString()}
            subtitle="BTC tokens"
            icon={<Award className="h-4 w-4 text-chart-2" />}
          />
          <BalanceCard
            title="Current Tier"
            value={currentTierInfo.name}
            subtitle={`${currentTierInfo.apy} APY`}
            className={currentTierInfo.color}
            icon={<Award className="h-4 w-4 text-primary" />}
          />
          <BalanceCard
            title="Pending Rewards"
            value={Number(stakeInfo.rewards).toFixed(4)}
            subtitle="CORE rewards"
            icon={<Award className="h-4 w-4 text-chart-2" />}
          />
        </div>

        {/* Portfolio or Getting Started */}
        {Number(stakeInfo.coreStaked) > 0 || Number(stakeInfo.btcStaked) > 0 ? (
          <PortfolioDisplay
            stakeInfo={stakeInfo}
            tierInfo={TIER_INFO}
            currentTierInfo={currentTierInfo}
            calculateRatioBonus={calculateRatioBonus}
          />
        ) : (
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-chart-2/5 to-primary/5 border-2 border-dashed border-chart-2/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-chart-2">
                  <Target className="h-5 w-5" />
                  Ready to Join the Dual Staking Basket
                </CardTitle>
                <CardDescription>
                  Your deposits will be automatically managed to achieve optimal tier performance
                </CardDescription>
              </CardHeader>
            </Card>
            <HowItWorksSection chainId={currentChainId} tokenSymbol={tokenSymbol} />
          </div>
        )}

        {/* Rebalancing Notice */}
        {needsRebalancing && (
          <Card className="border-chart-1 bg-chart-1/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-chart-1">
                <AlertTriangle className="h-5 w-5" />
                Rebalancing Recommended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-chart-1 text-sm">
                Your CORE:BTC ratio has drifted from optimal. Consider rebalancing to maintain your current tier status.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Staking Form */}
        <DualStakingForm
          coreAmount={coreAmount}
          btcAmount={btcAmount}
          setCoreAmount={setCoreAmount}
          setBtcAmount={setBtcAmount}
          coreBalanceFormatted={coreBalanceFormatted}
          btcBalanceFormatted={btcBalanceFormatted}
          chainId={currentChainId}
          isNativeCORE={isNativeCORE}
          tierInfo={TIER_INFO}
          handleAutoCalculate={handleAutoCalculate}
          calculateTier={calculateTier}
          needsCoreApproval={false} // CORE is native token - never needs approval
          needsBtcApproval={needsBtcApprovalCheck}
          handleApproveCORE={handleApproveCORE}
          handleApproveBTC={handleApproveBTC}
          isApprovingCoreTx={isApprovingCore}
          isApprovingBtcTx={isApprovingBtc}
          isAwaitingCoreApproval={approveCoreSuccess}
          isAwaitingBtcApproval={isAwaitingBtcApproval}
          handleDualStake={handleDualStake}
          isStaking={isDualStaking || priceData.isLoading}
        />

        {/* Your Basket Position (if user has shares) */}
        {Number(stakeInfo.shares) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Basket Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Ratio</p>
                  <p className="text-lg font-mono">
                    {stakeInfo.btcStaked !== '0' 
                      ? (Number(stakeInfo.coreStaked) / Number(stakeInfo.btcStaked)).toFixed(0) 
                      : '0'}:1
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shares Owned</p>
                  <p className="text-lg">{Number(stakeInfo.shares).toFixed(4)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={handleUnstake}
                  disabled={Number(stakeInfo.shares) <= 0}
                  variant="outline"
                  className="w-full"
                >
                  Withdraw from Basket
                </Button>
                <Button 
                  onClick={handleClaimRewards}
                  disabled={Number(stakeInfo.rewards) <= 0}
                  className="w-full"
                >
                  Claim Rewards
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier Information */}
        <TierDisplay
          tiers={TIER_INFO}
          currentTier={stakeInfo.tier as DualTier}
        />

        {/* Safety Notice */}
        <SafetyNotice />
        
        {/* Price Data Indicator */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${!priceData.error ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm font-medium">
                Price Source: {priceData.source === 'oracle' ? 'Switchboard Oracle' : 
                              priceData.source === 'coingecko' ? 'CoinGecko API' : 
                              priceData.source === 'core-api' ? 'Core API' :
                              priceData.source === 'fallback' ? 'Fallback Data' : 'Loading...'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              <div>CORE: ${priceData.corePrice?.toFixed(3)} | BTC: ${priceData.btcPrice?.toLocaleString()}</div>
              {priceData.error && <div className="text-yellow-600">⚠ {priceData.error}</div>}
            </div>
          </div>
        </div>

        {/* Contract Information */}
        <ContractInformation chainId={currentChainId} />
      </div>
    </div>
  )
})