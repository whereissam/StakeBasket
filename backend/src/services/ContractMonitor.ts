import { createPublicClient, http, formatEther, parseAbi } from 'viem'
import { coreTestnet } from '../config/chains'
import { CONTRACT_ADDRESSES } from '../config/contracts'

export interface ContractMetrics {
  totalAUM: string
  navPerShare: string
  totalSupply: string
  gasUsage: {
    deposit: number
    withdraw: number
    average: number
  }
  transactionCount: {
    deposits: number
    withdrawals: number
    total: number
  }
  errorRate: number
  performanceScore: number
  timestamp: string
}

export interface PriceData {
  corePrice: string
  lstBTCPrice: string
  btcPrice: string
  lastUpdated: string
  isStale: boolean
  deviation: number
}

export class ContractMonitor {
  private client: any
  private contracts: any

  constructor() {
    this.client = createPublicClient({
      chain: coreTestnet,
      transport: http()
    })

    // Contract ABIs (simplified for monitoring)
    const stakeBasketAbi = parseAbi([
      'function getTotalAUM() view returns (uint256)',
      'function getNAVPerShare() view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function paused() view returns (bool)',
      'event Deposited(address indexed user, uint256 amount, uint256 shares)',
      'event Redeemed(address indexed user, uint256 shares, uint256 amount)'
    ])

    const priceFeedAbi = parseAbi([
      'function getPrice(string memory asset) view returns (uint256)',
      'function isStale(string memory asset) view returns (bool)',
      'function getLastUpdated(string memory asset) view returns (uint256)'
    ])

    this.contracts = {
      stakeBasket: {
        address: CONTRACT_ADDRESSES.coreTestnet.StakeBasket,
        abi: stakeBasketAbi
      },
      priceFeed: {
        address: CONTRACT_ADDRESSES.coreTestnet.PriceFeed,
        abi: priceFeedAbi
      }
    }
  }

