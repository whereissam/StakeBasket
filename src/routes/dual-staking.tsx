import { createFileRoute } from '@tanstack/react-router'
import { DualStakingInterface } from '../components/DualStakingInterface'
import * as React from 'react'

const DualStaking = React.memo(() => {
  return <DualStakingInterface />
})

export const Route = createFileRoute('/dual-staking')({
  component: DualStaking,
})