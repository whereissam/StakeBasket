import { useStakeBasketStore } from '../store/useStakeBasketStore'
import { useDualStakingStore, DualTier, tierNames, tierColors, formatRatio, formatAPY } from '../store/useDualStakingStore'
import { useSparksStore, SparksTier, tierNames as sparksTierNames, tierColors as sparksTierColors } from '../store/useSparksStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectItem } from './ui/select'
import { TransactionHistory } from './TransactionHistory'
import { SparksWidget } from './SparksWidget'
import { useState } from 'react'
import { TrendingUp, Wallet, DollarSign, Users, ArrowLeftRight, Award, AlertTriangle, Zap } from 'lucide-react'

export function Dashboard() {
  const {
    stakeBasketTokenBalance,
    totalValueUSD,
    totalPoolSizeUSD,
    currentAPY,
    navPerShare,
    totalHolders,
    isDepositing,
    isWithdrawing,
    setIsDepositing,
    setIsWithdrawing,
  } = useStakeBasketStore()

  // Dual staking store
  const {
    position: dualPosition,
    needsRebalancing,
    coreBalance,
    btcBalance,
    getCurrentRatio,
    getPositionValue,
    getAPYForTier
  } = useDualStakingStore()

  // Sparks store
  const { sparksInfo, formatSparksAmount } = useSparksStore()

  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedAsset, setSelectedAsset] = useState('CORE')

  const handleDeposit = async () => {
    if (!depositAmount) return
    
    setIsDepositing(true)
    // TODO: Implement actual deposit logic
    setTimeout(() => {
      setIsDepositing(false)
      setDepositAmount('')
    }, 2000)
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount) return
    
    setIsWithdrawing(true)
    // TODO: Implement actual withdraw logic
    setTimeout(() => {
      setIsWithdrawing(false)
      setWithdrawAmount('')
    }, 2000)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pool Size</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPoolSizeUSD}</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentAPY}%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NAV per Share</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${navPerShare}</div>
            <p className="text-xs text-muted-foreground">+8.5% total returns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Holders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHolders}</div>
            <p className="text-xs text-muted-foreground">+15 new this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Sparks</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatSparksAmount(sparksInfo.balance)} ⚡
            </div>
            <p className={`text-xs ${sparksTierColors[sparksInfo.tier]}`}>
              {sparksTierNames[sparksInfo.tier]} tier ({sparksInfo.feeReduction}% fee reduction)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dual Staking Overview */}
      {dualPosition && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Dual Staking Position
                </CardTitle>
                <CardDescription>Your CORE + BTC staking position</CardDescription>
              </div>
              {needsRebalancing && (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Rebalancing Needed</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className={`h-4 w-4 ${tierColors[dualPosition.tier]}`} />
                  <span className="text-sm font-medium">Current Tier</span>
                </div>
                <div className={`text-xl font-bold ${tierColors[dualPosition.tier]}`}>
                  {tierNames[dualPosition.tier]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatAPY(getAPYForTier(dualPosition.tier))} APY
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">CORE Staked</span>
                <div className="text-xl font-bold text-orange-600">
                  {Number(dualPosition.coreAmount).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">CORE tokens</div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">BTC Staked</span>
                <div className="text-xl font-bold text-yellow-600">
                  {Number(dualPosition.btcAmount).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">BTC tokens</div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Current Ratio</span>
                <div className="text-xl font-bold">
                  {formatRatio(getCurrentRatio())}
                </div>
                <div className="text-xs text-muted-foreground">CORE:BTC</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">Pending Rewards</span>
                  <div className="text-lg font-bold text-green-600">
                    {Number(dualPosition.rewards).toFixed(4)} CORE
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">Position Value</span>
                  <div className="text-lg font-bold">
                    ${getPositionValue().totalValue}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sparks Widget */}
      <div className="grid grid-cols-1 gap-6">
        <SparksWidget showDetailed={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Portfolio */}
        <Card>
          <CardHeader>
            <CardTitle>My Portfolio</CardTitle>
            <CardDescription>Your current holdings in StakeBasket</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">StakeBasket Token Balance</span>
              <span className="text-sm">{stakeBasketTokenBalance} BASKET</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Value (USD)</span>
              <span className="text-sm font-bold">${totalValueUSD}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Estimated APY</span>
              <span className="text-sm text-green-600">{currentAPY}%</span>
            </div>
            <div className="pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">Portfolio Breakdown</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>CORE Staking</span>
                  <span>65%</span>
                </div>
                <div className="flex justify-between">
                  <span>lstBTC</span>
                  <span>35%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-6">
          {/* Deposit */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit</CardTitle>
              <CardDescription>Stake your CORE tokens to receive BASKET tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Type</label>
                <Select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)}>
                  <SelectItem value="CORE">CORE Token</SelectItem>
                  <SelectItem value="coreBTC">coreBTC (Bridged Bitcoin)</SelectItem>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount ({selectedAsset})</label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  You will receive ~{depositAmount ? (parseFloat(depositAmount) / parseFloat(navPerShare)).toFixed(4) : '0'} BASKET
                </div>
                {selectedAsset === 'coreBTC' && (
                  <div className="text-xs text-blue-600">
                    💡 Don't have coreBTC? <a href="https://bridge.coredao.org" target="_blank" rel="noopener noreferrer" className="underline cursor-pointer">Bridge your BTC first</a>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleDeposit} 
                disabled={!depositAmount || isDepositing}
                className="w-full"
              >
                {isDepositing ? 'Depositing...' : 'Deposit'}
              </Button>
            </CardContent>
          </Card>

          {/* Withdraw */}
          <Card>
            <CardHeader>
              <CardTitle>Withdraw</CardTitle>
              <CardDescription>Redeem your BASKET tokens for underlying assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (BASKET)</label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  You will receive ~{withdrawAmount ? (parseFloat(withdrawAmount) * parseFloat(navPerShare)).toFixed(4) : '0'} CORE equivalent
                </div>
              </div>
              <Button 
                onClick={handleWithdraw} 
                disabled={!withdrawAmount || isWithdrawing}
                variant="outline"
                className="w-full"
              >
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ETF Information */}
      <Card>
        <CardHeader>
          <CardTitle>About StakeBasket</CardTitle>
          <CardDescription>How StakeBasket works and what you're investing in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Strategy</h4>
              <p className="text-sm text-muted-foreground">
                StakeBasket automatically stakes CORE tokens with high-performing validators and invests in liquid staked Bitcoin (lstBTC) 
                to maximize yield while maintaining liquidity.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Asset Allocation</h4>
              <p className="text-sm text-muted-foreground">
                65% CORE staking with top validators, 35% lstBTC for Bitcoin exposure. 
                Rebalanced monthly based on performance and market conditions.
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Key Features</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Instant liquidity - redeem anytime</li>
              <li>• Professional validator selection and management</li>
              <li>• Automatic reward compounding</li>
              <li>• Transparent on-chain operations</li>
              <li>• Low management fees (0.5% annually)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  )
}