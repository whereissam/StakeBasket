import { Button } from './ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Badge } from './ui/badge'
import { ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { useState } from 'react'
import { SUPPORTED_NETWORKS, getNetworkById, isNetworkSupported } from '../config/networks'

export function NetworkSwitcher() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [isOpen, setIsOpen] = useState(false)

  const currentNetwork = getNetworkById(chainId)
  const isUnsupportedNetwork = !isNetworkSupported(chainId) && isConnected

  const handleNetworkSwitch = async (networkId: number) => {
    try {
      await switchChain({ chainId: networkId })
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  if (!isConnected) {
    return (
      <Badge variant="outline" className="text-xs">
        <WifiOff className="h-3 w-3 mr-1" />
        Not Connected
      </Badge>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${isUnsupportedNetwork ? 'border-red-500 text-red-600' : ''}`}
          disabled={isPending}
        >
          <div className="flex items-center gap-2">
            {isUnsupportedNetwork ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-xs">Unsupported</span>
              </>
            ) : (
              <>
                <span className="text-sm">{currentNetwork?.icon}</span>
                <span className="text-xs font-medium">{currentNetwork?.shortName}</span>
                <Wifi className="h-3 w-3" />
              </>
            )}
          </div>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_NETWORKS.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => handleNetworkSwitch(network.id)}
            className="flex items-center gap-3 cursor-pointer"
            disabled={isPending || chainId === network.id}
          >
            <span className="text-base">{network.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-sm">{network.name}</div>
            </div>
            {chainId === network.id && (
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}