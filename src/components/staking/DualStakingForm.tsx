import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Target, Info, Lightbulb, AlertTriangle, Briefcase, CheckCircle, Zap } from 'lucide-react'
import { DualTier, TierInfo } from '../../types/staking'
import { useNetworkInfo } from '../../hooks/useNetworkInfo'

// Base minimum deposit requirements (should match DualStakingInterface.tsx)
const MIN_DEPOSIT_REQUIREMENTS = {
  CORE: 10,       // Minimum 10 CORE tokens (reduced for base tier)
  BTC: 0.001,     // Minimum 0.001 BTC tokens (reduced for base tier)
  USD_VALUE: 50   // Minimum $50 total USD value for base tier
}

interface DualStakingFormProps {
  coreAmount: string
  btcAmount: string
  setCoreAmount: (amount: string) => void
  setBtcAmount: (amount: string) => void
  coreBalanceFormatted: string
  btcBalanceFormatted: string
  chainId: number
  isNativeCORE: boolean
  tierInfo: Record<DualTier, TierInfo>
  handleAutoCalculate: (targetTier: DualTier) => void
  calculateTier: (core: string, btc: string) => DualTier
  needsCoreApproval: boolean
  needsBtcApproval: boolean
  handleApproveCORE: () => void
  handleApproveBTC: () => void
  isApprovingCoreTx: boolean
  isApprovingBtcTx: boolean
  isAwaitingCoreApproval: boolean
  isAwaitingBtcApproval: boolean
  handleDualStake: () => void
  isStaking: boolean
}

