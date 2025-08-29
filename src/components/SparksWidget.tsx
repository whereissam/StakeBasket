import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Zap, Star, TrendingUp, Gift, Crown, Award } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { useContracts } from '../hooks/useContracts'
import { useSparksTransactions } from '../hooks/useSparksTransactions'
import { useWalletLogger } from '../hooks/useWalletLogger'
import { useState } from 'react'
import { Input } from './ui/input'

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
    bgColor: 'bg-muted/20',
    icon: Award,
    threshold: '0',
    feeReduction: '0%',
    description: 'Start earning Sparks!'
  },
  [SparksTier.Bronze]: {
    name: 'Bronze',
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/20',
    icon: Award,
    threshold: '1,000',
    feeReduction: '5%',
    description: 'Bronze tier benefits'
  },
  [SparksTier.Silver]: {
    name: 'Silver',
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/20',
    icon: Star,
    threshold: '5,000',
    feeReduction: '10%',
    description: 'Silver tier benefits'
  },
  [SparksTier.Gold]: {
    name: 'Gold',
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/20',
    icon: Star,
    threshold: '20,000',
    feeReduction: '25%',
    description: 'Gold tier benefits'
  },
  [SparksTier.Platinum]: {
    name: 'Platinum',
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/20',
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
  const { contracts, network } = useContracts()
  
  // Enhanced wallet logging
  const {
    logTransactionStart,
    logTransactionSuccess,
    logTransactionError,
    logContractCall,
    logWalletError
  } = useWalletLogger()
  
  // Use unified Sparks transaction system
  const {
    redeemSparksPoints,
    claimSparksRewards,
    isRedeeming,
    isClaiming
  } = useSparksTransactions()
  
  // Local state for transaction forms
  const [showRedeemForm, setShowRedeemForm] = useState(false)
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemReason, setRedeemReason] = useState('')
  
  // Sparks Manager ABI
  const sparksManagerABI = [
    {
      inputs: [{ internalType: "address", name: "user", type: "address" }],
      name: "getUserSparksInfo",
      outputs: [
        { internalType: "uint256", name: "balance", type: "uint256" },
        { internalType: "uint256", name: "totalEarned", type: "uint256" },
        { internalType: "uint8", name: "tier", type: "uint8" },
        { internalType: "uint8", name: "feeReduction", type: "uint8" },
        { internalType: "uint256", name: "nextTierThreshold", type: "uint256" }
      ],
      stateMutability: "view",
      type: "function"
    }
  ] as const

  // Read user's Sparks info from contract
  const { data: userSparksData, refetch } = useReadContract({
    address: contracts?.SparksManager as `0x${string}`,
    abi: sparksManagerABI,
    functionName: 'getUserSparksInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts?.SparksManager && contracts.SparksManager !== '0x0000000000000000000000000000000000000000'
    }
  })

  // Convert contract data to display format
  const sparksInfo: SparksInfo = userSparksData ? {
    balance: formatEther(userSparksData[0]),
    totalEarned: formatEther(userSparksData[1]),
    tier: Number(userSparksData[2]),
    feeReduction: Number(userSparksData[3]),
    nextTierThreshold: formatEther(userSparksData[4])
  } : {
    balance: '0',
    totalEarned: '0',
    tier: SparksTier.None,
    feeReduction: 0,
    nextTierThreshold: '1000'
  }

  const currentTier = tierInfo[sparksInfo.tier as SparksTier]
  const nextTier = sparksInfo.tier < SparksTier.Platinum ? tierInfo[(sparksInfo.tier + 1) as SparksTier] : null
  
  const progress = nextTier && Number(sparksInfo.nextTierThreshold) > 0
    ? Math.min(100, (Number(sparksInfo.balance) / Number(sparksInfo.nextTierThreshold)) * 100)
    : 100
  
  // Transaction handlers
  const handleRedeemSparks = async () => {
    if (!redeemAmount || !redeemReason) {
      logWalletError('Invalid Sparks Redeem Data', {
        hasAmount: !!redeemAmount,
        hasReason: !!redeemReason,
        amount: redeemAmount,
        reason: redeemReason
      })
      return
    }
    
    logTransactionStart('Redeem Sparks Points', {
      amount: redeemAmount,
      reason: redeemReason,
      currentBalance: sparksInfo.balance,
      address
    })
    
    try {
      logContractCall('SparksManager', 'redeemSparks', {
        amount: redeemAmount,
        reason: redeemReason
      })
      
      await redeemSparksPoints(redeemAmount, redeemReason)
      
      logTransactionSuccess('Sparks Redeemed Successfully', '')
      
      setRedeemAmount('')
      setRedeemReason('')
      setShowRedeemForm(false)
    } catch (error) {
      logTransactionError('Redeem Sparks Points', error, {
        amount: redeemAmount,
        reason: redeemReason,
        currentBalance: sparksInfo.balance
      })
    }
  }
  
  const handleClaimRewards = async () => {
    if (!address) {
      logWalletError('Wallet Not Connected', {
        action: 'claimSparksRewards'
      })
      return
    }
    
    logTransactionStart('Claim Sparks Rewards', {
      address,
      currentBalance: sparksInfo.balance,
      currentTier: currentTier.name
    })
    
    try {
      logContractCall('SparksManager', 'claimRewards', {
        user: address
      })
      
      await claimSparksRewards()
      
      logTransactionSuccess('Sparks Rewards Claimed', '')
    } catch (error) {
      logTransactionError('Claim Sparks Rewards', error, {
        address,
        currentBalance: sparksInfo.balance,
        currentTier: currentTier.name
      })
    }
  }

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
            <Zap className="h-5 w-5 text-chart-1" />
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
                <TrendingUp className="h-4 w-4 text-chart-2" />
                <span className="text-sm font-medium">Total Earned</span>
              </div>
              <div className="text-2xl font-bold text-chart-2">
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
              <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                <Gift className="h-4 w-4 text-chart-1" />
                <div>
                  <div className="text-sm font-medium">Fee Reduction</div>
                  <div className="text-xs text-muted-foreground">{sparksInfo.feeReduction}% off management fees</div>
                </div>
              </div>
              
              {sparksInfo.tier >= SparksTier.Silver && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                  <Star className="h-4 w-4 text-chart-2" />
                  <div>
                    <div className="text-sm font-medium">Priority Support</div>
                    <div className="text-xs text-muted-foreground">Faster response times</div>
                  </div>
                </div>
              )}
              
              {sparksInfo.tier >= SparksTier.Gold && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                  <Crown className="h-4 w-4 text-chart-1" />
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
                        ? 'border-chart-2 bg-chart-2/10'
                        : 'border-border bg-card'
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

          {/* Sparks Actions */}
          {contracts?.SparksManager && contracts.SparksManager !== '0x0000000000000000000000000000000000000000' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={handleClaimRewards} 
                  disabled={isClaiming || Number(sparksInfo.balance) === 0}
                  className="flex-1"
                >
                  {isClaiming ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      Claiming...
                    </div>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Claim Rewards
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setShowRedeemForm(!showRedeemForm)}
                  variant="outline"
                  disabled={Number(sparksInfo.balance) === 0}
                  className="flex-1"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Redeem Sparks
                </Button>
              </div>
              
              {/* Redeem Form */}
              {showRedeemForm && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Redeem Sparks Points</CardTitle>
                    <CardDescription className="text-xs">
                      Use your Sparks to get benefits or rewards
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">Amount</label>
                      <Input
                        type="number"
                        value={redeemAmount}
                        onChange={(e) => setRedeemAmount(e.target.value)}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Reason</label>
                      <select
                        value={redeemReason}
                        onChange={(e) => setRedeemReason(e.target.value)}
                        className="w-full p-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select reason</option>
                        <option value="FEE_REDUCTION">Fee Reduction</option>
                        <option value="EXCLUSIVE_ACCESS">Exclusive Access</option>
                        <option value="PRIORITY_SUPPORT">Priority Support</option>
                        <option value="CUSTOM_REWARD">Custom Reward</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleRedeemSparks}
                        disabled={isRedeeming || !redeemAmount || !redeemReason}
                        size="sm"
                        className="flex-1"
                      >
                        {isRedeeming ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                            Redeeming...
                          </div>
                        ) : (
                          'Redeem'
                        )}
                      </Button>
                      <Button 
                        onClick={() => setShowRedeemForm(false)}
                        variant="outline" 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Button onClick={() => refetch()} variant="outline" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Refresh Sparks
              </Button>
            </div>
          ) : (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Sparks Manager not deployed on {network} network
              </p>
            </div>
          )}
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
          <span className="font-medium text-chart-1">{sparksInfo.feeReduction}%</span>
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