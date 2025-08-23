import { useAccount, useChainId } from 'wagmi'
import { getNetworkByChainId } from '../../config/contracts'
import { validateNetwork, getTokenSymbol } from '../../utils/networkHandler'
import { useContractStore } from '../../store/useContractStore'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export function DashboardDebug() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { contracts, config } = getNetworkByChainId(chainId)
  const networkValidation = validateNetwork(chainId)
  const tokenSymbol = getTokenSymbol(chainId)
  const { getAllAddresses } = useContractStore()
  const contractAddresses = getAllAddresses()

  return (
    <Card className="mb-4 border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="text-muted-foreground">🐛 Dashboard Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div><strong className="text-foreground">Wallet:</strong> {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Not connected'}</div>
        <div><strong className="text-foreground">Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</div>
        <div><strong className="text-foreground">Chain ID:</strong> {chainId || 'Unknown'}</div>
        <div><strong className="text-foreground">Token Symbol:</strong> {tokenSymbol}</div>
        <div><strong className="text-foreground">Network Valid:</strong> {networkValidation.isSupported && networkValidation.isAvailable ? '✅ Yes' : '❌ No'}</div>
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