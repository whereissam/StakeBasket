import { Hono } from 'hono'
import { ValidatorMonitor } from '../services/ValidatorMonitor'

const validators = new Hono()
const validatorMonitor = new ValidatorMonitor()

// Get all validator metrics
validators.get('/', async (c) => {
  try {
    const metrics = await validatorMonitor.checkValidators()
    return c.json({ success: true, data: metrics })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get specific validator details
validators.get('/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const validator = await validatorMonitor.getValidatorDetails(address)
    
    if (validator) {
      return c.json({ success: true, data: validator })
    } else {
      return c.json({ success: false, error: 'Validator not found' }, 404)
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get top performing validators
validators.get('/top/:limit', async (c) => {
  try {
    const limit = parseInt(c.req.param('limit') || '10')
    const topValidators = await validatorMonitor.getTopValidators(limit)
    
    return c.json({ 
      success: true, 
      data: topValidators,
      count: topValidators.length,
      limit 
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get validator performance summary
validators.get('/performance/summary', async (c) => {
  try {
    const metrics = await validatorMonitor.checkValidators()
    
    const summary = {
      totalValidators: metrics.totalValidators,
      activeValidators: metrics.activeValidators,
      averageUptime: metrics.averageUptime,
      averagePerformance: metrics.averagePerformance,
      performance: {
        excellent: metrics.validators.filter(v => v.performance >= 90).length,
        good: metrics.validators.filter(v => v.performance >= 70 && v.performance < 90).length,
        fair: metrics.validators.filter(v => v.performance >= 50 && v.performance < 70).length,
        poor: metrics.validators.filter(v => v.performance < 50).length
      },
      uptime: {
        excellent: metrics.validators.filter(v => v.uptime >= 99).length,
        good: metrics.validators.filter(v => v.uptime >= 95 && v.uptime < 99).length,
        fair: metrics.validators.filter(v => v.uptime >= 90 && v.uptime < 95).length,
        poor: metrics.validators.filter(v => v.uptime < 90).length
      },
      slashing: {
        totalEvents: metrics.totalSlashingEvents,
        affectedValidators: metrics.validators.filter(v => v.slashingHistory.length > 0).length
      },
      recommendations: metrics.recommendations
    }
    
    return c.json({ success: true, data: summary })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get validators by performance tier
validators.get('/tier/:tier', async (c) => {
  try {
    const tier = c.req.param('tier').toLowerCase()
    const metrics = await validatorMonitor.checkValidators()
    
    let filteredValidators = []
    
    switch (tier) {
      case 'excellent':
        filteredValidators = metrics.validators.filter(v => v.performance >= 90)
        break
      case 'good':
        filteredValidators = metrics.validators.filter(v => v.performance >= 70 && v.performance < 90)
        break
      case 'fair':
        filteredValidators = metrics.validators.filter(v => v.performance >= 50 && v.performance < 70)
        break
      case 'poor':
        filteredValidators = metrics.validators.filter(v => v.performance < 50)
        break
      case 'active':
        filteredValidators = metrics.validators.filter(v => v.isActive)
        break
      case 'inactive':
        filteredValidators = metrics.validators.filter(v => !v.isActive)
        break
      case 'slashed':
        filteredValidators = metrics.validators.filter(v => v.slashingHistory.length > 0)
        break
      default:
        return c.json({ success: false, error: 'Invalid tier. Use: excellent, good, fair, poor, active, inactive, or slashed' }, 400)
    }
    
    return c.json({ 
      success: true, 
      data: filteredValidators,
      tier,
      count: filteredValidators.length
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get validator uptime history (mock endpoint)
validators.get('/:address/uptime', async (c) => {
  try {
    const address = c.req.param('address')
    const days = parseInt(c.req.query('days') || '30')
    
    // Mock uptime history data
    const uptimeHistory = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      uptime: 95 + Math.random() * 5, // 95-100% uptime
      blocks: Math.floor(8640 + Math.random() * 200), // ~8640 blocks per day on Core
      missed: Math.floor(Math.random() * 50)
    })).reverse()
    
    return c.json({ 
      success: true, 
      data: {
        validator: address,
        period: `${days} days`,
        history: uptimeHistory,
        averageUptime: uptimeHistory.reduce((sum, day) => sum + day.uptime, 0) / uptimeHistory.length
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get validator slashing history
validators.get('/:address/slashing', async (c) => {
  try {
    const address = c.req.param('address')
    const validator = await validatorMonitor.getValidatorDetails(address)
    
    if (!validator) {
      return c.json({ success: false, error: 'Validator not found' }, 404)
    }
    
    return c.json({ 
      success: true, 
      data: {
        validator: address,
        slashingHistory: validator.slashingHistory,
        totalEvents: validator.slashingHistory.length,
        totalAmount: validator.slashingHistory.reduce((sum, event) => sum + parseFloat(event.amount), 0)
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get commission analysis
validators.get('/analysis/commission', async (c) => {
  try {
    const metrics = await validatorMonitor.checkValidators()
    
    const calculateMedian = (values: number[]) => {
      const sorted = values.sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }
    
    const generateCommissionRecommendations = (validators: any[]) => {
      const recommendations = []
      const highCommission = validators.filter(v => v.commission > 8)
      if (highCommission.length > 0) {
        recommendations.push(`Consider rebalancing from ${highCommission.length} high-commission validators`)
      }
      return recommendations
    }
    
    const commissionAnalysis = {
      average: metrics.validators.reduce((sum, v) => sum + v.commission, 0) / metrics.validators.length,
      median: calculateMedian(metrics.validators.map(v => v.commission)),
      min: Math.min(...metrics.validators.map(v => v.commission)),
      max: Math.max(...metrics.validators.map(v => v.commission)),
      distribution: {
        low: metrics.validators.filter(v => v.commission <= 3).length, // ≤3%
        medium: metrics.validators.filter(v => v.commission > 3 && v.commission <= 7).length, // 3-7%
        high: metrics.validators.filter(v => v.commission > 7).length // >7%
      },
      recommendations: generateCommissionRecommendations(metrics.validators)
    }
    
    return c.json({ success: true, data: commissionAnalysis })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { validators as validatorRoutes }