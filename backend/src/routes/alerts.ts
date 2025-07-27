import { Hono } from 'hono'
import { AlertManager } from '../services/AlertManager'

const alerts = new Hono()
const alertManager = new AlertManager()

// Get all alerts
alerts.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const acknowledged = c.req.query('acknowledged') === 'true' ? true : 
                        c.req.query('acknowledged') === 'false' ? false : undefined
    
    const alertList = alertManager.getAlerts(limit, acknowledged)
    
    return c.json({ 
      success: true, 
      data: alertList,
      pagination: {
        limit,
        total: alertList.length,
        hasMore: alertList.length === limit
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get alert statistics
alerts.get('/stats', async (c) => {
  try {
    const stats = alertManager.getAlertStats()
    return c.json({ success: true, data: stats })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Acknowledge an alert
alerts.patch('/:alertId/acknowledge', async (c) => {
  try {
    const alertId = c.req.param('alertId')
    const success = alertManager.acknowledgeAlert(alertId)
    
    if (success) {
      return c.json({ 
        success: true, 
        message: 'Alert acknowledged',
        data: { alertId }
      })
    } else {
      return c.json({ 
        success: false, 
        error: 'Alert not found' 
      }, 404)
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Create custom alert
alerts.post('/custom', async (c) => {
  try {
    const body = await c.req.json()
    const { type, category, title, message, data } = body
    
    if (!type || !category || !title || !message) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: type, category, title, message' 
      }, 400)
    }
    
    const alert = alertManager.addCustomAlert(type, category, title, message, data)
    
    return c.json({ 
      success: true, 
      message: 'Custom alert created',
      data: alert
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get alerts by category
alerts.get('/category/:category', async (c) => {
  try {
    const category = c.req.param('category')
    const limit = parseInt(c.req.query('limit') || '50')
    
    const allAlerts = alertManager.getAlerts()
    const categoryAlerts = allAlerts
      .filter(alert => alert.category === category)
      .slice(0, limit)
    
    return c.json({ 
      success: true, 
      data: categoryAlerts,
      category,
      count: categoryAlerts.length
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get alerts by type/severity
alerts.get('/type/:type', async (c) => {
  try {
    const type = c.req.param('type')
    const limit = parseInt(c.req.query('limit') || '50')
    
    const allAlerts = alertManager.getAlerts()
    const typeAlerts = allAlerts
      .filter(alert => alert.type === type)
      .slice(0, limit)
    
    return c.json({ 
      success: true, 
      data: typeAlerts,
      type,
      count: typeAlerts.length
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Clear old alerts
alerts.delete('/cleanup', async (c) => {
  try {
    const maxAgeDays = parseInt(c.req.query('days') || '7')
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000
    
    alertManager.clearOldAlerts(maxAge)
    
    return c.json({ 
      success: true, 
      message: `Cleared alerts older than ${maxAgeDays} days`
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { alerts as alertsRoutes }