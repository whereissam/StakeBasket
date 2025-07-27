import axios from 'axios';

export interface CoreValidator {
  operatorAddress: string;
  consensusAddress: string;
  feeAddress: string;
  validatorName: string;
  validatorStatus: string;
  validatorVotingPower: string;
  totalDeposit: string;
  feePercent: string;
}

export interface CorePriceData {
  corebtc: string;
  corebtc_timestamp: string;
  coreusd: string;
  coreusd_timestamp: string;
}

export interface CoreSupplyData {
  totalSupply: string;
}

export interface APIResponse<T> {
  status: string;
  result: T;
  message: string;
}

/**
 * @class CoreAPIService
 * @description Service for interacting with Core blockchain's official APIs
 * Provides real-time data for validators, prices, and network statistics
 */
export class CoreAPIService {
  private readonly baseURL = 'https://openapi.coredao.org/api';
  private readonly apiKey: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CORE_API_KEY || 'YourApiKeyToken';
  }
  
  /**
   * Get the top 31 validators on Core blockchain
   */
  async getValidators(): Promise<CoreValidator[]> {
    try {
      const response = await axios.get<APIResponse<CoreValidator[]>>(this.baseURL, {
        params: {
          module: 'stats',
          action: 'validators',
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      if (response.data.status !== '1') {
        throw new Error(`API Error: ${response.data.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Error fetching validators:', error);
      throw new Error(`Failed to fetch validators: ${error}`);
    }
  }
  
  /**
   * Get real-time CORE token price
   */
  async getCorePrice(): Promise<CorePriceData> {
    try {
      const response = await axios.get<APIResponse<CorePriceData>>(this.baseURL, {
        params: {
          module: 'stats',
          action: 'coreprice',
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      if (response.data.status !== '1') {
        throw new Error(`API Error: ${response.data.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Error fetching CORE price:', error);
      throw new Error(`Failed to fetch CORE price: ${error}`);
    }
  }
  
  /**
   * Get total supply of CORE tokens
   */
  async getCoreSupply(): Promise<string> {
    try {
      const response = await axios.get<APIResponse<string>>(this.baseURL, {
        params: {
          module: 'stats',
          action: 'coresupply',
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      if (response.data.status !== '1') {
        throw new Error(`API Error: ${response.data.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Error fetching CORE supply:', error);
      throw new Error(`Failed to fetch CORE supply: ${error}`);
    }
  }
  
  /**
   * Get active validators only
   */
  async getActiveValidators(): Promise<CoreValidator[]> {
    const allValidators = await this.getValidators();
    return allValidators.filter(validator => validator.validatorStatus === '1');
  }
  
  /**
   * Get top validators by total deposit
   */
  async getTopValidatorsByDeposit(limit: number = 10): Promise<CoreValidator[]> {
    const validators = await this.getActiveValidators();
    
    return validators
      .sort((a, b) => parseFloat(b.totalDeposit) - parseFloat(a.totalDeposit))
      .slice(0, limit);
  }
  
  /**
   * Get validators with lowest fees
   */
  async getLowestFeeValidators(limit: number = 10): Promise<CoreValidator[]> {
    const validators = await this.getActiveValidators();
    
    return validators
      .sort((a, b) => parseFloat(a.feePercent) - parseFloat(b.feePercent))
      .slice(0, limit);
  }
  
  /**
   * Get comprehensive network statistics
   */
  async getNetworkStats() {
    try {
      const [validators, price, supply] = await Promise.all([
        this.getValidators(),
        this.getCorePrice(),
        this.getCoreSupply()
      ]);
      
      const activeValidators = validators.filter(v => v.validatorStatus === '1');
      const totalStaked = activeValidators.reduce((sum, validator) => {
        return sum + parseFloat(validator.totalDeposit);
      }, 0);
      
      return {
        validators: {
          total: validators.length,
          active: activeValidators.length,
          totalStaked: totalStaked.toString(),
          averageFee: this.calculateAverageFee(activeValidators)
        },
        price: {
          coreusd: parseFloat(price.coreusd),
          corebtc: parseFloat(price.corebtc),
          lastUpdate: Math.max(
            parseInt(price.coreusd_timestamp),
            parseInt(price.corebtc_timestamp)
          )
        },
        supply: {
          total: supply,
          // Calculate market cap
          marketCap: (parseFloat(supply) / 1e18 * parseFloat(price.coreusd)).toFixed(2)
        }
      };
    } catch (error) {
      console.error('Error fetching network stats:', error);
      throw error;
    }
  }
  
  /**
   * Calculate average validator fee
   */
  private calculateAverageFee(validators: CoreValidator[]): number {
    if (validators.length === 0) return 0;
    
    const totalFee = validators.reduce((sum, validator) => {
      return sum + parseFloat(validator.feePercent);
    }, 0);
    
    return totalFee / validators.length / 100; // Convert to percentage
  }
  
  /**
   * Monitor validator performance changes
   */
  async getValidatorPerformanceMetrics(operatorAddress: string) {
    const validators = await this.getValidators();
    const validator = validators.find(v => 
      v.operatorAddress.toLowerCase() === operatorAddress.toLowerCase()
    );
    
    if (!validator) {
      throw new Error(`Validator ${operatorAddress} not found`);
    }
    
    return {
      address: validator.operatorAddress,
      isActive: validator.validatorStatus === '1',
      totalDeposit: validator.totalDeposit,
      feePercent: parseFloat(validator.feePercent) / 100,
      votingPower: validator.validatorVotingPower,
      name: validator.validatorName || 'Unnamed',
      rank: this.calculateValidatorRank(validator, validators)
    };
  }
  
  /**
   * Calculate validator rank by total deposit
   */
  private calculateValidatorRank(validator: CoreValidator, allValidators: CoreValidator[]): number {
    const sorted = allValidators
      .filter(v => v.validatorStatus === '1')
      .sort((a, b) => parseFloat(b.totalDeposit) - parseFloat(a.totalDeposit));
    
    return sorted.findIndex(v => v.operatorAddress === validator.operatorAddress) + 1;
  }
}