import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect } from 'react'
import { Coins, TrendingUp, Award, Gift, Lock, Unlock, DollarSign } from 'lucide-react'
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useNetworkStore } from '../store/useNetworkStore'
import { getNetworkByChainId } from '../config/contracts'
import { parseEther, formatEther } from 'viem'

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
  const chainId = useChainId()
  const { chainId: storeChainId } = useNetworkStore()
  const currentChainId = chainId || storeChainId || 31337
  const { contracts } = getNetworkByChainId(currentChainId)
  
  const { writeContract, data: hash, isPending: isContractPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })
  
  // Contract ABIs
  const basketTokenABI = [
    {
      inputs: [{ internalType: "address", name: "owner", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ] as const
  
  const basketStakingABI = [
    {
      inputs: [{ internalType: "address", name: "user", type: "address" }],
      name: "getUserStakeInfo",
      outputs: [
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "uint256", name: "pendingRewards", type: "uint256" },
        { internalType: "uint256", name: "lastClaimTime", type: "uint256" },
        { internalType: "uint8", name: "tier", type: "uint8" }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "address", name: "user", type: "address" }],
      name: "getUserTier", 
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
      name: "stake",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
      name: "unstake",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "claimRewards",
      outputs: [],
      stateMutability: "nonpayable", 
      type: "function"
    }
  ] as const
  
  // Read BASKET token balance
  
  // Read staking info
  const { data: stakeInfoData, refetch: refetchStakeInfo } = useReadContract({
    address: contracts?.BasketStaking as `0x${string}`,
    abi: basketStakingABI,
    functionName: 'getUserStakeInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts?.BasketStaking
    }
  })
  
  // Calculate tier from staked amount
  const { data: userTier, refetch: refetchUserTier } = useReadContract({
    address: contracts?.BasketStaking as `0x${string}`,
    abi: basketStakingABI,
    functionName: 'getUserTier',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts?.BasketStaking
    }
  })
  
  // Read basket balance
  const { data: basketBalance, refetch: refetchBasketBalance } = useReadContract({
    address: contracts?.BasketToken as `0x${string}`,
    abi: basketTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts?.BasketToken
    }
  })

  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: contracts?.BasketToken as `0x${string}`,
    abi: [
      {
        inputs: [
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "address", name: "spender", type: "address" }
        ],
        name: "allowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
      }
    ] as const,
    functionName: 'allowance',
    args: address && contracts?.BasketStaking ? [address, contracts.BasketStaking as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!contracts?.BasketToken && !!contracts?.BasketStaking
    }
  })
  
  // Debug logging
  console.log('StakeInfoData:', stakeInfoData)
  console.log('UserTier:', userTier)
  console.log('BasketBalance:', basketBalance)
  console.log('CurrentAllowance:', currentAllowance)
  
  // Convert contract data to display format
  const basketBalanceFormatted = basketBalance ? (Number(basketBalance) / 1e18).toString() : '0'
  const stakeInfo: StakeInfo = {
    amount: stakeInfoData ? (Number(stakeInfoData[0]) / 1e18).toString() : '0',
    pendingRewards: stakeInfoData ? (Number(stakeInfoData[1]) / 1e18).toString() : '0',
    lastClaimTime: stakeInfoData ? Number(stakeInfoData[2]) * 1000 : 0, // Convert to milliseconds
    tier: userTier ? Number(userTier) : Tier.None
  }
  
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [needsApproval, setNeedsApproval] = useState(true)
  const [isApproving, setIsApproving] = useState(false)

  // Check if approval is needed when stake amount or allowance changes
  useEffect(() => {
    if (stakeAmount && currentAllowance !== undefined) {
      try {
        const stakeAmountBigInt = parseEther(stakeAmount)
        const allowanceBigInt = currentAllowance as bigint
        const approvalNeeded = stakeAmountBigInt > allowanceBigInt
        setNeedsApproval(approvalNeeded)
        console.log(`Approval needed: ${approvalNeeded} (stake: ${stakeAmount}, allowance: ${formatEther(allowanceBigInt)})`)
      } catch (error) {
        console.log('Error parsing stake amount:', error)
        setNeedsApproval(true)
      }
    } else {
      setNeedsApproval(true)
    }
  }, [stakeAmount, currentAllowance])
  
  const tierInfo: Record<Tier, TierInfo> = {
    [Tier.None]: {
      name: 'No Tier',
      threshold: '0',
      multiplier: '1x',
      benefits: ['No special benefits'],
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    },
    [Tier.Bronze]: {
      name: 'Bronze',
      threshold: '100',
      multiplier: '1x',
      benefits: ['5% fee reduction', 'Basic support'],
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/20'
    },
    [Tier.Silver]: {
      name: 'Silver', 
      threshold: '1,000',
      multiplier: '1.1x',
      benefits: ['10% fee reduction', '1.1x voting power', 'Priority support'],
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/20'
    },
    [Tier.Gold]: {
      name: 'Gold',
      threshold: '10,000', 
      multiplier: '1.25x',
      benefits: ['25% fee reduction', '1.25x voting power', 'Early access to strategies'],
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/20'
    },
    [Tier.Platinum]: {
      name: 'Platinum',
      threshold: '100,000',
      multiplier: '1.5x',
      benefits: ['50% fee reduction', '1.5x voting power', 'Exclusive strategies', 'Premium support'],
      color: 'text-chart-5',
      bgColor: 'bg-chart-5/20'
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

  const handleApprove = async () => {
    if (!address || !stakeAmount || !contracts?.BasketStaking || !contracts?.BasketToken) return
    
    try {
      console.log('Starting approval...')
      setIsApproving(true)
      writeContract({
        address: contracts.BasketToken as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "spender", type: "address" },
              { internalType: "uint256", name: "amount", type: "uint256" }
            ],
            name: "approve",
            outputs: [{ internalType: "bool", name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: 'approve',
        args: [contracts.BasketStaking as `0x${string}`, parseEther(stakeAmount)],
      })
    } catch (error) {
      console.error('Approval failed:', error)
      setIsApproving(false)
    }
  }

  const handleStake = async () => {
    if (!address || !stakeAmount || !contracts?.BasketStaking) return
    
    try {
      console.log('Starting stake...', {
        stakeAmount,
        contractAddress: contracts.BasketStaking,
        stakeAmountParsed: parseEther(stakeAmount).toString()
      })
      writeContract({
        address: contracts.BasketStaking as `0x${string}`,
        abi: basketStakingABI,
        functionName: 'stake',
        args: [parseEther(stakeAmount)],
      })
    } catch (error) {
      console.error('Staking failed:', error)
    }
  }

  const handleUnstake = async () => {
    if (!address || !unstakeAmount || !contracts?.BasketStaking) return
    
    try {
      // Call unstake function on contract
      writeContract({
        address: contracts.BasketStaking as `0x${string}`,
        abi: basketStakingABI,
        functionName: 'unstake',
        args: [parseEther(unstakeAmount)],
      })
      
      setUnstakeAmount('')
    } catch (error) {
      console.error('Unstaking failed:', error)
    }
  }

  const handleClaimRewards = async () => {
    if (!address || !contracts?.BasketStaking) return
    
    try {
      // Call claim rewards function on contract
      writeContract({
        address: contracts.BasketStaking as `0x${string}`,
        abi: basketStakingABI,
        functionName: 'claimRewards',
        args: [],
      })
    } catch (error) {
      console.error('Claiming failed:', error)
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      if (isApproving) {
        // Just completed approval, refetch allowance
        console.log('Approval confirmed! Refetching allowance...')
        setIsApproving(false)
        refetchAllowance()
      } else {
        // Completed staking or unstaking - reset everything
        console.log('Transaction confirmed! Refetching all data...')
        refetchStakeInfo()
        refetchUserTier()
        refetchBasketBalance()
        refetchAllowance()
        setStakeAmount('')
        setUnstakeAmount('')
      }
    }
  }, [isConfirmed, isApproving, refetchStakeInfo, refetchUserTier, refetchBasketBalance, refetchAllowance])

  if (!address) {
    return (
      <div className="p-6 min-h-screen bg-background text-foreground">
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Coins className="h-5 w-5 text-primary" />
              BASKET Staking
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your wallet to stake BASKET tokens and earn protocol fees
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const currentTierInfo = tierInfo[stakeInfo.tier as Tier]
  const tierProgress = getTierProgress(Number(stakeInfo.amount), stakeInfo.tier)
  const nextTierInfo = tierProgress.nextTier ? tierInfo[tierProgress.nextTier] : null

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background text-foreground">
      {/* Staking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <Coins className="h-4 w-4 text-primary" />
              Staked Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{Number(stakeInfo.amount).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">BASKET tokens</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              Pending Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{Number(stakeInfo.pendingRewards).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">ETH</p>
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
            <p className="text-xs text-muted-foreground">{currentTierInfo.multiplier} rewards</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <Gift className="h-4 w-4 text-primary" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{Number(basketBalanceFormatted).toLocaleString()}</div>
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
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
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
            {currentTierInfo.benefits.map((benefit: string, index: number) => (
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
                max={basketBalanceFormatted}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Available: {Number(basketBalanceFormatted).toLocaleString()} BASKET</span>
                <button 
                  onClick={() => setStakeAmount(basketBalanceFormatted)}
                  className="text-primary hover:underline"
                >
                  Max
                </button>
              </div>
            </div>
            {needsApproval ? (
              <Button 
                onClick={handleApprove}
                disabled={isContractPending || isConfirming || !stakeAmount || Number(stakeAmount) <= 0}
                className="w-full"
              >
                {isContractPending && isApproving ? 'Approving...' : 
                 isConfirming && isApproving ? 'Confirming Approval...' : 
                 'Approve BASKET'}
              </Button>
            ) : (
              <Button 
                onClick={handleStake}
                disabled={isContractPending || isConfirming || !stakeAmount || Number(stakeAmount) <= 0}
                className="w-full"
              >
                {isContractPending && !isApproving ? 'Staking...' : 
                 isConfirming && !isApproving ? 'Confirming Stake...' : 
                 'Stake BASKET'}
              </Button>
            )}
            
            {/* Debug info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Debug: needsApproval={needsApproval.toString()}, isApproving={isApproving.toString()}</div>
              <div>Allowance: {currentAllowance ? formatEther(currentAllowance) : 'Loading...'} BASKET</div>
              <div>Pending: {isContractPending.toString()}, Confirming: {isConfirming.toString()}</div>
            </div>
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
                  className="text-primary hover:underline"
                >
                  Max
                </button>
              </div>
            </div>
            <Button 
              onClick={handleUnstake}
              disabled={isContractPending || isConfirming || !unstakeAmount || Number(unstakeAmount) <= 0}
              variant="outline"
              className="w-full"
            >
              {isContractPending ? 'Submitting...' : 
               isConfirming ? 'Confirming...' : 
               'Unstake BASKET'}
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
              disabled={isContractPending || isConfirming || Number(stakeInfo.pendingRewards) <= 0}
            >
              {isContractPending ? 'Submitting...' : 
               isConfirming ? 'Confirming...' : 
               'Claim Rewards'}
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
            {Object.entries(tierInfo).slice(1).map(([tierKey, info]: [string, TierInfo]) => (
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
                  Threshold: {info.threshold} BASKET
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Multiplier: {info.multiplier}
                </div>
                <div className="space-y-1">
                  {info.benefits.map((benefit: string, index: number) => (
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