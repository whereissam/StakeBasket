import { createFileRoute } from '@tanstack/react-router'
import { GovernanceInterface } from '../components/GovernanceInterface'

export const Route = createFileRoute('/governance')({
  component: GovernancePage,
})

function GovernancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Governance</h1>
        <p className="text-muted-foreground mt-2">
          Participate in StakeBasket protocol governance by voting on proposals and shaping the future of the platform.
        </p>
      </div>
      
      <GovernanceInterface />
    </div>
  )
}