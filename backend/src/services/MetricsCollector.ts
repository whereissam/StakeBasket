export interface HistoricalMetric {
  id: string
  type: string
  data: any
  timestamp: string
}

export class MetricsCollector {
  private metrics: HistoricalMetric[] = []

  async store(type: string, data: any): Promise<void> {
    const metric: HistoricalMetric = {
      id: `${type}-${Date.now()}`,
      type,
      data,
      timestamp: new Date().toISOString()
    }
    
    this.metrics.push(metric)
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  async getHistory(type: string, limit: number, timeframe: string): Promise<HistoricalMetric[]> {
    // Calculate time cutoff based on timeframe
    const now = Date.now()
    let cutoffTime = now
    
    switch (timeframe) {
      case '1h':
        cutoffTime = now - (60 * 60 * 1000)
        break
      case '24h':
        cutoffTime = now - (24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        cutoffTime = now - (30 * 24 * 60 * 60 * 1000)
        break
    }
    
    return this.metrics
      .filter(m => m.type === type && new Date(m.timestamp).getTime() > cutoffTime)
      .slice(-limit)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  async getSummary(timeframe: string): Promise<any> {
    const history = await this.getHistory('contract', 100, timeframe)
    
    if (history.length === 0) {
      return {
        totalTransactions: 0,
        averageGasUsage: 0,
        errorRate: 0,
        uptimePercentage: 100,
        averagePerformance: 0
      }
    }
    
    const totalTxns = history.reduce((sum, h) => sum + (h.data.transactionCount?.total || 0), 0)
    const avgGas = history.reduce((sum, h) => sum + (h.data.gasUsage?.average || 0), 0) / history.length
    const avgErrorRate = history.reduce((sum, h) => sum + (h.data.errorRate || 0), 0) / history.length
    const avgPerformance = history.reduce((sum, h) => sum + (h.data.performanceScore || 0), 0) / history.length
    
    return {
      totalTransactions: totalTxns,
      averageGasUsage: Math.round(avgGas),
      errorRate: avgErrorRate,
      uptimePercentage: Math.max(0, 100 - (avgErrorRate * 100)),
      averagePerformance: avgPerformance,
      dataPoints: history.length,
      timeframe
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    const recentMetrics = this.metrics.slice(-10) // Last 10 metrics
    
    if (recentMetrics.length === 0) {
      return {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        availability: 100
      }
    }
    
    return {
      responseTime: 150 + Math.random() * 50, // Mock response time 150-200ms
      throughput: 50 + Math.random() * 30, // Mock throughput 50-80 req/min
      errorRate: Math.random() * 0.02, // Mock error rate 0-2%
      availability: 99.5 + Math.random() * 0.5, // Mock availability 99.5-100%
      lastUpdated: new Date().toISOString()
    }
  }

  getMetricsCount(): number {
    return this.metrics.length
  }

  clearOldMetrics(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge
    this.metrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoffTime
    )
  }
}