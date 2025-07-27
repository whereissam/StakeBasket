import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ExternalLink, Copy, Shield, CheckCircle, AlertCircle } from 'lucide-react'
import { getNetworkByChainId, getExplorerUrl } from '../config/contracts'
import { useChainId } from 'wagmi'

export function ContractsInfo() {
  const chainId = useChainId()
  const { network, config, contracts } = getNetworkByChainId(chainId)
  const isLocalNetwork = network === 'hardhat'

  const contractList = [
    {
      name: 'StakeBasket',
      address: contracts.StakeBasket,
      description: 'Main ETF contract for deposits and redemptions',
    },
    {
      name: 'StakeBasket Token (BASKET)',
      address: contracts.StakeBasketToken,
      description: 'ERC-20 token representing shares in the ETF',
    },
    {
      name: 'Staking Manager',
      address: contracts.StakingManager,
      description: 'Manages external staking interactions',
    },
    {
      name: 'Price Feed',
      address: contracts.PriceFeed,
      description: 'Oracle integration for asset pricing',
    },
    {
      name: 'Core Oracle',
      address: contracts.CoreOracle,
      description: 'Real-time price feeds from Core blockchain APIs',
    },
  ]

  // Show mock contracts on testnet too since we deployed them
  const mockContracts = !isLocalNetwork ? [
    {
      name: 'Mock CORE Token',
      address: contracts.MockCORE,
      description: 'Test CORE token with faucet functionality',
    },
    {
      name: 'Mock coreBTC Token',
      address: contracts.MockCoreBTC,
      description: 'Test coreBTC token with faucet functionality',
    },
    {
      name: 'Mock Core Staking',
      address: contracts.MockCoreStaking,
      description: 'Simulates Core blockchain staking with 8% APY',
    },
    {
      name: 'Mock lstBTC',
      address: contracts.MockLstBTC,
      description: 'Simulates Liquid Staked Bitcoin with 6% APY',
    },
  ] : []

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Smart Contract Addresses
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Verified smart contracts powering the StakeBasket protocol
          </p>
          {isLocalNetwork && (
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              Local Network - Development Mode
            </div>
          )}
        </div>

        {/* Network Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Network Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">{config.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chain ID:</span>
                    <span>{config.chainId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RPC URL:</span>
                    <span className="font-mono text-xs">{config.rpcUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency:</span>
                    <span>{config.nativeCurrency.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Explorer:</span>
                    <a href={config.explorer} target="_blank" rel="noopener noreferrer" 
                       className="text-primary hover:underline cursor-pointer">
                      {config.explorer.replace('https://', '')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Core Contracts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Core Contracts
            </CardTitle>
            <CardDescription>
              Main StakeBasket protocol contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {contractList.map((contract) => (
                <div key={contract.name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{contract.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {contract.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {contract.address}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(contract.address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getExplorerUrl(contract.address), '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mock Contracts (Local Network Only) */}
        {isLocalNetwork && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                Mock Contracts (Testing)
              </CardTitle>
              <CardDescription>
                Mock contracts for local development and testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockContracts.map((contract) => (
                  <div key={contract.name} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{contract.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {contract.description}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                            {contract.address}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contract.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Smart Contract Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    All contracts are {isLocalNetwork ? 'deployed locally for testing' : 'verified on the blockchain explorer'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Open Source</h4>
                  <p className="text-sm text-muted-foreground">
                    All contract source code is publicly available and auditable
                  </p>
                </div>
              </div>
              
              {!isLocalNetwork && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Security Audit</h4>
                    <p className="text-sm text-muted-foreground">
                      Professional security audit completed by certified auditors
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}