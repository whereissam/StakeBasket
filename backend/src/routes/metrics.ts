import { Hono } from 'hono'
import { MetricsCollector } from '../services/MetricsCollector'

const metrics = new Hono()
const metricsCollector = new MetricsCollector()

// Get historical metrics
metrics.get('/history', async (c) => {
  try {
    const type = c.req.query('type') || 'contract'
    const limit = parseInt(c.req.query('limit') || '100')
    const timeframe = c.req.query('timeframe') || '24h'
    
    const history = await metricsCollector.getHistory(type, limit, timeframe)
    
    return c.json({ 
      success: true, 
      data: history,
      metadata: { type, limit, timeframe }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get aggregated metrics
metrics.get('/summary', async (c) => {
  try {
    const timeframe = c.req.query('timeframe') || '24h'
    const summary = await metricsCollector.getSummary(timeframe)
    
    return c.json({ success: true, data: summary })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get real-time performance metrics
metrics.get('/performance', async (c) => {
  try {
    const performance = await metricsCollector.getPerformanceMetrics()
    
    return c.json({ success: true, data: performance })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { metrics as metricsRoutes }