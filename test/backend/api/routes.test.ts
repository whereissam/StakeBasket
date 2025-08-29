import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';

// Import backend modules
import { app } from '../../../backend/src/index';
import { AlertManager } from '../../../backend/src/services/AlertManager';
import { MetricsCollector } from '../../../backend/src/services/MetricsCollector';
import { ContractMonitor } from '../../../backend/src/services/ContractMonitor';

// Mock services
vi.mock('../../../backend/src/services/AlertManager');
vi.mock('../../../backend/src/services/MetricsCollector');
vi.mock('../../../backend/src/services/ContractMonitor');

describe('Backend API Routes', () => {
  let server: any;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Mock service implementations
    vi.mocked(AlertManager).mockImplementation(() => ({
      getAlerts: vi.fn().mockResolvedValue([
        {
          id: '1',
          type: 'price_deviation',
          severity: 'warning',
          message: 'Price deviation detected',
          timestamp: new Date(),
          resolved: false
        }
      ]),
      createAlert: vi.fn().mockResolvedValue({
        id: '2',
        type: 'manual',
        severity: 'info',
        message: 'Test alert',
        timestamp: new Date(),
        resolved: false
      }),
      resolveAlert: vi.fn().mockResolvedValue(true),
      getMetrics: vi.fn().mockResolvedValue({
        totalAlerts: 5,
        unresolvedAlerts: 2,
        alertsByType: { price_deviation: 3, contract_error: 2 }
      })
    } as any));

    vi.mocked(MetricsCollector).mockImplementation(() => ({
      getMetrics: vi.fn().mockResolvedValue({
        totalStaked: '1000000000000000000000',
        totalRewards: '50000000000000000000',
        activeStakers: 150,
        averageStakeSize: '6666666666666666666',
        stakingApr: '12.5',
        lastUpdated: new Date()
      }),
      getHistoricalMetrics: vi.fn().mockResolvedValue([
        {
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          totalStaked: '950000000000000000000',
          activeStakers: 145
        },
        {
          timestamp: new Date(),
          totalStaked: '1000000000000000000000',
          activeStakers: 150
        }
      ]),
      refreshMetrics: vi.fn().mockResolvedValue(true)
    } as any));

    vi.mocked(ContractMonitor).mockImplementation(() => ({
      getContractStatus: vi.fn().mockResolvedValue({
        StakeBasket: { status: 'healthy', lastCheck: new Date(), blockNumber: 12345 },
        DualStakingBasket: { status: 'healthy', lastCheck: new Date(), blockNumber: 12345 },
        PriceFeed: { status: 'healthy', lastCheck: new Date(), blockNumber: 12345 }
      }),
      getContractHealth: vi.fn().mockResolvedValue({
        overall: 'healthy',
        contracts: {
          StakeBasket: { healthy: true, issues: [] },
          DualStakingBasket: { healthy: true, issues: [] },
          PriceFeed: { healthy: true, issues: [] }
        }
      }),
      runHealthCheck: vi.fn().mockResolvedValue({
        success: true,
        timestamp: new Date(),
        results: {
          connectivity: true,
          contractsActive: true,
          pricesValid: true
        }
      })
    } as any));

    server = createServer(app);
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check Endpoints', () => {
    it('GET /health returns server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          api: 'healthy',
          database: 'healthy',
          contracts: 'healthy'
        }
      });
    });

    it('GET /health/contracts returns contract health status', async () => {
      const response = await request(app)
        .get('/health/contracts')
        .expect(200);

      expect(response.body).toEqual({
        overall: 'healthy',
        contracts: {
          StakeBasket: { healthy: true, issues: [] },
          DualStakingBasket: { healthy: true, issues: [] },
          PriceFeed: { healthy: true, issues: [] }
        }
      });
    });
  });

  describe('Metrics Endpoints', () => {
    it('GET /api/metrics returns current metrics', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body).toEqual({
        totalStaked: '1000000000000000000000',
        totalRewards: '50000000000000000000',
        activeStakers: 150,
        averageStakeSize: '6666666666666666666',
        stakingApr: '12.5',
        lastUpdated: expect.any(String)
      });
    });

    it('GET /api/metrics/historical returns historical data', async () => {
      const response = await request(app)
        .get('/api/metrics/historical')
        .query({ period: '7d' })
        .expect(200);

      expect(response.body).toEqual([
        {
          timestamp: expect.any(String),
          totalStaked: '950000000000000000000',
          activeStakers: 145
        },
        {
          timestamp: expect.any(String),
          totalStaked: '1000000000000000000000',
          activeStakers: 150
        }
      ]);
    });

    it('POST /api/metrics/refresh triggers metrics refresh', async () => {
      const response = await request(app)
        .post('/api/metrics/refresh')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Metrics refresh initiated'
      });
    });
  });

  describe('Alerts Endpoints', () => {
    it('GET /api/alerts returns alerts list', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(response.body).toEqual([
        {
          id: '1',
          type: 'price_deviation',
          severity: 'warning',
          message: 'Price deviation detected',
          timestamp: expect.any(String),
          resolved: false
        }
      ]);
    });

    it('POST /api/alerts creates new alert', async () => {
      const alertData = {
        type: 'manual',
        severity: 'info',
        message: 'Test alert'
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body).toEqual({
        id: '2',
        type: 'manual',
        severity: 'info',
        message: 'Test alert',
        timestamp: expect.any(String),
        resolved: false
      });
    });

    it('PUT /api/alerts/:id/resolve resolves alert', async () => {
      const response = await request(app)
        .put('/api/alerts/1/resolve')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Alert resolved'
      });
    });

    it('GET /api/alerts/metrics returns alert metrics', async () => {
      const response = await request(app)
        .get('/api/alerts/metrics')
        .expect(200);

      expect(response.body).toEqual({
        totalAlerts: 5,
        unresolvedAlerts: 2,
        alertsByType: { price_deviation: 3, contract_error: 2 }
      });
    });
  });

  describe('Monitoring Endpoints', () => {
    it('GET /api/monitoring/contracts returns contract status', async () => {
      const response = await request(app)
        .get('/api/monitoring/contracts')
        .expect(200);

      expect(response.body).toEqual({
        StakeBasket: { 
          status: 'healthy', 
          lastCheck: expect.any(String), 
          blockNumber: 12345 
        },
        DualStakingBasket: { 
          status: 'healthy', 
          lastCheck: expect.any(String), 
          blockNumber: 12345 
        },
        PriceFeed: { 
          status: 'healthy', 
          lastCheck: expect.any(String), 
          blockNumber: 12345 
        }
      });
    });

    it('POST /api/monitoring/health-check runs health check', async () => {
      const response = await request(app)
        .post('/api/monitoring/health-check')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        timestamp: expect.any(String),
        results: {
          connectivity: true,
          contractsActive: true,
          pricesValid: true
        }
      });
    });
  });

  describe('Faucet Endpoints', () => {
    it('POST /api/faucet/request requests test tokens', async () => {
      const requestData = {
        address: '0x1234567890123456789012345678901234567890',
        tokenType: 'CORE',
        amount: '100'
      };

      const response = await request(app)
        .post('/api/faucet/request')
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: expect.any(String),
        amount: '100',
        tokenType: 'CORE'
      });
    });

    it('GET /api/faucet/balance returns faucet balance', async () => {
      const response = await request(app)
        .get('/api/faucet/balance')
        .expect(200);

      expect(response.body).toEqual({
        CORE: expect.any(String),
        BTC: expect.any(String),
        USDT: expect.any(String)
      });
    });
  });

  describe('Oracle Endpoints', () => {
    it('GET /api/oracle/prices returns current prices', async () => {
      const response = await request(app)
        .get('/api/oracle/prices')
        .expect(200);

      expect(response.body).toEqual({
        CORE: {
          price: expect.any(String),
          timestamp: expect.any(String),
          source: 'chainlink'
        },
        BTC: {
          price: expect.any(String),
          timestamp: expect.any(String),
          source: 'chainlink'
        }
      });
    });

    it('POST /api/oracle/update-prices triggers price update', async () => {
      const response = await request(app)
        .post('/api/oracle/update-prices')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Price update initiated',
        updatedCount: expect.any(Number)
      });
    });
  });

  describe('Authentication Middleware', () => {
    it('rejects requests without API key for protected endpoints', async () => {
      await request(app)
        .post('/api/metrics/refresh')
        .expect(401);
    });

    it('accepts requests with valid API key', async () => {
      await request(app)
        .post('/api/metrics/refresh')
        .set('Authorization', 'Bearer valid-api-key')
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits on API endpoints', async () => {
      const requests = Array(6).fill(null).map(() => 
        request(app).get('/api/metrics')
      );

      const responses = await Promise.all(requests);
      
      // First 5 requests should succeed
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(200);
      });

      // 6th request should be rate limited
      expect(responses[5].status).toBe(429);
    });
  });

  describe('Error Handling', () => {
    it('handles service errors gracefully', async () => {
      // Mock service to throw error
      vi.mocked(MetricsCollector).mockImplementation(() => ({
        getMetrics: vi.fn().mockRejectedValue(new Error('Service unavailable'))
      } as any));

      const response = await request(app)
        .get('/api/metrics')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: expect.any(String)
      });
    });

    it('validates request parameters', async () => {
      const response = await request(app)
        .post('/api/alerts')
        .send({
          // Missing required fields
          message: 'Test alert'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation error',
        details: expect.any(Array)
      });
    });
  });

  describe('CORS Configuration', () => {
    it('includes CORS headers in responses', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('handles preflight requests', async () => {
      await request(app)
        .options('/api/metrics')
        .expect(204);
    });
  });
});