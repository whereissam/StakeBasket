import { Button } from "@/components/ui/button";
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectWallet } from "@/components/ConnectWallet";
import { TrendingUp, Shield, Zap, Target } from "lucide-react";

export function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          StakeBasket
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Multi-Asset Staking ETF on Core Blockchain
        </p>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Optimize your CORE and lstBTC yield with automated staking strategies. 
          Professional portfolio management meets DeFi accessibility.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <ConnectWallet />
          <Link to="/dashboard">
            <Button variant="outline" size="lg">
              Open Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <Card>
          <CardHeader>
            <TrendingUp className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle>Optimized Yields</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Professional validator selection and automated rebalancing to maximize your returns across CORE and lstBTC.
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-green-500 mb-2" />
            <CardTitle>Instant Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Redeem your BASKET tokens anytime for underlying assets. No lockup periods or withdrawal delays.
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-purple-500 mb-2" />
            <CardTitle>Secure & Audited</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Smart contracts audited by leading security firms. Your assets remain secure on the Core blockchain.
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Target className="h-8 w-8 text-orange-500 mb-2" />
            <CardTitle>Diversified Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Balanced exposure to CORE staking rewards and Bitcoin yield through lstBTC integration.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div>
          <h3 className="text-3xl font-bold text-blue-600">8.5%</h3>
          <p className="text-muted-foreground">Current APY</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-green-600">$1.25M</h3>
          <p className="text-muted-foreground">Total Value Locked</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-purple-600">247</h3>
          <p className="text-muted-foreground">Active Investors</p>
        </div>
      </div>
    </div>
  );
}
