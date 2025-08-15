import { useReadContract } from 'wagmi'
import { useContracts } from '../hooks/useContracts'
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'

// PriceFeed ABI for checking price data
const PRICE_FEED_ABI = [
  {
    "inputs": [{"name": "", "type": "string"}],
    "name": "priceData",
    "outputs": [
      {"name": "price", "type": "uint256"},
      {"name": "lastUpdated", "type": "uint256"},
      {"name": "decimals", "type": "uint8"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

interface Props {
  onUpdatePrice: () => void
  isUpdating: boolean
}

export function PriceStalenessIndicator({ onUpdatePrice, isUpdating }: Props) {
  const { contracts } = useContracts()
  
  const { data: coreData } = useReadContract({
    address: contracts?.CoreOracle as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: 'priceData',
    args: ['CORE'],
    query: {
      enabled: !!contracts?.CoreOracle,
      refetchInterval: 30000 // Check every 30 seconds
    }
  })

  if (!coreData) return null

  const [price, lastUpdated] = coreData as [bigint, bigint, number, boolean]
  const now = Math.floor(Date.now() / 1000)
  const ageSeconds = now - Number(lastUpdated)
  const ageHours = ageSeconds / 3600
  const isStale = ageSeconds > 3600 // 1 hour

  const formatAge = (hours: number) => {
    if (hours < 1) return `${Math.floor(hours * 60)}m`
    if (hours < 24) return `${hours.toFixed(1)}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
      isStale 
        ? 'bg-destructive/10 text-destructive border border-destructive/20' 
        : 'bg-muted text-muted-foreground'
    }`}>
      {isStale ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckCircle className="h-3 w-3" />
      )}
      
      <span>
        Price data: {formatAge(ageHours)} old
        {isStale && ' (stale)'}
      </span>

      {isStale && (
        <Button
          onClick={onUpdatePrice}
          disabled={isUpdating}
          size="sm"
          variant="ghost"
          className="h-5 px-2 text-xs"
        >
          {isUpdating ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            'Fix'
          )}
        </Button>
      )}
    </div>
  )
}