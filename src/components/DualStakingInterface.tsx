import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect, useMemo } from 'react'
import { Coins, TrendingUp, Award, ArrowLeftRight, AlertTriangle, PieChart, BarChart3, Target, Info, BookOpen } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi'
import { parseEther, formatEther, erc20Abi } from 'viem'
// Using DualStakingBasket ABI - depositNativeCORE function takes native CORE + BTC
const DUAL_STAKING_BASKET_ABI = [
  {
    inputs: [{ name: 'btcAmount', type: 'uint256' }],
    name: 'depositNativeCORE',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
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

const TIER_RATIOS = {
  [DualTier.None]: 0,
  [DualTier.Base]: 0,
  [DualTier.Boost]: 2000,
  [DualTier.Super]: 6000,
  [DualTier.Satoshi]: 16000
}

const tierInfo: Record<DualTier, TierInfo> = {
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

export function DualStakingInterface() {
  const { address } = useAccount()
  const { chainId: storeChainId } = useNetworkStore()
  const { contracts, chainId, isTestnet } = useContracts()
  const currentChainId = chainId || storeChainId || 31337
  const stakingContractAddress = currentChainId === 1114 
    ? '0x78F398a57774429a41fA73e1CE7AC0915B37157a' // FINAL DualStaking with no timelock
    : '0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849' // DualStakingBasket for local development
  
  // Debug logging
  console.log('🔍 Network Debug:', {
    chainId,
    storeChainId,
    currentChainId,
    contracts: contracts ? Object.keys(contracts) : 'null',
    stakingContractAddress,
    isTestnet
  })
  
  // DualStakingBasket now supports native CORE + BTC tokens
  const isNativeCORE = true // Use native CORE with depositNativeCORE function
  const coreTokenAddress = null // Not needed for native CORE
  
  const btcTokenAddress = currentChainId === 1114
    ? '0x8646C9ad9FED5834d2972A5de25DcCDe1daF7F96' // NEW SimpleBTCFaucet with easy token access
    : '0x38a024C0b412B9d1db8BC398140D00F5Af3093D4' // MockCoreBTC for local development (from deployment-data)
  
  console.log('🪙 Token Debug:', {
    coreTokenAddress,
    btcTokenAddress,
    isNativeCORE,
    contractsMockCORE: contracts?.MockCORE,
    contractsMockCoreBTC: contracts?.MockCoreBTC
  })
  const [stakeInfo, setStakeInfo] = useState<DualStakeInfo>({
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
  const [isAwaitingCoreApproval, setIsAwaitingCoreApproval] = useState(false);
  const [isAwaitingBtcApproval, setIsAwaitingBtcApproval] = useState(false);
  
  // Native ETH balance (for local hardhat)
  const { data: nativeCoreBalance, refetch: refetchNativeCoreBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address && isNativeCORE,
    },
  })

  // ERC-20 CORE balance (for testnet MockCORE with 18 decimals)
  const { data: erc20CoreBalance, refetch: refetchERC20CoreBalance } = useReadContract({
    address: coreTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!coreTokenAddress && !isNativeCORE, // Only for ERC-20 tokens (testnet)
    },
  })

  // Use appropriate CORE balance based on network
  const coreBalanceData = isNativeCORE ? nativeCoreBalance?.value : erc20CoreBalance
  const refetchCoreBalance = isNativeCORE ? refetchNativeCoreBalance : refetchERC20CoreBalance
  
  const { data: btcBalanceData, refetch: refetchBtcBalance, isError: btcBalanceError, isLoading: btcBalanceLoading } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!btcTokenAddress,
    },
  })

  // Remove non-existent functions - basic StakeBasket only has deposit()
  // Mock static data until we switch to the proper dual staking contract
  const userStakeInfo = null
  const tierStatus = null
  const pendingRewards = null
  const userStakeInfoError = null
  const userStakeInfoLoading = false
  const tierStatusError = null 
  const tierStatusLoading = false
  
  const refetchStakeInfo = () => {
    console.log('Stake info refresh - using mock data since basic StakeBasket has limited functions')
  }
  
  // Only check CORE allowance for ERC-20 tokens (testnet), native ETH doesn't need approval
  const { data: coreAllowance, refetch: refetchCoreAllowance } = useReadContract({
    address: coreTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!coreTokenAddress && !!stakingContractAddress && !isNativeCORE // Only for ERC-20 CORE
    }
  })

  const { data: btcAllowance, refetch: refetchBtcAllowance } = useReadContract({
    address: btcTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && stakingContractAddress ? [address, stakingContractAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!btcTokenAddress && !!stakingContractAddress
    }
  })

  const parsedCoreAmount = useMemo(() => {
    try {
      if (!coreAmount) return 0n
      // For local hardhat, MockCORE uses 8 decimals like BTC
      if (currentChainId === 31337) {
        return BigInt(Math.floor(parseFloat(coreAmount) * 10**8))
      }
      // For testnet, use 18 decimals
      return parseEther(coreAmount)
    } catch {
      return 0n
    }
  }, [coreAmount, currentChainId])

  const parsedBtcAmount = useMemo(() => {
    try {
      const val = parseFloat(btcAmount)
      if (isNaN(val)) return 0n
      return BigInt(Math.floor(val * 10**8))
    } catch {
      return 0n
    }
  }, [btcAmount])

  const { writeContract: writeDualStake, data: stakeHash, isPending: isStaking } = useWriteContract()
  const { writeContract: writeUnstake, data: unstakeHash, isPending: isUnstaking } = useWriteContract()
  const { writeContract: writeClaimRewards, data: claimHash, isPending: isClaiming } = useWriteContract()
  const { writeContract: writeApproveCORE, data: approveCOREHash } = useWriteContract()
  const { writeContract: writeApproveBTC, data: approveBTCHash } = useWriteContract()

  const { isSuccess: isStakeSuccess, error: stakeError } = useWaitForTransactionReceipt({
    hash: stakeHash,
  })
  
  const { isSuccess: isUnstakeSuccess, error: unstakeError } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  })

  const { isSuccess: isClaimSuccess, error: claimError } = useWaitForTransactionReceipt({
    hash: claimHash,
  })
  
  const { isSuccess: isApproveCORESuccess, isLoading: isApprovingCoreTx, error: approveCOREError } = useWaitForTransactionReceipt({
    hash: approveCOREHash,
  })
  
  const { isSuccess: isApproveBTCSuccess, isLoading: isApprovingBtcTx, error: approveBTCError } = useWaitForTransactionReceipt({
    hash: approveBTCHash,
  })
  
  const needsCoreApproval = useMemo(() => {
    console.log('🔍 CORE Approval Check:', {
      isNativeCORE,
      currentChainId,
      isAwaitingCoreApproval,
      parsedCoreAmount: parsedCoreAmount?.toString(),
      coreAllowance: coreAllowance?.toString(),
      coreAmount,
      needsApproval: !isNativeCORE && !isAwaitingCoreApproval && parsedCoreAmount > 0n && (coreAllowance === undefined || (coreAllowance as bigint) < parsedCoreAmount)
    });
    
    // Native tokens (ETH on local, CORE on testnet that's native) never need approval
    if (isNativeCORE) return false;
    
    if (isAwaitingCoreApproval) return false;
    if (!parsedCoreAmount || parsedCoreAmount === 0n) return false
    
    // If allowance data hasn't loaded yet, assume approval is needed
    if (coreAllowance === undefined) return true
    
    // Check if current allowance is sufficient
    return (coreAllowance as bigint) < parsedCoreAmount
  }, [isNativeCORE, coreAllowance, parsedCoreAmount, isAwaitingCoreApproval, coreAmount])

  const needsBtcApproval = useMemo(() => {
    console.log('🔍 BTC Approval Check:', {
      isAwaitingBtcApproval,
      parsedBtcAmount: parsedBtcAmount?.toString(),
      btcAllowance: btcAllowance?.toString(),
      btcAmount,
      needsApproval: !isAwaitingBtcApproval && parsedBtcAmount > 0n && (btcAllowance === undefined || (btcAllowance as bigint) < parsedBtcAmount)
    });
    
    if (isAwaitingBtcApproval) return false;
    if (!parsedBtcAmount || parsedBtcAmount === 0n) return false
    if (btcAllowance === undefined) return true
    return (btcAllowance as bigint) < parsedBtcAmount
  }, [btcAllowance, parsedBtcAmount, isAwaitingBtcApproval, btcAmount])

  // Enhanced error parsing function
  const parseContractError = (error: any): { title: string; description: string; isContractIssue: boolean } => {
    const errorString = error?.message || error?.toString() || 'Unknown error'
    
    console.log('🚨 Full error details:', {
      error,
      message: error?.message,
      cause: error?.cause,
      details: error?.details,
      data: error?.data,
      code: error?.code
    })

    // Check for specific contract errors
    if (errorString.includes('execution reverted')) {
      if (errorString.includes('caller is not the StakeBasket contract')) {
        return {
          title: '🚨 Contract Configuration Error',
          description: `The staking contract is not authorized to mint tokens. Run: "npx hardhat run scripts/fix-minting-authorization.cjs --network ${chainId === 1114 ? 'coreTestnet' : 'localhost'}" to fix this deployment issue.`,
          isContractIssue: true
        }
      }
      if (errorString.includes('insufficient allowance') || errorString.includes('ERC20: insufficient allowance')) {
        return {
          title: 'Token Approval Required',
          description: 'Please approve your tokens first before staking. Click the approval buttons above.',
          isContractIssue: false
        }
      }
      if (errorString.includes('insufficient balance') || errorString.includes('ERC20: transfer amount exceeds balance')) {
        return {
          title: 'Insufficient Token Balance',
          description: 'You don\'t have enough tokens in your wallet for this transaction.',
          isContractIssue: false
        }
      }
      if (errorString.includes('Minimum deposit not met')) {
        return {
          title: 'Minimum Deposit Required',
          description: `Please deposit at least 0.1 ${chainId === 31337 ? 'ETH' : 'CORE'} and 0.0001 BTC.`,
          isContractIssue: false
        }
      }
      return {
        title: 'Contract Execution Failed',
        description: `Contract reverted: ${errorString.slice(errorString.indexOf('execution reverted:') + 19).trim()}`,
        isContractIssue: true
      }
    }

    // Check for network/connection errors
    if (errorString.includes('network') || errorString.includes('connection')) {
      return {
        title: 'Network Connection Error',
        description: 'Unable to connect to the blockchain network. Please check your internet connection and try again.',
        isContractIssue: false
      }
    }

    // Check for gas errors
    if (errorString.includes('gas') || errorString.includes('out of gas')) {
      return {
        title: 'Gas Estimation Failed',
        description: 'Transaction requires more gas than estimated. Please try increasing gas limit or try again later.',
        isContractIssue: false
      }
    }

    // Check for user rejection
    if (errorString.includes('rejected') || errorString.includes('denied') || errorString.includes('cancelled')) {
      return {
        title: 'Transaction Cancelled',
        description: 'You cancelled the transaction in your wallet.',
        isContractIssue: false
      }
    }

    // Check for contract not found
    if (errorString.includes('contract not deployed') || errorString.includes('no contract code')) {
      return {
        title: 'Contract Not Found',
        description: 'The staking contract is not deployed on this network. Please check your network connection.',
        isContractIssue: true
      }
    }

    // Default fallback
    return {
      title: 'Transaction Failed',
      description: errorString.length > 100 ? errorString.slice(0, 100) + '...' : errorString,
      isContractIssue: false
    }
  }

  useEffect(() => {
    if (isStakeSuccess && stakeHash) {
      toast.success('Dual staking confirmed!', { 
        description: `Hash: ${stakeHash}`,
        id: `stake-success-${stakeHash}` // Unique ID prevents duplicates
      })
      refetchStakeInfo()
      refetchCoreBalance()
      refetchBtcBalance()
    }
    if (stakeError) {
      const parsedError = parseContractError(stakeError)
      
      if (parsedError.isContractIssue) {
        toast.error(parsedError.title, { 
          description: `⚠️ CONTRACT ISSUE: ${parsedError.description}`,
          duration: 8000,
          id: `stake-error-${Date.now()}` // Unique ID prevents duplicates
        })
      } else {
        toast.error(parsedError.title, { 
          description: parsedError.description,
          id: `stake-error-${Date.now()}` // Unique ID prevents duplicates
        })
      }
    }
  }, [isStakeSuccess, stakeError, stakeHash, refetchStakeInfo, refetchCoreBalance, refetchBtcBalance, chainId])

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
    if (approveCOREHash) {
      setIsAwaitingCoreApproval(true);
      toast.info('CORE approval transaction sent...', { description: `Hash: ${approveCOREHash}` });
    }
  }, [approveCOREHash]);
  
  useEffect(() => {
    if (isApproveCORESuccess) {
      toast.success('CORE tokens approved!', { description: `Hash: ${approveCOREHash}` })
      setIsAwaitingCoreApproval(false);
      refetchCoreAllowance();
    }
    if (approveCOREError) {
      const parsedError = parseContractError(approveCOREError)
      
      if (parsedError.isContractIssue) {
        toast.error(parsedError.title, { 
          description: `⚠️ CONTRACT ISSUE: ${parsedError.description}`,
          duration: 8000
        })
      } else {
        toast.error(parsedError.title, { description: parsedError.description })
      }
      setIsAwaitingCoreApproval(false);
    }
  }, [isApproveCORESuccess, approveCOREError, approveCOREHash, refetchCoreAllowance])

  useEffect(() => {
    if (approveBTCHash) {
      setIsAwaitingBtcApproval(true);
      toast.info('BTC approval transaction sent...', { description: `Hash: ${approveBTCHash}` });
    }
  }, [approveBTCHash]);

  useEffect(() => {
    if (isApproveBTCSuccess) {
      toast.success('BTC tokens approved!', { description: `Hash: ${approveBTCHash}` })
      setIsAwaitingBtcApproval(false);
      refetchBtcAllowance();
    }
    if (approveBTCError) {
      toast.error('BTC approval failed', { description: approveBTCError.message })
      setIsAwaitingBtcApproval(false);
    }
  }, [isApproveBTCSuccess, approveBTCError, approveBTCHash, refetchBtcAllowance])

  useEffect(() => {
    if (userStakeInfo && tierStatus) {
      const [coreStaked, btcStaked, shares, rewards] = userStakeInfo as [bigint, bigint, bigint, bigint, bigint]
      const [tier, , , ratio, , apy] = tierStatus as [number, bigint, bigint, bigint, bigint, bigint]
      const actualTier = (coreStaked === 0n && btcStaked === 0n) ? DualTier.None : Number(tier);
      setStakeInfo({
        coreStaked: formatEther(coreStaked),
        btcStaked: (Number(btcStaked) / 10**8).toFixed(8),
        shares: (Number(shares) / 10**8).toFixed(4),
        rewards: pendingRewards ? formatEther(pendingRewards as bigint) : formatEther(rewards),
        tier: actualTier,
        ratio: ratio.toString(),
        apy: actualTier === DualTier.None ? '0' : (Number(apy) / 100).toString()
      })
    }
  }, [userStakeInfo, tierStatus, pendingRewards])

  const calculateTier = (core: string, btc: string): DualTier => {
    const coreNum = Number(core) || 0
    const btcNum = Number(btc) || 0
    
    // Base minimum deposit requirements  
    const minCORE = 0.1   // Minimum 0.1 CORE/ETH
    const minBTC = 0.0001 // Minimum 0.0001 BTC
    
    if (btcNum < minBTC || coreNum < minCORE) return DualTier.None
    if (btcNum === 0 || coreNum === 0) return DualTier.None
    
    // Calculate total value (using CORE as base unit)
    // BTC is more valuable, so it contributes more to total value
    const totalCoreValue = coreNum + (btcNum * 50000) // Approximate BTC:CORE price ratio
    
    // Calculate actual CORE:BTC token ratio (not USD values)
    const tokenRatio = coreNum / btcNum
    
    // Enhanced tier requirements: BOTH ratio AND minimum amounts for EACH token
    // Higher tiers now require meaningful BTC deposits, not just tiny amounts
    
    // Satoshi Tier: 16,000:1 ratio + 100 CORE total + minimum 0.01 BTC
    if (tokenRatio >= 16000 && totalCoreValue >= 100 && btcNum >= 0.01) {
      return DualTier.Satoshi
    }
    
    // Super Tier: 6,000:1 ratio + 50 CORE total + minimum 0.005 BTC
    if (tokenRatio >= 6000 && totalCoreValue >= 50 && btcNum >= 0.005) {
      return DualTier.Super
    }
    
    // Boost Tier: 2,000:1 ratio + 20 CORE total + minimum 0.002 BTC
    if (tokenRatio >= 2000 && totalCoreValue >= 20 && btcNum >= 0.002) {
      return DualTier.Boost
    }
    
    // Base Tier: Any ratio + minimum 1 CORE total + minimum 0.0005 BTC
    if (totalCoreValue >= 1 && btcNum >= 0.0005) {
      return DualTier.Base
    }
    
    return DualTier.None
  }

  const getOptimalCoreAmount = (btc: string, targetTier: DualTier): string => {
    const btcNum = Number(btc) || 0
    const requiredRatio = TIER_RATIOS[targetTier]
    return (btcNum * requiredRatio).toString()
  }

  const handleAutoCalculate = (targetTier: DualTier) => {
    const requiredRatio = TIER_RATIOS[targetTier]
    
    console.log('Auto-calculate:', { targetTier, requiredRatio })
    
    // Define minimum BTC amounts for each tier (key change!)
    const tierMinBTC = {
      [DualTier.Base]: 0.0005,    // 0.0005 BTC minimum
      [DualTier.Boost]: 0.002,    // 0.002 BTC minimum  
      [DualTier.Super]: 0.005,    // 0.005 BTC minimum
      [DualTier.Satoshi]: 0.01    // 0.01 BTC minimum
    }
    
    // Define minimum total values for each tier
    const tierMinValues = {
      [DualTier.Base]: 1,      // 1 CORE total value
      [DualTier.Boost]: 20,    // 20 CORE total value  
      [DualTier.Super]: 50,    // 50 CORE total value
      [DualTier.Satoshi]: 100  // 100 CORE total value
    }
    
    const minBTC = tierMinBTC[targetTier] || 0.0005
    const minTotalValue = tierMinValues[targetTier] || 1
    
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
    
    console.log('Set amounts:', { 
      tier: targetTier, 
      btc: btcAmount, 
      core: coreAmount,
      ratio: coreAmount / btcAmount,
      totalValue: coreAmount + (btcAmount * 50000),
      minBTCRequired: minBTC,
      minTotalRequired: minTotalValue
    })
  }

  const handleApproveCORE = () => {
    console.log('🚨 APPROVE CORE DEBUG:', {
      address,
      coreTokenAddress,
      parsedCoreAmount: parsedCoreAmount?.toString(),
      coreAmount,
      stakingContractAddress,
      currentChainId,
      canProceed: !!(address && coreTokenAddress && parsedCoreAmount && parsedCoreAmount > 0n)
    });
    
    if (!address || !coreTokenAddress || !parsedCoreAmount || parsedCoreAmount === 0n) {
      console.log('❌ Cannot approve CORE: missing requirements');
      return;
    }
    
    console.log('🔄 Calling approve function with:', {
      tokenContract: coreTokenAddress,
      spender: stakingContractAddress,
      amount: parsedCoreAmount.toString(),
      amountFormatted: (Number(parsedCoreAmount) / 1e18).toString()
    });
    
    writeApproveCORE({
      address: coreTokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [stakingContractAddress as `0x${string}`, parsedCoreAmount],
    })
  }

  const handleApproveBTC = () => {
    if (!address || !btcTokenAddress || !parsedBtcAmount) return
    console.log('🔄 Approving BTC tokens...', {
      token: btcTokenAddress,
      spender: stakingContractAddress,
      amount: parsedBtcAmount.toString(),
      isTestnet: currentChainId === 1114
    })
    writeApproveBTC({
      address: btcTokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [stakingContractAddress as `0x${string}`, parsedBtcAmount],
    })
  }

  const handleDualStake = () => {
    // Check minimum deposit requirements - allow depositing just CORE or just BTC
    const coreNum = Number(coreAmount) || 0
    const btcNum = Number(btcAmount) || 0
    
    console.log('🚨 DETAILED DEBUG:', {
      coreAmount,
      btcAmount,
      coreNum,
      btcNum,
      parsedCoreAmount: parsedCoreAmount.toString(),
      parsedBtcAmount: parsedBtcAmount.toString(),
      currentChainId,
      coreAmountEmpty: !coreAmount,
      btcAmountEmpty: !btcAmount
    });
    
    // Must have at least one asset for dual staking
    if (coreNum === 0 && btcNum === 0) {
      toast.error('Please enter CORE and/or BTC amounts to deposit')
      return
    }
    
    // Check minimums only if the asset is being deposited
    if (coreNum > 0 && coreNum < 0.1) {
      toast.error(`Minimum 0.1 ${chainId === 31337 ? 'ETH' : 'CORE'} required`)
      return
    }
    
    if (btcNum > 0 && btcNum < 0.0001) {
      toast.error('Minimum 0.0001 BTC required')  
      return
    }
    
    if (!address) {
      toast.error('Please connect your wallet')
      return
    }
    
    // Check parsed amounts are not zero
    if (parsedCoreAmount === 0n && parsedBtcAmount === 0n) {
      toast.error('Invalid amounts - both parsed amounts are zero')
      console.error('❌ Both parsed amounts are zero:', {
        parsedCoreAmount: parsedCoreAmount.toString(),
        parsedBtcAmount: parsedBtcAmount.toString(),
        coreAmount,
        btcAmount
      })
      return
    }
    
    // Check approvals only for tokens being deposited (not needed for native tokens)
    if (coreNum > 0 && needsCoreApproval) {
      toast.error(`Please approve ${chainId === 31337 ? 'ETH' : 'CORE'} tokens first`)
      return
    }
    
    if (btcNum > 0 && needsBtcApproval) {
      toast.error('Please approve BTC tokens first')
      return
    }
    try {
      console.log('🚨 DUAL STAKE DEBUG:', {
        stakingContractAddress,
        parsedCoreAmount: parsedCoreAmount.toString(),
        parsedBtcAmount: parsedBtcAmount.toString(),
        coreAmount,
        btcAmount,
        needsCoreApproval,
        needsBtcApproval,
        isNativeCORE
      });
      
      // Use DualStakingBasket depositNativeCORE function with native CORE + BTC
      const stakeCall = {
        address: stakingContractAddress as `0x${string}`,
        abi: DUAL_STAKING_BASKET_ABI,
        functionName: 'depositNativeCORE',
        args: [parsedBtcAmount], // Only BTC amount as parameter
        value: parsedCoreAmount, // Send native CORE as msg.value
      };
      
      writeDualStake(stakeCall)
      
    } catch (error) {
      console.error('❌ Dual stake setup error:', error)
      const parsedError = parseContractError(error)
      
      if (parsedError.isContractIssue) {
        toast.error(parsedError.title, { 
          description: `⚠️ CONTRACT ISSUE: ${parsedError.description}`,
          duration: 8000
        })
      } else {
        toast.error(parsedError.title, { description: parsedError.description })
      }
    }
  }

  const handleUnstake = () => {
    toast.error('Unstaking not available - basic StakeBasket contract does not support unstaking')
  }

  const handleClaimRewards = () => {
    toast.error('Claim rewards not available - basic StakeBasket contract does not support reward claims')
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
  
  // Debug balance data
  console.log('💰 Balance Debug:', {
    address,
    coreBalanceData: coreBalanceData?.toString(),
    btcBalanceData: btcBalanceData?.toString(),
    coreBalanceFormatted,
    btcBalanceFormatted,
    coreTokenAddress,
    btcTokenAddress
  })
  const currentTierInfo = tierInfo[stakeInfo.tier as DualTier]
  const proposedTier = calculateTier(coreAmount, btcAmount)
  const proposedTierInfo = tierInfo[proposedTier]

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
                <span className="text-muted-foreground">Automated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Audited Smart Contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                <span className="text-muted-foreground">Tier Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
              <Coins className="h-4 w-4 text-chart-1" />
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
              <Coins className="h-4 w-4 text-chart-2" />
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
              <TrendingUp className="h-4 w-4 text-chart-2" />
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
      {Number(stakeInfo.coreStaked) > 0 || Number(stakeInfo.btcStaked) > 0 ? (
        <Card className="bg-gradient-to-r from-primary/5 to-chart-3/5 border-2 border-dashed border-primary/30">
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
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Asset Allocation</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                        CORE
                      </span>
                      <span className="font-mono">
                        {((Number(stakeInfo.coreStaked) / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-chart-1 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((Number(stakeInfo.coreStaked) / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100) || 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                        BTC
                      </span>
                      <span className="font-mono">
                        {((Number(stakeInfo.btcStaked) * 50000 / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-chart-2 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((Number(stakeInfo.btcStaked) * 50000 / (Number(stakeInfo.coreStaked) + Number(stakeInfo.btcStaked) * 50000)) * 100) || 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Tier Achievement</h4>
                <div className="space-y-3">
                  {Object.entries(tierInfo)
                    .filter(([tierKey]) => Number(tierKey) >= 0)
                    .map(([tierKey, info]) => {
                    const isActive = Number(tierKey) <= stakeInfo.tier && stakeInfo.tier >= 0
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
                    <span className="text-sm font-medium text-chart-2">
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
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-chart-2" />
                  <div>
                    <div className="font-medium">Auto-Rebalancing</div>
                    <div className="text-muted-foreground text-xs">Maintains optimal {chainId === 31337 ? 'ETH' : 'CORE'}:BTC ratios</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Maximized Yields</div>
                    <div className="text-muted-foreground text-xs">Tier-optimized returns</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-chart-3" />
                  <div>
                    <div className="font-medium">Professional Management</div>
                    <div className="text-muted-foreground text-xs">Set and forget strategy</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <h3 className="font-semibold">Deposit Your Tokens</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your {chainId === 31337 ? 'ETH' : 'CORE'} and BTC tokens to the smart contract. We handle the optimal ratio calculations automatically.
                  </p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-chart-2/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-chart-2 font-bold">2</span>
                  </div>
                  <h3 className="font-semibold">We Optimize & Stake</h3>
                  <p className="text-sm text-muted-foreground">
                    Our smart contract automatically stakes your {chainId === 31337 ? 'ETH (for testing)' : 'tokens with CoreDAO validators'} at the highest reward tier.
                  </p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-chart-3/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-chart-3 font-bold">3</span>
                  </div>
                  <h3 className="font-semibold">Earn & Compound</h3>
                  <p className="text-sm text-muted-foreground">
                    Rewards are automatically collected and reinvested. Your position grows through compound interest.
                  </p>
                </div>
              </div>
              <div className="mt-8 bg-muted/30 rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-center">Smart Contract Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-chart-2 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Auto-Rebalancing</div>
                        <div className="text-muted-foreground text-xs">Maintains optimal 16,000:1 CORE:BTC ratio for maximum 20% APY</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Compound Rewards</div>
                        <div className="text-muted-foreground text-xs">All staking rewards automatically reinvested to grow your position</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-chart-3 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Liquid Shares</div>
                        <div className="text-muted-foreground text-xs">Receive basket tokens representing your proportional ownership</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-chart-1 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium">Anytime Withdrawal</div>
                        <div className="text-muted-foreground text-xs">Exit the strategy at any time and receive your proportional assets</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="font-semibold text-chart-2 mb-2">Why Use This Strategy?</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>✓ Higher yields than individual staking</li>
                      <li>✓ No manual ratio management needed</li>
                      <li>✓ Professional-grade optimization</li>
                      <li>✓ Fully automated and transparent</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-chart-1 mb-2">Important to Know</h4>
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
          <div className="bg-muted/30 rounded-lg p-6 space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-2">Choose Your Strategy</h3>
              <p className="text-sm text-muted-foreground">Select a target yield to get optimal {chainId === 31337 ? 'ETH' : 'CORE'} and BTC amounts</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(tierInfo)
                .filter(([tierKey]) => Number(tierKey) !== DualTier.None)
                .reverse().map(([tierKey, info]) => (
                <button
                  key={tierKey}
                  onClick={() => handleAutoCalculate(Number(tierKey) as DualTier)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-lg hover:scale-105 active:scale-95 ${
                    Number(tierKey) === DualTier.Satoshi 
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50 hover:bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                >
                  <div className={`font-semibold text-sm ${info.color}`}>
                    {info.name}
                  </div>
                  <div className="text-lg font-bold text-chart-2 mt-1">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Or Enter Custom Amounts</h3>
              <button 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {}}
              >
                Advanced Options
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {chainId === 31337 ? 'ETH' : 'CORE'} Tokens
                    {!isNativeCORE && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        ERC-20 Token
                      </span>
                    )}
                  </span>
                  <div className="mt-1 relative">
                    <Input
                      type="number"
                      value={coreAmount}
                      onChange={(e) => setCoreAmount(e.target.value)}
                      placeholder="0.00"
                      className="text-right font-mono text-lg pl-12"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-chart-1 font-semibold text-sm">
                      {chainId === 31337 ? 'ETH' : 'CORE'}
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
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                  💡 Dual Staking uses your native CORE balance + BTC tokens from faucet. Get BTC tokens at /faucet first.
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
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-chart-2 font-semibold text-sm">
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
          {/* Minimum Requirements Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-sm font-medium text-amber-800 mb-2">⚠️ Enhanced Tier Requirements - BTC Incentivized!</h4>
            <div className="text-xs text-amber-700 space-y-2">
              <div>
                <p className="font-medium">Base Requirements:</p>
                <p>• Minimum {chainId === 31337 ? '0.1 ETH' : '0.1 CORE'} + 0.0001 BTC for any tier</p>
              </div>
              <div>
                <p className="font-medium">Tier-Specific Requirements (Ratio + Total Value + BTC Minimum):</p>
                <p>• <span className="font-medium text-gray-600">Base:</span> Any ratio + 1 CORE total + <span className="text-orange-600 font-bold">0.0005 BTC</span></p>
                <p>• <span className="font-medium text-blue-600">Boost:</span> 2,000:1 ratio + 20 CORE total + <span className="text-orange-600 font-bold">0.002 BTC</span></p>
                <p>• <span className="font-medium text-purple-600">Super:</span> 6,000:1 ratio + 50 CORE total + <span className="text-orange-600 font-bold">0.005 BTC</span></p>
                <p>• <span className="font-medium text-yellow-600">Satoshi:</span> 16,000:1 ratio + 100 CORE total + <span className="text-orange-600 font-bold">0.01 BTC</span></p>
              </div>
              <div className="bg-orange-100 border border-orange-300 rounded p-2 mt-2">
                <p className="text-orange-800 font-medium">🟧 BTC is now properly rewarded! Higher tiers require meaningful BTC holdings, not just tiny amounts.</p>
              </div>
            </div>
          </div>
          
          {coreAmount && btcAmount && (
            <div className="p-4 bg-gradient-to-r from-primary/5 to-chart-2/5 rounded-lg border-2 border-dashed border-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-primary">Your Proposed Allocation</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Target Tier</p>
                  <p className={`text-xl font-bold ${proposedTierInfo.color}`}>
                    {proposedTierInfo.name}
                  </p>
                  <p className="text-sm text-chart-2 font-medium">{proposedTierInfo.apy} Annual Yield</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">CORE Allocation</p>
                  <p className="text-xl font-mono font-bold">
                    {(() => {
                      const coreNum = Number(coreAmount) || 0
                      const btcNum = Number(btcAmount) || 0
                      if (btcNum === 0) return '100%'
                      const ratio = Math.round(coreNum / btcNum)
                      return `${ratio.toLocaleString()}:1`
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">CORE:BTC token ratio</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Basket Management</p>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1 text-chart-2">
                      <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
                      Auto-rebalancing enabled
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Reward compounding active
                    </div>
                    <div className="flex items-center gap-1 text-chart-3">
                      <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                      Professional management
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  💼 <strong>Smart Contract Benefits:</strong> Your deposit will be professionally managed to maintain this tier 
                  automatically, even as market prices change. The basket handles all complexity for you.
                </p>
              </div>
            </div>
          )}
          <div className="space-y-4 pt-4 border-t border-border">
            {(() => {
              console.log('🚨 UI Approval Check:', { needsCoreApproval, needsBtcApproval, showApprovalUI: needsCoreApproval || needsBtcApproval });
              return (needsCoreApproval || needsBtcApproval);
            })() && (
              <div className="bg-chart-1/5 border border-chart-1/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-chart-1" />
                  <span className="text-sm font-medium text-chart-1">
                    Token Approval Required
                  </span>
                </div>
                <p className="text-xs text-chart-1/80 mb-3">
                  You need to approve the smart contract to use your tokens. This is a one-time action for security.
                </p>
                <div className="space-y-2">
                  {needsCoreApproval && (
                    <Button 
                      onClick={handleApproveCORE}
                      disabled={isApprovingCoreTx || isAwaitingCoreApproval}
                      className="w-full"
                      variant="outline"
                    >
                      {isApprovingCoreTx ? `Approving ${chainId === 31337 ? 'ETH' : 'CORE'}...` : `✓ Approve ${chainId === 31337 ? 'ETH' : 'CORE'} Tokens`}
                    </Button>
                  )}
                  {needsBtcApproval && (
                    <Button 
                      onClick={handleApproveBTC}
                      disabled={isApprovingBtcTx || isAwaitingBtcApproval}
                      className="w-full"
                      variant="outline"
                    >
                      {isApprovingBtcTx ? 'Approving BTC...' : '✓ Approve BTC Tokens'}
                    </Button>
                  )}
                </div>
              </div>
            )}
            <Button 
              onClick={handleDualStake}
              disabled={isStaking || ((!coreAmount || Number(coreAmount) === 0) && (!btcAmount || Number(btcAmount) === 0)) || needsCoreApproval || needsBtcApproval}
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
            {Object.entries(tierInfo)
              .filter(([tierKey]) => Number(tierKey) !== DualTier.None)
              .map(([tierKey, info]) => (
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
                    <span className="text-sm font-semibold text-chart-2">{info.apy}</span>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {info.description}
                    </div>
                    {Number(tierKey) === DualTier.Satoshi && (
                      <div className="mt-2 text-xs bg-chart-2/10 text-chart-2 p-2 rounded border border-chart-2/20">
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
      <Card className="bg-muted/20 border-muted">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-foreground">Built for Safety & Transparency</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-chart-2/10 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-chart-2 rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Audited Smart Contracts</div>
                  <div className="text-muted-foreground text-xs">Code reviewed for security vulnerabilities</div>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-primary rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Open Source</div>
                  <div className="text-muted-foreground text-xs">All contract code publicly verifiable</div>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-chart-3/10 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-chart-3 rounded-full"></div>
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