  async collectMetrics(): Promise<ContractMetrics> {
    try {
      // Get basic contract metrics
      const [totalAUM, navPerShare, totalSupply, isPaused] = await Promise.all([
        this.client.readContract({
          address: this.contracts.stakeBasket.address,
          abi: this.contracts.stakeBasket.abi,
          functionName: 'getTotalAUM'
        }),
        this.client.readContract({
          address: this.contracts.stakeBasket.address,
          abi: this.contracts.stakeBasket.abi,
          functionName: 'getNAVPerShare'
        }),
        this.client.readContract({
          address: this.contracts.stakeBasket.address,
          abi: this.contracts.stakeBasket.abi,
          functionName: 'totalSupply'
        }),
        this.client.readContract({
          address: this.contracts.stakeBasket.address,
          abi: this.contracts.stakeBasket.abi,
          functionName: 'paused'
        })
      ])

      // Get recent transaction data
      const recentBlocks = await this.getRecentTransactionData()
      
      // Calculate performance metrics
      const performanceScore = this.calculatePerformanceScore({
        isPaused,
        transactionSuccess: recentBlocks.successRate,
        gasEfficiency: recentBlocks.avgGasUsed < 500000 ? 1 : 0.5
      })

      return {
        totalAUM: formatEther(totalAUM as bigint),
        navPerShare: formatEther(navPerShare as bigint),
        totalSupply: formatEther(totalSupply as bigint),
        gasUsage: {
          deposit: recentBlocks.avgDepositGas,
          withdraw: recentBlocks.avgWithdrawGas,
          average: recentBlocks.avgGasUsed
        },
        transactionCount: {
          deposits: recentBlocks.depositCount,
          withdrawals: recentBlocks.withdrawCount,
          total: recentBlocks.totalTxns
        },
        errorRate: 1 - recentBlocks.successRate,
        performanceScore,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error collecting contract metrics:', error)
      throw error
    }
  }

  async checkPriceFeeds(): Promise<PriceData> {
    try {
      const [corePrice, lstBTCPrice, btcPrice] = await Promise.all([
        this.client.readContract({
          address: this.contracts.priceFeed.address,
          abi: this.contracts.priceFeed.abi,
          functionName: 'getPrice',
          args: ['CORE']
        }),
        this.client.readContract({
          address: this.contracts.priceFeed.address,
          abi: this.contracts.priceFeed.abi,
          functionName: 'getPrice',
          args: ['lstBTC']
        }),
        this.client.readContract({
          address: this.contracts.priceFeed.address,
          abi: this.contracts.priceFeed.abi,
          functionName: 'getPrice',
          args: ['BTC']
        })
      ])

      const [coreStale, lstBTCStale, btcStale] = await Promise.all([
        this.client.readContract({
          address: this.contracts.priceFeed.address,
          abi: this.contracts.priceFeed.abi,
          functionName: 'isStale',
          args: ['CORE']
        }),
        this.client.readContract({
          address: this.contracts.priceFeed.address,
          abi: this.contracts.priceFeed.abi,
          functionName: 'isStale',
          args: ['lstBTC']
        }),
        this.client.readContract({
          address: this.contracts.priceFeed.address,
          abi: this.contracts.priceFeed.abi,
          functionName: 'isStale',
          args: ['BTC']
        })
      ])

      const lastUpdated = await this.client.readContract({
        address: this.contracts.priceFeed.address,
        abi: this.contracts.priceFeed.abi,
        functionName: 'getLastUpdated',
        args: ['CORE']
      })

      // Calculate price deviation (simplified)
      const currentCorePrice = Number(formatEther(corePrice as bigint)) * 100 // Convert to cents
      const expectedCorePrice = 150 // $1.50 in cents
      const deviation = Math.abs(currentCorePrice - expectedCorePrice) / expectedCorePrice

      return {
        corePrice: (Number(formatEther(corePrice as bigint)) * 100).toFixed(8), // 8 decimals
        lstBTCPrice: (Number(formatEther(lstBTCPrice as bigint)) * 100).toFixed(8),
        btcPrice: (Number(formatEther(btcPrice as bigint)) * 100).toFixed(8),
        lastUpdated: new Date(Number(lastUpdated) * 1000).toISOString(),
        isStale: coreStale || lstBTCStale || btcStale,
        deviation
      }
    } catch (error) {
      console.error('Error checking price feeds:', error)
      throw error
    }
  }

  private async getRecentTransactionData() {
    try {
      // Get recent blocks (last 100 blocks)
      const latestBlock = await this.client.getBlockNumber()
      const fromBlock = latestBlock - 100n

      // This is a simplified version - in production, you'd use event logs
      return {
        depositCount: 5,
        withdrawCount: 3,
        totalTxns: 8,
        avgDepositGas: 180000,
        avgWithdrawGas: 220000,
        avgGasUsed: 200000,
        successRate: 0.95
      }
    } catch (error) {
      console.error('Error getting transaction data:', error)
      return {
        depositCount: 0,
        withdrawCount: 0,
        totalTxns: 0,
        avgDepositGas: 0,
        avgWithdrawGas: 0,
        avgGasUsed: 0,
        successRate: 1
      }
    }
  }

  private calculatePerformanceScore(metrics: {
    isPaused: boolean
    transactionSuccess: number
    gasEfficiency: number
  }): number {
    let score = 100

    // Deduct points for being paused
    if (metrics.isPaused) score -= 50

    // Deduct points for low transaction success rate
    score -= (1 - metrics.transactionSuccess) * 30

    // Deduct points for poor gas efficiency
    score -= (1 - metrics.gasEfficiency) * 20

    return Math.max(0, score)
  }

  async getContractEvents(fromBlock: number = -100) {
    try {
      const latestBlock = await this.client.getBlockNumber()
      const targetBlock = fromBlock < 0 ? latestBlock + BigInt(fromBlock) : BigInt(fromBlock)

      const logs = await this.client.getLogs({
        address: this.contracts.stakeBasket.address,
        fromBlock: targetBlock,
        toBlock: latestBlock
      })

      return logs.map(log => ({
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        topics: log.topics,
        data: log.data,
        timestamp: new Date().toISOString() // In production, get actual block timestamp
      }))
    } catch (error) {
      console.error('Error getting contract events:', error)
      return []
    }
  }
}