import { Hono } from 'hono'
import { AutomationEngine } from '../services/AutomationEngine'
import { AutomatedRebalancer } from '../services/AutomatedRebalancer'
import { ValidatorMonitor } from '../services/ValidatorMonitor'

const automation = new Hono()
const automationEngine = new AutomationEngine()
const rebalancer = new AutomatedRebalancer(60) // 60 minute intervals
const validatorMonitor = new ValidatorMonitor()

// Start automated rebalancing on module load
rebalancer.start()

// Get all automation tasks
automation.get('/tasks', async (c) => {
  try {
    const tasks = automationEngine.getAutomationTasks()
    return c.json({ success: true, data: tasks })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Toggle automation task
automation.patch('/tasks/:taskId/toggle', async (c) => {
  try {
    const taskId = c.req.param('taskId')
    const body = await c.req.json()
    const { enabled } = body
    
    const success = automationEngine.toggleTask(taskId, enabled)
    
    if (success) {
      return c.json({ 
        success: true, 
        message: `Task ${enabled ? 'enabled' : 'disabled'}`,
        data: { taskId, enabled }
      })
    } else {
      return c.json({ success: false, error: 'Task not found' }, 404)
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Update task parameters
automation.patch('/tasks/:taskId/parameters', async (c) => {
  try {
    const taskId = c.req.param('taskId')
    const parameters = await c.req.json()
    
    const success = automationEngine.updateTaskParameters(taskId, parameters)
    
    if (success) {
      return c.json({ 
        success: true, 
        message: 'Task parameters updated',
        data: { taskId, parameters }
      })
    } else {
      return c.json({ success: false, error: 'Task not found' }, 404)
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get rebalancing status and configuration
automation.get('/rebalancing/status', async (c) => {
  try {
    const status = rebalancer.getStatus()
    const statistics = rebalancer.getStatistics()
    const history = rebalancer.getHistory(10) // Last 10 results
    
    return c.json({ 
      success: true, 
      data: { 
        status, 
        statistics, 
        recentHistory: history 
      } 
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Update rebalancing configuration
automation.patch('/rebalancing/config', async (c) => {
  try {
    const config = await c.req.json()
    
    if (config.thresholds) {
      rebalancer.updateThresholds(config.thresholds)
    }
    
    if (config.intervalMinutes) {
      rebalancer.updateInterval(config.intervalMinutes)
    }
    
    if (config.enabled !== undefined) {
      rebalancer.setEnabled(config.enabled)
    }
    
    return c.json({ 
      success: true, 
      message: 'Rebalancing configuration updated',
      data: config
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Manual rebalancing trigger
automation.post('/rebalancing/trigger', async (c) => {
  try {
    const result = await rebalancer.triggerManualRebalancing()
    
    return c.json({ 
      success: true, 
      message: 'Manual rebalancing completed',
      data: result
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get rebalancing history
automation.get('/rebalancing/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const history = rebalancer.getHistory(limit)
    
    return c.json({ 
      success: true, 
      data: { 
        history,
        total: history.length
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Validator monitoring and analysis
automation.get('/validators/analysis', async (c) => {
  try {
    const metrics = await validatorMonitor.checkValidators()
    
    return c.json({ 
      success: true, 
      data: metrics
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Simulate validator state changes for testing
automation.post('/validators/simulate', async (c) => {
  try {
    const changes = await c.req.json()
    
    const result = await rebalancer.simulateValidatorStateChanges(changes)
    
    return c.json({ 
      success: true, 
      message: result.message,
      data: { 
        applied: result.success,
        changes
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get risk parameters
automation.get('/risk/parameters', async (c) => {
  try {
    const parameters = automationEngine.getRiskParameters()
    return c.json({ success: true, data: parameters })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Update risk parameters
automation.patch('/risk/parameters', async (c) => {
  try {
    const parameters = await c.req.json()
    automationEngine.updateRiskParameters(parameters)
    
    return c.json({ 
      success: true, 
      message: 'Risk parameters updated',
      data: parameters
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Manual trigger for automation tasks
automation.post('/trigger/:taskId', async (c) => {
  try {
    const taskId = c.req.param('taskId')
    
    if (taskId === 'rebalancing') {
      const result = await rebalancer.triggerManualRebalancing()
      return c.json({ 
        success: true, 
        message: 'Rebalancing task triggered manually',
        data: { taskId, result, timestamp: new Date().toISOString() }
      })
    } else {
      // This would trigger other automation tasks
      await automationEngine.runAutomatedTasks()
      
      return c.json({ 
        success: true, 
        message: 'Automation task triggered manually',
        data: { taskId, timestamp: new Date().toISOString() }
      })
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get comprehensive automation status and statistics
automation.get('/status', async (c) => {
  try {
    const tasks = automationEngine.getAutomationTasks()
    const enabledTasks = tasks.filter(t => t.enabled)
    const lastRuns = tasks.map(t => new Date(t.lastRun).getTime())
    const nextRuns = tasks.map(t => new Date(t.nextRun).getTime())
    
    // Get rebalancing status
    const rebalancingStatus = rebalancer.getStatus()
    const rebalancingStats = rebalancer.getStatistics()
    
    const status = {
      // General automation
      totalTasks: tasks.length + 1, // +1 for rebalancing
      enabledTasks: enabledTasks.length + (rebalancingStatus.enabled ? 1 : 0),
      disabledTasks: (tasks.length + 1) - (enabledTasks.length + (rebalancingStatus.enabled ? 1 : 0)),
      lastActivity: rebalancingStatus.lastRun ? 
        new Date(Math.max(Math.max(...lastRuns), new Date(rebalancingStatus.lastRun).getTime())).toISOString() :
        new Date(Math.max(...lastRuns)).toISOString(),
      nextScheduled: rebalancingStatus.nextRun ?
        new Date(Math.min(Math.min(...nextRuns), new Date(rebalancingStatus.nextRun).getTime())).toISOString() :
        new Date(Math.min(...nextRuns)).toISOString(),
      
      // Rebalancing specific
      rebalancing: {
        enabled: rebalancingStatus.enabled,
        scheduled: rebalancingStatus.scheduled,
        lastRun: rebalancingStatus.lastRun,
        nextRun: rebalancingStatus.nextRun,
        totalExecutions: rebalancingStats.totalRuns,
        successfulRebalances: rebalancingStats.successfulRebalances,
        failedRebalances: rebalancingStats.failedRebalances,
        averageImprovement: rebalancingStats.averageImprovement,
        totalImprovement: rebalancingStats.totalImprovement
      },
      
      // System health
      uptime: '99.5%', // Mock uptime
      systemHealth: (enabledTasks.length > 0 || rebalancingStatus.enabled) ? 'healthy' : 'inactive',
      errorRate: rebalancingStats.totalRuns > 0 ? 
        rebalancingStats.failedRebalances / rebalancingStats.totalRuns : 0.02
    }
    
    return c.json({ success: true, data: status })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Health check endpoint
automation.get('/health', async (c) => {
  try {
    const rebalancingStatus = rebalancer.getStatus()
    const rebalancingStats = rebalancer.getStatistics()
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        rebalancer: {
          status: rebalancingStatus.enabled ? 'active' : 'inactive',
          scheduled: rebalancingStatus.scheduled,
          lastRun: rebalancingStatus.lastRun,
          successRate: rebalancingStats.totalRuns > 0 ? 
            (rebalancingStats.successfulRebalances / rebalancingStats.totalRuns) * 100 : 100
        },
        validatorMonitor: {
          status: 'active',
          lastCheck: new Date().toISOString()
        }
      }
    }
    
    return c.json({ success: true, data: health })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Cleanup on process exit
process.on('SIGINT', () => {
  console.log('Shutting down automated rebalancer...')
  rebalancer.destroy()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Shutting down automated rebalancer...')
  rebalancer.destroy()
  process.exit(0)
})

export { automation as automationRoutes }