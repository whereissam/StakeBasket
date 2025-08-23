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
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-700">🐛 Dashboard Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div><strong>Wallet:</strong> {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Not connected'}</div>
        <div><strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Chain ID:</strong> {chainId || 'Unknown'}</div>
        <div><strong>Token Symbol:</strong> {tokenSymbol}</div>
        <div><strong>Network Valid:</strong> {networkValidation.isSupported && networkValidation.isAvailable ? '✅ Yes' : '❌ No'}</div>
        {networkValidation.error && (
          <div><strong>Network Error:</strong> <span className="text-red-600">{networkValidation.error}</span></div>
        )}
        <div><strong>StakeBasket Contract:</strong> {contracts.StakeBasket || 'Missing'}</div>
        <div><strong>StakeBasketToken Contract:</strong> {contracts.StakeBasketToken || 'Missing'}</div>
        <div><strong>PriceFeed Contract:</strong> {contracts.PriceFeed || 'Missing'}</div>
        <div><strong>Config RPC:</strong> {config.rpcUrl}</div>
      </CardContent>
    </Card>
  )
}