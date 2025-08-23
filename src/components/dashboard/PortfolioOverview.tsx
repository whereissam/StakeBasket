import { TrendingUp, Wallet, DollarSign } from 'lucide-react'
import { BalanceCard } from '../shared/BalanceCard'

interface PortfolioOverviewProps {
  portfolioValueUSD: number
  basketBalance: number
  coreBalance: number
  corePrice: number
  chainId: number
}

export function PortfolioOverview({
  portfolioValueUSD,
  basketBalance,
  coreBalance,
  corePrice,
  chainId
}: PortfolioOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <BalanceCard
        title="Total Portfolio Value"
        value={`$${portfolioValueUSD.toFixed(2)}`}
        subtitle={`${basketBalance.toFixed(4)} BASKET tokens`}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />

      <BalanceCard
        title={`${chainId === 31337 ? 'ETH' : 'CORE'} Balance`}
        value={coreBalance.toFixed(2)}
        subtitle={`≈ $${(coreBalance * corePrice).toFixed(2)} USD`}
        icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
      />

      <BalanceCard
        title="Current APY"
        value="8.5%"
        subtitle="Estimated annual yield"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />

      <BalanceCard
        title="NAV per Share"
        value={`$${(corePrice * 1.085).toFixed(4)}`}
        subtitle="Net Asset Value"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  )
}