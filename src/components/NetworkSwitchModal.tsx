import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog'
import { Button } from './ui/button'
import { AlertTriangle, Wifi, WifiOff, X } from 'lucide-react'
import { 
  switchToNetwork, 
  getAvailableNetworks,
  SupportedChainId 
} from '../utils/networkHandler'
import type { NetworkValidationResult } from '../utils/networkHandler'

interface NetworkSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  validation: NetworkValidationResult
  currentChainId?: number
}

export function NetworkSwitchModal({ 
  isOpen, 
  onClose, 
  validation, 
  currentChainId 
}: NetworkSwitchModalProps) {
  const availableNetworks = getAvailableNetworks()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <DialogTitle className="text-lg">Network Not Supported</DialogTitle>
                <DialogDescription className="text-sm">
                  This app only works on CoreDAO blockchain networks
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Network */}
          {currentChainId && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <WifiOff className="w-4 h-4" />
                Current Network (Unsupported)
              </div>
              <div className="font-medium text-sm text-destructive">
                {validation.network?.name || `Unsupported Network (Chain ID: ${currentChainId})`}
              </div>
              {currentChainId === 1 && (
                <div className="text-xs text-muted-foreground mt-1">
                  ⚠️ You're on Ethereum Mainnet. Please switch to CoreDAO.
                </div>
              )}
              {currentChainId === 5 && (
                <div className="text-xs text-muted-foreground mt-1">
                  ⚠️ You're on Ethereum Goerli. Please switch to CoreDAO.
                </div>
              )}
            </div>
          )}

          {/* Available Networks */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <Wifi className="w-4 h-4" />
              Choose a CoreDAO Network
            </div>
            <div className="grid gap-2">
              {availableNetworks.map((network) => (
                <Button
                  key={network.chainId}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    switchToNetwork(network.chainId as SupportedChainId)
                    onClose()
                  }}
                  className="justify-start h-auto p-3"
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">{network.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Chain ID: {network.chainId} • {network.symbol}
                    </div>
                    {network.chainId === 1114 && (
                      <div className="text-xs text-primary font-medium">Recommended for testing</div>
                    )}
                    {network.chainId === 1116 && (
                      <div className="text-xs text-green-600 font-medium">Production network</div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Dismiss Option */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full text-muted-foreground"
            >
              Continue Browsing (Staking & contracts disabled)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}