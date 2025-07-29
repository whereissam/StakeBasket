import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Gift, Crown, Star, Shield, Zap, Lock, Unlock, TrendingUp, Users, Bell } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useSparksStore, SparksTier, tierNames, tierColors } from '../store/useSparksStore'

interface Benefit {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  requiredTier: SparksTier
  isExclusive?: boolean
  comingSoon?: boolean
}

const benefits: Benefit[] = [
  {
    id: 'fee-reduction',
    title: 'Management Fee Reduction',
    description: 'Reduce your management fees by up to 50% based on your Sparks tier',
    icon: Gift,
    requiredTier: SparksTier.Bronze,
  },
  {
    id: 'priority-support',
    title: 'Priority Customer Support',
    description: 'Get faster response times and dedicated support channels',
    icon: Shield,
    requiredTier: SparksTier.Silver,
  },
  {
    id: 'advanced-analytics',
    title: 'Advanced Portfolio Analytics',
    description: 'Access detailed performance metrics and yield optimization insights',
    icon: TrendingUp,
    requiredTier: SparksTier.Silver,
  },
  {
    id: 'early-access',
    title: 'Early Strategy Access',
    description: 'Be first to access new staking strategies and yield farming opportunities',
    icon: Star,
    requiredTier: SparksTier.Gold,
    isExclusive: true,
  },
  {
    id: 'governance-power',
    title: 'Enhanced Governance Voting',
    description: 'Increased voting weight in StakeBasket governance decisions',
    icon: Users,
    requiredTier: SparksTier.Gold,
  },
  {
    id: 'custom-strategies',
    title: 'Custom Strategy Builder',
    description: 'Create and backtest your own custom staking strategies',
    icon: Crown,
    requiredTier: SparksTier.Platinum,
    isExclusive: true,
    comingSoon: true,
  },
  {
    id: 'vip-features',
    title: 'VIP Beta Features',
    description: 'Exclusive access to experimental features and new product betas',
    icon: Crown,
    requiredTier: SparksTier.Platinum,
    isExclusive: true,
  },
  {
    id: 'portfolio-insights',
    title: 'AI Portfolio Insights',
    description: 'Personalized AI-driven recommendations for portfolio optimization',
    icon: Zap,
    requiredTier: SparksTier.Platinum,
    isExclusive: true,
    comingSoon: true,
  },
]

interface SparksBenefitsProps {
  className?: string
  showAll?: boolean
}

export function SparksBenefits({ className = '', showAll = true }: SparksBenefitsProps) {
  const { address } = useAccount()
  const { sparksInfo, canUseFeature, getTierBenefits } = useSparksStore()
  
  const userTier = sparksInfo.tier
  const userBenefits = showAll ? benefits : benefits.filter(b => b.requiredTier <= userTier)

  const getBenefitStatus = (benefit: Benefit) => {
    const hasAccess = canUseFeature(benefit.requiredTier)
    
    if (benefit.comingSoon) {
      return { 
        status: 'coming-soon' as const, 
        text: 'Coming Soon',
        color: 'bg-secondary text-secondary-foreground'
      }
    }
    
    if (hasAccess) {
      return { 
        status: 'unlocked' as const, 
        text: 'Unlocked',
        color: 'bg-primary text-primary-foreground'
      }
    }
    
    return { 
      status: 'locked' as const, 
      text: `Requires ${tierNames[benefit.requiredTier]}`,
      color: 'bg-muted text-muted-foreground'
    }
  }

  if (!address) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Sparks Benefits
          </CardTitle>
          <CardDescription>
            Connect your wallet to see available benefits and exclusive features
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Sparks Benefits & Exclusive Features
        </CardTitle>
        <CardDescription>
          Unlock premium features and benefits by earning Sparks points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Tier Status */}
        <Alert>
          <Crown className={`h-4 w-4 ${tierColors[userTier]}`} />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                You are currently <strong className={tierColors[userTier]}>{tierNames[userTier]}</strong> tier 
                {sparksInfo.feeReduction > 0 && (
                  <span className="text-primary ml-2">
                    ({sparksInfo.feeReduction}% fee reduction active)
                  </span>
                )}
              </span>
              <Badge className={`${tierColors[userTier]} border-current bg-transparent`}>
                {Number(sparksInfo.balance).toLocaleString()} ⚡
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userBenefits.map((benefit) => {
            const status = getBenefitStatus(benefit)
            const Icon = benefit.icon
            const hasAccess = status.status === 'unlocked'

            return (
              <div
                key={benefit.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  hasAccess 
                    ? 'border-primary bg-primary/10' 
                    : status.status === 'coming-soon'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <Badge className={`text-xs ${status.color}`}>
                    {status.text}
                  </Badge>
                  {benefit.isExclusive && (
                    <Badge className="ml-1 text-xs bg-accent text-accent-foreground">
                      Exclusive
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="pr-20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      hasAccess 
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {hasAccess ? (
                        <Unlock className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <Icon className={`h-5 w-5 ${
                        hasAccess ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                  </div>

                  <h3 className={`font-semibold mb-2 ${
                    hasAccess ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {benefit.title}
                  </h3>
                  
                  <p className={`text-sm ${
                    hasAccess ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  }`}>
                    {benefit.description}
                  </p>

                  {!hasAccess && status.status === 'locked' && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Need {(Number(sparksInfo.nextTierThreshold) - Number(sparksInfo.balance)).toLocaleString()} more Sparks
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tier Progression */}
        <div className="space-y-4">
          <h3 className="font-semibold">Unlock More Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Object.entries(tierNames).slice(1).map(([tierKey, tierName]) => {
              const tier = Number(tierKey) as SparksTier
              const isCurrentTier = tier === userTier
              const isUnlocked = tier <= userTier
              const tierBenefits = getTierBenefits(tier)

              return (
                <div
                  key={tierKey}
                  className={`p-3 rounded-lg border-2 ${
                    isCurrentTier
                      ? 'border-primary bg-primary/10'
                      : isUnlocked
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-medium ${tierColors[tier]}`}>
                      {tierName}
                    </span>
                    {isCurrentTier && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                    {isUnlocked && !isCurrentTier && (
                      <Badge variant="secondary" className="text-xs">✓</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {tierBenefits.slice(0, 2).map((benefit, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {benefit}
                      </div>
                    ))}
                    {tierBenefits.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{tierBenefits.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Earning Tips */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">How to earn more Sparks:</div>
              <ul className="text-sm space-y-1">
                <li>• Hold BASKET tokens (1 Spark per token per day)</li>
                <li>• Make deposits into StakeBasket (100 Sparks per deposit)</li>
                <li>• Participate in dual staking (bonus Sparks)</li>
                <li>• Engage with governance voting</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}