import { createPublicClient, http, parseAbi } from 'viem'
import { coreTestnet } from '../config/chains'
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
      chain: coreTestnet,
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
      address: CONTRACT_ADDRESSES.coreTestnet.MockCoreStaking,
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
    
    return recommendations
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
        .sort((a, b) => b.performance - a.performance)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting top validators:', error)
      return []
    }
  }
}