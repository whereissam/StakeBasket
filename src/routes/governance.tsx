import { createFileRoute } from '@tanstack/react-router'
import { GovernanceInterface } from '../components/GovernanceInterface'
import { CoreDAOGovernanceInterface } from '../components/CoreDAOGovernanceInterface'
import { useState } from 'react'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/governance')({
  component: GovernancePage,
})

function GovernancePage() {
  const [activeTab, setActiveTab] = useState<'basket' | 'coredao'>('basket')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Governance</h1>
        <p className="text-muted-foreground mt-2">
          Participate in StakeBasket protocol governance and CoreDAO network governance.
        </p>
      </div>
      
      {/* Governance Type Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-8 w-fit">
        <Button
          variant={activeTab === 'basket' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('basket')}
          className="relative"
        >
          BASKET Governance
          {activeTab === 'basket' && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
          )}
        </Button>
        <Button
          variant={activeTab === 'coredao' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('coredao')}
          className="relative"
        >
          CoreDAO Governance
          <span className="ml-1.5 px-1.5 py-0.5 bg-chart-1/20 text-chart-1 text-xs rounded-full font-medium">
            Network
          </span>
          {activeTab === 'coredao' && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
          )}
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'basket' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">BASKET Protocol Governance</h2>
            <p className="text-muted-foreground">
              Vote on protocol parameters, fee changes, strategy additions, and other BASKET-specific proposals.
            </p>
          </div>
          <GovernanceInterface />
        </div>
      )}

      {activeTab === 'coredao' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">CoreDAO Network Governance</h2>
            <p className="text-muted-foreground">
              Participate in CoreDAO network governance, validator delegation, and hash power delegation through your BASKET tokens.
            </p>
          </div>
          <CoreDAOGovernanceInterface />
        </div>
      )}
    </div>
  )
}