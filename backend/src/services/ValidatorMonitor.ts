import { createPublicClient, http, parseAbi } from 'viem'
import { coreTestnet2 } from '../config/chains'
import { CONTRACT_ADDRESSES } from '../config/contracts'

export interface ValidatorInfo {
  address: string
  name: string
  isActive: boolean
  totalDelegated: string
  commission: number
  uptime: number
  performance: number
  slashingHistory: SlashingEvent[]
  lastUpdate: string
}

export interface SlashingEvent {
  timestamp: string
  amount: string
  reason: string
  validator: string
}

export interface ValidatorMetrics {
  validators: ValidatorInfo[]
  totalValidators: number
  activeValidators: number
  averageUptime: number
  averagePerformance: number
  totalSlashingEvents: number
  recommendations: string[]
  timestamp: string
}

export class ValidatorMonitor {
  private client: any
  private mockCoreStaking: any

  constructor() {
    this.client = createPublicClient({
      chain: coreTestnet2,
      transport: http()
    })

    // Mock Core Staking ABI for validator monitoring
    const mockCoreStakingAbi = parseAbi([
      'function getValidators() view returns (address[])',
      'function validators(address) view returns (bool isActive, string memory name, uint256 totalDelegated, uint256 commission)',
      'function getTotalDelegated(address validator) view returns (uint256)',
      'function getValidatorPerformance(address validator) view returns (uint256)',
      'event ValidatorSlashed(address indexed validator, uint256 amount, string reason)'
    ])

    this.mockCoreStaking = {
      address: CONTRACT_ADDRESSES.coreTestnet2.MockCoreStaking,
      abi: mockCoreStakingAbi
    }
  }

