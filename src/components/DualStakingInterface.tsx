'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect, useMemo } from 'react'
import { Coins, TrendingUp, Award, ArrowLeftRight, AlertTriangle } from 'lucide-react'
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
  }
] as const
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
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
    name: 'Base',
    ratio: '5,000:1',
    apy: '8%',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: '500 CORE per 0.1 BTC (Minimum dual stake)'
  },
  [DualTier.Boost]: {
    name: 'Boost',
    ratio: '20,000:1',
    apy: '12%',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    description: '2,000 CORE per 0.1 BTC'
  },
  [DualTier.Super]: {
    name: 'Super',
    ratio: '60,000:1',
    apy: '16%',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
    description: '6,000 CORE per 0.1 BTC'
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi',
    ratio: '160,000:1',
    apy: '20%',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    description: '16,000 CORE per 0.1 BTC (Highest yield)'
  }
}

export function DualStakingInterface() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { chainId: storeChainId } = useNetworkStore()
  const currentChainId = chainId || storeChainId || 31337
  const { contracts } = getNetworkByChainId(currentChainId)
  
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
    args: address && stakingContractAddress ? [address, stakingContractAddress] : undefined,
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
    args: address && stakingContractAddress ? [address, stakingContractAddress] : undefined,
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
      args: [stakingContractAddress, parsedCoreAmount],
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
      args: [stakingContractAddress, parsedBtcAmount],
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
      args: [parseEther(stakeInfo.shares)],
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
    <div className="space-y-6 p-6 min-h-screen bg-background text-foreground">
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
            <div>
              <label className="text-sm font-medium">CORE Amount</label>
              <Input
                type="number"
                value={coreAmount}
                onChange={(e) => setCoreAmount(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Available: {Number(coreBalanceFormatted).toLocaleString()} CORE</span>
                <button 
                  onClick={() => coreBalanceFormatted && setCoreAmount(coreBalanceFormatted)}
                  className="text-primary hover:underline"
                >
                  Max
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">BTC Amount</label>
              <Input
                type="number"
                value={btcAmount}
                onChange={(e) => setBtcAmount(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Available: {Number(btcBalanceFormatted).toLocaleString()} BTC</span>
                <button 
                  onClick={() => btcBalanceFormatted && setBtcAmount(btcBalanceFormatted)}
                  className="text-primary hover:underline"
                >
                  Max
                </button>
              </div>
            </div>
          </div>

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
                    {(Number(coreAmount) / Number(btcAmount)).toFixed(0) || 0}:1
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Tier Selection</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(tierInfo).map(([tierKey, info]) => (
                <Button
                  key={tierKey}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoCalculate(Number(tierKey) as DualTier)}
                  className={`${info.color} border-current`}
                >
                  {info.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {needsCoreApproval && (
              <Button 
                onClick={handleApproveCORE}
                disabled={isApprovingCore}
                className="w-full"
                variant="outline"
              >
                {isApprovingCore ? 'Approving CORE...' : 'Approve CORE'}
              </Button>
            )}
            {needsBtcApproval && (
              <Button 
                onClick={handleApproveBTC}
                disabled={isApprovingBtc}
                className="w-full"
                variant="outline"
              >
                {isApprovingBtc ? 'Approving BTC...' : 'Approve BTC'}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => {
                  refetchCoreAllowance()
                  refetchBtcAllowance()
                }}
                className="w-full"
                variant="outline"
                size="sm"
              >
                Refresh Allowances
              </Button>
              <Button 
                onClick={() => {
                  console.log('Manual refresh triggered')
                  refetchStakeInfo()
                  refetchCoreBalance()
                  refetchBtcBalance()
                }}
                className="w-full"
                variant="outline"
                size="sm"
              >
                Refresh Stake Data
              </Button>
            </div>
            <Button 
              onClick={handleDualStake}
              disabled={isStaking || !coreAmount || Number(coreAmount) === 0 || !btcAmount || Number(btcAmount) === 0 || needsCoreApproval || needsBtcApproval}
              className="w-full"
            >
              {isStaking ? 'Staking...' : 'Dual Stake CORE + BTC'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
            
            <div className="space-y-2">
              <Button 
                onClick={handleUnstake}
                disabled={isUnstaking || Number(stakeInfo.shares) <= 0}
                variant="outline"
                className="w-full"
              >
                {isUnstaking ? 'Unstaking...' : 'Unstake All'}
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