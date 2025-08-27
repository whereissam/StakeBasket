import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { getNetworkByChainId } from '../../config/contracts'
import { useNetworkStore } from '../../store/useNetworkStore'

interface ContractInformationProps {
  chainId?: number
}

export function ContractInformation({ chainId }: ContractInformationProps) {
  const { chainId: storeChainId } = useNetworkStore()
  const currentChainId = chainId || storeChainId || 31337
  
  // Get contract addresses and network config from centralized config
  // The 'config' property is the object containing 'name' and 'explorer'.
  // We deconstruct 'config' and alias it as 'network' to fix the type errors.
  const { contracts, config: network } = getNetworkByChainId(currentChainId)
  
  // Contract information to display
  const contractInfo = [
    {
      name: 'DualStaking Contract',
      address: contracts.DualStakingBasket || contracts.MockDualStaking,
      description: 'Main dual staking contract for CORE + BTC'
    },
    {
      name: 'BTC Token',
      address: contracts.MockCoreBTC || contracts.MockCoreBTC,
      description: 'ERC-20 BTC token for dual staking'
    },
    {
      name: 'Price Oracle', 
      address: contracts.PriceFeed || contracts.CoreOracle,
      description: 'Price feed for CORE and BTC pricing'
    },
    {
      name: 'Staking Manager',
      address: contracts.StakingManager,
      description: 'Manages dual staking operations and tier calculations'
    }
  ]
  
  const copyToClipboard = async (address: string, name: string) => {
    if (!address) {
      toast.error(`${name} address not available`)
      return
    }
    
    try {
      await navigator.clipboard.writeText(address)
      toast.success(`${name} address copied!`)
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }
  
  const openInExplorer = (address: string) => {
    if (!address) return
    
    const explorerUrl = network.explorer
    if (explorerUrl) {
      window.open(`${explorerUrl}/address/${address}`, '_blank')
    }
  }
  
  const formatAddress = (address: string | undefined): string => {
    if (!address) return 'Not deployed'
    return address
  }
  
  const getAddressColor = (address: string | undefined): string => {
    return address ? 'text-primary' : 'text-muted-foreground'
  }
  
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Contract Information</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your Dual Staking Protocol is deployed on {network.name}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contractInfo.map((contract, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{contract.name}</h4>
                {contract.address && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(contract.address!, contract.name)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Copy address"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </button>
                    <button
                      onClick={() => openInExplorer(contract.address!)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <code className={`text-sm font-mono ${getAddressColor(contract.address)} break-all`}>
                  {formatAddress(contract.address)}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                {contract.description}
              </p>
            </div>
          ))}
        </div>
        
        {/* Network Information */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Network:</span>
              <span className="ml-2 font-medium">{network.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Chain ID:</span>
              <span className="ml-2 font-medium">{currentChainId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Explorer:</span>
              <a 
                href={network.explorer}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline"
              >
                View Explorer
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}