  async checkValidators(): Promise<ValidatorMetrics> {
    try {
      // Get list of validators
      const validatorAddresses = await this.getValidatorList()
      
      // Get detailed info for each validator
      const validators = await Promise.all(
        validatorAddresses.map(address => this.getValidatorInfo(address))
      )

      // Calculate aggregate metrics
      const activeValidators = validators.filter(v => v.isActive).length
      const averageUptime = validators.reduce((sum, v) => sum + v.uptime, 0) / validators.length
      const averagePerformance = validators.reduce((sum, v) => sum + v.performance, 0) / validators.length
      const totalSlashingEvents = validators.reduce((sum, v) => sum + v.slashingHistory.length, 0)

      // Generate recommendations
      const recommendations = this.generateRecommendations(validators)

      return {
        validators,
        totalValidators: validators.length,
        activeValidators,
        averageUptime,
        averagePerformance,
        totalSlashingEvents,
        recommendations,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error checking validators:', error)
      throw error
    }
  }

  private async getValidatorList(): Promise<string[]> {
    try {
      // In a real implementation, this would call the actual Core staking contract
      // For now, we'll return mock validator addresses
      return [
        '0x1234567890123456789012345678901234567890',
        '0x2345678901234567890123456789012345678901',
        '0x3456789012345678901234567890123456789012'
      ]
    } catch (error) {
      console.error('Error getting validator list:', error)
      return []
    }
  }

  private async getValidatorInfo(address: string): Promise<ValidatorInfo> {
    try {
      // Mock validator data - in production, this would query real validator APIs
      const mockData = this.getMockValidatorData(address)
      
      // Simulate real-time performance metrics
      const performance = this.calculateValidatorPerformance(address)
      const uptime = this.calculateValidatorUptime(address)
      
      return {
        address,
        name: mockData.name,
        isActive: mockData.isActive,
        totalDelegated: mockData.totalDelegated,
        commission: mockData.commission,
        uptime,
        performance,
        slashingHistory: await this.getSlashingHistory(address),
        lastUpdate: new Date().toISOString()
      }
    } catch (error) {
      console.error(`Error getting info for validator ${address}:`, error)
      return {
        address,
        name: 'Unknown Validator',
        isActive: false,
        totalDelegated: '0',
        commission: 0,
        uptime: 0,
        performance: 0,
        slashingHistory: [],
        lastUpdate: new Date().toISOString()
      }
    }
  }

  private getMockValidatorData(address: string) {
    // Mock data for different validators
    const mockValidators = {
      '0x1234567890123456789012345678901234567890': {
        name: 'Validator Alpha',
        isActive: true,
        totalDelegated: '1000000',
        commission: 5
      },
      '0x2345678901234567890123456789012345678901': {
        name: 'Validator Beta',
        isActive: true,
        totalDelegated: '750000',
        commission: 3
      },
      '0x3456789012345678901234567890123456789012': {
        name: 'Validator Gamma',
        isActive: false,
        totalDelegated: '500000',
        commission: 10
      }
    }

    return mockValidators[address as keyof typeof mockValidators] || {
      name: 'Unknown Validator',
      isActive: false,
      totalDelegated: '0',
      commission: 0
    }
  }

  private calculateValidatorPerformance(address: string): number {
    // Simulate performance calculation based on various factors
    const basePerformance = 85
    const randomVariance = (Math.random() - 0.5) * 20 // ±10 points
    const addressHash = parseInt(address.slice(-4), 16)
    const consistencyFactor = (addressHash % 100) / 10 // 0-10 points
    
    return Math.max(0, Math.min(100, basePerformance + randomVariance + consistencyFactor))
  }

  private calculateValidatorUptime(address: string): number {
    // Simulate uptime calculation
    const baseUptime = 95
    const randomVariance = (Math.random() - 0.5) * 10 // ±5 points
    
    return Math.max(0, Math.min(100, baseUptime + randomVariance))
  }

  private async getSlashingHistory(address: string): Promise<SlashingEvent[]> {
    try {
      // In production, this would query blockchain events
      // For now, return mock slashing history
      const mockEvents: SlashingEvent[] = []
      
      // Simulate some slashing events for testing
      if (address === '0x3456789012345678901234567890123456789012') {
        mockEvents.push({
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          amount: '1000',
          reason: 'Double signing',
          validator: address
        })
      }
      
      return mockEvents
    } catch (error) {
      console.error(`Error getting slashing history for ${address}:`, error)
      return []
    }
  }

  private generateRecommendations(validators: ValidatorInfo[]): string[] {
    const recommendations: string[] = []
    
    // Check for inactive validators
    const inactiveValidators = validators.filter(v => !v.isActive)
    if (inactiveValidators.length > 0) {
      recommendations.push(`${inactiveValidators.length} validators are inactive and should be reviewed`)
    }
    
    // Check for low performance validators
    const lowPerformanceValidators = validators.filter(v => v.performance < 70)
    if (lowPerformanceValidators.length > 0) {
      recommendations.push(`${lowPerformanceValidators.length} validators have performance below 70%`)
    }
    
    // Check for high commission validators
    const highCommissionValidators = validators.filter(v => v.commission > 8)
    if (highCommissionValidators.length > 0) {
      recommendations.push(`Consider rebalancing away from ${highCommissionValidators.length} high-commission validators`)
    }
    
    // Check for slashing events
    const slashedValidators = validators.filter(v => v.slashingHistory.length > 0)
    if (slashedValidators.length > 0) {
      recommendations.push(`${slashedValidators.length} validators have recent slashing events`)
    }
    
    // Check for low uptime
    const lowUptimeValidators = validators.filter(v => v.uptime < 95)
    if (lowUptimeValidators.length > 0) {
      recommendations.push(`${lowUptimeValidators.length} validators have uptime below 95%`)
    }
    
    // Diversification recommendations
    const totalDelegated = validators.reduce((sum, v) => sum + parseFloat(v.totalDelegated), 0)
    const concentrationThreshold = totalDelegated * 0.4 // 40% threshold
    const overConcentratedValidators = validators.filter(v => parseFloat(v.totalDelegated) > concentrationThreshold)
    
    if (overConcentratedValidators.length > 0) {
      recommendations.push('Consider redistributing stake to improve diversification')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All validators are performing well')
    }
    
    // Check for low effective APY
    const lowAPYValidators = validators.filter(v => v.effectiveAPY < 6)
    if (lowAPYValidators.length > 0) {
      recommendations.push(`${lowAPYValidators.length} validators have effective APY below 6%`)
    }
    
    // Check for high risk scores
    const highRiskValidators = validators.filter(v => v.riskScore > 60)
    if (highRiskValidators.length > 0) {
      recommendations.push(`${highRiskValidators.length} validators have high risk scores (>60)`)
    }

    return recommendations
  }
  
  private async generateRebalanceRecommendation(validators: ValidatorInfo[]): Promise<RebalanceRecommendation> {
    try {
      // Check with StakingManager if rebalancing is needed
      let shouldRebalance = false
      let reason = 'No rebalancing needed'
      
      if (this.stakingManager.address) {
        try {
          const [needsRebalance, contractReason] = await this.client.readContract({
            address: this.stakingManager.address,
            abi: this.stakingManager.abi,
            functionName: 'shouldRebalance'
          })
          shouldRebalance = needsRebalance
          reason = contractReason
        } catch (error) {
          console.warn('Could not check rebalancing status from contract:', error)
        }
      }
      
      // Fallback logic if contract call fails
      if (!shouldRebalance) {
        const analysisResult = this.analyzeRebalancingNeed(validators)
        shouldRebalance = analysisResult.shouldRebalance
        if (analysisResult.shouldRebalance) reason = analysisResult.reason
      }
      
      const fromValidators: Array<{ address: string; amount: string; reason: string }> = []
      const toValidators: Array<{ address: string; amount: string; expectedAPY: number }> = []
      let estimatedImprovementAPY = 0
      
      if (shouldRebalance) {
        // Find validators to move funds away from
        const problemValidators = validators.filter(v => 
          !v.isActive || 
          v.riskScore > 60 || 
          v.effectiveAPY < 6 || 
          v.commission > 8
        )
        
        // Find good validators to move funds to
        const goodValidators = validators.filter(v => 
          v.isActive && 
          v.riskScore < 40 && 
          v.effectiveAPY > 7 && 
          v.commission < 6
        ).sort((a, b) => b.effectiveAPY - a.effectiveAPY)
        
        // Calculate rebalancing moves
        for (const badValidator of problemValidators) {
          const delegatedAmount = await this.getCurrentDelegation(badValidator.address)
          if (delegatedAmount > 0) {
            fromValidators.push({
              address: badValidator.address,
              amount: delegatedAmount.toString(),
              reason: this.getRebalanceReason(badValidator)
            })
          }
        }
        
        // Distribute to good validators
        const totalToRebalance = fromValidators.reduce((sum, v) => sum + parseInt(v.amount), 0)
        const avgAPYBefore = fromValidators.reduce((sum, v, i) => {
          const validator = problemValidators.find(pv => pv.address === v.address)
          return sum + (validator?.effectiveAPY || 0)
        }, 0) / fromValidators.length
        
        if (goodValidators.length > 0 && totalToRebalance > 0) {
          const perValidatorAmount = Math.floor(totalToRebalance / Math.min(goodValidators.length, 3))
          let remainingAmount = totalToRebalance
          
          goodValidators.slice(0, 3).forEach((validator, index) => {
            const amount = index === 2 ? remainingAmount : perValidatorAmount
            toValidators.push({
              address: validator.address,
              amount: amount.toString(),
              expectedAPY: validator.effectiveAPY
            })
            remainingAmount -= amount
          })
          
          const avgAPYAfter = toValidators.reduce((sum, v) => sum + v.expectedAPY, 0) / toValidators.length
          estimatedImprovementAPY = avgAPYAfter - avgAPYBefore
        }
      }
      
      return {
        shouldRebalance,
        reason,
        fromValidators,
        toValidators,
        estimatedImprovementAPY
      }
    } catch (error) {
      console.error('Error generating rebalance recommendation:', error)
      return {
        shouldRebalance: false,
        reason: 'Error analyzing rebalancing need',
        fromValidators: [],
        toValidators: [],
        estimatedImprovementAPY: 0
      }
    }
  }
  
  private analyzeRebalancingNeed(validators: ValidatorInfo[]): { shouldRebalance: boolean; reason: string } {
    // Check for inactive validators
    const inactiveValidators = validators.filter(v => !v.isActive)
    if (inactiveValidators.length > 0) {
      return { shouldRebalance: true, reason: `${inactiveValidators.length} validators are inactive` }
    }
    
    // Check for high-risk validators
    const highRiskValidators = validators.filter(v => v.riskScore > 60)
    if (highRiskValidators.length > 0) {
      return { shouldRebalance: true, reason: `${highRiskValidators.length} validators have high risk scores` }
    }
    
    // Check for low APY validators
    const lowAPYValidators = validators.filter(v => v.effectiveAPY < 6)
    if (lowAPYValidators.length > 0) {
      return { shouldRebalance: true, reason: `${lowAPYValidators.length} validators have low effective APY` }
    }
    
    return { shouldRebalance: false, reason: 'All validators performing adequately' }
  }
  
  private async getCurrentDelegation(validatorAddress: string): Promise<number> {
    try {
      if (!this.stakingManager.address) return 0
      
      const delegation = await this.client.readContract({
        address: this.stakingManager.address,
        abi: this.stakingManager.abi,
        functionName: 'delegatedCoreByValidator',
        args: [validatorAddress]
      })
      
      return parseInt(delegation.toString())
    } catch (error) {
      console.warn(`Could not get delegation for validator ${validatorAddress}:`, error)
      return 0
    }
  }
  
  private getRebalanceReason(validator: ValidatorInfo): string {
    if (!validator.isActive) return 'Validator inactive'
    if (validator.riskScore > 80) return 'Very high risk score'
    if (validator.riskScore > 60) return 'High risk score'
    if (validator.effectiveAPY < 5) return 'Very low APY'
    if (validator.effectiveAPY < 6.5) return 'Low APY'
    if (validator.commission > 10) return 'Very high commission'
    if (validator.commission > 8) return 'High commission'
    return 'Underperforming'
  }

  async getValidatorDetails(address: string): Promise<ValidatorInfo | null> {
    try {
      return await this.getValidatorInfo(address)
    } catch (error) {
      console.error(`Error getting validator details for ${address}:`, error)
      return null
    }
  }

  async getTopValidators(limit: number = 10): Promise<ValidatorInfo[]> {
    try {
      const metrics = await this.checkValidators()
      return metrics.validators
        .filter(v => v.isActive)
        .sort((a, b) => b.effectiveAPY - a.effectiveAPY)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting top validators:', error)
      return []
    }
  }
  
  // New methods for automated rebalancing
  
  /**
   * Execute automated rebalancing if conditions are met
   */
  async executeAutomatedRebalancing(): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      if (!this.walletClient) {
        return { success: false, message: 'Wallet client not configured for automation' }
      }
      
      const metrics = await this.checkValidators()
      const rebalanceRec = metrics.rebalanceRecommendation
      
      if (!rebalanceRec.shouldRebalance) {
        return { success: true, message: 'No rebalancing needed' }
      }
      
      if (rebalanceRec.fromValidators.length === 0 || rebalanceRec.toValidators.length === 0) {
        return { success: false, message: 'No valid rebalancing moves identified' }
      }
      
      console.log(`Executing automated rebalancing: ${rebalanceRec.reason}`)
      console.log(`Moving funds from ${rebalanceRec.fromValidators.length} validators to ${rebalanceRec.toValidators.length} validators`)
      console.log(`Expected APY improvement: ${rebalanceRec.estimatedImprovementAPY.toFixed(2)}%`)
      
      // Prepare transaction parameters
      const fromValidators = rebalanceRec.fromValidators.map(v => v.address)
      const fromAmounts = rebalanceRec.fromValidators.map(v => BigInt(v.amount))
      const toValidators = rebalanceRec.toValidators.map(v => v.address)
      const toAmounts = rebalanceRec.toValidators.map(v => BigInt(v.amount))
      
      // Execute rebalancing transaction
      const txHash = await this.walletClient.writeContract({
        address: this.stakingManager.address,
        abi: this.stakingManager.abi,
        functionName: 'rebalanceCoreStaking',
        args: [fromValidators, fromAmounts, toValidators, toAmounts]
      })
      
      console.log(`Rebalancing transaction submitted: ${txHash}`)
      
      return {
        success: true,
        message: `Rebalancing executed successfully. Expected APY improvement: ${rebalanceRec.estimatedImprovementAPY.toFixed(2)}%`,
        txHash
      }
    } catch (error) {
      console.error('Error executing automated rebalancing:', error)
      return {
        success: false,
        message: `Rebalancing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
  
  /**
   * Simulate validator state changes for testing
   */
  async simulateValidatorStateChange(validatorAddress: string, changes: {
    status?: boolean
    commission?: number
    hybridScore?: number
  }): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.walletClient) {
        return { success: false, message: 'Wallet client not configured for simulation' }
      }
      
      const results = []
      
      if (changes.status !== undefined) {
        const txHash = await this.walletClient.writeContract({
          address: this.mockCoreStaking.address,
          abi: this.mockCoreStaking.abi,
          functionName: 'setValidatorStatus',
          args: [validatorAddress, changes.status]
        })
        results.push(`Status changed to ${changes.status}: ${txHash}`)
      }
      
      if (changes.commission !== undefined) {
        const txHash = await this.walletClient.writeContract({
          address: this.mockCoreStaking.address,
          abi: this.mockCoreStaking.abi,
          functionName: 'setValidatorCommission',
          args: [validatorAddress, BigInt(changes.commission * 100)] // Convert to basis points
        })
        results.push(`Commission changed to ${changes.commission}%: ${txHash}`)
      }
      
      if (changes.hybridScore !== undefined) {
        const txHash = await this.walletClient.writeContract({
          address: this.mockCoreStaking.address,
          abi: this.mockCoreStaking.abi,
          functionName: 'setValidatorHybridScore',
          args: [validatorAddress, BigInt(changes.hybridScore * 10)] // Convert to contract format
        })
        results.push(`Hybrid score changed to ${changes.hybridScore}%: ${txHash}`)
      }
      
      return {
        success: true,
        message: `Validator state changes applied: ${results.join(', ')}`
      }
    } catch (error) {
      console.error('Error simulating validator state change:', error)
      return {
        success: false,
        message: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}