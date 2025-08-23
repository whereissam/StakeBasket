import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeftRight, AlertTriangle, Award, Target } from 'lucide-react'
import { useAccount, useReadContract, useBalance } from 'wagmi'
import { formatEther, erc20Abi } from 'viem'
import { useDualStakingTransactions } from '../hooks/useDualStakingTransactions'
import { BalanceCard } from './shared/BalanceCard'
import { TierDisplay } from './shared/TierDisplay'
import { DualStakingHero } from './staking/DualStakingHero'
import { PortfolioDisplay } from './staking/PortfolioDisplay'
import { DualStakingForm } from './staking/DualStakingForm'
import { HowItWorksSection } from './staking/HowItWorksSection'
import { SafetyNotice } from './staking/SafetyNotice'
import { useContracts } from '../hooks/useContracts'
import { useNetworkStore } from '../store/useNetworkStore'
import { toast } from 'sonner'
import { getNetworkByChainId } from '../config/contracts'
import { validateNetwork, getTokenSymbol } from '../utils/networkHandler'
import { DualTier, DualStakeInfo, TierInfo } from '../types/staking'

// Target ratios for optimal bonus within each tier
const TIER_OPTIMAL_RATIOS: Record<DualTier, number> = {
  [DualTier.None]: 0,
  [DualTier.Bronze]: 5000,   // 5,000:1 CORE:BTC optimal for Bronze
  [DualTier.Silver]: 10000,  // 10,000:1 CORE:BTC optimal for Silver  
  [DualTier.Gold]: 20000,    // 20,000:1 CORE:BTC optimal for Gold
  [DualTier.Satoshi]: 25000  // 25,000:1 CORE:BTC optimal for Satoshi
}

// USD value thresholds for tier qualification
const TIER_USD_THRESHOLDS: Record<DualTier, { min: number; max: number }> = {
  [DualTier.None]: { min: 0, max: 1000 },
  [DualTier.Bronze]: { min: 1000, max: 10000 },
  [DualTier.Silver]: { min: 10000, max: 100000 },
  [DualTier.Gold]: { min: 100000, max: 500000 },
  [DualTier.Satoshi]: { min: 500000, max: Infinity }
}

