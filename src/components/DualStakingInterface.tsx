import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect } from 'react'
import { Coins, TrendingUp, Award, ArrowLeftRight, AlertTriangle } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { MOCK_DUAL_STAKING_ABI, MOCK_CORE_ABI } from '../config/abis'
import { CONTRACT_ADDRESSES } from '../config/contracts'

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

const TIER_RATIOS = {
  [DualTier.Base]: 0,
  [DualTier.Boost]: 2000,
  [DualTier.Super]: 6000,
  [DualTier.Satoshi]: 16000
}

const tierInfo: Record<DualTier, TierInfo> = {
  [DualTier.Base]: {
    name: 'Base',
    ratio: '0:1',
    apy: '8%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'BTC only staking'
  },
  [DualTier.Boost]: {
    name: 'Boost',
    ratio: '2,000:1',
    apy: '12%',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    description: '2,000 CORE per 1 BTC'
  },
  [DualTier.Super]: {
    name: 'Super',
    ratio: '6,000:1',
    apy: '16%',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
    description: '6,000 CORE per 1 BTC'
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi',
    ratio: '16,000:1',
    apy: '20%',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    description: '16,000 CORE per 1 BTC (Highest yield)'
  }
}

export function DualStakingInterface() {
  const { address } = useAccount()
  
  const [coreBalance, setCoreBalance] = useState('0')
  const [btcBalance, setBtcBalance] = useState('0')
  const [stakeInfo, setStakeInfo] = useState<DualStakeInfo>({
    coreStaked: '0',
    btcStaked: '0',
    shares: '0',
    rewards: '0',
    tier: DualTier.Base,
    ratio: '0',
    apy: '8'
  })
  
  const [coreAmount, setCoreAmount] = useState('')
  const [btcAmount, setBtcAmount] = useState('')
  const [isStaking, setIsStaking] = useState(false)
  const [isUnstaking, setIsUnstaking] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [needsRebalancing] = useState(false)

  // Contract reads
  const { data: userStakeInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.hardhat.MockDualStaking as `0x${string}`,
    abi: MOCK_DUAL_STAKING_ABI,
    functionName: 'getUserStakeInfo',
    args: address ? [address] : undefined,
  })

  const { data: tierStatus } = useReadContract({
    address: CONTRACT_ADDRESSES.hardhat.MockDualStaking as `0x${string}`,
    abi: MOCK_DUAL_STAKING_ABI,
    functionName: 'getTierStatus',
    args: address ? [address] : undefined,
  })

  const { data: coreBalanceData } = useReadContract({
    address: CONTRACT_ADDRESSES.hardhat.MockCORE as `0x${string}`,
    abi: MOCK_CORE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: btcBalanceData } = useReadContract({
    address: CONTRACT_ADDRESSES.hardhat.MockCoreBTC as `0x${string}`,
    abi: MOCK_CORE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Contract writes
  const { writeContract: stakeDual, data: stakeHash } = useWriteContract()
  const { writeContract: unstakeDual, data: unstakeHash } = useWriteContract()
  const { writeContract: claimRewards, data: claimHash } = useWriteContract()

  const { isLoading: isStakeConfirming } = useWaitForTransactionReceipt({
    hash: stakeHash,
  })

  const { isLoading: isUnstakeConfirming } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  })

  const { isLoading: isClaimConfirming } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  useEffect(() => {
    if (coreBalanceData) {
      setCoreBalance(formatEther(coreBalanceData as bigint))
    }
    if (btcBalanceData) {
      setBtcBalance(formatEther(btcBalanceData as bigint))
    }
  }, [coreBalanceData, btcBalanceData])

  useEffect(() => {
    if (userStakeInfo && tierStatus) {
      const [coreStaked, btcStaked, shares, rewards] = userStakeInfo as [bigint, bigint, bigint, bigint, bigint]
      const [tier, , , ratio, , apy] = tierStatus as [number, bigint, bigint, bigint, bigint, bigint]
      
      setStakeInfo({
        coreStaked: formatEther(coreStaked),
        btcStaked: formatEther(btcStaked),
        shares: formatEther(shares),
        rewards: formatEther(rewards),
        tier,
        ratio: ratio.toString(),
        apy: apy.toString()
      })
    }
  }, [userStakeInfo, tierStatus])

  const calculateTier = (core: string, btc: string): DualTier => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    if (btcNum === 0) return DualTier.Base
    
    const ratio = coreNum / btcNum
    
    if (ratio >= 16000) return DualTier.Satoshi
    if (ratio >= 6000) return DualTier.Super
    if (ratio >= 2000) return DualTier.Boost
    return DualTier.Base
  }

  const getOptimalCoreAmount = (btc: string, targetTier: DualTier): string => {
    const btcNum = Number(btc) || 0
    const requiredRatio = TIER_RATIOS[targetTier]
    return (btcNum * requiredRatio).toString()
  }

  const handleAutoCalculate = (targetTier: DualTier) => {
    if (!btcAmount) return
    const optimalCore = getOptimalCoreAmount(btcAmount, targetTier)
    setCoreAmount(optimalCore)
  }

  const handleStake = async () => {
    if (!address || !coreAmount || !btcAmount) return
    
    setIsStaking(true)
    try {
      await stakeDual({
        address: CONTRACT_ADDRESSES.hardhat.MockDualStaking as `0x${string}`,
        abi: MOCK_DUAL_STAKING_ABI,
        functionName: 'stake',
        args: [parseEther(coreAmount), parseEther(btcAmount)],
      })
    } catch (error) {
      console.error('Staking failed:', error)
    } finally {
      setIsStaking(false)
    }
  }

  const handleUnstake = async () => {
    if (!address || !stakeInfo.shares) return
    
    setIsUnstaking(true)
    try {
      await unstakeDual({
        address: CONTRACT_ADDRESSES.hardhat.MockDualStaking as `0x${string}`,
        abi: MOCK_DUAL_STAKING_ABI,
        functionName: 'unstake',
        args: [parseEther(stakeInfo.shares)],
      })
    } catch (error) {
      console.error('Unstaking failed:', error)
    } finally {
      setIsUnstaking(false)
    }
  }

  const handleClaimRewards = async () => {
    if (!address) return
    
    setIsClaiming(true)
    try {
      await claimRewards({
        address: CONTRACT_ADDRESSES.hardhat.MockDualStaking as `0x${string}`,
        abi: MOCK_DUAL_STAKING_ABI,
        functionName: 'claimRewards',
      })
    } catch (error) {
      console.error('Claiming failed:', error)
    } finally {
      setIsClaiming(false)
    }
  }

  if (!address) {
    return (
      <div className="p-6 min-h-screen bg-background text-foreground">
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              CoreDAO Dual Staking
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your wallet to stake CORE and BTC tokens for optimized yields
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const currentTierInfo = tierInfo[stakeInfo.tier as DualTier]
  const proposedTier = calculateTier(coreAmount, btcAmount)
  const proposedTierInfo = tierInfo[proposedTier]

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background text-foreground">
      {/* Dual Staking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <Coins className="h-4 w-4 text-orange-500" />
              CORE Staked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {Number(stakeInfo.coreStaked).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">CORE tokens</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <Coins className="h-4 w-4 text-yellow-500" />
              BTC Staked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {Number(stakeInfo.btcStaked).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">BTC tokens</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <Award className="h-4 w-4 text-primary" />
              Current Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentTierInfo.color}`}>
              {currentTierInfo.name}
            </div>
            <p className="text-xs text-muted-foreground">{currentTierInfo.apy} APY</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Pending Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {Number(stakeInfo.rewards).toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">CORE rewards</p>
          </CardContent>
        </Card>
      </div>

      {/* Rebalancing Alert */}
      {needsRebalancing && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              Rebalancing Recommended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 dark:text-orange-300 text-sm">
              Your CORE:BTC ratio has drifted from optimal. Consider rebalancing to maintain your current tier status.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dual Asset Staking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Dual Asset Staking
          </CardTitle>
          <CardDescription>
            Stake CORE and BTC tokens together to achieve optimal tier ratios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CORE Input */}
            <div>
              <label className="text-sm font-medium">CORE Amount</label>
              <Input
                type="number"
                value={coreAmount}
                onChange={(e) => setCoreAmount(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Available: {Number(coreBalance).toLocaleString()} CORE</span>
                <button 
                  onClick={() => setCoreAmount(coreBalance)}
                  className="text-primary hover:underline"
                >
                  Max
                </button>
              </div>
            </div>

            {/* BTC Input */}
            <div>
              <label className="text-sm font-medium">BTC Amount</label>
              <Input
                type="number"
                value={btcAmount}
                onChange={(e) => setBtcAmount(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Available: {Number(btcBalance).toLocaleString()} BTC</span>
                <button 
                  onClick={() => setBtcAmount(btcBalance)}
                  className="text-primary hover:underline"
                >
                  Max
                </button>
              </div>
            </div>
          </div>

          {/* Tier Calculator */}
          {coreAmount && btcAmount && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Proposed Tier</p>
                  <p className={`text-lg font-bold ${proposedTierInfo.color}`}>
                    {proposedTierInfo.name} ({proposedTierInfo.apy} APY)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Ratio</p>
                  <p className="text-lg font-mono">
                    {Number(coreAmount) / Number(btcAmount) || 0}:1
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Tier Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Tier Selection</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(tierInfo).map(([tierKey, info]) => (
                <Button
                  key={tierKey}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoCalculate(Number(tierKey) as DualTier)}
                  disabled={!btcAmount}
                  className={`${info.color} border-current`}
                >
                  {info.name}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleStake}
            disabled={isStaking || isStakeConfirming || !coreAmount || !btcAmount}
            className="w-full"
          >
            {isStaking || isStakeConfirming ? 'Staking...' : 'Stake CORE + BTC'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Position */}
      {Number(stakeInfo.shares) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Position</CardTitle>
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
            
            <div className="flex gap-2">
              <Button 
                onClick={handleUnstake}
                disabled={isUnstaking || isUnstakeConfirming}
                variant="outline"
                className="flex-1"
              >
                {isUnstaking || isUnstakeConfirming ? 'Unstaking...' : 'Unstake All'}
              </Button>
              
              <Button 
                onClick={handleClaimRewards}
                disabled={isClaiming || isClaimConfirming || Number(stakeInfo.rewards) <= 0}
                className="flex-1"
              >
                {isClaiming || isClaimConfirming ? 'Claiming...' : 'Claim Rewards'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Information */}
      <Card>
        <CardHeader>
          <CardTitle>Dual Staking Tiers</CardTitle>
          <CardDescription>
            Higher tiers require specific CORE:BTC ratios but offer better APY
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tierInfo).map(([tierKey, info]) => (
              <div 
                key={tierKey}
                className={`p-4 rounded-lg border-2 bg-card ${
                  Number(tierKey) === stakeInfo.tier ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <div className={`font-semibold ${info.color} mb-2`}>
                  {info.name}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Ratio: {info.ratio}
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  APY: {info.apy}
                </div>
                <div className="text-xs text-muted-foreground">
                  {info.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}