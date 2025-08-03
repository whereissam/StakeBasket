import { Button } from "@/components/ui/button";
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectWallet } from "@/components/ConnectWallet";
import { LogoFull } from "@/components/ui/logo";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Target, 
  ChevronRight, 
  BarChart3,
  Wallet,
  Lock,
  Coins,
  ArrowUpRight,
  CheckCircle,
  Star
} from "lucide-react";

export function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-1/5" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 shadow-md">
              <Star className="w-4 h-4 mr-2" />
              Now Live on Core Blockchain
            </div>
            <div className="flex flex-col items-center mb-6">
              <LogoFull size="xl" className="mb-4" />
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-chart-1 to-accent bg-clip-text text-transparent tracking-tight">
                StakeBasket
              </h1>
            </div>
            <p className="text-2xl md:text-3xl text-card-foreground mb-6 max-w-4xl mx-auto font-medium">
              Multi-Asset Staking ETF on Core Blockchain
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Maximize your yield with professional-grade staking strategies. Our automated rebalancing system 
              optimizes returns across CORE validators and lstBTC, delivering institutional-level portfolio 
              management with DeFi accessibility.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <ConnectWallet />
              <Link to="/dashboard">
                <Button variant="outline" size="lg" className="bg-card border-border hover:bg-accent text-card-foreground shadow-md">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Open Dashboard
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-chart-2" />
                <span>Audited Smart Contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-chart-1" />
                <span>Non-Custodial</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-chart-4" />
                <span>Instant Liquidity</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card/50 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="p-6">
              <h3 className="text-4xl font-bold text-chart-1 mb-2">8.7%</h3>
              <p className="text-muted-foreground font-medium">Current APY</p>
              <p className="text-xs text-muted-foreground mt-1">7-day average</p>
            </div>
            <div className="p-6">
              <h3 className="text-4xl font-bold text-chart-2 mb-2">$2.4M</h3>
              <p className="text-muted-foreground font-medium">Total Value Locked</p>
              <p className="text-xs text-chart-2 mt-1">+15% this month</p>
            </div>
            <div className="p-6">
              <h3 className="text-4xl font-bold text-chart-4 mb-2">423</h3>
              <p className="text-muted-foreground font-medium">Active Stakers</p>
              <p className="text-xs text-chart-4 mt-1">Growing daily</p>
            </div>
            <div className="p-6">
              <h3 className="text-4xl font-bold text-chart-5 mb-2">99.8%</h3>
              <p className="text-muted-foreground font-medium">Uptime</p>
              <p className="text-xs text-chart-5 mt-1">Last 90 days</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
              Why Choose StakeBasket?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Professional-grade staking infrastructure designed for maximum returns and minimal risk
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-chart-1/20 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-chart-1" />
                </div>
                <CardTitle className="text-card-foreground">Optimized Yields</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  AI-powered validator selection and automated rebalancing algorithms maximize your returns 
                  across CORE and lstBTC with minimal gas costs.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-chart-4/20 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-chart-4" />
                </div>
                <CardTitle className="text-card-foreground">Instant Liquidity</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  Redeem your BASKET tokens anytime for underlying assets. No lockup periods, 
                  withdrawal delays, or complex unstaking procedures.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-chart-2/20 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-chart-2" />
                </div>
                <CardTitle className="text-card-foreground">Battle-Tested Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  Multi-signature governance, comprehensive audits by leading security firms, 
                  and battle-tested smart contracts protect your investments.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-chart-5/20 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-chart-5" />
                </div>
                <CardTitle className="text-card-foreground">Diversified Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  Balanced exposure across multiple asset classes: CORE staking rewards, 
                  Bitcoin yield via lstBTC, and emerging Core ecosystem opportunities.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
              How StakeBasket Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Simple steps to start earning optimized yields on your crypto assets
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/30 transition-colors">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">1. Deposit Assets</h3>
              <p className="text-muted-foreground leading-relaxed">
                Deposit CORE tokens or lstBTC into our smart contract. Your assets remain 
                on-chain and non-custodial at all times.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 rounded-full bg-chart-1/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-chart-1/30 transition-colors">
                <BarChart3 className="w-8 h-8 text-chart-1" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">2. Auto-Optimization</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our algorithms automatically allocate your assets across top-performing 
                validators and yield strategies for maximum returns.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-chart-2/30 transition-colors">
                <Coins className="w-8 h-8 text-chart-2" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">3. Earn & Withdraw</h3>
              <p className="text-muted-foreground leading-relaxed">
                Receive BASKET tokens representing your share. Earn continuous rewards 
                and withdraw anytime with just one transaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-6">
                Built for the Future of Finance
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                StakeBasket combines traditional ETF principles with cutting-edge DeFi innovation, 
                delivering institutional-grade performance to individual investors.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-chart-2 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-card-foreground">Professional Management</h4>
                    <p className="text-muted-foreground text-sm">Algorithmic strategies typically reserved for institutions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-chart-2 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-card-foreground">Gas Optimization</h4>
                    <p className="text-muted-foreground text-sm">Batch transactions reduce individual gas costs by up to 90%</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-chart-2 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-card-foreground">24/7 Monitoring</h4>
                    <p className="text-muted-foreground text-sm">Automated rebalancing and risk management around the clock</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-chart-2 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-card-foreground">Governance Rights</h4>
                    <p className="text-muted-foreground text-sm">BASKET holders vote on key protocol decisions and upgrades</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-chart-1/10 rounded-2xl transform rotate-1" />
              <Card className="relative bg-card border-border shadow-xl">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl text-card-foreground">Portfolio Performance</CardTitle>
                  <CardDescription>Last 30 days vs alternatives</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold text-card-foreground">StakeBasket</p>
                      <p className="text-sm text-muted-foreground">Optimized yield</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-chart-1 text-lg">+8.7%</p>
                      <p className="text-xs text-chart-1">APY</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-semibold text-card-foreground">Manual Staking</p>
                      <p className="text-sm text-muted-foreground">Single validator</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-muted-foreground text-lg">+6.2%</p>
                      <p className="text-xs text-muted-foreground">APY</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-semibold text-card-foreground">CEX Staking</p>
                      <p className="text-sm text-muted-foreground">Exchange platform</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-muted-foreground text-lg">+4.8%</p>
                      <p className="text-xs text-muted-foreground">APY</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      {/* <section className="py-20 bg-gradient-to-br from-primary/5 to-chart-1/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
              Join Our Growing Community
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Be part of the future of decentralized staking and yield optimization
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-card/80 backdrop-blur border-border shadow-lg text-center">
              <CardHeader>
                <Users className="w-8 h-8 text-chart-4 mx-auto mb-2" />
                <CardTitle className="text-card-foreground">Active Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-chart-4 mb-2">1,200+</p>
                <p className="text-muted-foreground text-sm">Discord members sharing strategies</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur border-border shadow-lg text-center">
              <CardHeader>
                <Globe className="w-8 h-8 text-chart-2 mx-auto mb-2" />
                <CardTitle className="text-card-foreground">Global Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-chart-2 mb-2">45+</p>
                <p className="text-muted-foreground text-sm">Countries represented</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur border-border shadow-lg text-center">
              <CardHeader>
                <BarChart3 className="w-8 h-8 text-chart-1 mx-auto mb-2" />
                <CardTitle className="text-card-foreground">Daily Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-chart-1 mb-2">$50K+</p>
                <p className="text-muted-foreground text-sm">New deposits daily</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-6">
            Ready to Optimize Your Yields?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of smart investors who trust StakeBasket for their staking needs
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ConnectWallet />
            <Link to="/staking">
              <Button variant="outline" size="lg" className="bg-background border-border hover:bg-accent text-card-foreground shadow-md">
                <Coins className="w-5 h-5 mr-2" />
                Start Staking
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          <p className="text-muted-foreground text-sm mt-6">
            No minimum deposit • Withdraw anytime • Non-custodial
          </p>
        </div>
      </section>
    </div>
  );
}