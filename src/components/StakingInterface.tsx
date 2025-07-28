import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect } from 'react'
import { Coins, TrendingUp, Award, Gift, Lock, Unlock, DollarSign } from 'lucide-react'
import { useAccount } from 'wagmi'

interface StakeInfo {
  amount: string
  pendingRewards: string
  lastClaimTime: number
  tier: number
}

enum Tier {
  None,
  Bronze,
  Silver,
  Gold,
  Platinum
}

interface TierInfo {
  name: string
  threshold: string
  multiplier: string
  benefits: string[]
  color: string
  bgColor: string
}

export function StakingInterface() {
  const { address } = useAccount()
  
  const [basketBalance, setBasketBalance] = useState('0')
  const [stakeInfo, setStakeInfo] = useState<StakeInfo>({
    amount: '0',
    pendingRewards: '0',
    lastClaimTime: 0,
    tier: Tier.None
  })
  
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [isStaking, setIsStaking] = useState(false)
  const [isUnstaking, setIsUnstaking] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  
  const tierInfo: Record<Tier, TierInfo> = {
    [Tier.None]: {
      name: 'No Tier',
      threshold: '0',
      multiplier: '1x',
      benefits: ['No special benefits'],
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    [Tier.Bronze]: {
      name: 'Bronze',
      threshold: '100',
      multiplier: '1x',
      benefits: ['5% fee reduction', 'Basic support'],
      color: 'text-amber-700',
      bgColor: 'bg-amber-100'
    },
    [Tier.Silver]: {
      name: 'Silver', 
      threshold: '1,000',
      multiplier: '1.1x',
      benefits: ['10% fee reduction', '1.1x voting power', 'Priority support'],
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    [Tier.Gold]: {
      name: 'Gold',
      threshold: '10,000', 
      multiplier: '1.25x',
      benefits: ['25% fee reduction', '1.25x voting power', 'Early access to strategies'],
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    [Tier.Platinum]: {
      name: 'Platinum',
      threshold: '100,000',
      multiplier: '1.5x',
      benefits: ['50% fee reduction', '1.5x voting power', 'Exclusive strategies', 'Premium support'],
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  }

  const getTierProgress = (currentAmount: number, currentTier: Tier) => {
    const tiers = [
      { tier: Tier.Bronze, threshold: 100 },
      { tier: Tier.Silver, threshold: 1000 },
      { tier: Tier.Gold, threshold: 10000 },
      { tier: Tier.Platinum, threshold: 100000 }
    ]
    
    if (currentTier === Tier.Platinum) {
      return { progress: 100, nextTier: null, nextThreshold: 0 }
    }
    
    const nextTierInfo = tiers.find(t => t.tier > currentTier)
    if (!nextTierInfo) {
      return { progress: 100, nextTier: null, nextThreshold: 0 }
    }
    
    const prevThreshold = currentTier === Tier.None ? 0 : 
      tiers.find(t => t.tier === currentTier)?.threshold || 0
    
    const progress = ((currentAmount - prevThreshold) / (nextTierInfo.threshold - prevThreshold)) * 100
    
    return {
      progress: Math.min(100, Math.max(0, progress)),
      nextTier: nextTierInfo.tier,
      nextThreshold: nextTierInfo.threshold
    }
  }

  const handleStake = async () => {
    if (!address || !stakeAmount) return
    
    setIsStaking(true)
    try {
      // TODO: Integrate with wagmi/viem to call staking contract
      console.log(`Staking ${stakeAmount} BASKET tokens`)
      
      // Simulate staking transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update state (in real implementation, this would come from contract events)
      const newAmount = Number(stakeInfo.amount) + Number(stakeAmount)
      setStakeInfo(prev => ({
        ...prev,
        amount: newAmount.toString()
      }))
      
      setStakeAmount('')
    } catch (error) {
      console.error('Staking failed:', error)
    } finally {
      setIsStaking(false)
    }
  }

  const handleUnstake = async () => {
    if (!address || !unstakeAmount) return
    
    setIsUnstaking(true)
    try {
      // TODO: Integrate with wagmi/viem to call staking contract
      console.log(`Unstaking ${unstakeAmount} BASKET tokens`)
      
      // Simulate unstaking transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update state
      const newAmount = Math.max(0, Number(stakeInfo.amount) - Number(unstakeAmount))
      setStakeInfo(prev => ({
        ...prev,
        amount: newAmount.toString()
      }))
      
      setUnstakeAmount('')
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
      // TODO: Integrate with wagmi/viem to call staking contract
      console.log(`Claiming ${stakeInfo.pendingRewards} ETH rewards`)
      
      // Simulate claiming transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update state
      setStakeInfo(prev => ({
        ...prev,
        pendingRewards: '0',
        lastClaimTime: Date.now()
      }))
    } catch (error) {
      console.error('Claiming failed:', error)
    } finally {
      setIsClaiming(false)
    }
  }

  // Mock data for demonstration
  useEffect(() => {
    if (address) {
      setBasketBalance('25000') // Mock balance
      setStakeInfo({
        amount: '15000', // Mock staked amount
        pendingRewards: '0.125', // Mock pending rewards in ETH
        lastClaimTime: Date.now() - 86400000, // 1 day ago
        tier: Tier.Gold // Mock tier
      })
    }
  }, [address])

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            BASKET Staking
          </CardTitle>
          <CardDescription>
            Connect your wallet to stake BASKET tokens and earn protocol fees
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const currentTierInfo = tierInfo[stakeInfo.tier]
  const tierProgress = getTierProgress(Number(stakeInfo.amount), stakeInfo.tier)
  const nextTierInfo = tierProgress.nextTier ? tierInfo[tierProgress.nextTier] : null

  return (
    <div className="space-y-6">
      {/* Staking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Staked Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(stakeInfo.amount).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">BASKET tokens</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pending Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(stakeInfo.pendingRewards).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">ETH</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Current Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentTierInfo.color}`}>
              {currentTierInfo.name}
            </div>
            <p className="text-xs text-muted-foreground">{currentTierInfo.multiplier} rewards</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(basketBalance).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">BASKET tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      {nextTierInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tier Progress</CardTitle>
            <CardDescription>
              Progress towards {nextTierInfo.name} tier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>{currentTierInfo.name}</span>
              <span>{nextTierInfo.name}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${tierProgress.progress}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {tierProgress.nextThreshold - Number(stakeInfo.amount)} more BASKET tokens needed
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Tier Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Your Benefits ({currentTierInfo.name})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentTierInfo.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${currentTierInfo.bgColor}`} />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Staking Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stake */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Stake BASKET
            </CardTitle>
            <CardDescription>
              Stake your BASKET tokens to earn protocol fees and tier benefits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount to Stake</label>
              <Input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="0.00"
                max={basketBalance}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Available: {Number(basketBalance).toLocaleString()} BASKET</span>
                <button 
                  onClick={() => setStakeAmount(basketBalance)}
                  className="text-blue-600 hover:underline"
                >
                  Max
                </button>
              </div>
            </div>
            <Button 
              onClick={handleStake}
              disabled={isStaking || !stakeAmount || Number(stakeAmount) <= 0}
              className="w-full"
            >
              {isStaking ? 'Staking...' : 'Stake BASKET'}
            </Button>
          </CardContent>
        </Card>

        {/* Unstake */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Unstake BASKET
            </CardTitle>
            <CardDescription>
              Unstake your BASKET tokens (may lose tier benefits)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount to Unstake</label>
              <Input
                type="number"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                placeholder="0.00"
                max={stakeInfo.amount}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Staked: {Number(stakeInfo.amount).toLocaleString()} BASKET</span>
                <button 
                  onClick={() => setUnstakeAmount(stakeInfo.amount)}
                  className="text-blue-600 hover:underline"
                >
                  Max
                </button>
              </div>
            </div>
            <Button 
              onClick={handleUnstake}
              disabled={isUnstaking || !unstakeAmount || Number(unstakeAmount) <= 0}
              variant="outline"
              className="w-full"
            >
              {isUnstaking ? 'Unstaking...' : 'Unstake BASKET'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Claim Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Claim Rewards
          </CardTitle>
          <CardDescription>
            Claim your accumulated protocol fee rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{Number(stakeInfo.pendingRewards).toFixed(6)} ETH</div>
              <p className="text-sm text-muted-foreground">
                Last claimed: {stakeInfo.lastClaimTime ? 
                  new Date(stakeInfo.lastClaimTime).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <Button 
              onClick={handleClaimRewards}
              disabled={isClaiming || Number(stakeInfo.pendingRewards) <= 0}
            >
              {isClaiming ? 'Claiming...' : 'Claim Rewards'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Tier Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tier System</CardTitle>
          <CardDescription>
            Stake more BASKET tokens to unlock higher tiers and better benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tierInfo).slice(1).map(([tierKey, info]) => (
              <div 
                key={tierKey}
                className={`p-4 rounded-lg border-2 ${
                  Number(tierKey) === stakeInfo.tier ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className={`font-semibold ${info.color} mb-2`}>
                  {info.name}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Threshold: {info.threshold} BASKET
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Multiplier: {info.multiplier}
                </div>
                <div className="space-y-1">
                  {info.benefits.map((benefit, index) => (
                    <div key={index} className="text-xs flex items-center gap-1">
                      <div className={`w-1 h-1 rounded-full ${info.bgColor}`} />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}