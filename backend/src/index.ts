import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { WebSocketServer } from 'ws'
import cron from 'node-cron'

import { monitoringRoutes } from './routes/monitoring'
import { alertsRoutes } from './routes/alerts'
import { validatorRoutes } from './routes/validators'
import { automationRoutes } from './routes/automation'
import { metricsRoutes } from './routes/metrics'
import { oracleRoutes } from './routes/oracle'

import { ContractMonitor } from './services/ContractMonitor'
import { ValidatorMonitor } from './services/ValidatorMonitor'
import { AlertManager } from './services/AlertManager'
import { AutomationEngine } from './services/AutomationEngine'
import { MetricsCollector } from './services/MetricsCollector'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Frontend URLs
  credentials: true,
}))

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      monitoring: true,
      alerts: true,
      validators: true,
      automation: true
    }
  })
})

// API Routes
app.route('/api/monitoring', monitoringRoutes)
app.route('/api/alerts', alertsRoutes)
app.route('/api/validators', validatorRoutes)
app.route('/api/automation', automationRoutes)
app.route('/api/metrics', metricsRoutes)
app.route('/api/oracle', oracleRoutes)

// Initialize services
const contractMonitor = new ContractMonitor()
const validatorMonitor = new ValidatorMonitor()
const alertManager = new AlertManager()
const automationEngine = new AutomationEngine()
const metricsCollector = new MetricsCollector()

// WebSocket server for real-time updates
const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket')
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'connection',
    data: { status: 'connected', timestamp: new Date().toISOString() }
  }))

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket')
  })
})

// Broadcast function for real-time updates
export const broadcast = (type: string, data: any) => {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() })
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message)
    }
  })
}

// Scheduled tasks
console.log('Setting up scheduled monitoring tasks...')

// Contract monitoring every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  try {
    const metrics = await contractMonitor.collectMetrics()
    await metricsCollector.store('contract', metrics)
    
    // Check for alerts
    const alerts = await alertManager.checkContractAlerts(metrics)
    if (alerts.length > 0) {
      broadcast('alerts', alerts)
    }
    
    // Broadcast metrics
    broadcast('contract_metrics', metrics)
  } catch (error) {
    console.error('Contract monitoring error:', error)
  }
})

// Validator monitoring every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  try {
    const validatorData = await validatorMonitor.checkValidators()
    await metricsCollector.store('validators', validatorData)
    
    // Check for validator alerts
    const alerts = await alertManager.checkValidatorAlerts(validatorData)
    if (alerts.length > 0) {
      broadcast('validator_alerts', alerts)
    }
    
    broadcast('validator_metrics', validatorData)
  } catch (error) {
    console.error('Validator monitoring error:', error)
  }
})

// Automation engine every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await automationEngine.runAutomatedTasks()
  } catch (error) {
    console.error('Automation engine error:', error)
  }
})

// Price oracle monitoring every minute
cron.schedule('* * * * *', async () => {
  try {
    const priceData = await contractMonitor.checkPriceFeeds()
    
    // Check for price alerts
    const alerts = await alertManager.checkPriceAlerts(priceData)
    if (alerts.length > 0) {
      broadcast('price_alerts', alerts)
    }
    
    broadcast('price_data', priceData)
  } catch (error) {
    console.error('Price monitoring error:', error)
  }
})

// Start server
const port = process.env.PORT || 3001
console.log(`🚀 StakeBasket Backend starting on port ${port}`)
console.log(`📊 WebSocket server running on port 8080`)

serve({
  fetch: app.fetch,
  port: Number(port),
  hostname: '127.0.0.1'
})

export default app