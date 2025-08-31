import { createFileRoute } from '@tanstack/react-router'
import { DualStakingInterface } from '../components/DualStakingInterface'
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAccount } from 'wagmi'
import { useNetworkStore } from '../store/useNetworkStore'
import { useContracts } from '../hooks/useContracts'
import { validateNetwork } from '../utils/networkHandler'
import { AlertTriangle, ArrowLeftRight } from 'lucide-react'
import * as React from 'react'

const DualStaking = React.memo(() => {
  const { address } = useAccount()
  const { chainId: storeChainId } = useNetworkStore()
  const { chainId } = useContracts()
  
  const currentChainId = chainId || storeChainId || 31337
  const networkValidation = validateNetwork(currentChainId)

  // Network validation at route level
  if (!networkValidation.isSupported || !networkValidation.isAvailable) {
    return (
      <div className="p-6 min-h-screen bg-background text-foreground">
        <Card className="bg-card shadow-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Network Not Supported
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {networkValidation.error || 'Please switch to a supported network to use this feature.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Wallet connection at route level
  if (!address) {
    return (
      <div className="p-6 min-h-screen bg-background text-foreground">
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Dual Staking Basket
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your wallet to join the managed dual staking investment strategy
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return <DualStakingInterface />
})

export const Route = createFileRoute('/dual-staking')({
  component: DualStaking,
})