import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Award, TrendingUp, ArrowUp, CheckCircle } from 'lucide-react'

export enum DualTier {
  Base = 0,
  Boost = 1,
  Super = 2,
  Satoshi = 3
}

interface TierInfo {
  name: string
  ratio: string
  ratioNumeric: number
  apy: string
  apyNumeric: number
  color: string
  bgColor: string
  description: string
  features: string[]
}

const tierData: Record<DualTier, TierInfo> = {
  [DualTier.Base]: {
    name: 'Base',
    ratio: '0:1',
    ratioNumeric: 0,
    apy: '8%',
    apyNumeric: 8,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'BTC-only staking with basic rewards',
    features: ['BTC-only deposits', 'Base reward rate', 'No ratio requirements']
  },
  [DualTier.Boost]: {
    name: 'Boost',
    ratio: '2,000:1',
    ratioNumeric: 2000,
    apy: '12%',
    apyNumeric: 12,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    description: 'Enhanced rewards with moderate CORE commitment',
    features: ['2,000 CORE per BTC', '50% higher APY', 'Balanced risk/reward']
  },
  [DualTier.Super]: {
    name: 'Super',
    ratio: '6,000:1',
    ratioNumeric: 6000,
    apy: '16%',
    apyNumeric: 16,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    description: 'High-yield staking with significant CORE exposure',
    features: ['6,000 CORE per BTC', '100% higher APY', 'Higher CORE exposure']
  },
  [DualTier.Satoshi]: {
    name: 'Satoshi',
    ratio: '16,000:1',
    ratioNumeric: 16000,
    apy: '20%',
    apyNumeric: 20,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    description: 'Maximum yield tier for CORE maximalists',
    features: ['16,000 CORE per BTC', '150% higher APY', 'Maximum CORE leverage', 'Exclusive tier benefits']
  }
}

interface TierSelectorProps {
  currentTier: DualTier
  selectedTier?: DualTier
  onTierSelect: (tier: DualTier) => void
  btcAmount?: string
  disabled?: boolean
  className?: string
}

export function TierSelector({ 
  currentTier, 
  selectedTier, 
  onTierSelect, 
  btcAmount = '0',
  disabled = false,
  className = ''
}: TierSelectorProps) {
  
  const calculateRequiredCore = (tier: DualTier, btc: string): string => {
    const btcNum = Number(btc) || 0
    const ratio = tierData[tier].ratioNumeric
    return (btcNum * ratio).toLocaleString()
  }

  const calculateAPYDifference = (fromTier: DualTier, toTier: DualTier): number => {
    return tierData[toTier].apyNumeric - tierData[fromTier].apyNumeric
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Select Your Staking Tier</h3>
        <p className="text-sm text-muted-foreground">
          Choose the optimal CORE:BTC ratio for your yield strategy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(tierData).map(([tierKey, info]) => {
          const tier = Number(tierKey) as DualTier
          const isSelected = selectedTier === tier
          const isCurrent = currentTier === tier
          const apyDiff = calculateAPYDifference(currentTier, tier)
          const requiredCore = calculateRequiredCore(tier, btcAmount)

          return (
            <Card 
              key={tierKey}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary' 
                  : isCurrent
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onTierSelect(tier)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg ${info.color}`}>
                    {info.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Current
                      </Badge>
                    )}
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {info.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Core Metrics */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ratio</span>
                    <span className="font-mono text-sm font-semibold">
                      {info.ratio}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">APY</span>
                    <div className="flex items-center gap-1">
                      <span className={`font-semibold ${info.color}`}>
                        {info.apy}
                      </span>
                      {apyDiff > 0 && (
                        <Badge variant="secondary" className="text-xs text-green-600">
                          <ArrowUp className="w-3 h-3 mr-1" />
                          +{apyDiff}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {Number(btcAmount) > 0 && tier !== DualTier.Base && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CORE Needed</span>
                      <span className="font-mono text-sm">
                        {requiredCore}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Features</span>
                  <div className="space-y-1">
                    {info.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${info.bgColor}`} />
                        <span className="text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selection Button */}
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTierSelect(tier)
                  }}
                >
                  {isSelected ? 'Selected' : 'Select Tier'}
                </Button>
              </CardContent>

              {/* Tier Indicator */}
              <div 
                className={`absolute top-0 left-0 w-full h-1 rounded-t-lg ${info.bgColor}`}
              />
            </Card>
          )
        })}
      </div>

      {/* Summary Section */}
      {selectedTier !== undefined && selectedTier !== currentTier && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Tier Change Summary
              </span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>
                Moving from <strong>{tierData[currentTier].name}</strong> to{' '}
                <strong>{tierData[selectedTier].name}</strong>
              </p>
              <p>
                APY increase: <strong>+{calculateAPYDifference(currentTier, selectedTier)}%</strong>
              </p>
              {Number(btcAmount) > 0 && selectedTier !== DualTier.Base && (
                <p>
                  CORE required: <strong>{calculateRequiredCore(selectedTier, btcAmount)}</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Utility function to calculate optimal tier based on available assets
export function calculateOptimalTier(coreAmount: string, btcAmount: string): DualTier {
  const core = Number(coreAmount) || 0
  const btc = Number(btcAmount) || 0
  
  if (btc === 0) return DualTier.Base
  
  const ratio = core / btc
  
  if (ratio >= 16000) return DualTier.Satoshi
  if (ratio >= 6000) return DualTier.Super  
  if (ratio >= 2000) return DualTier.Boost
  return DualTier.Base
}

// Utility function to get required CORE for a target tier
export function getRequiredCoreForTier(btcAmount: string, targetTier: DualTier): string {
  const btc = Number(btcAmount) || 0
  const ratio = tierData[targetTier].ratioNumeric
  return (btc * ratio).toString()
}