import { ContractMetrics, PriceData } from './ContractMonitor'
import { ValidatorMetrics } from './ValidatorMonitor'

export interface Alert {
  id: string
  type: 'warning' | 'error' | 'critical'
  category: 'contract' | 'validator' | 'price' | 'security'
  title: string
  message: string
  timestamp: string
  acknowledged: boolean
  data?: any
}

export interface AlertRule {
  id: string
  name: string
  category: string
  condition: (data: any) => boolean
  severity: 'warning' | 'error' | 'critical'
  message: string
  cooldown: number // minutes
}

export class AlertManager {
  private alerts: Alert[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private alertRules: AlertRule[] = []

  constructor() {
    this.initializeAlertRules()
  }

  private initializeAlertRules() {
    this.alertRules = [
      // Contract alert rules
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        category: 'contract',
        condition: (metrics: ContractMetrics) => metrics.errorRate > 0.05, // 5%
        severity: 'error',
        message: 'Contract error rate is above 5%',
        cooldown: 15
      },
      {
        id: 'low-performance',
        name: 'Low Performance Score',
        category: 'contract',
        condition: (metrics: ContractMetrics) => metrics.performanceScore < 50,
        severity: 'warning',
        message: 'Contract performance score is below 50',
        cooldown: 30
      },
      {
        id: 'high-gas-usage',
        name: 'High Gas Usage',
        category: 'contract',
        condition: (metrics: ContractMetrics) => metrics.gasUsage.average > 600000,
        severity: 'warning',
        message: 'Average gas usage is above 600,000',
        cooldown: 60
      },
      {
        id: 'low-aum',
        name: 'Low AUM',
        category: 'contract',
        condition: (metrics: ContractMetrics) => parseFloat(metrics.totalAUM) < 1000,
        severity: 'warning',
        message: 'Total AUM is below $1,000',
        cooldown: 120
      },

      // Validator alert rules
      {
        id: 'validator-slashing',
        name: 'Validator Slashing Event',
        category: 'validator',
        condition: (metrics: ValidatorMetrics) => metrics.totalSlashingEvents > 0,
        severity: 'critical',
        message: 'Validator slashing event detected',
        cooldown: 5
      },
      {
        id: 'low-validator-uptime',
        name: 'Low Validator Uptime',
        category: 'validator',
        condition: (metrics: ValidatorMetrics) => metrics.averageUptime < 95,
        severity: 'warning',
        message: 'Average validator uptime is below 95%',
        cooldown: 60
      },
      {
        id: 'inactive-validators',
        name: 'Inactive Validators',
        category: 'validator',
        condition: (metrics: ValidatorMetrics) => metrics.activeValidators / metrics.totalValidators < 0.8,
        severity: 'error',
        message: 'More than 20% of validators are inactive',
        cooldown: 30
      },

      // Price alert rules
      {
        id: 'stale-price-feed',
        name: 'Stale Price Feed',
        category: 'price',
        condition: (priceData: PriceData) => priceData.isStale,
        severity: 'critical',
        message: 'Price feed is stale and needs updating',
        cooldown: 5
      },
      {
        id: 'high-price-deviation',
        name: 'High Price Deviation',
        category: 'price',
        condition: (priceData: PriceData) => priceData.deviation > 0.1, // 10%
        severity: 'warning',
        message: 'Price deviation is above 10%',
        cooldown: 15
      },
      {
        id: 'extreme-price-movement',
        name: 'Extreme Price Movement',
        category: 'price',
        condition: (priceData: PriceData) => priceData.deviation > 0.25, // 25%
        severity: 'critical',
        message: 'Extreme price movement detected (>25%)',
        cooldown: 1
      }
    ]
  }

  async checkContractAlerts(metrics: ContractMetrics): Promise<Alert[]> {
    const newAlerts: Alert[] = []
    
    const contractRules = this.alertRules.filter(rule => rule.category === 'contract')
    
    for (const rule of contractRules) {
      if (this.shouldTriggerAlert(rule, metrics)) {
        const alert = this.createAlert(rule, metrics)
        newAlerts.push(alert)
        this.alerts.push(alert)
        this.lastAlertTime.set(rule.id, Date.now())
      }
    }
    
    return newAlerts
  }

