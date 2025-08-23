import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface WalletConnectionPromptProps {
  config: { name: string }
  chainId: number
}

export function WalletConnectionPrompt({ config, chainId }: WalletConnectionPromptProps) {
  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Connect to Core Network</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Please connect your wallet to view your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current network: {config.name} (Chain ID: {chainId})
            </p>
            {chainId !== 1114 && chainId !== 31337 && (
              <div className="p-4 border border-border bg-accent/50 rounded-lg">
                <p className="text-sm text-accent-foreground">
                  ⚠️ Please switch to Core Testnet2 (Chain ID: 1114) or Local Hardhat (Chain ID: 31337) to see your contracts and portfolio data.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}