import { ethers } from 'ethers';
import { CoreAPIService } from './CoreAPIService.js';

interface OracleConfig {
  contractAddress: string;
  privateKey: string;
  rpcUrl: string;
  updateInterval: number; // in milliseconds
}

/**
 * @class OracleUpdater
 * @description Automated service that fetches real-time prices from Core APIs
 * and updates the CoreOracle smart contract on Core Testnet2
 */
export class OracleUpdater {
  private coreAPI: CoreAPIService;
  private provider: ethers.Provider;
  private signer: ethers.Wallet;
  private oracleContract: ethers.Contract;
  private config: OracleConfig;
  private updateTimer?: NodeJS.Timeout;
  
  // Oracle contract ABI (minimal interface)
  private readonly oracleABI = [
    "function updatePrice(string memory asset, uint256 price) external",
    "function updatePrices(string[] memory assets, uint256[] memory prices) external",
    "function getPrice(string memory asset) external view returns (uint256)",
    "function isPriceFresh(string memory asset) external view returns (bool)",
    "event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp)"
  ];
  
  constructor(config: OracleConfig, apiKey?: string) {
    this.config = config;
    this.coreAPI = new CoreAPIService(apiKey);
    
    // Initialize ethers provider and signer
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    
    // Initialize oracle contract
    this.oracleContract = new ethers.Contract(
      config.contractAddress,
      this.oracleABI,
      this.signer
    );
  }
  
  /**
   * Start the automated price update service
   */
  async startUpdating(): Promise<void> {
    console.log('🚀 Starting Oracle Updater Service...');
    console.log(`📊 Update interval: ${this.config.updateInterval / 1000}s`);
    console.log(`🏦 Oracle contract: ${this.config.contractAddress}`);
    
    // Initial update
    await this.updateAllPrices();
    
    // Set up recurring updates
    this.updateTimer = setInterval(async () => {
      try {
        await this.updateAllPrices();
      } catch (error) {
        console.error('❌ Error in scheduled update:', error);
      }
    }, this.config.updateInterval);
    
    console.log('✅ Oracle Updater Service started successfully');
  }
  
  /**
   * Stop the automated updates
   */
  stopUpdating(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
      console.log('⏹️ Oracle Updater Service stopped');
    }
  }
  
  /**
   * Update all supported asset prices
   */
  async updateAllPrices(): Promise<void> {
    try {
      console.log('📈 Fetching latest prices from Core API...');
      
      // Fetch real-time data from Core APIs
      const [priceData, networkStats] = await Promise.all([
        this.coreAPI.getCorePrice(),
        this.coreAPI.getNetworkStats()
      ]);
      
      // Prepare price updates
      const assets: string[] = [];
      const prices: bigint[] = [];
      
      // CORE price in USD (convert to 8 decimals)
      const coreUsdPrice = Math.round(parseFloat(priceData.coreusd) * 1e8);
      assets.push('CORE');
      prices.push(BigInt(coreUsdPrice));
      
      // BTC price (estimate from CORE/BTC ratio)
      const btcPrice = Math.round(parseFloat(priceData.coreusd) / parseFloat(priceData.corebtc) * 1e8);
      assets.push('BTC');
      prices.push(BigInt(btcPrice));
      
      // lstBTC price (same as BTC for now, can be enhanced with real lstBTC data)
      assets.push('lstBTC');
      prices.push(BigInt(btcPrice));
      
      // coreBTC price (same as BTC)
      assets.push('coreBTC');
      prices.push(BigInt(btcPrice));
      
      console.log('💰 Price Updates:');
      console.log(`  CORE: $${(coreUsdPrice / 1e8).toFixed(4)}`);
      console.log(`  BTC:  $${(Number(btcPrice) / 1e8).toFixed(2)}`);
      
      // Update oracle contract
      console.log('⬆️ Updating oracle contract...');
      const tx = await this.oracleContract.updatePrices(assets, prices);
      
      console.log(`📝 Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Prices updated successfully! Gas used: ${receipt.gasUsed}`);
      
      // Log network stats
      console.log('📊 Network Stats:');
      console.log(`  Active Validators: ${networkStats.validators.active}`);
      console.log(`  Total Staked: ${(parseFloat(networkStats.validators.totalStaked) / 1e18).toFixed(0)} CORE`);
      console.log(`  Market Cap: $${networkStats.supply.marketCap}M`);
      
    } catch (error) {
      console.error('❌ Error updating prices:', error);
      throw error;
    }
  }
  
  /**
   * Update a single asset price
   */
  async updateSinglePrice(asset: string): Promise<void> {
    try {
      if (asset === 'CORE') {
        const priceData = await this.coreAPI.getCorePrice();
        const coreUsdPrice = Math.round(parseFloat(priceData.coreusd) * 1e8);
        
        const tx = await this.oracleContract.updatePrice('CORE', BigInt(coreUsdPrice));
        await tx.wait();
        
        console.log(`✅ Updated ${asset} price: $${(coreUsdPrice / 1e8).toFixed(4)}`);
      } else {
        throw new Error(`Unsupported asset: ${asset}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${asset} price:`, error);
      throw error;
    }
  }
  
  /**
   * Check if oracle prices are fresh
   */
  async checkPriceFreshness(): Promise<Record<string, boolean>> {
    const assets = ['CORE', 'BTC', 'lstBTC', 'coreBTC'];
    const freshness: Record<string, boolean> = {};
    
    for (const asset of assets) {
      try {
        freshness[asset] = await this.oracleContract.isPriceFresh(asset);
      } catch (error) {
        console.error(`Error checking freshness for ${asset}:`, error);
        freshness[asset] = false;
      }
    }
    
    return freshness;
  }
  
  /**
   * Get current oracle prices
   */
  async getCurrentPrices(): Promise<Record<string, number>> {
    const assets = ['CORE', 'BTC', 'lstBTC', 'coreBTC'];
    const prices: Record<string, number> = {};
    
    for (const asset of assets) {
      try {
        const price = await this.oracleContract.getPrice(asset);
        prices[asset] = Number(price) / 1e8; // Convert from 8 decimals to USD
      } catch (error) {
        console.error(`Error getting price for ${asset}:`, error);
        prices[asset] = 0;
      }
    }
    
    return prices;
  }
  
  /**
   * Monitor for price update events
   */
  setupEventListeners(): void {
    this.oracleContract.on('PriceUpdated', (asset: string, price: bigint, timestamp: bigint) => {
      const priceUsd = Number(price) / 1e8;
      const date = new Date(Number(timestamp) * 1000);
      console.log(`📢 Price Update Event: ${asset} = $${priceUsd.toFixed(4)} at ${date.toISOString()}`);
    });
    
    console.log('👂 Listening for price update events...');
  }
  
  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.updateTimer !== undefined,
      contractAddress: this.config.contractAddress,
      updateInterval: this.config.updateInterval,
      lastUpdate: new Date().toISOString()
    };
  }
}