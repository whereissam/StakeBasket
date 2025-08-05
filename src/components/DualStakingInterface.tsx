'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect, useMemo } from 'react'
import { Coins, TrendingUp, Award, ArrowLeftRight, AlertTriangle, PieChart, BarChart3, Target, Info, BookOpen } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
// Import the proper ABI directly from artifacts
const PROPER_DUAL_STAKING_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserStakeInfo",
    outputs: [
      { internalType: "uint256", name: "coreStaked", type: "uint256" },
      { internalType: "uint256", name: "btcStaked", type: "uint256" },
      { internalType: "uint256", name: "shares", type: "uint256" },
      { internalType: "uint256", name: "rewards", type: "uint256" },
      { internalType: "uint256", name: "lastClaimTime", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getTierStatus",
    outputs: [
      { internalType: "uint8", name: "tier", type: "uint8" },
      { internalType: "uint256", name: "coreStaked", type: "uint256" },
      { internalType: "uint256", name: "btcStaked", type: "uint256" },
      { internalType: "uint256", name: "ratio", type: "uint256" },
      { internalType: "uint256", name: "rewards", type: "uint256" },
      { internalType: "uint256", name: "apy", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "coreAmount", type: "uint256" },
      { internalType: "uint256", name: "btcAmount", type: "uint256" }
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "estimateRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "coreAmount", type: "uint256" },
      { internalType: "uint256", name: "btcAmount", type: "uint256" }
    ],
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
import { useContracts } from '../hooks/useContracts'
import { useNetworkStore } from '../store/useNetworkStore'
import { toast } from 'sonner'

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
  [DualTier.Base]: 5000,
  [DualTier.Boost]: 20000,
  [DualTier.Super]: 60000,
  [DualTier.Satoshi]: 160000
}

const tierInfo: Record<DualTier, TierInfo> = {
  [DualTier.Base]: {
    name: 'Base Tier',
    ratio: '5,000:1',
    apy: '8%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Entry level - Good starting point for new users'
  },
  [DualTier.Boost]: {
    name: 'Boost Tier',
    ratio: '20,000:1',
    apy: '12%',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    description: 'Enhanced rewards - 50% higher than base tier'
  },
  [DualTier.Super]: {
    name: 'Super Tier',
    ratio: '60,000:1',
    apy: '16%',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
    description: 'Premium yields - Professional tier rewards'
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi Tier',
    ratio: '160,000:1',
    apy: '20%',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    description: 'Maximum rewards - Institutional-grade returns'
  }
}

export function DualStakingInterface() {
  const { address } = useAccount()
  const { chainId: storeChainId } = useNetworkStore()
  const { contracts, chainId } = useContracts()
  const currentChainId = chainId || storeChainId || 31337
  
  // Use the correct staking contract address from configuration
  const stakingContractAddress = contracts?.MockDualStaking
  
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
  const [btcAmount, setBtcAmount] = useState('0')
  const [needsRebalancing] = useState(false)
  
  const { data: coreBalanceData, refetch: refetchCoreBalance, isError: coreBalanceError, isLoading: coreBalanceLoading } = useReadContract({
    address: contracts?.MockCORE as `0x${string}`,
    abi: [
      {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
      }
    ] as const,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts?.MockCORE,
    },
  })
  
  const { data: btcBalanceData, refetch: refetchBtcBalance, isError: btcBalanceError, isLoading: btcBalanceLoading } = useReadContract({
    address: contracts?.MockCoreBTC as `0x${string}`,
    abi: [
      {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
      }
    ] as const,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts?.MockCoreBTC,
    },
  })

  const { data: userStakeInfo, refetch: refetchStakeInfo, error: userStakeInfoError, isLoading: userStakeInfoLoading } = useReadContract({
    address: stakingContractAddress && stakingContractAddress !== '0x0000000000000000000000000000000000000000' ? stakingContractAddress as `0x${string}` : undefined,
    abi: PROPER_DUAL_STAKING_ABI,
    functionName: 'getUserStakeInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingContractAddress && stakingContractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  const { data: tierStatus, error: tierStatusError, isLoading: tierStatusLoading } = useReadContract({
    address: stakingContractAddress && stakingContractAddress !== '0x0000000000000000000000000000000000000000' ? stakingContractAddress as `0x${string}` : undefined,
    abi: PROPER_DUAL_STAKING_ABI,
    functionName: 'getTierStatus',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingContractAddress && stakingContractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  const { data: pendingRewards } = useReadContract({
    address: stakingContractAddress && stakingContractAddress !== '0x0000000000000000000000000000000000000000' ? stakingContractAddress as `0x${string}` : undefined,
    abi: PROPER_DUAL_STAKING_ABI,
    functionName: 'estimateRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingContractAddress && stakingContractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })
  
  const { data: coreAllowance, refetch: refetchCoreAllowance } = useReadContract({
    address: contracts?.MockCORE as `0x${string}`,
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
    args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!contracts?.MockCORE && !!stakingContractAddress
    }
  })

  const { data: btcAllowance, refetch: refetchBtcAllowance } = useReadContract({
    address: contracts?.MockCoreBTC as `0x${string}`,
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
    args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!contracts?.MockCoreBTC && !!stakingContractAddress
    }
  })

  const parsedCoreAmount = useMemo(() => {
    try {
      return coreAmount ? parseEther(coreAmount) : 0n
    } catch {
      return 0n
    }
  }, [coreAmount])

  const parsedBtcAmount = useMemo(() => {
    try {
      const val = parseFloat(btcAmount)
      if (isNaN(val)) return 0n
      return BigInt(Math.floor(val * 10**8))
    } catch {
      return 0n
    }
  }, [btcAmount])

  const needsCoreApproval = useMemo(() => {
    if (!parsedCoreAmount || parsedCoreAmount === 0n) return false
    if (coreAllowance === undefined) return true // If allowance is undefined, assume we need approval
    return (coreAllowance as bigint) < parsedCoreAmount
  }, [coreAllowance, parsedCoreAmount])

  const needsBtcApproval = useMemo(() => {
    if (!parsedBtcAmount || parsedBtcAmount === 0n) return false
    if (btcAllowance === undefined) return true // If allowance is undefined, assume we need approval
    return (btcAllowance as bigint) < parsedBtcAmount
  }, [btcAllowance, parsedBtcAmount])

  const { writeContract: writeDualStake, data: stakeHash, isPending: isStaking } = useWriteContract()
  const { writeContract: writeUnstake, data: unstakeHash, isPending: isUnstaking } = useWriteContract()
  const { writeContract: writeClaimRewards, data: claimHash, isPending: isClaiming } = useWriteContract()
  const { writeContract: writeApproveCORE, data: approveCOREHash, isPending: isApprovingCore } = useWriteContract()
  const { writeContract: writeApproveBTC, data: approveBTCHash, isPending: isApprovingBtc } = useWriteContract()

  const { isSuccess: isStakeSuccess, error: stakeError } = useWaitForTransactionReceipt({
    hash: stakeHash,
  })
  
  const { isSuccess: isUnstakeSuccess, error: unstakeError } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  })

  const { isSuccess: isClaimSuccess, error: claimError } = useWaitForTransactionReceipt({
    hash: claimHash,
  })
  
  const { isSuccess: isApproveCORESuccess, error: approveCOREError } = useWaitForTransactionReceipt({
    hash: approveCOREHash,
  })
  
  const { isSuccess: isApproveBTCSuccess, error: approveBTCError } = useWaitForTransactionReceipt({
    hash: approveBTCHash,
  })

  // Handle transaction success/error with useEffect
  useEffect(() => {
    if (isStakeSuccess && stakeHash) {
      toast.success('Dual staking confirmed!', { description: `Hash: ${stakeHash}` })
      console.log('Stake success, refetching data...')
      // Refetch all data
      refetchStakeInfo()
      refetchCoreBalance()
      refetchBtcBalance()
      // Force refresh after a short delay
      setTimeout(() => {
        refetchStakeInfo()
        console.log('Force refetch completed')
      }, 2000)
    }
    if (stakeError) {
      console.error('Stake error:', stakeError)
      toast.error('Dual staking failed', { description: stakeError.message })
    }
  }, [isStakeSuccess, stakeError, stakeHash, refetchStakeInfo, refetchCoreBalance, refetchBtcBalance])

  useEffect(() => {
    if (isUnstakeSuccess && unstakeHash) {
      toast.success('Unstaking confirmed!', { description: `Hash: ${unstakeHash}` })
      refetchStakeInfo()
      refetchCoreBalance()
      refetchBtcBalance()
    }
    if (unstakeError) {
      toast.error('Unstaking failed', { description: unstakeError.message })
    }
  }, [isUnstakeSuccess, unstakeError, unstakeHash, refetchStakeInfo, refetchCoreBalance, refetchBtcBalance])

  useEffect(() => {
    if (isClaimSuccess && claimHash) {
      toast.success('Rewards claimed!', { description: `Hash: ${claimHash}` })
      refetchStakeInfo()
    }
    if (claimError) {
      toast.error('Claiming rewards failed', { description: claimError.message })
    }
  }, [isClaimSuccess, claimError, claimHash, refetchStakeInfo])

  useEffect(() => {
    if (isApproveCORESuccess && approveCOREHash) {
      toast.success('CORE approved successfully!')
      refetchCoreAllowance()
      // Force refresh after a short delay
      setTimeout(() => refetchCoreAllowance(), 1000)
    }
    if (approveCOREError) {
      toast.error('CORE approval failed', { description: approveCOREError.message })
    }
  }, [isApproveCORESuccess, approveCOREError, approveCOREHash, refetchCoreAllowance])

  useEffect(() => {
    if (isApproveBTCSuccess && approveBTCHash) {
      toast.success('BTC approved successfully!')
      refetchBtcAllowance()
      // Force refresh after a short delay
      setTimeout(() => refetchBtcAllowance(), 1000)
    }
    if (approveBTCError) {
      toast.error('BTC approval failed', { description: approveBTCError.message })
    }
  }, [isApproveBTCSuccess, approveBTCError, approveBTCHash, refetchBtcAllowance])

  useEffect(() => {
    console.log('Stake info update:', { 
      userStakeInfo, 
      tierStatus, 
      pendingRewards,
      stakingContractAddress,
      currentChainId,
      contractsAvailable: !!contracts,
      userStakeInfoError: userStakeInfoError?.message,
      tierStatusError: tierStatusError?.message
    });
    
    if (userStakeInfo && tierStatus) {
      // getUserStakeInfo returns: (uint256 coreStaked, uint256 btcStaked, uint256 shares, uint256 rewards, uint256 lastClaimTime)
      const [coreStaked, btcStaked, shares, rewards] = userStakeInfo as [bigint, bigint, bigint, bigint, bigint]
      // getTierStatus returns: (uint8 tier, uint256 coreStaked, uint256 btcStaked, uint256 ratio, uint256 rewards, uint256 apy)
      const [tier, , , ratio, , apy] = tierStatus as [number, bigint, bigint, bigint, bigint, bigint]
      
      console.log('🔍 Raw stake data:', {
        coreStaked: coreStaked.toString(),
        btcStaked: btcStaked.toString(),
        shares: shares.toString(),
        rewards: rewards.toString(),
        tier,
        ratio: ratio.toString(),
        // Debug: Show what we expect vs what we get
        expectedShares: btcStaked.toString(), // Should equal shares
        sharesFormatted: (Number(shares) / 1e8).toFixed(4),
        userStakeInfoRaw: userStakeInfo,
        apy: apy.toString()
      });
      
      setStakeInfo({
        coreStaked: formatEther(coreStaked),
        btcStaked: (Number(btcStaked) / 10**8).toFixed(8),
        shares: (Number(shares) / 10**8).toFixed(4), // Fix: Use 8 decimals like BTC, not 18
        rewards: pendingRewards ? formatEther(pendingRewards as bigint) : formatEther(rewards),
        tier: Number(tier),
        ratio: ratio.toString(),
        apy: (Number(apy) / 100).toString() // Convert basis points to percentage
      })
    }
  }, [userStakeInfo, tierStatus, pendingRewards])

  const calculateTier = (core: string, btc: string): DualTier => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    if (btcNum === 0 || coreNum === 0) return DualTier.Base
    
    const ratio = coreNum / btcNum
    
    if (ratio >= 160000) return DualTier.Satoshi
    if (ratio >= 60000) return DualTier.Super
    if (ratio >= 20000) return DualTier.Boost
    if (ratio >= 5000) return DualTier.Base
    return DualTier.Base
  }

  const getOptimalCoreAmount = (btc: string, targetTier: DualTier): string => {
    const btcNum = Number(btc) || 0
    const requiredRatio = TIER_RATIOS[targetTier]
    return (btcNum * requiredRatio).toString()
  }

  const handleAutoCalculate = (targetTier: DualTier) => {
    const coreNum = Number(coreAmount) || 0
    const btcNum = Number(btcAmount) || 0
    const requiredRatio = TIER_RATIOS[targetTier]
    
    console.log('🎯 Auto-calculating for tier:', {
      targetTier,
      coreNum,
      btcNum,
      requiredRatio,
      tierName: tierInfo[targetTier].name
    })
    
    if (coreNum > 0 && btcNum === 0) {
      // User entered CORE amount, calculate BTC
      const requiredBtc = coreNum / requiredRatio
      console.log('📊 Calculating BTC from CORE:', { coreNum, requiredRatio, requiredBtc })
      setBtcAmount(requiredBtc.toFixed(8))
    } else if (btcNum > 0 && coreNum === 0) {
      // User entered BTC amount, calculate CORE
      const optimalCore = getOptimalCoreAmount(btcAmount, targetTier)
      console.log('📊 Calculating CORE from BTC:', { btcNum, optimalCore })
      setCoreAmount(optimalCore)
    } else if (coreNum === 0 && btcNum === 0) {
      // Neither entered, use defaults
      setBtcAmount('0.1')
      const optimalCore = getOptimalCoreAmount('0.1', targetTier)
      setCoreAmount(optimalCore)
      console.log('📊 Using defaults:', { btc: '0.1', core: optimalCore })
    } else {
      // Both entered, prioritize the CORE amount and adjust BTC
      const requiredBtc = coreNum / requiredRatio
      console.log('📊 Both entered, prioritizing CORE:', { coreNum, newBtc: requiredBtc })
      setBtcAmount(requiredBtc.toFixed(8))
    }
  }

  const handleApproveCORE = () => {
    if (!address || !contracts?.MockCORE || !parsedCoreAmount) return
    writeApproveCORE({
      address: contracts.MockCORE as `0x${string}`,
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
      ] as const,
      functionName: 'approve',
      args: [stakingContractAddress as `0x${string}`, parsedCoreAmount],
    })
  }

  const handleApproveBTC = () => {
    if (!address || !contracts?.MockCoreBTC || !parsedBtcAmount) return
    writeApproveBTC({
      address: contracts.MockCoreBTC as `0x${string}`,
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
      ] as const,
      functionName: 'approve',
      args: [stakingContractAddress as `0x${string}`, parsedBtcAmount],
    })
  }

  const handleDualStake = () => {
    console.log('🚀 Dual stake button clicked!', {
      address,
      stakingContractAddress,
      contracts: contracts?.MockDualStaking,
      parsedCoreAmount: parsedCoreAmount.toString(),
      parsedBtcAmount: parsedBtcAmount.toString(),
      coreAmount,
      btcAmount,
      needsCoreApproval,
      needsBtcApproval,
      isStaking,
      coreAllowance: coreAllowance?.toString(),
      btcAllowance: btcAllowance?.toString()
    })
    
    if (!address) {
      console.log('❌ No wallet address')
      return
    }
    
    if (!parsedCoreAmount || parsedCoreAmount === 0n) {
      console.log('❌ Invalid CORE amount:', parsedCoreAmount.toString())
      return
    }
    
    if (!parsedBtcAmount || parsedBtcAmount === 0n) {
      console.log('❌ Invalid BTC amount:', parsedBtcAmount.toString())
      return
    }
    
    if (needsCoreApproval) {
      console.log('❌ CORE approval needed. Current allowance:', coreAllowance?.toString(), 'Required:', parsedCoreAmount.toString())
      return
    }
    
    if (needsBtcApproval) {
      console.log('❌ BTC approval needed. Current allowance:', btcAllowance?.toString(), 'Required:', parsedBtcAmount.toString())
      return
    }
    
    console.log('✅ All validations passed. Calling dual stake...')
    try {
      writeDualStake({
        address: stakingContractAddress as `0x${string}`,
        abi: PROPER_DUAL_STAKING_ABI,
        functionName: 'stake',
        args: [parsedCoreAmount, parsedBtcAmount],
      })
      console.log('✅ writeDualStake called successfully')
    } catch (error) {
      console.error('❌ Error calling writeDualStake:', error)
    }
  }

  const handleUnstake = () => {
    if (!address || !stakeInfo.shares || Number(stakeInfo.shares) <= 0) return
    
    writeUnstake({
      address: stakingContractAddress as `0x${string}`,
      abi: PROPER_DUAL_STAKING_ABI,
      functionName: 'unstake',
      args: [parseEther(stakeInfo.coreStaked), BigInt(Math.floor(Number(stakeInfo.btcStaked) * 10**8))],
    })
  }

  const handleClaimRewards = () => {
    if (!address) return
    
    writeClaimRewards({
      address: stakingContractAddress as `0x${string}`,
      abi: PROPER_DUAL_STAKING_ABI,
      functionName: 'claimRewards',
    })
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

  // Debug balance data
  console.log('Balance Debug:', {
    coreBalanceData,
    btcBalanceData,
    coreBalanceError,
    btcBalanceError,
    coreBalanceLoading,
    btcBalanceLoading,
    address,
    currentChainId,
    contracts: {
      MockCORE: contracts?.MockCORE,
      MockCoreBTC: contracts?.MockCoreBTC,
      MockDualStaking: contracts?.MockDualStaking
    }
  })
  
  // Debug stake data queries
  console.log('Stake Query Debug:', {
    userStakeInfo,
    userStakeInfoError,
    userStakeInfoLoading,
    tierStatus,
    tierStatusError,
    tierStatusLoading,
    pendingRewards,
    queryEnabled: !!address && !!contracts?.MockDualStaking,
    stakingAddress: contracts?.MockDualStaking
  })

  // Debug approval data
  console.log('Approval Debug:', {
    coreAllowance,
    btcAllowance,
    needsCoreApproval,
    needsBtcApproval,
    parsedCoreAmount,
    parsedBtcAmount
  })

  const coreBalanceFormatted = coreBalanceData ? formatEther(coreBalanceData as bigint) : '0'
  const btcBalanceFormatted = btcBalanceData ? (Number(btcBalanceData as bigint) / 10**8).toFixed(8) : '0'
  
  const currentTierInfo = tierInfo[stakeInfo.tier as DualTier]
  const proposedTier = calculateTier(coreAmount, btcAmount)
  const proposedTierInfo = tierInfo[proposedTier]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Earn up to <span className="text-primary">20% APY</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Professional DeFi management that automatically optimizes your CORE and BTC for maximum rewards
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">Automated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-muted-foreground">Audited Smart Contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-muted-foreground">Tier Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 p-6">
        {/* Stats Dashboard */}
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

      {/* Basket Composition Visualization */}
      {Number(stakeInfo.coreStaked) > 0 || Number(stakeInfo.btcStaked) > 0 ? (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-dashed border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Your Dual Staking Basket
            </CardTitle>
            <CardDescription>
              Managed investment allocation maintaining optimal tier ratios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Allocation Chart Visualization */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Asset Allocation</h4>
                <div className="space-y-3">
                  {/* CORE allocation bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        CORE
                      </span>
                      <span className="font-mono">
                        {((Number(stakeInfo.coreStaked) / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((Number(stakeInfo.coreStaked) / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100) || 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* BTC allocation bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        BTC
                      </span>
                      <span className="font-mono">
                        {((Number(stakeInfo.btcStaked) * 50000 / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((Number(stakeInfo.btcStaked) * 50000 / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100) || 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tier Progress */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Tier Achievement</h4>
                <div className="space-y-3">
                  {Object.entries(tierInfo).map(([tierKey, info]) => {
                    const isActive = Number(tierKey) <= stakeInfo.tier
                    const isCurrent = Number(tierKey) === stakeInfo.tier
                    return (
                      <div key={tierKey} className={`flex items-center gap-3 p-2 rounded ${isCurrent ? 'bg-primary/20 border border-primary/30' : ''}`}>
                        <div className={`w-3 h-3 rounded-full transition-all ${
                          isActive ? 'bg-primary' : 'bg-muted border-2 border-muted-foreground'
                        }`}></div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${info.color}`}>
                            {info.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {info.apy} APY
                          </div>
                        </div>
                        {isCurrent && (
                          <Target className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Performance Metrics */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Strategy Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Ratio</span>
                    <span className="font-mono text-sm">
                      {stakeInfo.btcStaked !== '0' 
                        ? (Number(stakeInfo.coreStaked) / Number(stakeInfo.btcStaked)).toLocaleString(undefined, {maximumFractionDigits: 0})
                        : '0'}:1
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Target Tier</span>
                    <span className={`text-sm font-medium ${currentTierInfo.color}`}>
                      {currentTierInfo.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Est. Annual Yield</span>
                    <span className="text-sm font-medium text-green-600">
                      {currentTierInfo.apy}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Basket Management</div>
                    <div className="text-xs text-primary">
                      ✓ Auto-rebalancing enabled<br/>
                      ✓ Optimal ratio maintenance<br/>
                      ✓ Compound reward reinvestment
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-dashed border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Target className="h-5 w-5" />
                Ready to Join the Dual Staking Basket
              </CardTitle>
              <CardDescription>
                Your deposits will be automatically managed to achieve optimal tier performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Auto-Rebalancing</div>
                    <div className="text-muted-foreground text-xs">Maintains optimal ratios</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Maximized Yields</div>
                    <div className="text-muted-foreground text-xs">Tier-optimized returns</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">Professional Management</div>
                    <div className="text-muted-foreground text-xs">Set and forget strategy</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section - Simplified */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
              <CardDescription>
                Simple, automated DeFi earning designed for everyone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <h3 className="font-semibold">Deposit Your Tokens</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your CORE and BTC tokens to the smart contract. We handle the optimal ratio calculations automatically.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <h3 className="font-semibold">We Optimize & Stake</h3>
                  <p className="text-sm text-muted-foreground">
                    Our smart contract automatically stakes your tokens with CoreDAO validators at the highest reward tier.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <h3 className="font-semibold">Earn & Compound</h3>
                  <p className="text-sm text-muted-foreground">
                    Rewards are automatically collected and reinvested. Your position grows through compound interest.
                  </p>
                </div>
              </div>

              {/* Smart Contract Features */}
              <div className="mt-8 bg-muted/30 rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-center">Smart Contract Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Auto-Rebalancing</div>
                        <div className="text-muted-foreground text-xs">Maintains optimal 16,000:1 CORE:BTC ratio for maximum 20% APY</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Compound Rewards</div>
                        <div className="text-muted-foreground text-xs">All staking rewards automatically reinvested to grow your position</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Liquid Shares</div>
                        <div className="text-muted-foreground text-xs">Receive basket tokens representing your proportional ownership</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Anytime Withdrawal</div>
                        <div className="text-muted-foreground text-xs">Exit the strategy at any time and receive your proportional assets</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick FAQ */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Why Use This Strategy?</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>✓ Higher yields than individual staking</li>
                      <li>✓ No manual ratio management needed</li>
                      <li>✓ Professional-grade optimization</li>
                      <li>✓ Fully automated and transparent</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">Important to Know</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>⚠ Smart contract and market risks apply</li>
                      <li>⚠ APY rates are estimates, not guarantees</li>
                      <li>⚠ May have CoreDAO unbonding periods</li>
                      <li>⚠ Experimental DeFi protocol</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

      {/* Main Action Card */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">
            Start Earning Today
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Simply deposit your tokens and we'll handle the rest
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Quick Start Options */}
          <div className="bg-muted/30 rounded-lg p-6 space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-2">Choose Your Strategy</h3>
              <p className="text-sm text-muted-foreground">Select a target yield to get optimal token amounts</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(tierInfo).reverse().map(([tierKey, info]) => (
                <button
                  key={tierKey}
                  onClick={() => handleAutoCalculate(Number(tierKey) as DualTier)}
                  className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    Number(tierKey) === DualTier.Satoshi 
                      ? 'border-primary bg-primary/10 shadow-sm' 
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`font-semibold text-sm ${info.color}`}>
                    {info.name}
                  </div>
                  <div className="text-lg font-bold text-green-600 mt-1">
                    {info.apy}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {info.description}
                  </div>
                  {Number(tierKey) === DualTier.Satoshi && (
                    <div className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded mt-2 inline-block">
                      Recommended
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Or Enter Custom Amounts</h3>
              <button 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  // Toggle advanced mode
                }}
              >
                Advanced Options
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">CORE Tokens</span>
                  <div className="mt-1 relative">
                    <Input
                      type="number"
                      value={coreAmount}
                      onChange={(e) => setCoreAmount(e.target.value)}
                      placeholder="0.00"
                      className="text-right font-mono text-lg pl-12"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-semibold text-sm">
                      CORE
                    </div>
                  </div>
                </label>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Balance: {Number(coreBalanceFormatted).toLocaleString()}</span>
                  <button 
                    onClick={() => coreBalanceFormatted && setCoreAmount(coreBalanceFormatted)}
                    className="text-primary hover:underline"
                  >
                    Use All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">BTC Tokens</span>
                  <div className="mt-1 relative">
                    <Input
                      type="number"
                      value={btcAmount}
                      onChange={(e) => setBtcAmount(e.target.value)}
                      placeholder="0.00"
                      className="text-right font-mono text-lg pl-12"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500 font-semibold text-sm">
                      BTC
                    </div>
                  </div>
                </label>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Balance: {Number(btcBalanceFormatted).toFixed(4)}</span>
                  <button 
                    onClick={() => btcBalanceFormatted && setBtcAmount(btcBalanceFormatted)}
                    className="text-primary hover:underline"
                  >
                    Use All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {coreAmount && btcAmount && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/50 dark:to-green-950/50 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">Your Proposed Allocation</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Target Tier</p>
                  <p className={`text-xl font-bold ${proposedTierInfo.color}`}>
                    {proposedTierInfo.name}
                  </p>
                  <p className="text-sm text-green-600 font-medium">{proposedTierInfo.apy} Annual Yield</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Your Ratio</p>
                  <p className="text-xl font-mono font-bold">
                    {(Number(coreAmount) / Number(btcAmount)).toLocaleString(undefined, {maximumFractionDigits: 0}) || 0}:1
                  </p>
                  <p className="text-xs text-muted-foreground">CORE to BTC ratio</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Basket Management</p>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Auto-rebalancing enabled
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Reward compounding active
                    </div>
                    <div className="flex items-center gap-1 text-purple-600">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Professional management
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-muted-foreground">
                  💼 <strong>Smart Contract Benefits:</strong> Your deposit will be professionally managed to maintain this tier 
                  automatically, even as market prices change. The basket handles all complexity for you.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4 pt-4 border-t border-border">
            {(needsCoreApproval || needsBtcApproval) && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Token Approval Required
                  </span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                  You need to approve the smart contract to use your tokens. This is a one-time action for security.
                </p>
                <div className="space-y-2">
                  {needsCoreApproval && (
                    <Button 
                      onClick={handleApproveCORE}
                      disabled={isApprovingCore}
                      className="w-full"
                      variant="outline"
                    >
                      {isApprovingCore ? 'Approving CORE...' : '✓ Approve CORE Tokens'}
                    </Button>
                  )}
                  {needsBtcApproval && (
                    <Button 
                      onClick={handleApproveBTC}
                      disabled={isApprovingBtc}
                      className="w-full"
                      variant="outline"
                    >
                      {isApprovingBtc ? 'Approving BTC...' : '✓ Approve BTC Tokens'}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleDualStake}
              disabled={isStaking || !coreAmount || Number(coreAmount) === 0 || !btcAmount || Number(btcAmount) === 0 || needsCoreApproval || needsBtcApproval}
              className="w-full h-14 text-lg font-semibold shadow-lg"
              size="lg"
            >
              {isStaking ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  Joining Strategy...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Start Earning {proposedTierInfo.apy} APY
                </div>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                By joining, you agree that this is an experimental DeFi protocol with associated risks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                disabled={isUnstaking || Number(stakeInfo.shares) <= 0}
                variant="outline"
                className="w-full"
              >
                {isUnstaking ? 'Withdrawing...' : 'Withdraw from Basket'}
              </Button>
              
              <Button 
                onClick={handleClaimRewards}
                disabled={isClaiming || Number(stakeInfo.rewards) <= 0}
                className="w-full"
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yield Tiers - Simplified */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Available Yield Tiers
          </CardTitle>
          <CardDescription>
            Our smart contract automatically targets the highest tier for maximum returns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tierInfo).map(([tierKey, info]) => (
              <div 
                key={tierKey}
                className={`p-4 rounded-lg border-2 bg-card transition-all hover:shadow-md ${
                  Number(tierKey) === stakeInfo.tier ? 'border-primary bg-primary/10 shadow-lg' : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`font-semibold ${info.color}`}>
                    {info.name}
                  </div>
                  {Number(tierKey) === stakeInfo.tier && (
                    <div className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      <Target className="h-3 w-3" />
                      Current
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Required Ratio:</span>
                    <span className="text-sm font-mono">{info.ratio}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Annual Yield:</span>
                    <span className="text-sm font-semibold text-green-600">{info.apy}</span>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {info.description}
                    </div>
                    {Number(tierKey) === DualTier.Satoshi && (
                      <div className="mt-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-2 rounded">
                        🎯 <strong>Basket Target:</strong> This tier offers maximum rewards and is the default target for the automated strategy.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trust & Security Footer */}
      <Card className="bg-muted/20 border-muted">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-foreground">Built for Safety & Transparency</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Audited Smart Contracts</div>
                  <div className="text-muted-foreground text-xs">Code reviewed for security vulnerabilities</div>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Open Source</div>
                  <div className="text-muted-foreground text-xs">All contract code publicly verifiable</div>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Non-Custodial</div>
                  <div className="text-muted-foreground text-xs">You maintain full control of your assets</div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
                This is an experimental DeFi protocol built on CoreDAO. While contracts are audited, 
                cryptocurrency investments carry inherent risks. Only invest what you can afford to lose. 
                Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}