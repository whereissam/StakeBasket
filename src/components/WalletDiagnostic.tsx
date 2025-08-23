import { useAccount, useBalance, useChainId } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function WalletDiagnostic() {
  const { address, isConnected, isConnecting, isReconnecting, connector } = useAccount()
  const chainId = useChainId()
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: balance, isLoading: balanceLoading, error: balanceError } = useBalance({
    address: address,
    query: { 
      enabled: !!address,
      gcTime: 0,
      staleTime: 0
    }
  })

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    window.location.reload()
  }

  return (
    <Card className="mb-4 border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Wallet Diagnostic</span>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Connection Status:</strong>
            <div className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? '✅ Connected' : '❌ Not Connected'}
            </div>
            {isConnecting && <div className="text-yellow-600">🔄 Connecting...</div>}
            {isReconnecting && <div className="text-yellow-600">🔄 Reconnecting...</div>}
          </div>
          
          <div>
            <strong>Wallet Address:</strong>
            <div className="font-mono text-xs break-all">
              {address || 'Not detected'}
            </div>
            {address && (
              <div className={address.length === 42 ? 'text-green-600' : 'text-red-600'}>
                {address.length === 42 ? '✅ Valid format' : '❌ Invalid format'}
              </div>
            )}
          </div>
          
          <div>
            <strong>Chain ID:</strong>
            <div className={chainId === 1114 ? 'text-green-600' : 'text-red-600'}>
              {chainId} {chainId === 1114 ? '✅ Core Testnet2' : '❌ Wrong network'}
            </div>
          </div>
          
          <div>
            <strong>Connector:</strong>
            <div>{connector?.name || 'Unknown'}</div>
          </div>
          
          <div>
            <strong>Balance (Wagmi):</strong>
            <div>
              {balanceLoading ? (
                '🔄 Loading...'
              ) : balanceError ? (
                <span className="text-red-600">❌ Error: {balanceError.message}</span>
              ) : balance ? (
                <span className="text-green-600">
                  ✅ {Number(balance.formatted).toFixed(4)} {balance.symbol}
                </span>
              ) : (
                <span className="text-yellow-600">⚠️ No balance data</span>
              )}
            </div>
          </div>
          
          <div>
            <strong>Refresh Key:</strong>
            <div>{refreshKey}</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <strong>Debug Info:</strong>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
{JSON.stringify({
  address,
  isConnected,
  isConnecting,
  isReconnecting,
  chainId,
  connector: connector?.name,
  balance: balance ? {
    formatted: balance.formatted,
    symbol: balance.symbol,
    decimals: balance.decimals
  } : null,
  balanceError: balanceError?.message,
  timestamp: new Date().toISOString()
}, null, 2)}
          </pre>
        </div>

        <div className="border-t pt-4 bg-yellow-50 p-3 rounded">
          <strong>🎯 Expected Values for Working System:</strong>
          <ul className="text-xs mt-2 space-y-1">
            <li>✅ isConnected: true</li>
            <li>✅ address: 0x2b44f71b6eb9f2f981b08ea9af582157075b34b9</li>
            <li>✅ chainId: 1114</li>
            <li>✅ balance: ~979 tCORE2</li>
            <li>✅ connector: MetaMask/WalletConnect/etc</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}