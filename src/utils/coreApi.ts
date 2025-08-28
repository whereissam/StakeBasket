// Universal Core API utility that works with any Core network

interface NetworkConfig {
  chainId: number
  apiBaseUrl: string
  name: string
}

const CORE_NETWORKS: NetworkConfig[] = [
  {
    chainId: 1116,
    apiBaseUrl: 'https://openapi.coredao.org/api',
    name: 'Core Mainnet'
  },
  {
    chainId: 1114,
    apiBaseUrl: 'https://openapi.coredao.org/api', // Testnet2 uses mainnet API for stats
    name: 'Core Testnet2'
  }
]

export function getCoreApiUrl(chainId: number): string {
  const network = CORE_NETWORKS.find(n => n.chainId === chainId)
  if (!network) {
    console.warn(`Unknown Core network chainId: ${chainId}, falling back to mainnet API`)
    return CORE_NETWORKS[0].apiBaseUrl // Default to mainnet
  }
  return network.apiBaseUrl
}

export function getCoreNetworkName(chainId: number): string {
  const network = CORE_NETWORKS.find(n => n.chainId === chainId)
  return network?.name || `Unknown Core Network (${chainId})`
}

export interface CorePriceResponse {
  status: string
  result: {
    corebtc: string
    corebtc_timestamp: string
    coreusd: string
    coreusd_timestamp: string
  }
  message: string
}

export interface CoreValidatorsResponse {
  status: string
  result: Array<{
    operatorAddress: string
    consensusAddress: string
    feeAddress: string
    validatorName: string
    validatorStatus: string
    validatorVotingPower: string
    totalDeposit: string
    feePercent: string
  }>
  message: string
}

export interface CoreSupplyResponse {
  status: string
  result: string
  message: string
}

// Global cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 120000 // 2 minutes cache

export class CoreApiClient {
  private apiKey: string
  private chainId: number
  private baseUrl: string

  constructor(chainId: number, apiKey?: string) {
    this.chainId = chainId
    this.apiKey = apiKey || import.meta.env.VITE_CORE_API_KEY || ''
    this.baseUrl = getCoreApiUrl(chainId)
    
    if (!this.apiKey) {
      console.warn('CoreAPI: No API key provided. Some features may be limited.')
    }
  }

  private async request<T>(params: Record<string, string>): Promise<T> {
    // Create cache key
    const cacheKey = `${this.baseUrl}_${JSON.stringify(params)}_${this.chainId}`
    const cached = apiCache.get(cacheKey)
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    const url = new URL(this.baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
    url.searchParams.append('apikey', this.apiKey)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Core API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    // Cache the result
    apiCache.set(cacheKey, { data, timestamp: Date.now() })
    
    return data
  }

  async getCorePrice(): Promise<CorePriceResponse> {
    return this.request<CorePriceResponse>({
      module: 'stats',
      action: 'coreprice'
    })
  }

  async getValidators(): Promise<CoreValidatorsResponse> {
    return this.request<CoreValidatorsResponse>({
      module: 'stats',
      action: 'validators'
    })
  }

  async getCoreSupply(): Promise<CoreSupplyResponse> {
    return this.request<CoreSupplyResponse>({
      module: 'stats',
      action: 'coresupply'
    })
  }

  // Calculate BTC price from CORE/BTC ratio
  calculateBtcPrice(coreUsdPrice: number, coreBtcPrice: number): number {
    if (coreBtcPrice === 0) return 0
    return coreUsdPrice / coreBtcPrice
  }

  // Get network info
  getNetworkInfo() {
    return {
      chainId: this.chainId,
      name: getCoreNetworkName(this.chainId),
      apiUrl: this.baseUrl
    }
  }
}