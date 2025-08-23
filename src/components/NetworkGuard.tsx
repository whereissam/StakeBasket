import { useChainId, useAccount } from 'wagmi'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { 
  validateNetwork, 
  switchToNetwork, 
  getAvailableNetworks,
  SupportedChainId,
  handleNetworkValidation 
} from '../utils/networkHandler'

interface NetworkGuardProps {
  children: React.ReactNode
  showNetworkInfo?: boolean
}

export function NetworkGuard({ children, showNetworkInfo: _showNetworkInfo = true }: NetworkGuardProps) {
  const chainId = useChainId()
  const { isConnected } = useAccount()
  
  const validation = validateNetwork(chainId)
  const availableNetworks = getAvailableNetworks()

  // Handle network validation on mount and chain changes
  useEffect(() => {
    if (isConnected) {
      handleNetworkValidation(chainId)
    }
  }, [chainId, isConnected])

  // If wallet is not connected, let the children handle it
  if (!isConnected) {
    return <>{children}</>
  }

  // If network is supported and available, render children
  if (validation.isSupported && validation.isAvailable) {
    return <>{children}</>
  }

  // Show network error UI
  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-xl">Network Not Supported</CardTitle>
          <CardDescription>
            {validation.error || 'Please switch to a supported CoreDAO network.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Network Info */}
          {chainId && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <WifiOff className="w-4 h-4" />
                Current Network
              </div>
              <div className="font-medium">
                {validation.network?.name || `Unknown Network (Chain ID: ${chainId})`}
              </div>
            </div>
          )}

          {/* Available Networks */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Switch to Supported Network
            </h3>
            <div className="grid gap-2">
              {availableNetworks.map((network) => (
                <Button
                  key={network.chainId}
                  variant="outline"
                  onClick={() => switchToNetwork(network.chainId as SupportedChainId)}
                  className="justify-start h-auto p-4"
                >
                  <div className="text-left">
                    <div className="font-medium">{network.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Chain ID: {network.chainId} • {network.symbol}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="font-medium mb-2">Why only CoreDAO networks?</p>
            <p>
              This application is specifically designed for the CoreDAO ecosystem. 
              Our smart contracts are deployed on Core networks and optimized for 
              Core's dual staking and validator delegation features.
            </p>
          </div>

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground p-3 bg-gray-50 dark:bg-gray-900/20 rounded border-l-4 border-gray-300">
              <p className="font-medium mb-1">Development Mode</p>
              <p>Local Hardhat network is available for testing. Make sure the local node is running on port 8545.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}