export function DualStakingForm({
  coreAmount,
  btcAmount,
  setCoreAmount,
  setBtcAmount,
  coreBalanceFormatted,
  btcBalanceFormatted,
  chainId: _chainId,
  isNativeCORE,
  tierInfo,
  handleAutoCalculate,
  calculateTier,
  needsCoreApproval,
  needsBtcApproval,
  handleApproveCORE,
  handleApproveBTC,
  isApprovingCoreTx,
  isApprovingBtcTx,
  isAwaitingCoreApproval,
  isAwaitingBtcApproval,
  handleDualStake,
  isStaking
}: DualStakingFormProps) {
  const networkInfo = useNetworkInfo()
  const proposedTier = calculateTier(coreAmount, btcAmount)
  const proposedTierInfo = tierInfo[proposedTier]
  
  // Conditional rendering instead of early return
  if (!networkInfo.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dual Staking Unavailable</CardTitle>
          <CardDescription>{networkInfo.error || 'This network is not supported'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">
          Start Earning Today
        </CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Simply deposit your tokens and we'll handle the rest
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Strategy Selection */}
        <div className="bg-muted/30 rounded-lg p-6 space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-foreground mb-2">Choose Your Strategy</h3>
            <p className="text-sm text-muted-foreground">
              Select a target yield to get optimal {networkInfo.tokenSymbol} and BTC amounts
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(tierInfo)
              .filter(([tierKey]) => Number(tierKey) !== DualTier.None)
              .reverse().map(([tierKey, info]) => (
              <button
                key={tierKey}
                onClick={() => handleAutoCalculate(Number(tierKey) as DualTier)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-lg hover:scale-105 active:scale-95 ${
                  Number(tierKey) === DualTier.Satoshi 
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50 hover:bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              >
                <div className={`font-semibold text-sm ${info.color}`}>
                  {info.name}
                </div>
                <div className="text-lg font-bold text-chart-2 mt-1">
                  {info.apy}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {info.description}
                </div>
                {Number(tierKey) === DualTier.Satoshi && (
                  <div className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded mt-2 inline-block">
                    Recommended
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount Inputs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Or Enter Custom Amounts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  {networkInfo.tokenSymbol} Tokens
                  {!isNativeCORE && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                      ERC-20 Token
                    </span>
                  )}
                </span>
                <div className="mt-1 relative">
                  <Input
                    type="number"
                    value={coreAmount}
                    onChange={(e) => setCoreAmount(e.target.value)}
                    placeholder={MIN_DEPOSIT_REQUIREMENTS.CORE.toString()}
                    className="text-right font-mono text-lg pl-12"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-chart-1 font-semibold text-sm">
                    {networkInfo.tokenSymbol}
                  </div>
                </div>
              </label>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Balance: {Number(coreBalanceFormatted).toLocaleString()}</span>
                <button 
                  onClick={() => coreBalanceFormatted && setCoreAmount(coreBalanceFormatted)}
                  className="text-primary hover:underline"
                >
                  Use All
                </button>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border flex items-start gap-2">
                <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Dual Staking uses your native CORE balance + BTC tokens from faucet. Get BTC tokens at /faucet first.</span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-foreground">BTC Tokens</span>
                <div className="mt-1 relative">
                  <Input
                    type="number"
                    value={btcAmount}
                    onChange={(e) => setBtcAmount(e.target.value)}
                    placeholder={MIN_DEPOSIT_REQUIREMENTS.BTC.toString()}
                    className="text-right font-mono text-lg pl-12"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-chart-2 font-semibold text-sm">
                    BTC
                  </div>
                </div>
              </label>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Balance: {Number(btcBalanceFormatted).toFixed(4)}</span>
                <button 
                  onClick={() => btcBalanceFormatted && setBtcAmount(btcBalanceFormatted)}
                  className="text-primary hover:underline"
                >
                  Use All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Warning */}
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h4 className="text-sm font-medium text-foreground">Enhanced Tier Requirements - BTC Incentivized!</h4>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <div>
              <p className="font-medium">Base Requirements:</p>
              <p>• Minimum {MIN_DEPOSIT_REQUIREMENTS.CORE} {networkInfo.tokenSymbol} + {MIN_DEPOSIT_REQUIREMENTS.BTC} BTC for any tier</p>
              <p>• Minimum ${MIN_DEPOSIT_REQUIREMENTS.USD_VALUE} total USD value</p>
            </div>
            <div>
              <p className="font-medium">Tier Benefits (Higher tiers = Higher rewards):</p>
              <p>• <span className="font-medium text-muted-foreground">Base:</span> Starting tier - {MIN_DEPOSIT_REQUIREMENTS.CORE} {networkInfo.tokenSymbol} + {MIN_DEPOSIT_REQUIREMENTS.BTC} BTC minimum</p>
              <p>• <span className="font-medium text-primary">Silver:</span> Enhanced rewards - Higher amounts for better ratios</p>
              <p>• <span className="font-medium text-accent-foreground">Gold:</span> Premium rewards - Significant holdings required</p>
              <p>• <span className="font-medium text-chart-4">Satoshi:</span> Maximum rewards - Whale tier with optimal ratios</p>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded p-2 mt-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-primary font-medium">BTC is now properly rewarded! Higher tiers require meaningful BTC holdings, not just tiny amounts.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Proposed Allocation Preview */}
        {coreAmount && btcAmount && (
          <div className="p-4 bg-gradient-to-r from-primary/5 to-chart-2/5 rounded-lg border-2 border-dashed border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-primary">Your Proposed Allocation</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Target Tier</p>
                <p className={`text-xl font-bold ${proposedTierInfo.color}`}>
                  {proposedTierInfo.name}
                </p>
                <p className="text-sm text-chart-2 font-medium">{proposedTierInfo.apy} Annual Yield</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">CORE Allocation</p>
                <p className="text-xl font-mono font-bold">
                  {(() => {
                    const coreNum = Number(coreAmount) || 0
                    const btcNum = Number(btcAmount) || 0
                    if (btcNum === 0) return '100%'
                    const ratio = Math.round(coreNum / btcNum)
                    return `${ratio.toLocaleString()}:1`
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">CORE:BTC token ratio</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Basket Management</p>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1 text-chart-2">
                    <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
                    Auto-rebalancing enabled
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Reward compounding active
                  </div>
                  <div className="flex items-center gap-1 text-chart-3">
                    <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                    Professional management
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/20">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Briefcase className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Smart Contract Benefits:</strong> Your deposit will be professionally managed to maintain this tier 
                  automatically, even as market prices change. The basket handles all complexity for you.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approval and Staking */}
        <div className="space-y-4 pt-4 border-t border-border">
          {(needsCoreApproval || needsBtcApproval) && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Token Approval Required
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                You need to approve the smart contract to use your tokens. This is a one-time action for security.
              </p>
              <div className="space-y-2">
                {needsCoreApproval && (
                  <Button 
                    onClick={handleApproveCORE}
                    disabled={isApprovingCoreTx || isAwaitingCoreApproval}
                    className="w-full"
                    variant="outline"
                  >
                    {isApprovingCoreTx ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        Approving {networkInfo.tokenSymbol}...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approve {networkInfo.tokenSymbol} Tokens
                      </div>
                    )}
                  </Button>
                )}
                {needsBtcApproval && (
                  <Button 
                    onClick={handleApproveBTC}
                    disabled={isApprovingBtcTx || isAwaitingBtcApproval}
                    className="w-full"
                    variant="outline"
                  >
                    {isApprovingBtcTx ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        Approving BTC...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approve BTC Tokens
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
          <Button 
            onClick={handleDualStake}
            disabled={isStaking || ((!coreAmount || Number(coreAmount) === 0) && (!btcAmount || Number(btcAmount) === 0)) || needsCoreApproval || needsBtcApproval}
            className="w-full h-14 text-lg font-semibold shadow-lg"
            size="lg"
          >
            {isStaking ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                Joining Strategy...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Start Earning {proposedTierInfo.apy} APY
              </div>
            )}
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By joining, you agree that this is an experimental DeFi protocol with associated risks
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}