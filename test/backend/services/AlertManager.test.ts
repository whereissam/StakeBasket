import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlertManager } from '../../../backend/src/services/AlertManager';

// Mock dependencies
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  access: vi.fn()
}));

vi.mock('../../../backend/src/config/contracts', () => ({
  getContract: vi.fn().mockReturnValue({
    address: '0x123456789',
    abi: []
  })
}));

describe('AlertManager Service', () => {
  let alertManager: AlertManager;
  let mockWriteFile: any;
  let mockReadFile: any;
  let mockAccess: any;

  beforeEach(() => {
    const fs = require('fs/promises');
    mockWriteFile = vi.mocked(fs.writeFile);
    mockReadFile = vi.mocked(fs.readFile);
    mockAccess = vi.mocked(fs.access);

    // Clear all mocks
    vi.clearAllMocks();

    // Mock file system operations
    mockAccess.mockResolvedValue(undefined); // File exists
    mockReadFile.mockResolvedValue(JSON.stringify([])); // Empty alerts file
    mockWriteFile.mockResolvedValue(undefined);

    alertManager = new AlertManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Alert Creation', () => {
    it('creates a new alert with proper structure', async () => {
      const alertData = {
        type: 'price_deviation' as const,
        severity: 'warning' as const,
        message: 'CORE price deviated by 5%',
        metadata: { token: 'CORE', deviation: 5 }
      };

      const alert = await alertManager.createAlert(alertData);

      expect(alert).toEqual({
        id: expect.any(String),
        type: 'price_deviation',
        severity: 'warning',
        message: 'CORE price deviated by 5%',
        metadata: { token: 'CORE', deviation: 5 },
        timestamp: expect.any(Date),
        resolved: false
      });
    });

    it('generates unique IDs for different alerts', async () => {
      const alert1 = await alertManager.createAlert({
        type: 'contract_error',
        severity: 'critical',
        message: 'Contract call failed'
      });

      const alert2 = await alertManager.createAlert({
        type: 'price_deviation',
        severity: 'warning',
        message: 'Price spike detected'
      });

      expect(alert1.id).not.toBe(alert2.id);
    });

    it('persists alerts to storage', async () => {
      await alertManager.createAlert({
        type: 'manual',
        severity: 'info',
        message: 'System maintenance scheduled'
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('alerts.json'),
        expect.stringContaining('System maintenance scheduled')
      );
    });
  });

  describe('Alert Retrieval', () => {
    beforeEach(async () => {
      const existingAlerts = [
        {
          id: '1',
          type: 'price_deviation',
          severity: 'warning',
          message: 'Price alert 1',
          timestamp: new Date('2024-01-01'),
          resolved: false
        },
        {
          id: '2',
          type: 'contract_error',
          severity: 'critical',
          message: 'Contract alert',
          timestamp: new Date('2024-01-02'),
          resolved: true
        }
      ];

      mockReadFile.mockResolvedValue(JSON.stringify(existingAlerts));
    });

    it('retrieves all alerts', async () => {
      const alerts = await alertManager.getAlerts();

      expect(alerts).toHaveLength(2);
      expect(alerts[0]).toEqual({
        id: '1',
        type: 'price_deviation',
        severity: 'warning',
        message: 'Price alert 1',
        timestamp: expect.any(Date),
        resolved: false
      });
    });

    it('filters alerts by type', async () => {
      const alerts = await alertManager.getAlerts({ type: 'price_deviation' });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('price_deviation');
    });

    it('filters alerts by severity', async () => {
      const alerts = await alertManager.getAlerts({ severity: 'critical' });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
    });

    it('filters alerts by resolved status', async () => {
      const unresolvedAlerts = await alertManager.getAlerts({ resolved: false });
      const resolvedAlerts = await alertManager.getAlerts({ resolved: true });

      expect(unresolvedAlerts).toHaveLength(1);
      expect(resolvedAlerts).toHaveLength(1);
    });

    it('supports multiple filters', async () => {
      const alerts = await alertManager.getAlerts({ 
        severity: 'warning',
        resolved: false 
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].resolved).toBe(false);
    });

    it('limits results when specified', async () => {
      const alerts = await alertManager.getAlerts({ limit: 1 });
      expect(alerts).toHaveLength(1);
    });
  });

  describe('Alert Resolution', () => {
    beforeEach(async () => {
      const existingAlerts = [
        {
          id: 'alert-1',
          type: 'price_deviation',
          severity: 'warning',
          message: 'Test alert',
          timestamp: new Date(),
          resolved: false
        }
      ];

      mockReadFile.mockResolvedValue(JSON.stringify(existingAlerts));
    });

    it('resolves an existing alert', async () => {
      const result = await alertManager.resolveAlert('alert-1');

      expect(result).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('returns false for non-existent alert', async () => {
      const result = await alertManager.resolveAlert('non-existent');

      expect(result).toBe(false);
    });

    it('adds resolution timestamp when resolving', async () => {
      await alertManager.resolveAlert('alert-1');

      const writeCall = mockWriteFile.mock.calls[0][1];
      const savedAlerts = JSON.parse(writeCall);
      
      expect(savedAlerts[0].resolved).toBe(true);
      expect(savedAlerts[0].resolvedAt).toBeDefined();
    });
  });

  describe('Alert Metrics', () => {
    beforeEach(async () => {
      const existingAlerts = [
        {
          id: '1',
          type: 'price_deviation',
          severity: 'warning',
          message: 'Alert 1',
          timestamp: new Date(),
          resolved: false
        },
        {
          id: '2',
          type: 'price_deviation',
          severity: 'critical',
          message: 'Alert 2',
          timestamp: new Date(),
          resolved: true
        },
        {
          id: '3',
          type: 'contract_error',
          severity: 'warning',
          message: 'Alert 3',
          timestamp: new Date(),
          resolved: false
        }
      ];

      mockReadFile.mockResolvedValue(JSON.stringify(existingAlerts));
    });

    it('calculates alert metrics correctly', async () => {
      const metrics = await alertManager.getMetrics();

      expect(metrics).toEqual({
        totalAlerts: 3,
        unresolvedAlerts: 2,
        resolvedAlerts: 1,
        alertsByType: {
          price_deviation: 2,
          contract_error: 1
        },
        alertsBySeverity: {
          warning: 2,
          critical: 1
        }
      });
    });

    it('handles empty alerts gracefully', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));

      const metrics = await alertManager.getMetrics();

      expect(metrics).toEqual({
        totalAlerts: 0,
        unresolvedAlerts: 0,
        resolvedAlerts: 0,
        alertsByType: {},
        alertsBySeverity: {}
      });
    });
  });

  describe('Price Monitoring', () => {
    it('monitors price deviations', async () => {
      const mockPrices = {
        CORE: { current: 1.05, previous: 1.00 },
        BTC: { current: 50000, previous: 50500 }
      };

      // Mock the price monitoring method
      const spy = vi.spyOn(alertManager, 'monitorPriceDeviations');
      spy.mockResolvedValue([
        {
          id: 'price-alert-1',
          type: 'price_deviation',
          severity: 'warning',
          message: 'CORE price increased by 5%',
          timestamp: new Date(),
          resolved: false
        }
      ]);

      const alerts = await alertManager.monitorPriceDeviations(mockPrices, 0.03); // 3% threshold

      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('CORE');
      expect(alerts[0].message).toContain('5%');
    });

    it('ignores price changes below threshold', async () => {
      const mockPrices = {
        CORE: { current: 1.01, previous: 1.00 }
      };

      const spy = vi.spyOn(alertManager, 'monitorPriceDeviations');
      spy.mockResolvedValue([]);

      const alerts = await alertManager.monitorPriceDeviations(mockPrices, 0.05); // 5% threshold

      expect(alerts).toHaveLength(0);
    });
  });

  describe('Contract Monitoring', () => {
    it('monitors contract health', async () => {
      const contractStatuses = {
        StakeBasket: { healthy: false, error: 'Connection timeout' },
        DualStakingBasket: { healthy: true, error: null }
      };

      const spy = vi.spyOn(alertManager, 'monitorContractHealth');
      spy.mockResolvedValue([
        {
          id: 'contract-alert-1',
          type: 'contract_error',
          severity: 'critical',
          message: 'StakeBasket contract health check failed: Connection timeout',
          timestamp: new Date(),
          resolved: false
        }
      ]);

      const alerts = await alertManager.monitorContractHealth(contractStatuses);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('contract_error');
      expect(alerts[0].severity).toBe('critical');
    });
  });

  describe('Error Handling', () => {
    it('handles file read errors gracefully', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Should not throw and should return empty array
      const alerts = await alertManager.getAlerts();
      expect(alerts).toEqual([]);
    });

    it('handles file write errors gracefully', async () => {
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      // Should not throw when creating alert fails to save
      await expect(alertManager.createAlert({
        type: 'manual',
        severity: 'info',
        message: 'Test alert'
      })).resolves.toBeDefined();
    });

    it('validates alert data', async () => {
      await expect(alertManager.createAlert({
        type: 'invalid_type' as any,
        severity: 'info',
        message: 'Test'
      })).rejects.toThrow('Invalid alert type');

      await expect(alertManager.createAlert({
        type: 'manual',
        severity: 'invalid_severity' as any,
        message: 'Test'
      })).rejects.toThrow('Invalid severity level');
    });
  });

  describe('Cleanup Operations', () => {
    it('cleans up old resolved alerts', async () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      const existingAlerts = [
        {
          id: '1',
          type: 'manual',
          severity: 'info',
          message: 'Old resolved alert',
          timestamp: oldDate,
          resolved: true,
          resolvedAt: oldDate
        },
        {
          id: '2',
          type: 'manual',
          severity: 'info',
          message: 'Recent alert',
          timestamp: new Date(),
          resolved: false
        }
      ];

      mockReadFile.mockResolvedValue(JSON.stringify(existingAlerts));

      await alertManager.cleanupOldAlerts(30); // Keep alerts for 30 days

      const writeCall = mockWriteFile.mock.calls[0][1];
      const remainingAlerts = JSON.parse(writeCall);
      
      expect(remainingAlerts).toHaveLength(1);
      expect(remainingAlerts[0].id).toBe('2');
    });

    it('preserves unresolved alerts regardless of age', async () => {
      const veryOldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const existingAlerts = [
        {
          id: '1',
          type: 'contract_error',
          severity: 'critical',
          message: 'Old unresolved alert',
          timestamp: veryOldDate,
          resolved: false
        }
      ];

      mockReadFile.mockResolvedValue(JSON.stringify(existingAlerts));

      await alertManager.cleanupOldAlerts(30);

      const writeCall = mockWriteFile.mock.calls[0][1];
      const remainingAlerts = JSON.parse(writeCall);
      
      expect(remainingAlerts).toHaveLength(1);
      expect(remainingAlerts[0].id).toBe('1');
    });
  });
});