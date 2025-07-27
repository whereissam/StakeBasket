import { Hono } from 'hono';
import { CoreAPIService } from '../services/CoreAPIService.js';
import { OracleUpdater } from '../services/OracleUpdater.js';

const oracle = new Hono();

// Initialize Core API service
const coreAPI = new CoreAPIService(process.env.CORE_API_KEY);

// Oracle updater instance (will be initialized when needed)
let oracleUpdater: OracleUpdater | null = null;

/**
 * @route GET /validators
 * @desc Get real-time validator data from Core blockchain
 */
oracle.get('/validators', async (c) => {
  try {
    const validators = await coreAPI.getValidators();
    
    return c.json({
      success: true,
      data: {
        total: validators.length,
        active: validators.filter(v => v.validatorStatus === '1').length,
        validators: validators.map(v => ({
          address: v.operatorAddress,
          name: v.validatorName || 'Unnamed',
          isActive: v.validatorStatus === '1',
          totalDeposit: v.totalDeposit,
          feePercent: parseFloat(v.feePercent) / 100,
          votingPower: v.validatorVotingPower
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching validators:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch validator data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * @route GET /api/oracle/validators/top
 * @desc Get top validators by total deposit
 */
oracle.get('/validators/top', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const topValidators = await coreAPI.getTopValidatorsByDeposit(limit);
    
    return c.json({
      success: true,
      data: topValidators.map((v, index) => ({
        rank: index + 1,
        address: v.operatorAddress,
        name: v.validatorName || 'Unnamed',
        totalDeposit: v.totalDeposit,
        feePercent: parseFloat(v.feePercent) / 100,
        depositInCore: (parseFloat(v.totalDeposit) / 1e18).toFixed(0)
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching top validators:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch top validators'
    }, 500);
  }
});

/**
 * @route GET /api/oracle/price
 * @desc Get real-time CORE price from Core API
 */
oracle.get('/price', async (c) => {
  try {
    const priceData = await coreAPI.getCorePrice();
    
    return c.json({
      success: true,
      data: {
        coreusd: parseFloat(priceData.coreusd),
        corebtc: parseFloat(priceData.corebtc),
        lastUpdate: {
          usd: new Date(parseInt(priceData.coreusd_timestamp)).toISOString(),
          btc: new Date(parseInt(priceData.corebtc_timestamp)).toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch price data'
    }, 500);
  }
});

/**
 * @route GET /api/oracle/network-stats
 * @desc Get comprehensive network statistics
 */
router.get('/network-stats', async (req, res) => {
  try {
    const stats = await coreAPI.getNetworkStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching network stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network statistics'
    });
  }
});

/**
 * @route POST /api/oracle/start-updater
 * @desc Start the automated oracle price updater service
 */
router.post('/start-updater', async (req, res) => {
  try {
    if (oracleUpdater && oracleUpdater.getStatus().isRunning) {
      return res.json({
        success: false,
        message: 'Oracle updater is already running'
      });
    }
    
    // Oracle contract address from environment or request body
    const contractAddress = req.body.contractAddress || process.env.ORACLE_CONTRACT_ADDRESS;
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Oracle contract address required'
      });
    }
    
    const config = {
      contractAddress,
      privateKey: process.env.PRIVATE_KEY!,
      rpcUrl: process.env.VITE_CORE_TESTNET_RPC || 'https://rpc.test2.btcs.network',
      updateInterval: 60000 // 1 minute
    };
    
    oracleUpdater = new OracleUpdater(config, process.env.CORE_API_KEY);
    await oracleUpdater.startUpdating();
    oracleUpdater.setupEventListeners();
    
    res.json({
      success: true,
      message: 'Oracle updater started successfully',
      status: oracleUpdater.getStatus()
    });
  } catch (error) {
    console.error('Error starting oracle updater:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start oracle updater',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/oracle/stop-updater
 * @desc Stop the automated oracle price updater service
 */
router.post('/stop-updater', (req, res) => {
  try {
    if (oracleUpdater) {
      oracleUpdater.stopUpdating();
      res.json({
        success: true,
        message: 'Oracle updater stopped successfully'
      });
    } else {
      res.json({
        success: false,
        message: 'Oracle updater was not running'
      });
    }
  } catch (error) {
    console.error('Error stopping oracle updater:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop oracle updater'
    });
  }
});

/**
 * @route GET /api/oracle/status
 * @desc Get oracle updater service status
 */
router.get('/status', async (req, res) => {
  try {
    if (!oracleUpdater) {
      return res.json({
        success: true,
        data: {
          isRunning: false,
          message: 'Oracle updater not initialized'
        }
      });
    }
    
    const status = oracleUpdater.getStatus();
    
    // Get current oracle prices if running
    let currentPrices = {};
    if (status.isRunning) {
      try {
        currentPrices = await oracleUpdater.getCurrentPrices();
      } catch (error) {
        console.error('Error getting current prices:', error);
      }
    }
    
    res.json({
      success: true,
      data: {
        ...status,
        currentPrices
      }
    });
  } catch (error) {
    console.error('Error getting oracle status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get oracle status'
    });
  }
});

/**
 * @route POST /api/oracle/manual-update
 * @desc Manually trigger a price update
 */
router.post('/manual-update', async (req, res) => {
  try {
    if (!oracleUpdater) {
      return res.status(400).json({
        success: false,
        error: 'Oracle updater not initialized'
      });
    }
    
    await oracleUpdater.updateAllPrices();
    
    res.json({
      success: true,
      message: 'Manual price update completed successfully'
    });
  } catch (error) {
    console.error('Error in manual update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prices manually',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/oracle/validator/:address
 * @desc Get detailed information for a specific validator
 */
router.get('/validator/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const metrics = await coreAPI.getValidatorPerformanceMetrics(address);
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching validator ${req.params.address}:`, error);
    res.status(404).json({
      success: false,
      error: 'Validator not found or API error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const oracleRoutes = oracle;