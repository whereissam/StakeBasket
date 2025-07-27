import { createFileRoute } from '@tanstack/react-router'
import { Shield, Target, Zap, Bitcoin, Users, Lock, Globe } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: () => (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            About StakeBasket
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The first liquid staking ETF on Core Chain, designed to maximize your Bitcoin and CORE token yields while maintaining full liquidity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-card rounded-lg shadow-sm p-8 border">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full mr-3">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                Our Mission
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To democratize access to Bitcoin and CORE staking rewards through a secure, 
              transparent, and liquid ETF that automatically optimizes yield while 
              maintaining full decentralization and user control.
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-8 border">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-accent/10 rounded-full mr-3">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                Security First
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Built with security at its core using audited smart contracts, 
              multi-signature controls, and battle-tested protocols. Your assets 
              remain non-custodial and fully under your control.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-8 mb-16 border">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-secondary/10 rounded-full mr-3">
              <Users className="h-6 w-6 text-secondary-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              How It Works
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Deposit Assets
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deposit CORE tokens or lstBTC into the StakeBasket smart contract
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Automatic Staking
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your assets are automatically staked with high-performing validators
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Earn Rewards
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Receive BASKET tokens that automatically compound staking rewards
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Instant Liquidity
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Redeem your BASKET tokens anytime for underlying assets + rewards
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="text-center p-6 bg-card rounded-lg shadow-sm border">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-4">
              <Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              High Yield
            </h3>
            <p className="text-muted-foreground">
              Earn competitive staking rewards optimized across multiple validators and strategies.
            </p>
          </div>

          <div className="text-center p-6 bg-card rounded-lg shadow-sm border">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mx-auto mb-4">
              <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              Non-Custodial
            </h3>
            <p className="text-muted-foreground">
              Your assets remain in your control through transparent smart contracts.
            </p>
          </div>

          <div className="text-center p-6 bg-card rounded-lg shadow-sm border">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full w-fit mx-auto mb-4">
              <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              Fully Liquid
            </h3>
            <p className="text-muted-foreground">
              No lock-up periods. Trade or redeem your positions anytime.
            </p>
          </div>
        </div>

        <div className="text-center bg-card rounded-lg p-8 border">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Bitcoin className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Powered by Core Chain
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built on Core's innovative Satoshi Plus consensus, combining Bitcoin's security 
            with scalable smart contracts. Experience the future of Bitcoin DeFi with 
            industry-leading yields and complete transparency.
          </p>
        </div>
      </div>
    </div>
  ),
})