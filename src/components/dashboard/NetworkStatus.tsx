import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { RefreshCw, DollarSign, Database, Globe } from 'lucide-react'
import { BalanceCard } from '../shared/BalanceCard'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'

interface NetworkStatusProps {
  dashboardData: any
  chainId: number
}

export function NetworkStatus({
  dashboardData,
  chainId
}: NetworkStatusProps) {
  const networkInfo = useNetworkInfo()
  
  // Show loading state if dashboardData is not yet loaded
  if (!dashboardData || !dashboardData.config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Network Status
            <span className="text-sm font-normal text-muted-foreground">
              (Loading... - Chain ID: {chainId})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Destructure from dashboardData
  const {
    config,
    corePrice,
    btcPrice,
    totalPooledCore,
    supportedAssets,
    priceLoading,
    priceError,
    updateCorePrice,
    isUpdating: isPriceUpdating
  } = dashboardData
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Network Status
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
            <div className="p-2 bg-accent/50 border border-border rounded text-xs text-foreground">
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