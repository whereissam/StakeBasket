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
  },
  {
    chainId: 1115,
    apiBaseUrl: 'https://openapi.coredao.org/api', // Legacy testnet uses mainnet API
    name: 'Core Testnet (Legacy)'
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

export class CoreApiClient {
  private apiKey: string
  private chainId: number
  private baseUrl: string

  constructor(chainId: number, apiKey: string = '206fcf6379b641f5b12b3ccbbb933180') {
    this.chainId = chainId
    this.apiKey = apiKey
    this.baseUrl = getCoreApiUrl(chainId)
  }

  private async request<T>(params: Record<string, string>): Promise<T> {
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
      throw new Error(`Core API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
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