  async checkValidatorAlerts(metrics: ValidatorMetrics): Promise<Alert[]> {
    const newAlerts: Alert[] = []
    
    const validatorRules = this.alertRules.filter(rule => rule.category === 'validator')
    
    for (const rule of validatorRules) {
      if (this.shouldTriggerAlert(rule, metrics)) {
        const alert = this.createAlert(rule, metrics)
        newAlerts.push(alert)
        this.alerts.push(alert)
        this.lastAlertTime.set(rule.id, Date.now())
      }
    }
    
    return newAlerts
  }

  async checkPriceAlerts(priceData: PriceData): Promise<Alert[]> {
    const newAlerts: Alert[] = []
    
    const priceRules = this.alertRules.filter(rule => rule.category === 'price')
    
    for (const rule of priceRules) {
      if (this.shouldTriggerAlert(rule, priceData)) {
        const alert = this.createAlert(rule, priceData)
        newAlerts.push(alert)
        this.alerts.push(alert)
        this.lastAlertTime.set(rule.id, Date.now())
      }
    }
    
    return newAlerts
  }

  private shouldTriggerAlert(rule: AlertRule, data: any): boolean {
    // Check cooldown period
    const lastAlert = this.lastAlertTime.get(rule.id)
    if (lastAlert && Date.now() - lastAlert < rule.cooldown * 60 * 1000) {
      return false
    }
    
    // Check condition
    try {
      return rule.condition(data)
    } catch (error) {
      console.error(`Error evaluating alert rule ${rule.id}:`, error)
      return false
    }
  }

  private createAlert(rule: AlertRule, data: any): Alert {
    return {
      id: `${rule.id}-${Date.now()}`,
      type: rule.severity,
      category: rule.category as any,
      title: rule.name,
      message: rule.message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      data
    }
  }

  getAlerts(limit?: number, acknowledged?: boolean): Alert[] {
    let filteredAlerts = this.alerts
    
    if (acknowledged !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged === acknowledged)
    }
    
    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    if (limit) {
      filteredAlerts = filteredAlerts.slice(0, limit)
    }
    
    return filteredAlerts
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  getAlertStats() {
    const total = this.alerts.length
    const unacknowledged = this.alerts.filter(a => !a.acknowledged).length
    const critical = this.alerts.filter(a => a.type === 'critical').length
    const errors = this.alerts.filter(a => a.type === 'error').length
    const warnings = this.alerts.filter(a => a.type === 'warning').length
    
    const last24h = this.alerts.filter(a => 
      Date.now() - new Date(a.timestamp).getTime() < 24 * 60 * 60 * 1000
    ).length
    
    return {
      total,
      unacknowledged,
      critical,
      errors,
      warnings,
      last24h,
      byCategory: {
        contract: this.alerts.filter(a => a.category === 'contract').length,
        validator: this.alerts.filter(a => a.category === 'validator').length,
        price: this.alerts.filter(a => a.category === 'price').length,
        security: this.alerts.filter(a => a.category === 'security').length
      }
    }
  }

  clearOldAlerts(maxAge: number = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const cutoffTime = Date.now() - maxAge
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    )
  }

  addCustomAlert(type: 'warning' | 'error' | 'critical', category: string, title: string, message: string, data?: any): Alert {
    const alert: Alert = {
      id: `custom-${Date.now()}`,
      type,
      category: category as any,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      data
    }
    
    this.alerts.push(alert)
    return alert
  }

  // Real-time suspicious activity detection
  async checkSuspiciousActivity(metrics: ContractMetrics): Promise<Alert[]> {
    const alerts: Alert[] = []
    
    // Check for unusual transaction patterns
    if (metrics.transactionCount.total > 100) { // Threshold for high activity
      const depositRatio = metrics.transactionCount.deposits / metrics.transactionCount.total
      if (depositRatio > 0.9 || depositRatio < 0.1) {
        alerts.push(this.addCustomAlert(
          'warning',
          'security',
          'Unusual Transaction Pattern',
          `Deposit ratio is ${(depositRatio * 100).toFixed(1)}% - possibly suspicious activity`
        ))
      }
    }
    
    // Check for rapid NAV changes
    const navChange = this.calculateNAVChange(metrics.navPerShare)
    if (Math.abs(navChange) > 0.05) { // 5% change
      alerts.push(this.addCustomAlert(
        'warning',
        'security',
        'Rapid NAV Change',
        `NAV changed by ${(navChange * 100).toFixed(2)}% rapidly`
      ))
    }
    
    return alerts
  }

  private calculateNAVChange(currentNAV: string): number {
    // This would compare against historical NAV data
    // For now, return a mock calculation
    return (Math.random() - 0.5) * 0.1 // ±5% random change
  }
}