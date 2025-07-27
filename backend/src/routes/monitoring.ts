import { Hono } from 'hono'
import { ContractMonitor } from '../services/ContractMonitor'
import { broadcast } from '../index'

const monitoring = new Hono()
const contractMonitor = new ContractMonitor()

// Get current contract metrics
monitoring.get('/metrics', async (c) => {
  try {
    const metrics = await contractMonitor.collectMetrics()
    return c.json({ success: true, data: metrics })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get price feed data
monitoring.get('/prices', async (c) => {
  try {
    const priceData = await contractMonitor.checkPriceFeeds()
    return c.json({ success: true, data: priceData })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get contract events
monitoring.get('/events', async (c) => {
  try {
    const fromBlock = parseInt(c.req.query('fromBlock') || '-100')
    const events = await contractMonitor.getContractEvents(fromBlock)
    return c.json({ success: true, data: events })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Real-time monitoring status
monitoring.get('/status', async (c) => {
  try {
    const [metrics, priceData] = await Promise.all([
      contractMonitor.collectMetrics(),
      contractMonitor.checkPriceFeeds()
    ])
    
    const status = {
      contract: {
        operational: metrics.performanceScore > 70,
        performance: metrics.performanceScore,
        errorRate: metrics.errorRate
      },
      priceFeeds: {
        operational: !priceData.isStale,
        staleness: priceData.isStale,
        deviation: priceData.deviation
      },
      overall: {
        healthy: metrics.performanceScore > 70 && !priceData.isStale,
        lastCheck: new Date().toISOString()
      }
    }
    
    return c.json({ success: true, data: status })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Trigger manual monitoring update
monitoring.post('/refresh', async (c) => {
  try {
    const [metrics, priceData] = await Promise.all([
      contractMonitor.collectMetrics(),
      contractMonitor.checkPriceFeeds()
    ])
    
    // Broadcast updates to connected clients
    broadcast('contract_metrics', metrics)
    broadcast('price_data', priceData)
    
    return c.json({ 
      success: true, 
      message: 'Monitoring data refreshed',
      data: { metrics, priceData }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { monitoring as monitoringRoutes }