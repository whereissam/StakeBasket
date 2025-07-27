import { createFileRoute } from '@tanstack/react-router'
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  RefreshCw, 
  Users, 
  BarChart3, 
  Lock, 
  Coins, 
  Globe,
  CheckCircle,
  ArrowUpDown,
  Timer
} from 'lucide-react'

export const Route = createFileRoute('/features')({
  component: () => (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Powerful Features
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to maximize your Bitcoin and CORE token yields through professional-grade liquid staking.
          </p>
        </div>

        {/* Core Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Auto-Compounding
            </h3>
            <p className="text-muted-foreground">
              Staking rewards are automatically reinvested to maximize your compound returns without any manual intervention.
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mb-4">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Multi-Sig Security
            </h3>
            <p className="text-muted-foreground">
              Smart contracts protected by multi-signature wallets and comprehensive security audits for maximum safety.
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Optimized Yields
            </h3>
            <p className="text-muted-foreground">
              Professional validator selection and management to ensure you always earn the highest possible staking rewards.
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full w-fit mb-4">
              <RefreshCw className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Instant Liquidity
            </h3>
            <p className="text-muted-foreground">
              No unbonding periods. Convert your staked positions back to liquid assets instantly whenever you need.
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full w-fit mb-4">
              <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Real-Time Analytics
            </h3>
            <p className="text-muted-foreground">
              Comprehensive dashboard with live APY tracking, portfolio performance, and detailed transaction history.
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mb-4">
              <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Validator Diversification
            </h3>
            <p className="text-muted-foreground">
              Risk is spread across multiple high-performance validators to minimize slashing risk and maximize uptime.
            </p>
          </div>
        </div>

        {/* Advanced Features Section */}
        <div className="bg-card rounded-lg shadow-sm p-8 mb-16 border">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Advanced Capabilities
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional-grade features designed for serious DeFi participants and institutional users.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Non-Custodial Design</h4>
                  <p className="text-sm text-muted-foreground">
                    Your assets never leave your control. All operations are executed through transparent smart contracts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Coins className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Multi-Asset Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Stake both CORE tokens and lstBTC (Liquid Staked Bitcoin) in a single diversified portfolio.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Globe className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Cross-Chain Compatibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Built for Core Chain with plans for multi-chain expansion to maximize yield opportunities.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Governance Participation</h4>
                  <p className="text-sm text-muted-foreground">
                    Participate in Core network governance while earning staking rewards through delegated voting power.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ArrowUpDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Dynamic Rebalancing</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatic portfolio rebalancing based on market conditions and yield optimization strategies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Timer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Automated Operations</h4>
                  <p className="text-sm text-muted-foreground">
                    Set-and-forget automation for reward claiming, reinvestment, and portfolio management.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="text-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Why Choose StakeBasket?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">8.5%+</div>
              <div className="text-sm text-muted-foreground">Average APY</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">0%</div>
              <div className="text-sm text-muted-foreground">Lock-up Period</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Liquidity Access</div>
            </div>
          </div>
          
          <p className="text-muted-foreground mt-6 max-w-2xl mx-auto">
            Join hundreds of users who trust StakeBasket to maximize their Bitcoin and CORE token yields 
            while maintaining complete control and liquidity of their assets.
          </p>
        </div>
      </div>
    </div>
  ),
})