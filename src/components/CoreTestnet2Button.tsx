import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { ExternalLink, Zap } from 'lucide-react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { useState } from 'react'

const CORE_TESTNET2_CHAIN_ID = 1114

export function CoreTestnet2Button() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [showAlert, setShowAlert] = useState(false)

  const isOnCoreTestnet2 = chainId === CORE_TESTNET2_CHAIN_ID

  const handleConnectToCoreTestnet2 = async () => {
    if (!isConnected) {
      setShowAlert(true)
      return
    }

    try {
      await switchChain({ chainId: CORE_TESTNET2_CHAIN_ID })
    } catch (error) {
      console.error('Failed to switch to Core Testnet2:', error)
      
      // If switching fails, try to add the network manually
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x45a', // 1114 in hex
              chainName: 'Core Blockchain Testnet2',
              rpcUrls: ['https://rpc.test2.btcs.network'],
              nativeCurrency: {
                name: 'tCORE2',
                symbol: 'tCORE2',
                decimals: 18
              },
              blockExplorerUrls: ['https://scan.test2.btcs.network/']
            }]
          })
        } catch (addError) {
          console.error('Failed to add Core Testnet2:', addError)
        }
      }
    }
  }

  if (isOnCoreTestnet2) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <Zap className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800 dark:text-green-200">
          Connected to Core Testnet2
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showAlert && (
        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet first, then switch to Core Testnet2.
          </AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={handleConnectToCoreTestnet2}
        disabled={isPending}
        className="w-full bg-orange-500 hover:bg-orange-600"
      >
        {isPending ? (
          'Switching...'
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Connect to Core Testnet2
          </>
        )}
      </Button>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Network Details:</strong></p>
        <ul className="space-y-1 ml-2">
          <li>• Chain ID: 1114 (0x45a)</li>
          <li>• RPC: https://rpc.test2.btcs.network</li>
          <li>• Currency: tCORE2</li>
          <li>• Explorer: https://scan.test2.btcs.network/</li>
        </ul>
      </div>
    </div>
  )
}