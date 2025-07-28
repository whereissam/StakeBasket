import { ValidatorMonitor } from './ValidatorMonitor'

export interface RebalancingJob {
  id: string
  scheduled: boolean
  interval: number // in milliseconds
  lastRun: string | null
  nextRun: string | null
  enabled: boolean
  thresholds: {
    apyDrop: number // minimum APY drop to trigger rebalancing
    riskIncrease: number // maximum risk score to tolerate
    minImprovement: number // minimum expected improvement to execute
  }
}

export interface RebalancingResult {
  executed: boolean
  reason: string
  txHash?: string
  beforeAPY: number
  afterAPY: number
  improvement: number
  timestamp: string
  validatorsChanged: {
    from: string[]
    to: string[]
  }
}

export class AutomatedRebalancer {
  private validatorMonitor: ValidatorMonitor
  private job: RebalancingJob
  private intervalId: NodeJS.Timeout | null = null
  private rebalancingHistory: RebalancingResult[] = []

  constructor(intervalMinutes: number = 60) {
    this.validatorMonitor = new ValidatorMonitor()
    
    this.job = {
      id: 'core-staking-rebalancer',
      scheduled: false,
      interval: intervalMinutes * 60 * 1000, // Convert to milliseconds
      lastRun: null,
      nextRun: null,
      enabled: true,
      thresholds: {
        apyDrop: 0.5, // 0.5% APY drop threshold
        riskIncrease: 60, // Risk score above 60 is concerning
        minImprovement: 0.2 // Minimum 0.2% improvement to execute
      }
    }
  }

  /**
   * Start the automated rebalancing scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log('Automated rebalancer is already running')
      return
    }

    console.log(`Starting automated rebalancer with ${this.job.interval / 60000} minute intervals`)
    
    this.job.scheduled = true
    this.job.nextRun = new Date(Date.now() + this.job.interval).toISOString()
    
    // Run immediately on start
    this.executeRebalancingCheck()
    
    // Set up recurring execution
    this.intervalId = setInterval(() => {
      this.executeRebalancingCheck()
    }, this.job.interval)
  }

  /**
   * Stop the automated rebalancing scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      this.job.scheduled = false
      this.job.nextRun = null
      console.log('Automated rebalancer stopped')
    }
  }

  /**
   * Execute a rebalancing check and potentially rebalance
   */
  private async executeRebalancingCheck(): Promise<void> {
    if (!this.job.enabled) {
      console.log('Rebalancing job is disabled, skipping check')
      return
    }

    try {
      console.log('Executing automated rebalancing check...')
      this.job.lastRun = new Date().toISOString()
      this.job.nextRun = new Date(Date.now() + this.job.interval).toISOString()

      // Get current validator metrics
      const metrics = await this.validatorMonitor.checkValidators()
      const rebalanceRec = metrics.rebalanceRecommendation

      console.log(`Rebalancing assessment: ${rebalanceRec.reason}`)
      console.log(`Should rebalance: ${rebalanceRec.shouldRebalance}`)
      console.log(`Estimated improvement: ${rebalanceRec.estimatedImprovementAPY.toFixed(2)}%`)

      // Check if rebalancing meets our criteria
      if (!rebalanceRec.shouldRebalance) {
        this.recordRebalancingResult({
          executed: false,
          reason: rebalanceRec.reason,
          beforeAPY: metrics.averageEffectiveAPY,
          afterAPY: metrics.averageEffectiveAPY,
          improvement: 0,
          timestamp: new Date().toISOString(),
          validatorsChanged: { from: [], to: [] }
        })
        return
      }

      // Check if improvement meets minimum threshold
      if (rebalanceRec.estimatedImprovementAPY < this.job.thresholds.minImprovement) {
        console.log(`Improvement ${rebalanceRec.estimatedImprovementAPY.toFixed(2)}% below threshold ${this.job.thresholds.minImprovement}%`)
        this.recordRebalancingResult({
          executed: false,
          reason: `Improvement below threshold (${rebalanceRec.estimatedImprovementAPY.toFixed(2)}% < ${this.job.thresholds.minImprovement}%)`,
          beforeAPY: metrics.averageEffectiveAPY,
          afterAPY: metrics.averageEffectiveAPY,
          improvement: 0,
          timestamp: new Date().toISOString(),
          validatorsChanged: { from: [], to: [] }
        })
        return
      }

      // Execute rebalancing
      console.log('Conditions met, executing automated rebalancing...')
      const result = await this.validatorMonitor.executeAutomatedRebalancing()

      if (result.success) {
        console.log(`✅ Rebalancing executed successfully: ${result.message}`)
        this.recordRebalancingResult({
          executed: true,
          reason: rebalanceRec.reason,
          txHash: result.txHash,
          beforeAPY: metrics.averageEffectiveAPY,
          afterAPY: metrics.averageEffectiveAPY + rebalanceRec.estimatedImprovementAPY,
          improvement: rebalanceRec.estimatedImprovementAPY,
          timestamp: new Date().toISOString(),
          validatorsChanged: {
            from: rebalanceRec.fromValidators.map(v => v.address),
            to: rebalanceRec.toValidators.map(v => v.address)
          }
        })
      } else {
        console.error(`❌ Rebalancing failed: ${result.message}`)
        this.recordRebalancingResult({
          executed: false,
          reason: `Execution failed: ${result.message}`,
          beforeAPY: metrics.averageEffectiveAPY,
          afterAPY: metrics.averageEffectiveAPY,
          improvement: 0,
          timestamp: new Date().toISOString(),
          validatorsChanged: {
            from: rebalanceRec.fromValidators.map(v => v.address),
            to: []
          }
        })
      }
    } catch (error) {
      console.error('Error in automated rebalancing check:', error)
      this.recordRebalancingResult({
        executed: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        beforeAPY: 0,
        afterAPY: 0,
        improvement: 0,
        timestamp: new Date().toISOString(),
        validatorsChanged: { from: [], to: [] }
      })
    }
  }

