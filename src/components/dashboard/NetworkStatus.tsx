import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { RefreshCw, DollarSign, Database } from 'lucide-react'
import { BalanceCard } from '../shared/BalanceCard'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'

interface NetworkStatusProps {
  config: { name: string }
  chainId: number
  corePrice: number
  btcPrice: number
  totalPooledCore: number
  supportedAssets: readonly string[]
  priceLoading: boolean
  priceError?: string
  updateCorePrice: () => void
  isPriceUpdating: boolean
}

export function NetworkStatus({
  config,
  chainId,
  corePrice,
  btcPrice,
  totalPooledCore,
  supportedAssets,
  priceLoading,
  priceError,
  updateCorePrice,
  isPriceUpdating
}: NetworkStatusProps) {
  const networkInfo = useNetworkInfo()
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌐 Network Status
          <span className="text-sm font-normal text-muted-foreground">
            ({config.name} - Chain ID: {chainId})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BalanceCard
              title={`${networkInfo.isSupported ? networkInfo.tokenSymbol : 'TOKEN'} Price`}
              value={priceLoading ? 'Loading...' : `$${corePrice.toFixed(4)}`}
              subtitle="Current market price"
              icon={priceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            />
            <BalanceCard
              title="BTC Price"
              value={priceLoading ? 'Loading...' : `$${btcPrice.toLocaleString()}`}
              subtitle="Current market price"
              icon={priceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            />
            <BalanceCard
              title="Total Pooled"
              value={`${totalPooledCore.toFixed(2)} ${networkInfo.isSupported ? networkInfo.tokenSymbol : 'TOKEN'}`}
              subtitle="In staking pool"
              icon={<Database className="w-4 h-4" />}
            />
            <BalanceCard
              title="Oracle Assets"
              value={supportedAssets.length.toString()}
              subtitle="Supported assets"
              icon={<Database className="w-4 h-4" />}
            />
          </div>
          
          {priceError && (
            <div className="p-2 bg-accent/50 border border-border rounded text-xs text-accent-foreground">
              ⚠️ {priceError}
              {priceError.includes('stale') && (
                <div className="mt-2">
                  <Button
                    onClick={updateCorePrice}
                    disabled={isPriceUpdating}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                  >
                    {isPriceUpdating ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Price Feed'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}