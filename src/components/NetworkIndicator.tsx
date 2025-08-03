import { useNetworkStore } from '../store/useNetworkStore'
import { Badge } from './ui/badge'

interface NetworkIndicatorProps {
  showContractStatus?: boolean
  contractType?: 'governance' | 'basketToken' | 'liquidStakingManager' | 'stCoreToken'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function NetworkIndicator({ 
  showContractStatus = true, 
  contractType,
  size = 'md',
  className = ''
}: NetworkIndicatorProps) {
  const { 
    chainId, 
    getNetworkName, 
    getNetworkColor, 
    getCurrentContracts,
    isContractDeployed 
  } = useNetworkStore()
  
  const contracts = getCurrentContracts()
  const isConnected = contractType ? isContractDeployed(contractType) : Object.values(contracts).some(addr => !!addr)
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base'
  }
  
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${dotSizes[size]} rounded-full ${getNetworkColor()}`}></div>
      <span className={`${sizeClasses[size]} text-muted-foreground`}>
        {getNetworkName()}
        {chainId && ` (${chainId})`}
      </span>
      
      {showContractStatus && (
        <Badge variant={isConnected ? "default" : "secondary"} className={sizeClasses[size]}>
          {isConnected ? 'Connected' : 'No Contract'}
        </Badge>
      )}
    </div>
  )
}

// Compact version for headers/navbars
export function NetworkStatus({ className = '' }: { className?: string }) {
  return (
    <NetworkIndicator 
      size="sm" 
      showContractStatus={false}
      className={className}
    />
  )
}

// Detailed version for settings/debug
export function NetworkDetails({ className = '' }: { className?: string }) {
  const { chainId, getCurrentContracts } = useNetworkStore()
  const contracts = getCurrentContracts()
  
  return (
    <div className={`space-y-2 ${className}`}>
      <NetworkIndicator size="lg" showContractStatus={true} />
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Chain ID: {chainId || 'Not connected'}</div>
        <div>Network: Connected</div>
        
        {Object.entries(contracts).map(([key, address]) => (
          <div key={key} className="flex justify-between">
            <span className="capitalize">{key}:</span>
            <span className="font-mono">
              {address && typeof address === 'string' ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not deployed'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}