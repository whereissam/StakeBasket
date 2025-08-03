import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { useState, useEffect } from 'react'
import { Coins, TrendingUp, ArrowUpDown, Clock, Zap, BarChart3 } from 'lucide-react'
import { useAccount } from 'wagmi'

interface LiquidStakingData {
  totalStaked: string
  totalStCoreSupply: string
  conversionRate: string
  userStCoreBalance: string
  userCoreValue: string
  validatorCount: number
}

interface UnstakeRequest {
  id: number
  user: string
  stCoreAmount: string
  coreAmount: string
  requestTime: number
  fulfilled: boolean
}

export function LiquidStakingInterface() {
  const { address } = useAccount()
  
  const [stakingData, setStakingData] = useState<LiquidStakingData>({
    totalStaked: '0',
    totalStCoreSupply: '0',
    conversionRate: '1.0',
    userStCoreBalance: '0',
    userCoreValue: '0',
    validatorCount: 0
  })
  
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [isStaking, setIsStaking] = useState(false)
  const [isUnstaking, setIsUnstaking] = useState(false)
  const [unstakeRequests] = useState<UnstakeRequest[]>([])
  
  // Mock functions for now - replace with actual wagmi v2 hooks later
  const stake = () => {
    console.log('Stake function called')
    setStakeAmount('')
    setIsStaking(false)
  }
  
  const approve = () => console.log('Approve function called')
  const requestUnstake = () => {
    console.log('Request unstake function called')
    setUnstakeAmount('')
    setIsUnstaking(false)
  }
  
  // Mock data - replace with actual contract data later
  useEffect(() => {
    setStakingData({
      totalStaked: '1000000',
      totalStCoreSupply: '950000',
      conversionRate: '1.0526',
      userStCoreBalance: '0',
      userCoreValue: '0',
      validatorCount: 5
    })
  }, [])
  
  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return
    
    setIsStaking(true)
    try {
      stake()
    } catch (error) {
      console.error('Stake error:', error)
      setIsStaking(false)
    }
  }
  
  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return
    
    setIsUnstaking(true)
    try {
      // First approve, then unstake
      if (approve) {
        approve()
        // Note: In a real implementation, you'd wait for approval confirmation
        // before calling requestUnstake
        setTimeout(() => {
          requestUnstake()
        }, 2000)
      }
    } catch (error) {
      console.error('Unstake error:', error)
      setIsUnstaking(false)
    }
  }
  
  const apr = stakingData.conversionRate ? 
    ((parseFloat(stakingData.conversionRate) - 1) * 365 * 100).toFixed(2) : '0.00'
  
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Total Value Locked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parseFloat(stakingData.totalStaked).toFixed(2)} CORE</div>
            <p className="text-xs text-muted-foreground">
              Across {stakingData.validatorCount} validators
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parseFloat(stakingData.conversionRate).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              CORE per stCORE
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estimated APR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{apr}%</div>
            <p className="text-xs text-muted-foreground">
              Auto-compounding rewards
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* User Balance */}
      {address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Your Liquid Staking Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">stCORE Balance</p>
                <p className="text-2xl font-bold">{parseFloat(stakingData.userStCoreBalance).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CORE Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {parseFloat(stakingData.userCoreValue).toFixed(4)}
                  <span className="text-sm text-muted-foreground ml-1">CORE</span>
                </p>
              </div>
            </div>
            
            {parseFloat(stakingData.userStCoreBalance) > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Unrealized Gains:</strong> {' '}
                  {(parseFloat(stakingData.userCoreValue) - parseFloat(stakingData.userStCoreBalance)).toFixed(4)} CORE
                  {' '}({(((parseFloat(stakingData.userCoreValue) / parseFloat(stakingData.userStCoreBalance)) - 1) * 100).toFixed(2)}%)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Staking Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stake Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-500" />
              Stake CORE
            </CardTitle>
            <CardDescription>
              Stake CORE to receive liquid stCORE tokens that accrue rewards automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount to Stake</label>
              <Input
                type="number"
                placeholder="0.0"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="mt-1"
              />
              {stakeAmount && (
                <p className="text-xs text-muted-foreground mt-1">
                  You will receive ≈ {(parseFloat(stakeAmount) / parseFloat(stakingData.conversionRate)).toFixed(4)} stCORE
                </p>
              )}
            </div>
            
            <Button 
              onClick={handleStake}
              disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isStaking || !address}
              className="w-full"
            >
              {isStaking ? 'Staking...' : 'Stake CORE'}
            </Button>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Instant stCORE token issuance</p>
              <p>• Automated validator selection</p>
              <p>• Daily reward compounding</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Unstake Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-orange-500" />
              Unstake stCORE
            </CardTitle>
            <CardDescription>
              Request unstaking with a 7-day cooldown period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">stCORE Amount to Unstake</label>
              <Input
                type="number"
                placeholder="0.0"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                className="mt-1"
                max={stakingData.userStCoreBalance}
              />
              {unstakeAmount && (
                <p className="text-xs text-muted-foreground mt-1">
                  You will receive ≈ {(parseFloat(unstakeAmount) * parseFloat(stakingData.conversionRate)).toFixed(4)} CORE
                </p>
              )}
            </div>
            
            <Button 
              onClick={handleUnstake}
              disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || isUnstaking || !address || parseFloat(unstakeAmount) > parseFloat(stakingData.userStCoreBalance)}
              className="w-full"
              variant="outline"
            >
              {isUnstaking ? 'Processing...' : 'Request Unstake'}
            </Button>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                7-day unstaking period
              </p>
              <p>• stCORE locked during cooldown</p>
              <p>• CORE available after completion</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Pending Unstake Requests */}
      {unstakeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Unstake Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unstakeRequests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{parseFloat(request.stCoreAmount).toFixed(4)} stCORE</p>
                    <p className="text-sm text-muted-foreground">
                      → {parseFloat(request.coreAmount).toFixed(4)} CORE
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={request.fulfilled ? "default" : "secondary"}>
                      {request.fulfilled ? "Ready" : "Pending"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(request.requestTime * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Liquid Staking Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Benefits</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Receive liquid stCORE tokens instantly</li>
                <li>• Trade stCORE while earning rewards</li>
                <li>• Automated validator rebalancing</li>
                <li>• Daily reward compounding</li>
                <li>• No minimum staking period</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Process</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Stake CORE → Receive stCORE tokens</li>
                <li>• stCORE value increases with rewards</li>
                <li>• Request unstake → 7-day cooldown</li>
                <li>• Claim CORE after cooldown period</li>
                <li>• Protocol automatically optimizes yields</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}