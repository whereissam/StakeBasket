import { TrendingUp, Wallet, DollarSign } from 'lucide-react'
import { BalanceCard } from '../shared/BalanceCard'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'

interface PortfolioOverviewProps {
  dashboardData: any
  chainId: number
}

export function PortfolioOverview({
  dashboardData,
  chainId: _chainId
}: PortfolioOverviewProps) {
  const networkInfo = useNetworkInfo()
  
  // Show loading state if dashboardData is not yet loaded
  if (!dashboardData || dashboardData.coreBalance === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  // Destructure from dashboardData
  const {
    portfolioValueUSD,
    basketBalance,
    coreBalance,
    corePrice,
    navPerShare,
    estimatedAPY
  } = dashboardData
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <BalanceCard
        title="Total Portfolio Value"
        value={`$${portfolioValueUSD.toFixed(2)}`}
        subtitle={`${basketBalance.toFixed(4)} BASKET tokens`}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />

      <BalanceCard
        title={`${networkInfo.isSupported ? networkInfo.tokenSymbol : 'TOKEN'} Balance`}
        value={coreBalance.toFixed(2)}
        subtitle={`≈ $${(coreBalance * corePrice).toFixed(2)} USD`}
        icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
      />

      <BalanceCard
        title="Current APY"
        value={`${estimatedAPY}%`}
        subtitle="Estimated annual yield"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />

      <BalanceCard
        title="NAV per Share"
        value={`$${navPerShare.toFixed(4)}`}
        subtitle="Net Asset Value"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  )
}