  /**
   * Record rebalancing result in history
   */
  private recordRebalancingResult(result: RebalancingResult): void {
    this.rebalancingHistory.push(result)
    
    // Keep only last 100 results
    if (this.rebalancingHistory.length > 100) {
      this.rebalancingHistory = this.rebalancingHistory.slice(-100)
    }
  }

  /**
   * Manual trigger for rebalancing (bypasses some automated checks)
   */
  async triggerManualRebalancing(): Promise<RebalancingResult> {
    console.log('Manual rebalancing triggered...')
    
    try {
      const metrics = await this.validatorMonitor.checkValidators()
      const rebalanceRec = metrics.rebalanceRecommendation

      if (!rebalanceRec.shouldRebalance) {
        const result: RebalancingResult = {
          executed: false,
          reason: `Manual trigger: ${rebalanceRec.reason}`,
          beforeAPY: metrics.averageEffectiveAPY,
          afterAPY: metrics.averageEffectiveAPY,
          improvement: 0,
          timestamp: new Date().toISOString(),
          validatorsChanged: { from: [], to: [] }
        }
        this.recordRebalancingResult(result)
        return result
      }

      const executionResult = await this.validatorMonitor.executeAutomatedRebalancing()
      
      const result: RebalancingResult = {
        executed: executionResult.success,
        reason: `Manual trigger: ${executionResult.message}`,
        txHash: executionResult.txHash,
        beforeAPY: metrics.averageEffectiveAPY,
        afterAPY: metrics.averageEffectiveAPY + (executionResult.success ? rebalanceRec.estimatedImprovementAPY : 0),
        improvement: executionResult.success ? rebalanceRec.estimatedImprovementAPY : 0,
        timestamp: new Date().toISOString(),
        validatorsChanged: {
          from: rebalanceRec.fromValidators.map(v => v.address),
          to: executionResult.success ? rebalanceRec.toValidators.map(v => v.address) : []
        }
      }

      this.recordRebalancingResult(result)
      return result
    } catch (error) {
      const errorResult: RebalancingResult = {
        executed: false,
        reason: `Manual trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        beforeAPY: 0,
        afterAPY: 0,
        improvement: 0,
        timestamp: new Date().toISOString(),
        validatorsChanged: { from: [], to: [] }
      }
      this.recordRebalancingResult(errorResult)
      return errorResult
    }
  }

  /**
   * Simulate validator changes to test rebalancing logic
   */
  async simulateValidatorStateChanges(changes: Array<{
    validatorAddress: string
    status?: boolean
    commission?: number
    hybridScore?: number
  }>): Promise<{ success: boolean; message: string }> {
    console.log('Simulating validator state changes for testing...')
    
    try {
      const results = []
      
      for (const change of changes) {
        const result = await this.validatorMonitor.simulateValidatorStateChange(
          change.validatorAddress,
          {
            status: change.status,
            commission: change.commission,
            hybridScore: change.hybridScore
          }
        )
        results.push(result)
      }
      
      const allSuccessful = results.every(r => r.success)
      
      return {
        success: allSuccessful,
        message: allSuccessful 
          ? `Successfully applied ${changes.length} validator state changes`
          : `Some state changes failed: ${results.filter(r => !r.success).map(r => r.message).join(', ')}`
      }
    } catch (error) {
      console.error('Error simulating validator state changes:', error)
      return {
        success: false,
        message: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Update rebalancing thresholds
   */
  updateThresholds(thresholds: Partial<RebalancingJob['thresholds']>): void {
    this.job.thresholds = { ...this.job.thresholds, ...thresholds }
    console.log('Updated rebalancing thresholds:', this.job.thresholds)
  }

  /**
   * Update rebalancing interval
   */
  updateInterval(intervalMinutes: number): void {
    const oldInterval = this.job.interval
    this.job.interval = intervalMinutes * 60 * 1000
    
    console.log(`Updated rebalancing interval from ${oldInterval / 60000} to ${intervalMinutes} minutes`)
    
    // Restart if currently running
    if (this.intervalId) {
      this.stop()
      this.start()
    }
  }

  /**
   * Enable or disable the rebalancing job
   */
  setEnabled(enabled: boolean): void {
    this.job.enabled = enabled
    console.log(`Rebalancing job ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Get current job status
   */
  getStatus(): RebalancingJob {
    return { ...this.job }
  }

  /**
   * Get rebalancing history
   */
  getHistory(limit?: number): RebalancingResult[] {
    const history = [...this.rebalancingHistory].reverse() // Most recent first
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Get rebalancing statistics
   */
  getStatistics(): {
    totalRuns: number
    successfulRebalances: number
    failedRebalances: number
    averageImprovement: number
    totalImprovement: number
    lastSuccess: string | null
    lastFailure: string | null
  } {
    const totalRuns = this.rebalancingHistory.length
    const successful = this.rebalancingHistory.filter(r => r.executed)
    const failed = this.rebalancingHistory.filter(r => !r.executed)
    
    const totalImprovement = successful.reduce((sum, r) => sum + r.improvement, 0)
    const averageImprovement = successful.length > 0 ? totalImprovement / successful.length : 0
    
    const lastSuccess = successful.length > 0 ? successful[successful.length - 1].timestamp : null
    const lastFailure = failed.length > 0 ? failed[failed.length - 1].timestamp : null
    
    return {
      totalRuns,
      successfulRebalances: successful.length,
      failedRebalances: failed.length,
      averageImprovement,
      totalImprovement,
      lastSuccess,
      lastFailure
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop()
    this.rebalancingHistory = []
    console.log('Automated rebalancer destroyed')
  }
}