import { useAccount, useChainId } from 'wagmi'
import { getNetworkByChainId } from '../../config/contracts'
import { validateNetwork, getTokenSymbol } from '../../utils/networkHandler'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Bug, CheckCircle, XCircle } from 'lucide-react'

export function DashboardDebug() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { contracts, config } = getNetworkByChainId(chainId)
  const networkValidation = validateNetwork(chainId)
  const tokenSymbol = getTokenSymbol(chainId)

  return (
    <Card className="mb-4 border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-2">
          <Bug className="h-4 w-4" />
          Dashboard Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div><strong className="text-foreground">Wallet:</strong> {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Not connected'}</div>
        <div className="flex items-center gap-2">
          <strong className="text-foreground">Connected:</strong> 
          {isConnected ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" /> Yes
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" /> No
            </span>
          )}
        </div>
        <div><strong className="text-foreground">Chain ID:</strong> {chainId || 'Unknown'}</div>
        <div><strong className="text-foreground">Token Symbol:</strong> {tokenSymbol}</div>
        <div className="flex items-center gap-2">
          <strong className="text-foreground">Network Valid:</strong> 
          {networkValidation.isSupported && networkValidation.isAvailable ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" /> Yes
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" /> No
            </span>
          )}
        </div>
        {networkValidation.error && (
          <div><strong className="text-foreground">Network Error:</strong> <span className="text-destructive">{networkValidation.error}</span></div>
        )}
        <div><strong className="text-foreground">StakeBasket Contract:</strong> {contracts.StakeBasket || 'Missing'}</div>
        <div><strong className="text-foreground">StakeBasketToken Contract:</strong> {contracts.StakeBasketToken || 'Missing'}</div>
        <div><strong className="text-foreground">PriceFeed Contract:</strong> {contracts.PriceFeed || 'Missing'}</div>
        <div><strong className="text-foreground">Config RPC:</strong> {config.rpcUrl}</div>
      </CardContent>
    </Card>
  )
}