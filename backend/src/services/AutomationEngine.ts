import { createWalletClient, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { coreTestnet2 } from '../config/chains'
import { ContractMonitor } from './ContractMonitor'
import { ValidatorMonitor } from './ValidatorMonitor'
import { AlertManager } from './AlertManager'

export interface AutomationTask {
  id: string
  name: string
  type: 'rebalancing' | 'liquidity' | 'fees' | 'risk-management'
  enabled: boolean
  lastRun: string
  nextRun: string
  condition: string
  action: string
  parameters: any
}

export interface RebalancingStrategy {
  targetAllocation: {
    CORE: number // percentage
    lstBTC: number // percentage
  }
  rebalanceThreshold: number // percentage deviation to trigger rebalancing
  maxSlippage: number // maximum acceptable slippage
  minLiquidity: number // minimum liquidity to maintain
}

export interface RiskParameters {
  maxDrawdown: number // maximum acceptable drawdown
  maxConcentration: number // maximum allocation to single asset
  emergencyThreshold: number // threshold for emergency actions
  pauseConditions: string[]
}

export class AutomationEngine {
  private contractMonitor: ContractMonitor
  private validatorMonitor: ValidatorMonitor
  private alertManager: AlertManager
  private walletClient: any
  private automationTasks: AutomationTask[]
  private rebalancingStrategy: RebalancingStrategy
  private riskParameters: RiskParameters

  constructor() {
    this.contractMonitor = new ContractMonitor()
    this.validatorMonitor = new ValidatorMonitor()
    this.alertManager = new AlertManager()
    
    // Initialize wallet client for automated transactions
    // NOTE: In production, use secure key management
    if (process.env.AUTOMATION_PRIVATE_KEY) {
      const account = privateKeyToAccount(process.env.AUTOMATION_PRIVATE_KEY as `0x${string}`)
      this.walletClient = createWalletClient({
        account,
        chain: coreTestnet2,
        transport: http()
      })
    }

    this.initializeAutomationTasks()
    this.initializeStrategies()
  }

  private initializeAutomationTasks() {
    this.automationTasks = [
      {
        id: 'auto-rebalance',
        name: 'Automatic Portfolio Rebalancing',
        type: 'rebalancing',
        enabled: true,
        lastRun: new Date(0).toISOString(),
        nextRun: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        condition: 'allocation_deviation > threshold',
        action: 'rebalance_portfolio',
        parameters: {
          checkInterval: 60, // minutes
          maxDeviation: 10 // percentage
        }
      },
      {
        id: 'liquidity-management',
        name: 'Liquidity Pool Management',
        type: 'liquidity',
        enabled: true,
        lastRun: new Date(0).toISOString(),
        nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        condition: 'available_liquidity < minimum_threshold',
        action: 'adjust_liquidity',
        parameters: {
          minLiquidityRatio: 0.05, // 5%
          targetLiquidityRatio: 0.10 // 10%
        }
      },
      {
        id: 'dynamic-fees',
        name: 'Dynamic Fee Adjustment',
        type: 'fees',
        enabled: false, // Disabled by default for safety
        lastRun: new Date(0).toISOString(),
        nextRun: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        condition: 'market_volatility > threshold',
        action: 'adjust_fees',
        parameters: {
          volatilityThreshold: 0.15, // 15%
          maxFeeAdjustment: 0.002 // 0.2%
        }
      },
      {
        id: 'risk-monitoring',
        name: 'Risk Monitoring and Mitigation',
        type: 'risk-management',
        enabled: true,
        lastRun: new Date(0).toISOString(),
        nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        condition: 'risk_metrics > safe_threshold',
        action: 'mitigate_risk',
        parameters: {
          checkInterval: 15, // minutes
          riskThreshold: 0.8 // 80% of maximum acceptable risk
        }
      }
    ]
  }

  private initializeStrategies() {
    this.rebalancingStrategy = {
      targetAllocation: {
        CORE: 60, // 60% CORE
        lstBTC: 40 // 40% lstBTC
      },
      rebalanceThreshold: 10, // 10% deviation
      maxSlippage: 2, // 2% maximum slippage
      minLiquidity: 50000 // $50k minimum liquidity
    }

    this.riskParameters = {
      maxDrawdown: 0.15, // 15% maximum drawdown
      maxConcentration: 0.70, // 70% maximum single asset concentration
      emergencyThreshold: 0.25, // 25% loss threshold for emergency actions
      pauseConditions: [
        'validator_slashing_event',
        'price_feed_failure',
        'high_error_rate',
        'extreme_market_volatility'
      ]
    }
  }

  async runAutomatedTasks(): Promise<void> {
    console.log('🤖 Running automated tasks...')
    
    for (const task of this.automationTasks) {
      if (!task.enabled) continue
      
      const now = new Date()
      const nextRun = new Date(task.nextRun)
      
      if (now >= nextRun) {
        try {
          await this.executeTask(task)
          task.lastRun = now.toISOString()
          
          // Schedule next run
          const intervalMs = this.getTaskInterval(task)
          task.nextRun = new Date(now.getTime() + intervalMs).toISOString()
          
          console.log(`✅ Completed task: ${task.name}`)
        } catch (error) {
          console.error(`❌ Error executing task ${task.name}:`, error)
          
          // Create alert for failed automation
          this.alertManager.addCustomAlert(
            'error',
            'automation',
            'Automation Task Failed',
            `Task "${task.name}" failed: ${error.message}`,
            { task: task.id, error: error.message }
          )
        }
      }
    }
  }

  private async executeTask(task: AutomationTask): Promise<void> {
    switch (task.type) {
      case 'rebalancing':
        await this.executeRebalancing(task)
        break
      case 'liquidity':
        await this.executeLiquidityManagement(task)
        break
      case 'fees':
        await this.executeFeeAdjustment(task)
        break
      case 'risk-management':
        await this.executeRiskManagement(task)
        break
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }

  private async executeRebalancing(task: AutomationTask): Promise<void> {
    console.log('📊 Checking portfolio allocation...')
    
    // Get current metrics
    const metrics = await this.contractMonitor.collectMetrics()
    const allocation = await this.getCurrentAllocation()
    
    // Calculate deviation from target
    const coreDeviation = Math.abs(allocation.CORE - this.rebalancingStrategy.targetAllocation.CORE)
    const lstBTCDeviation = Math.abs(allocation.lstBTC - this.rebalancingStrategy.targetAllocation.lstBTC)
    
    const maxDeviation = Math.max(coreDeviation, lstBTCDeviation)
    
    if (maxDeviation > this.rebalancingStrategy.rebalanceThreshold) {
      console.log(`🔄 Rebalancing needed. Max deviation: ${maxDeviation.toFixed(2)}%`)
      
      // Calculate required trades
      const trades = this.calculateRebalancingTrades(allocation)
      
      // Execute rebalancing (simulated)
      await this.executeRebalancingTrades(trades)
      
      // Create success alert
      this.alertManager.addCustomAlert(
        'warning',
        'automation',
        'Portfolio Rebalanced',
        `Portfolio rebalanced due to ${maxDeviation.toFixed(2)}% deviation`,
        { allocation, trades }
      )
    }
  }

  private async executeLiquidityManagement(task: AutomationTask): Promise<void> {
    console.log('💧 Checking liquidity levels...')
    
    const metrics = await this.contractMonitor.collectMetrics()
    const totalAUM = parseFloat(metrics.totalAUM)
    const liquidityRatio = await this.getCurrentLiquidityRatio()
    
    const minRatio = task.parameters.minLiquidityRatio
    const targetRatio = task.parameters.targetLiquidityRatio
    
    if (liquidityRatio < minRatio) {
      console.log(`💰 Liquidity too low: ${(liquidityRatio * 100).toFixed(2)}%`)
      
      // Calculate required liquidity adjustment
      const targetLiquidity = totalAUM * targetRatio
      const currentLiquidity = totalAUM * liquidityRatio
      const requiredIncrease = targetLiquidity - currentLiquidity
      
      // Execute liquidity adjustment (simulated)
      await this.adjustLiquidity(requiredIncrease)
      
      this.alertManager.addCustomAlert(
        'warning',
        'automation',
        'Liquidity Adjusted',
        `Increased liquidity by $${requiredIncrease.toFixed(0)}`,
        { oldRatio: liquidityRatio, newRatio: targetRatio }
      )
    }
  }

  private async executeFeeAdjustment(task: AutomationTask): Promise<void> {
    console.log('💰 Checking fee adjustment conditions...')
    
    // Calculate market volatility (simplified)
    const volatility = await this.calculateMarketVolatility()
    const threshold = task.parameters.volatilityThreshold
    
    if (volatility > threshold) {
      console.log(`📈 High volatility detected: ${(volatility * 100).toFixed(2)}%`)
      
      // Adjust fees based on volatility
      const feeAdjustment = Math.min(
        volatility * 0.01, // 1% of volatility
        task.parameters.maxFeeAdjustment
      )
      
      // Execute fee adjustment (simulated)
      await this.adjustFees(feeAdjustment)
      
      this.alertManager.addCustomAlert(
        'warning',
        'automation',
        'Fees Adjusted',
        `Increased fees by ${(feeAdjustment * 100).toFixed(3)}% due to volatility`,
        { volatility, feeAdjustment }
      )
    }
  }

  private async executeRiskManagement(task: AutomationTask): Promise<void> {
    console.log('🛡️ Monitoring risk metrics...')
    
    const metrics = await this.contractMonitor.collectMetrics()
    const validatorMetrics = await this.validatorMonitor.checkValidators()
    
    // Check for emergency conditions
    const riskLevel = await this.calculateRiskLevel(metrics, validatorMetrics)
    
    if (riskLevel > this.riskParameters.emergencyThreshold) {
      console.log(`🚨 High risk level detected: ${(riskLevel * 100).toFixed(1)}%`)
      
      // Execute risk mitigation
      await this.executeRiskMitigation(riskLevel)
      
      this.alertManager.addCustomAlert(
        'critical',
        'automation',
        'Risk Mitigation Activated',
        `Automated risk mitigation triggered at ${(riskLevel * 100).toFixed(1)}% risk level`,
        { riskLevel, metrics, validatorMetrics }
      )
    }
  }

  // Helper methods (simplified implementations)
  private async getCurrentAllocation(): Promise<{ CORE: number; lstBTC: number }> {
    // Mock allocation calculation
    return { CORE: 65, lstBTC: 35 }
  }

  private calculateRebalancingTrades(allocation: { CORE: number; lstBTC: number }) {
    const target = this.rebalancingStrategy.targetAllocation
    return {
      CORE: target.CORE - allocation.CORE,
      lstBTC: target.lstBTC - allocation.lstBTC
    }
  }

  private async executeRebalancingTrades(trades: any): Promise<void> {
    // Simulate rebalancing trades
    console.log('Executing rebalancing trades:', trades)
  }

  private async getCurrentLiquidityRatio(): Promise<number> {
    // Mock liquidity ratio calculation
    return 0.03 // 3%
  }

  private async adjustLiquidity(amount: number): Promise<void> {
    // Simulate liquidity adjustment
    console.log(`Adjusting liquidity by $${amount}`)
  }

  private async calculateMarketVolatility(): Promise<number> {
    // Mock volatility calculation
    return Math.random() * 0.2 // 0-20%
  }

  private async adjustFees(adjustment: number): Promise<void> {
    // Simulate fee adjustment
    console.log(`Adjusting fees by ${(adjustment * 100).toFixed(3)}%`)
  }

  private async calculateRiskLevel(contractMetrics: any, validatorMetrics: any): Promise<number> {
    let riskScore = 0
    
    // Contract performance risk
    riskScore += (1 - contractMetrics.performanceScore / 100) * 0.3
    
    // Error rate risk
    riskScore += contractMetrics.errorRate * 0.2
    
    // Validator risk
    riskScore += (1 - validatorMetrics.averageUptime / 100) * 0.3
    
    // Slashing risk
    riskScore += validatorMetrics.totalSlashingEvents * 0.1
    
    // Price volatility risk
    riskScore += Math.random() * 0.1 // Mock price volatility
    
    return Math.min(1, riskScore)
  }

  private async executeRiskMitigation(riskLevel: number): Promise<void> {
    if (riskLevel > 0.8) {
      // Emergency pause
      console.log('🛑 Executing emergency pause')
    } else if (riskLevel > 0.5) {
      // Reduce exposure
      console.log('📉 Reducing risk exposure')
    } else {
      // Increase monitoring frequency
      console.log('👁️ Increasing monitoring frequency')
    }
  }

  private getTaskInterval(task: AutomationTask): number {
    const intervals = {
      'auto-rebalance': 60 * 60 * 1000, // 1 hour
      'liquidity-management': 30 * 60 * 1000, // 30 minutes
      'dynamic-fees': 4 * 60 * 60 * 1000, // 4 hours
      'risk-monitoring': 15 * 60 * 1000 // 15 minutes
    }
    
    return intervals[task.id as keyof typeof intervals] || 60 * 60 * 1000
  }

  // Public API methods
  getAutomationTasks(): AutomationTask[] {
    return this.automationTasks
  }

  toggleTask(taskId: string, enabled: boolean): boolean {
    const task = this.automationTasks.find(t => t.id === taskId)
    if (task) {
      task.enabled = enabled
      return true
    }
    return false
  }

  updateTaskParameters(taskId: string, parameters: any): boolean {
    const task = this.automationTasks.find(t => t.id === taskId)
    if (task) {
      task.parameters = { ...task.parameters, ...parameters }
      return true
    }
    return false
  }

  getRebalancingStrategy(): RebalancingStrategy {
    return this.rebalancingStrategy
  }

  updateRebalancingStrategy(strategy: Partial<RebalancingStrategy>): void {
    this.rebalancingStrategy = { ...this.rebalancingStrategy, ...strategy }
  }

  getRiskParameters(): RiskParameters {
    return this.riskParameters
  }

  updateRiskParameters(parameters: Partial<RiskParameters>): void {
    this.riskParameters = { ...this.riskParameters, ...parameters }
  }
}