const TIER_INFO: Record<DualTier, TierInfo> = {
  [DualTier.None]: {
    name: 'Not Qualified',
    ratio: '< $1,000 total value',
    apy: '0%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    description: 'Minimum $1,000 total value required to qualify for dual staking rewards'
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
  CORE: 100,      // Minimum 100 CORE tokens
  BTC: 0.01,      // Minimum 0.01 BTC tokens
  USD_VALUE: 1000 // Minimum $1000 total USD value for any tier
}

// Price assumptions (should be replaced with oracle data)
const ASSET_PRICES_USD = {
  CORE: 1.5,      // $1.50 per CORE token
  BTC: 65000      // $65,000 per BTC token
}

// Maximum bonus caps per tier (prevents excessive rewards)
const TIER_MAX_BONUS: Record<DualTier, number> = {
  [DualTier.None]: 0,
  [DualTier.Bronze]: 0.25,   // +25% max bonus
  [DualTier.Silver]: 0.35,   // +35% max bonus
  [DualTier.Gold]: 0.50,     // +50% max bonus
  [DualTier.Satoshi]: 0.60   // +60% max bonus
}

export function DualStakingInterface() {
  const { address } = useAccount()
  const { chainId: storeChainId } = useNetworkStore()
  const { chainId } = useContracts()
  const currentChainId = chainId || storeChainId || 31337
  
  // Get token symbol first (needed for all cases)
  const tokenSymbol = getTokenSymbol(currentChainId)
  
  // Use unified dual staking transaction system
  const {
    depositDualStake,
    approveBtcTokens,
    isDualStaking,
    isApprovingCore,
    isApprovingBtc,
    approveCoreSuccess,
    approveBtcSuccess
  } = useDualStakingTransactions()
  
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
  const [btcAmount, setBtcAmount] = useState('0')
  const [needsRebalancing] = useState(false)
  // CORE approval not needed for native token
  const [isAwaitingBtcApproval, setIsAwaitingBtcApproval] = useState(false);
  
  // Native ETH balance (for local hardhat)
  const { data: nativeCoreBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address && isNativeCORE,
    },
  })

  // CORE is native token - use native balance only
  const coreBalanceData = nativeCoreBalance?.value
  
  const { data: btcBalanceData } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!btcTokenAddress,
    },
  })
  
  // CORE is native token - no allowance needed (like ETH)
  // Remove unnecessary allowance check since CORE is native

  const { data: btcAllowance, refetch: refetchBtcAllowance } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!btcTokenAddress && !!stakingContractAddress
    }
  })


  const parsedBtcAmount = useMemo(() => {
    try {
      const val = parseFloat(btcAmount)
      if (isNaN(val)) return 0n
      return BigInt(Math.floor(val * 10**8))
    } catch {
      return 0n
    }
  }, [btcAmount])

  // Old transaction hooks removed - now using unified useDualStakingTransactions hook
  

  const needsBtcApprovalCheck = useMemo(() => {
    if (isAwaitingBtcApproval) return false;
    if (!parsedBtcAmount || parsedBtcAmount === 0n) return false
    if (btcAllowance === undefined) return true
    return (btcAllowance as bigint) < parsedBtcAmount
  }, [btcAllowance, parsedBtcAmount, isAwaitingBtcApproval])

  // Consolidated transaction effects - simplified since these variables are not defined
  // Transaction success/error handling is managed by the useDualStakingTransactions hook
  
  // CORE approval effects not needed for native token

  // BTC approval transaction handling is managed by the hook

  useEffect(() => {
    if (approveBtcSuccess) {
      toast.success('BTC tokens approved!')
      setIsAwaitingBtcApproval(false);
      refetchBtcAllowance();
    }
  }, [approveBtcSuccess, refetchBtcAllowance])

  // Calculate total USD value of the stake
  const calculateTotalUSDValue = (core: string, btc: string): number => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    return (coreNum * ASSET_PRICES_USD.CORE) + (btcNum * ASSET_PRICES_USD.BTC)
  }
  
  // Calculate ratio bonus based on how close to optimal ratio (used for future reward calculations)
  const calculateRatioBonus = (core: string, btc: string, tier: DualTier): number => {
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
  }
  
  const calculateTier = (core: string, btc: string): DualTier => {
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
    }
    
    return DualTier.None
  }

  const handleAutoCalculate = (targetTier: DualTier) => {
    if (targetTier === DualTier.None) return
    
    // Get the minimum USD value for this tier
    const minUSDValue = TIER_USD_THRESHOLDS[targetTier].min
    const optimalRatio = TIER_OPTIMAL_RATIOS[targetTier]
    
    // Start with minimum BTC requirement
    const btcAmount = Math.max(MIN_DEPOSIT_REQUIREMENTS.BTC, minUSDValue * 0.1 / ASSET_PRICES_USD.BTC)
    
    // Calculate CORE amount for optimal ratio
    const coreAmountForRatio = btcAmount * optimalRatio
    
    // Ensure we meet minimum USD value requirement
    const currentUSDValue = (coreAmountForRatio * ASSET_PRICES_USD.CORE) + (btcAmount * ASSET_PRICES_USD.BTC)
    
    let finalCoreAmount = coreAmountForRatio
    if (currentUSDValue < minUSDValue) {
      // Add more CORE to reach minimum USD value
      const additionalCoreNeeded = (minUSDValue - currentUSDValue) / ASSET_PRICES_USD.CORE
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
    try {
      await approveBtcTokens(btcAmount)  
    } catch (error) {
      console.error('BTC approval failed:', error)
    }
  }

  const handleDualStake = async () => {
    // Check minimum deposit requirements - allow depositing just CORE or just BTC
    const coreNum = Number(coreAmount) || 0
    const btcNum = Number(btcAmount) || 0
    
    // Must have at least one asset for dual staking
    if (coreNum === 0 && btcNum === 0) {
      toast.error('Please enter CORE and/or BTC amounts to deposit')
      return
    }
    
    // Check minimum requirements for dual staking
    if (coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE) {
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.CORE} ${tokenSymbol} required for dual staking`)
      return
    }
    
    if (btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC) {
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.BTC} BTC required for dual staking`)  
      return
    }
    
    // Check minimum USD value requirement
    const totalUSDValue = calculateTotalUSDValue(coreAmount, btcAmount)
    if (totalUSDValue < MIN_DEPOSIT_REQUIREMENTS.USD_VALUE) {
      toast.error(`Minimum $${MIN_DEPOSIT_REQUIREMENTS.USD_VALUE.toLocaleString()} total value required for dual staking`)
      return
    }
    
    if (!address) {
      toast.error('Please connect your wallet')
      return
    }
    
    // CORE is native token - no approval needed for CORE
    // Only check BTC approval if depositing BTC
    
    if (btcNum > 0 && needsBtcApprovalCheck) {
      toast.error('Please approve BTC tokens first')
      return
    }
    
    try {
      // Use unified dual staking transaction system
      // Determine if using native CORE (chainId 1114 for Core testnet) or ERC20 CORE (local hardhat)
      const useNativeCORE = currentChainId === 1114 || currentChainId === 1116
      await depositDualStake(coreAmount, btcAmount, useNativeCORE)
      
    } catch (error) {
      console.error('❌ Dual stake setup error:', error)
      // Error handling is done in the hook, no need for additional toast here
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

  // Format balances - Native CORE uses 18 decimals
  const coreBalanceFormatted = coreBalanceData ? formatEther(coreBalanceData as bigint) : '0'
  const btcBalanceFormatted = btcBalanceData ? (Number(btcBalanceData as bigint) / 10**8).toFixed(8) : '0'
  
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
          isAwaitingBtcApproval={approveBtcSuccess}
          handleDualStake={handleDualStake}
          isStaking={isDualStaking}
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
      </div>
    </div>
  )
}