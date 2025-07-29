import { createFileRoute } from '@tanstack/react-router'
import { SparksWidget } from '../components/SparksWidget'
import { SparksHistory } from '../components/SparksHistory'
import { SparksBenefits } from '../components/SparksBenefits'

export const Route = createFileRoute('/sparks')({
  component: SparksPage,
})

function SparksPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Sparks Rewards System</h1>
        <p className="text-muted-foreground">
          Earn Sparks points for engaging with StakeBasket and unlock exclusive benefits and features.
        </p>
      </div>

      {/* Sparks Overview */}
      <SparksWidget showDetailed={true} />

      {/* Benefits and Features */}
      <SparksBenefits />

      {/* History */}
      <SparksHistory />
    </div>
  )
}