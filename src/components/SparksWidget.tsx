import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { useState, useEffect } from 'react'
import { Zap, Star, TrendingUp, Gift, Crown, Award } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { SPARKS_MANAGER_ABI } from '../config/abis'
import { CONTRACT_ADDRESSES } from '../config/contracts'

interface SparksInfo {
  balance: string
  totalEarned: string
  tier: number
  feeReduction: number
  nextTierThreshold: string
}

enum SparksTier {
  None = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4
}

const tierInfo = {
  [SparksTier.None]: {
    name: 'None',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: Award,
    threshold: '0',
    feeReduction: '0%',
    description: 'Start earning Sparks!'
  },
  [SparksTier.Bronze]: {
    name: 'Bronze',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: Award,
    threshold: '1,000',
    feeReduction: '5%',
    description: 'Bronze tier benefits'
  },
  [SparksTier.Silver]: {
    name: 'Silver',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: Star,
    threshold: '5,000',
    feeReduction: '10%',
    description: 'Silver tier benefits'
  },
  [SparksTier.Gold]: {
    name: 'Gold',
    color: 'text-secondary-foreground',
    bgColor: 'bg-secondary',
    icon: Star,
    threshold: '20,000',
    feeReduction: '25%',
    description: 'Gold tier benefits'
  },
  [SparksTier.Platinum]: {
    name: 'Platinum',
    color: 'text-accent-foreground',
    bgColor: 'bg-accent',
    icon: Crown,
    threshold: '100,000',
    feeReduction: '50%',
    description: 'Maximum tier benefits'
  }
}

interface SparksWidgetProps {
  showDetailed?: boolean
  className?: string
}

export function SparksWidget({ showDetailed = false, className = '' }: SparksWidgetProps) {
  const { address } = useAccount()
  const [sparksInfo, setSparksInfo] = useState<SparksInfo>({
    balance: '0',
    totalEarned: '0', 
    tier: SparksTier.None,
    feeReduction: 0,
    nextTierThreshold: '1000'
  })

  // Read user's Sparks info from contract (disabled during development)
  const { data: userSparksData, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.hardhat.SparksManager as `0x${string}`,
    abi: SPARKS_MANAGER_ABI,
    functionName: 'getUserSparksInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: false // Disable during development until contracts are deployed
    }
  })

  useEffect(() => {
    if (userSparksData) {
      const [balance, totalEarned, tier, feeReduction, nextTierThreshold] = userSparksData as [bigint, bigint, bigint, bigint, bigint]
      
      setSparksInfo({
        balance: formatEther(balance),
        totalEarned: formatEther(totalEarned),
        tier: Number(tier),
        feeReduction: Number(feeReduction),
        nextTierThreshold: formatEther(nextTierThreshold)
      })
    } else if (address) {
      // Mock data for development
      setSparksInfo({
        balance: '2500',
        totalEarned: '3200',
        tier: SparksTier.Silver,
        feeReduction: 10,
        nextTierThreshold: '5000'
      })
    }
  }, [userSparksData, address])

  const currentTier = tierInfo[sparksInfo.tier as SparksTier]
  const nextTier = sparksInfo.tier < SparksTier.Platinum ? tierInfo[(sparksInfo.tier + 1) as SparksTier] : null
  
  const progress = nextTier && Number(sparksInfo.nextTierThreshold) > 0
    ? Math.min(100, (Number(sparksInfo.balance) / Number(sparksInfo.nextTierThreshold)) * 100)
    : 100

  if (!address) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            Sparks Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Connect wallet to view Sparks</p>
        </CardContent>
      </Card>
    )
  }

  if (showDetailed) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Sparks Rewards System
          </CardTitle>
          <CardDescription>
            Earn Sparks points for engaging with StakeBasket and unlock exclusive benefits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Current Balance</span>
              </div>
              <div className="text-2xl font-bold">
                {Number(sparksInfo.balance).toLocaleString()} ⚡
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Total Earned</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {Number(sparksInfo.totalEarned).toLocaleString()} ⚡
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <currentTier.icon className={`h-4 w-4 ${currentTier.color}`} />
                <span className="text-sm font-medium">Current Tier</span>
              </div>
              <div className={`text-2xl font-bold ${currentTier.color}`}>
                {currentTier.name}
              </div>
            </div>
          </div>

          {/* Tier Progress */}
          {nextTier && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress to {nextTier.name}</span>
                <span className="text-sm text-muted-foreground">
                  {Number(sparksInfo.balance).toLocaleString()} / {Number(sparksInfo.nextTierThreshold).toLocaleString()} ⚡
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {(Number(sparksInfo.nextTierThreshold) - Number(sparksInfo.balance)).toLocaleString()} more Sparks needed
              </div>
            </div>
          )}

          {/* Current Benefits */}
          <div className="space-y-3">
            <h4 className="font-medium">Current Benefits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <Gift className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm font-medium">Fee Reduction</div>
                  <div className="text-xs text-muted-foreground">{sparksInfo.feeReduction}% off management fees</div>
                </div>
              </div>
              
              {sparksInfo.tier >= SparksTier.Silver && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Star className="h-4 w-4 text-secondary-foreground" />
                  <div>
                    <div className="text-sm font-medium">Priority Support</div>
                    <div className="text-xs text-muted-foreground">Faster response times</div>
                  </div>
                </div>
              )}
              
              {sparksInfo.tier >= SparksTier.Gold && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Crown className="h-4 w-4 text-accent-foreground" />
                  <div>
                    <div className="text-sm font-medium">Exclusive Features</div>
                    <div className="text-xs text-muted-foreground">Early access to new strategies</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tier Overview */}
          <div className="space-y-3">
            <h4 className="font-medium">All Tiers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(tierInfo).slice(1).map(([tierKey, info]) => {
                const tier = Number(tierKey) as SparksTier
                const isCurrentTier = tier === sparksInfo.tier
                const isAchieved = tier <= sparksInfo.tier
                
                return (
                  <div 
                    key={tierKey}
                    className={`p-3 rounded-lg border-2 ${
                      isCurrentTier 
                        ? 'border-primary bg-primary/10' 
                        : isAchieved
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <info.icon className={`h-4 w-4 ${info.color}`} />
                      <span className={`font-medium ${info.color}`}>{info.name}</span>
                      {isCurrentTier && <Badge variant="default" className="text-xs">Current</Badge>}
                      {isAchieved && !isCurrentTier && <Badge variant="secondary" className="text-xs">✓</Badge>}
                    </div>
                    <div className="text-xs space-y-1">
                      <div>Threshold: {info.threshold} ⚡</div>
                      <div>Fee Reduction: {info.feeReduction}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Button onClick={() => refetch()} variant="outline" className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            Refresh Sparks
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Compact widget
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Sparks Points
          </div>
          <Badge className={`${currentTier.bgColor} ${currentTier.color} border-current`}>
            {currentTier.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Balance</span>
          <span className="font-bold">{Number(sparksInfo.balance).toLocaleString()} ⚡</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Fee Reduction</span>
          <span className="font-medium text-primary">{sparksInfo.feeReduction}%</span>
        </div>
        
        {nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Progress to {nextTier.name}</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}