import { Hono } from 'hono'
import { AutomationEngine } from '../services/AutomationEngine'

const automation = new Hono()
const automationEngine = new AutomationEngine()

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

// Get rebalancing strategy
automation.get('/rebalancing/strategy', async (c) => {
  try {
    const strategy = automationEngine.getRebalancingStrategy()
    return c.json({ success: true, data: strategy })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Update rebalancing strategy
automation.patch('/rebalancing/strategy', async (c) => {
  try {
    const strategy = await c.req.json()
    automationEngine.updateRebalancingStrategy(strategy)
    
    return c.json({ 
      success: true, 
      message: 'Rebalancing strategy updated',
      data: strategy
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
    
    // This would trigger a specific automation task manually
    await automationEngine.runAutomatedTasks()
    
    return c.json({ 
      success: true, 
      message: 'Automation task triggered manually',
      data: { taskId, timestamp: new Date().toISOString() }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get automation status and statistics
automation.get('/status', async (c) => {
  try {
    const tasks = automationEngine.getAutomationTasks()
    const enabledTasks = tasks.filter(t => t.enabled)
    const lastRuns = tasks.map(t => new Date(t.lastRun).getTime())
    const nextRuns = tasks.map(t => new Date(t.nextRun).getTime())
    
    const status = {
      totalTasks: tasks.length,
      enabledTasks: enabledTasks.length,
      disabledTasks: tasks.length - enabledTasks.length,
      lastActivity: new Date(Math.max(...lastRuns)).toISOString(),
      nextScheduled: new Date(Math.min(...nextRuns)).toISOString(),
      uptime: '99.5%', // Mock uptime
      tasksExecutedToday: 47, // Mock count
      errorRate: 0.02, // Mock error rate
      systemHealth: enabledTasks.length > 0 ? 'healthy' : 'inactive'
    }
    
    return c.json({ success: true, data: status })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { automation as automationRoutes }