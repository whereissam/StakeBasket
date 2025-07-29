import { createFileRoute } from '@tanstack/react-router'
import { DualStakingInterface } from '../components/DualStakingInterface'

export const Route = createFileRoute('/dual-staking')({
  component: DualStaking,
})

function DualStaking() {
  return <DualStakingInterface />
}