import { createFileRoute } from '@tanstack/react-router'
import FaucetInterface from '../components/FaucetInterface'

export const Route = createFileRoute('/faucet')({
  component: FaucetPage,
})

function FaucetPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Core Testnet Faucet</h1>
          <p className="text-muted-foreground">
            Get test BTC and BASKET tokens for development and testing on Core Testnet
          </p>
        </div>
        
        <FaucetInterface />
      </div>
    </div>
  )
}