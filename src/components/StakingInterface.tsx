import { Card, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useState, useEffect } from 'react'
import { Coins } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useContracts } from '../hooks/useContracts'
import { parseEther, formatEther } from 'viem'
import { StakingOverview } from './staking/StakingOverview'
import { StakeBasketForm } from './staking/StakeBasketForm'
import { UnstakeBasketForm } from './staking/UnstakeBasketForm'
import { TierProgress } from './staking/TierProgress'
import { TierBenefits } from './staking/TierBenefits'
import { TierSystem } from './staking/TierSystem'
import { ClaimRewards } from './staking/ClaimRewards'
import { useWalletLogger } from '../hooks/useWalletLogger'

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
  const { contracts } = useContracts()
  
  const { writeContract, data: hash, isPending: isContractPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Enhanced wallet logging
  const {
    logTransactionStart,
    logTransactionSuccess,
    logTransactionError,
    logContractCall
  } = useWalletLogger()

  // Log transaction confirmations
  useEffect(() => {
    if (isConfirmed && hash) {
      logTransactionSuccess('Transaction Confirmed', hash);
    }
  }, [isConfirmed, hash, logTransactionSuccess]);
  
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
      logTransactionStart('Token Approval', {
        token: 'BASKET',
        spender: contracts.BasketStaking,
        amount: stakeAmount
      });
      
      setIsApproving(true);
      
      logContractCall('BasketToken', 'approve', {
        spender: contracts.BasketStaking,
        amount: parseEther(stakeAmount).toString()
      });
      
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
      logTransactionError('Token Approval', error, {
        token: 'BASKET',
        amount: stakeAmount,
        spender: contracts.BasketStaking
      });
      setIsApproving(false);
    }
  }

  const handleStake = async () => {
    if (!address || !stakeAmount || !contracts?.BasketStaking) return
    
    try {
      logTransactionStart('Staking', {
        amount: stakeAmount,
        contract: contracts.BasketStaking,
        user: address
      });

      logContractCall('BasketStaking', 'stake', {
        amount: parseEther(stakeAmount).toString()
      });

      writeContract({
        address: contracts.BasketStaking as `0x${string}`,
        abi: basketStakingABI,
        functionName: 'stake',
        args: [parseEther(stakeAmount)],
      })
    } catch (error) {
      logTransactionError('Staking', error, {
        amount: stakeAmount,
        contract: contracts.BasketStaking
      });
    }
  }

  const handleUnstake = async () => {
    if (!address || !unstakeAmount || !contracts?.BasketStaking) return
    
    try {
      logTransactionStart('Unstaking', {
        amount: unstakeAmount,
        contract: contracts.BasketStaking,
        user: address
      });

      logContractCall('BasketStaking', 'unstake', {
        amount: parseEther(unstakeAmount).toString()
      });

      writeContract({
        address: contracts.BasketStaking as `0x${string}`,
        abi: basketStakingABI,
        functionName: 'unstake',
        args: [parseEther(unstakeAmount)],
      })
      
      setUnstakeAmount('')
    } catch (error) {
      logTransactionError('Unstaking', error, {
        amount: unstakeAmount,
        contract: contracts.BasketStaking
      });
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
      <StakingOverview
        stakedAmount={stakeInfo.amount}
        pendingRewards={stakeInfo.pendingRewards}
        currentTier={currentTierInfo.name}
        availableBalance={basketBalanceFormatted}
        tierColor={currentTierInfo.color}
        tierMultiplier={currentTierInfo.multiplier}
      />

      {nextTierInfo && (
        <TierProgress
          currentTierName={currentTierInfo.name}
          nextTierName={nextTierInfo.name}
          progress={tierProgress.progress}
          tokensNeeded={tierProgress.nextThreshold - Number(stakeInfo.amount)}
          nextThreshold={tierProgress.nextThreshold}
        />
      )}

      <TierBenefits currentTierInfo={currentTierInfo} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StakeBasketForm
          stakeAmount={stakeAmount}
          setStakeAmount={setStakeAmount}
          handleStake={handleStake}
          handleApprove={handleApprove}
          needsApproval={needsApproval}
          isContractPending={isContractPending}
          isConfirming={isConfirming}
          isApproving={isApproving}
          basketBalance={basketBalanceFormatted}
          currentAllowance={currentAllowance}
        />
        
        <UnstakeBasketForm
          unstakeAmount={unstakeAmount}
          setUnstakeAmount={setUnstakeAmount}
          handleUnstake={handleUnstake}
          isContractPending={isContractPending}
          isConfirming={isConfirming}
          stakedAmount={stakeInfo.amount}
        />
      </div>

      <ClaimRewards
        pendingRewards={stakeInfo.pendingRewards}
        lastClaimTime={stakeInfo.lastClaimTime}
        handleClaimRewards={handleClaimRewards}
        isContractPending={isContractPending}
        isConfirming={isConfirming}
      />

      <TierSystem tierInfo={tierInfo} currentTier={stakeInfo.tier} />
    </div>
  )
}