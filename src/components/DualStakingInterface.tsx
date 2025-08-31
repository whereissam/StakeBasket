import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useState, useEffect, useMemo } from 'react'
import * as React from 'react'
import { AlertTriangle, Award, Target } from 'lucide-react'
import { useAccount, useReadContract, useBalance } from 'wagmi'
import { formatEther, erc20Abi } from 'viem'
import { useDualStakingTransactions } from '../hooks/useDualStakingTransactions'
import { useRealPriceData } from '../hooks/useRealPriceData'
import { useDualStakingTiers } from '../hooks/useDualStakingTiers'
import { useDualStakingValidation } from '../hooks/useDualStakingValidation'
import { BalanceCard } from './shared/BalanceCard'
import { TierDisplay } from './shared/TierDisplay'
import { ContractInformation } from './shared/ContractInformation'
import { PriceDataIndicator } from './shared/PriceDataIndicator'
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
import { getTokenSymbol } from '../utils/networkHandler'
import { DualTier, DualStakeInfo } from '../types/staking'
import { TIER_INFO, MIN_DEPOSIT_REQUIREMENTS } from '../config/dualStakingTiers'

export const DualStakingInterface = React.memo(() => {
  const { address } = useAccount()
  const { chainId: storeChainId } = useNetworkStore()
  const { chainId } = useContracts()
  
  const currentChainId = chainId || storeChainId || 31337
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsDataLoaded(true), 1500)
    return () => clearTimeout(timer)
  }, [])
  
  const tokenSymbol = getTokenSymbol(currentChainId)
  const { logTransactionStart, logTransactionSuccess, logTransactionError, logContractCall, logWalletError } = useWalletLogger()
  
  const {
    depositDualStake, approveBtcTokens, isDualStaking, isApprovingCore, isApprovingBtc,
    approveCoreSuccess, approveBtcSuccess, dualStakeSuccess
  } = useDualStakingTransactions()
  
  const priceData = useRealPriceData(isDataLoaded)
  
  const { contracts } = getNetworkByChainId(currentChainId)
  const stakingContractAddress = contracts.DualStakingBasket
  const btcTokenAddress = currentChainId === 1114 
    ? (contracts as any).SimpleBTCFaucet || contracts.MockCoreBTC 
    : contracts.MockCoreBTC
  
  const [stakeInfo] = useState<DualStakeInfo>({
    coreStaked: '0', btcStaked: '0', shares: '0', rewards: '0',
    tier: DualTier.None, ratio: '0', apy: '0'
  })
  const [coreAmount, setCoreAmount] = useState('')
  const [btcAmount, setBtcAmount] = useState(MIN_DEPOSIT_REQUIREMENTS.BTC.toString())
  const [needsRebalancing] = useState(false)
  const [isAwaitingBtcApproval, setIsAwaitingBtcApproval] = useState(false)
  
  // Use custom hooks
  const { calculateTier, calculateRatioBonus, calculateTotalUSDValue, handleAutoCalculate: autoCalculate } = useDualStakingTiers(priceData)
  
  const { data: nativeCoreBalance, refetch: refetchCoreBalance } = useBalance({
    address: address as `0x${string}`,
    query: { enabled: !!address && isDataLoaded, staleTime: 30000, gcTime: 120000, refetchOnWindowFocus: false },
  })

  const { data: btcBalanceData, refetch: refetchBtcBalance } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!btcTokenAddress && isDataLoaded, staleTime: 30000, gcTime: 120000, refetchOnWindowFocus: false },
  })
  
  const { data: btcAllowance, refetch: refetchBtcAllowance } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
    query: { enabled: !!address && !!btcTokenAddress && !!stakingContractAddress, staleTime: 30000, gcTime: 120000, refetchOnWindowFocus: false }
  })

  const parsedBtcAmount = useMemo(() => {
    try {
      const val = parseFloat(btcAmount)
      if (isNaN(val)) return 0n
      return BigInt(Math.floor(val * 10**18))
    } catch {
      return 0n
    }
  }, [btcAmount])

  const needsBtcApprovalCheck = useMemo(() => {
    if (isAwaitingBtcApproval) return false
    if (!parsedBtcAmount || parsedBtcAmount === 0n) return false
    if (btcAllowance === undefined || btcAllowance === null) return true
    return (btcAllowance as bigint) < parsedBtcAmount
  }, [btcAllowance, parsedBtcAmount, isAwaitingBtcApproval])

  // Format balances
  const coreBalanceFormatted = nativeCoreBalance?.value ? formatEther(nativeCoreBalance.value as bigint) : '0'
  const btcBalanceFormatted = btcBalanceData ? formatEther(btcBalanceData as bigint) : '0'
  
  const { validateDeposit } = useDualStakingValidation(
    currentChainId, tokenSymbol, coreBalanceFormatted, btcBalanceFormatted, 
    calculateTotalUSDValue, logWalletError, priceData
  )

  useEffect(() => {
    if (approveBtcSuccess) {
      logTransactionSuccess('BTC Token Approval Success', '')
      toast.success('BTC tokens approved!')
      setIsAwaitingBtcApproval(false)
      refetchBtcAllowance()
    }
  }, [approveBtcSuccess, refetchBtcAllowance, logTransactionSuccess])

  useEffect(() => {
    if (dualStakeSuccess) {
      logTransactionSuccess('Dual Staking Deposit Success', '')
      refetchCoreBalance()
      refetchBtcBalance()
      setCoreAmount('')
      setBtcAmount(MIN_DEPOSIT_REQUIREMENTS.BTC.toString())
      toast.success('🎉 Dual staking deposit successful! Your balances have been updated.')
    }
  }, [dualStakeSuccess, refetchCoreBalance, refetchBtcBalance, logTransactionSuccess])

  const handleAutoCalculate = (targetTier: DualTier) => {
    autoCalculate(targetTier, setCoreAmount, setBtcAmount)
  }

  const handleApproveCORE = () => {
    console.log('CORE is native token - no approval required')
  }

  const handleApproveBTC = async () => {
    if (!btcAmount) return
    
    logTransactionStart('BTC Token Approval', { amount: btcAmount, token: 'BTC', spender: stakingContractAddress })
    logContractCall('MockCoreBTC', 'approve', { spender: stakingContractAddress, amount: parsedBtcAmount.toString() })
    
    try {
      await approveBtcTokens(btcAmount)
    } catch (error) {
      logTransactionError('BTC Token Approval', error, { amount: btcAmount, token: 'BTC', contract: stakingContractAddress })
    }
  }

  const handleDualStake = async () => {
    if (!validateDeposit(coreAmount, btcAmount, address, calculateTier)) return
    
    if (Number(btcAmount) > 0 && needsBtcApprovalCheck) {
      logWalletError('BTC Approval Required', { btcAmount: Number(btcAmount), allowance: btcAllowance?.toString() || '0' })
      toast.error('Please approve BTC tokens first')
      return
    }
    
    const useNativeCORE = currentChainId === 1114 || currentChainId === 1116
    const totalUSDValue = calculateTotalUSDValue(coreAmount, btcAmount)
    
    logTransactionStart('Dual Staking Deposit', { coreAmount, btcAmount, chainId: currentChainId, address, tier: calculateTier(coreAmount, btcAmount) })
    logContractCall('DualStakingBasket', 'depositDualStake', { coreAmount, btcAmount, useNativeCORE, chainId: currentChainId, tier: calculateTier(coreAmount, btcAmount), totalUSDValue })
    
    try {
      await depositDualStake(coreAmount, btcAmount, useNativeCORE)
    } catch (error) {
      logTransactionError('Dual Staking Deposit', error, { coreAmount, btcAmount, chainId: currentChainId, address, useNativeCORE })
    }
  }

  const handleUnstake = () => {
    toast.error('Unstaking not available - basic StakeBasket contract does not support unstaking')
  }

  const handleClaimRewards = () => {
    toast.error('Claim rewards not available - basic StakeBasket contract does not support reward claims')
  }


  const currentTierInfo = TIER_INFO[stakeInfo.tier as DualTier]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DualStakingHero />
      
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BalanceCard title="CORE Staked" value={Number(stakeInfo.coreStaked).toLocaleString()} subtitle="CORE tokens" icon={<Award className="h-4 w-4 text-chart-1" />} />
          <BalanceCard title="BTC Staked" value={Number(stakeInfo.btcStaked).toLocaleString()} subtitle="BTC tokens" icon={<Award className="h-4 w-4 text-chart-2" />} />
          <BalanceCard title="Current Tier" value={currentTierInfo.name} subtitle={`${currentTierInfo.apy} APY`} className={currentTierInfo.color} icon={<Award className="h-4 w-4 text-primary" />} />
          <BalanceCard title="Pending Rewards" value={Number(stakeInfo.rewards).toFixed(4)} subtitle="CORE rewards" icon={<Award className="h-4 w-4 text-chart-2" />} />
        </div>

        {/* Portfolio or Getting Started */}
        {Number(stakeInfo.coreStaked) > 0 || Number(stakeInfo.btcStaked) > 0 ? (
          <PortfolioDisplay stakeInfo={stakeInfo} tierInfo={TIER_INFO} currentTierInfo={currentTierInfo} calculateRatioBonus={calculateRatioBonus} />
        ) : (
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-chart-2/5 to-primary/5 border-2 border-dashed border-chart-2/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-chart-2">
                  <Target className="h-5 w-5" />
                  Ready to Join the Dual Staking Basket
                </CardTitle>
                <CardDescription>Your deposits will be automatically managed to achieve optimal tier performance</CardDescription>
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
              <p className="text-chart-1 text-sm">Your CORE:BTC ratio has drifted from optimal. Consider rebalancing to maintain your current tier status.</p>
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
          isNativeCORE={true}
          tierInfo={TIER_INFO}
          handleAutoCalculate={handleAutoCalculate}
          calculateTier={calculateTier}
          needsCoreApproval={false}
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

        {/* Your Basket Position */}
        {Number(stakeInfo.shares) > 0 && (
          <Card>
            <CardHeader><CardTitle>Your Basket Position</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Ratio</p>
                  <p className="text-lg font-mono">
                    {stakeInfo.btcStaked !== '0' ? (Number(stakeInfo.coreStaked) / Number(stakeInfo.btcStaked)).toFixed(0) : '0'}:1
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shares Owned</p>
                  <p className="text-lg">{Number(stakeInfo.shares).toFixed(4)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Button onClick={handleUnstake} disabled={Number(stakeInfo.shares) <= 0} variant="outline" className="w-full">Withdraw from Basket</Button>
                <Button onClick={handleClaimRewards} disabled={Number(stakeInfo.rewards) <= 0} className="w-full">Claim Rewards</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <TierDisplay tiers={TIER_INFO} currentTier={stakeInfo.tier as DualTier} />
        <SafetyNotice />
        
        <PriceDataIndicator priceData={priceData} />

        <ContractInformation chainId={currentChainId} />
      </div>
    </div>
  )
})