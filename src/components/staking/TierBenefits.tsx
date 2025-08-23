import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Award } from 'lucide-react'

interface TierInfo {
  name: string
  benefits: string[]
  bgColor: string
}

interface TierBenefitsProps {
  currentTierInfo: TierInfo
}

export function TierBenefits({ currentTierInfo }: TierBenefitsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Your Benefits ({currentTierInfo.name})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentTierInfo.benefits.map((benefit: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentTierInfo.bgColor}`} />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}