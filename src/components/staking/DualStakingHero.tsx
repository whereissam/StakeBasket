interface DualStakingHeroProps {
  className?: string
}

export function DualStakingHero({ className = "" }: DualStakingHeroProps) {
  return (
    <div className={`bg-gradient-to-b from-primary/5 to-background border-b border-border ${className}`}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Earn up to <span className="text-primary">20% APY</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional DeFi management that automatically optimizes your CORE and BTC for maximum rewards
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
              <span className="text-muted-foreground">Automated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">Audited Smart Contracts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
              <span className="text-muted-foreground">Tier Optimized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}