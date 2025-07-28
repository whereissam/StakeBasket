import { createFileRoute } from '@tanstack/react-router'
import { StakingInterface } from '../components/StakingInterface'

export const Route = createFileRoute('/staking')({
  component: StakingPage,
})

function StakingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">BASKET Staking</h1>
        <p className="text-muted-foreground mt-2">
          Stake your BASKET tokens to earn protocol fees, unlock tier benefits, and gain enhanced voting power in governance.
        </p>
      </div>
      
      <StakingInterface />
    </div>
  )
}