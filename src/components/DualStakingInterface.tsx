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


interface DualStakeInfo {
  coreStaked: string
  btcStaked: string
  shares: string
  rewards: string
  tier: number
  ratio: string
  apy: string
}

enum DualTier {
  None = -1,
  Base = 0,
  Boost = 1,
  Super = 2,
  Satoshi = 3
}

interface TierInfo {
  name: string
  ratio: string
  apy: string
  color: string
  bgColor: string
  description: string
}

const TIER_RATIOS: Record<DualTier, number> = {
  [DualTier.None]: 0,
  [DualTier.Base]: 0,
  [DualTier.Boost]: 2000,
  [DualTier.Super]: 6000,
  [DualTier.Satoshi]: 16000
}

const TIER_INFO: Record<DualTier, TierInfo> = {
  [DualTier.None]: {
    name: 'Not Staking',
    ratio: '0:0',
    apy: '0%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    description: 'No active stakes - Start staking to earn rewards'
  },
  [DualTier.Base]: {
    name: 'Base Tier',
    ratio: 'Any + 0.0005 BTC min',
    apy: '8%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Entry level - Minimal BTC commitment required'
  },
  [DualTier.Boost]: {
    name: 'Boost Tier',
    ratio: '2,000:1 + 0.002 BTC min',
    apy: '12%',
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/10',
    description: 'Enhanced rewards - Meaningful BTC stake required'
  },
  [DualTier.Super]: {
    name: 'Super Tier',
    ratio: '6,000:1 + 0.005 BTC min',
    apy: '16%',
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    description: 'Premium yields - Substantial BTC commitment needed'
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi Tier',
    ratio: '16,000:1 + 0.01 BTC min',
    apy: '20%',
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    description: 'Maximum rewards - Significant BTC holdings required'
  }
}

// Minimum deposit requirements
const MIN_DEPOSIT_REQUIREMENTS = {
  CORE: 0.1,     // Minimum 0.1 CORE/ETH
  BTC: 0.0001    // Minimum 0.0001 BTC
}

// Tier minimum requirements
const TIER_MIN_BTC: Record<DualTier, number> = {
  [DualTier.None]: 0,         // Not used for None tier
  [DualTier.Base]: 0.0005,    // 0.0005 BTC minimum
  [DualTier.Boost]: 0.002,    // 0.002 BTC minimum  
  [DualTier.Super]: 0.005,    // 0.005 BTC minimum
  [DualTier.Satoshi]: 0.01    // 0.01 BTC minimum
}

const TIER_MIN_VALUES: Record<DualTier, number> = {
  [DualTier.None]: 0,      // Not used for None tier
  [DualTier.Base]: 1,      // 1 CORE total value
  [DualTier.Boost]: 20,    // 20 CORE total value  
  [DualTier.Super]: 50,    // 50 CORE total value
  [DualTier.Satoshi]: 100  // 100 CORE total value
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

  const calculateTier = (core: string, btc: string): DualTier => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    // Base minimum deposit requirements from constants
    if (btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC || coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE) return DualTier.None
    if (btcNum === 0 || coreNum === 0) return DualTier.None
    
    // Calculate total value (using CORE as base unit)
    const totalCoreValue = coreNum + (btcNum * 50000) // Approximate BTC:CORE price ratio
    const tokenRatio = coreNum / btcNum
    
    // Enhanced tier requirements: BOTH ratio AND minimum amounts for EACH token
    if (tokenRatio >= 16000 && totalCoreValue >= 100 && btcNum >= 0.01) {
      return DualTier.Satoshi
    } else if (tokenRatio >= 6000 && totalCoreValue >= 50 && btcNum >= 0.005) {
      return DualTier.Super
    } else if (tokenRatio >= 2000 && totalCoreValue >= 20 && btcNum >= 0.002) {
      return DualTier.Boost
    } else if (totalCoreValue >= 1 && btcNum >= 0.0005) {
      return DualTier.Base
    }
    
    return DualTier.None
  }

  const handleAutoCalculate = (targetTier: DualTier) => {
    const requiredRatio = TIER_RATIOS[targetTier]
    
    // Define minimum BTC amounts for each tier
    const minBTC = TIER_MIN_BTC[targetTier] || 0.0005
    const minTotalValue = TIER_MIN_VALUES[targetTier] || 1
    
    let btcAmount: number
    let coreAmount: number
    
    // Base tier: Any ratio is acceptable, just meet minimums
    if (targetTier === DualTier.Base) {
      btcAmount = minBTC  // Use minimum BTC for tier
      coreAmount = 1      // 1 CORE meets minimum total value
    } else {
      // For higher tiers, use the minimum BTC required for the tier
      btcAmount = minBTC
      
      // Calculate CORE needed for the ratio requirement
      const coreForRatio = btcAmount * requiredRatio
      
      // Calculate CORE needed for total value requirement (accounting for BTC contribution)
      const btcValueInCore = btcAmount * 50000
      const coreForTotalValue = Math.max(0, minTotalValue - btcValueInCore)
      
      // Use whichever CORE amount is higher
      coreAmount = Math.max(coreForRatio, coreForTotalValue)
    }
    
    setBtcAmount(btcAmount.toString())
    setCoreAmount(coreAmount.toString())
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
    
    // Check minimums only if the asset is being deposited
    if (coreNum > 0 && coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE) {
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.CORE} ${tokenSymbol} required`)
      return
    }
    
    if (btcNum > 0 && btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC) {
      toast.error(`Minimum ${MIN_DEPOSIT_REQUIREMENTS.BTC} BTC required`)  
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
        <Card className="bg-card border-border shadow-md border-destructive">
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