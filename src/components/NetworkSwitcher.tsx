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

const SUPPORTED_NETWORKS = [
  {
    id: 31337,
    name: 'Hardhat Local',
    shortName: 'Local',
    color: 'bg-gray-500',
    icon: '🔧'
  },
  {
    id: 1114,
    name: 'Core Testnet2',
    shortName: 'Core Test2',
    color: 'bg-orange-500',
    icon: '🧪'
  },
  {
    id: 1115,
    name: 'Core Testnet',
    shortName: 'Core Test',
    color: 'bg-blue-500',
    icon: '⚡'
  },
  {
    id: 1116,
    name: 'Core Mainnet',
    shortName: 'Core',
    color: 'bg-green-500',
    icon: '🚀'
  }
]

export function NetworkSwitcher() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [isOpen, setIsOpen] = useState(false)

  const currentNetwork = SUPPORTED_NETWORKS.find(network => network.id === chainId)
  const isUnsupportedNetwork = !currentNetwork && isConnected

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
      
      <DropdownMenuContent align="end" className="w-56">
        {SUPPORTED_NETWORKS.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => handleNetworkSwitch(network.id)}
            className="flex items-center justify-between cursor-pointer"
            disabled={isPending || chainId === network.id}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{network.icon}</span>
              <div>
                <div className="font-medium text-sm">{network.name}</div>
                <div className="text-xs text-muted-foreground">Chain ID: {network.id}</div>
              </div>
            </div>
            {chainId === network.id && (
              <Badge variant="secondary" className="text-xs">
                Current
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}