import { useState, useEffect } from 'react'
import { useAccount, useChainId, useReadContract } from 'wagmi'
import { getNetworkByChainId } from '../../config/contracts'
import { Button } from '../ui/button'
import { Settings, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { PriceFeedFallback } from '../PriceFeedFallback'
import { usePriceFeedStatus } from '../../hooks/usePriceFeedStatus'

const DIAGNOSTIC_ABI = [
  {
    "inputs": [],
    "name": "totalPooledCore",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "asset", "type": "string"}],
    "name": "getPrice",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function SystemDiagnostic() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  const [rpcStatus, setRpcStatus] = useState<'checking' | 'connected' | 'failed'>('checking')
  const [blockNumber, setBlockNumber] = useState<number>(0)
  const [proceedWithFallback, setProceedWithFallback] = useState(false)
  
  const priceFeedStatus = usePriceFeedStatus()

  // Check RPC connection based on network (run once on mount, not continuously)
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null
    
    const checkRPC = async () => {
      if (!isMounted) return
      
      try {
        let rpcUrl = 'http://localhost:8545' // Default local
        
        // Use appropriate RPC based on chain ID
        if (chainId === 1114) {
          rpcUrl = 'https://rpc.test2.btcs.network' // Core Testnet2 RPC
        } else if (chainId === 1115) {
          rpcUrl = 'https://rpc.coredao.org' // Core Mainnet RPC
        }
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: Date.now()
          })
        })
        
        if (!isMounted) return
        
        const result = await response.json()
        
        if (result.result && isMounted) {
          setBlockNumber(parseInt(result.result, 16))
          setRpcStatus('connected')
        } else if (isMounted) {
          setRpcStatus('failed')
        }
      } catch (error) {
        if (isMounted) {
          setRpcStatus('failed')
        }
      }
    }
    
    // Only check once on mount/chain change, don't poll continuously
    // Add a small delay to prevent excessive calls on component mount
    timeoutId = setTimeout(() => {
      if (isMounted) {
        checkRPC()
      }
    }, 1000) // 1 second delay to prevent spam
    
    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [chainId])

  // Test contract reads (with stable queries to prevent re-renders)
  const { data: totalPooled, error: poolError } = useReadContract({
    address: contracts.StakeBasket as `0x${string}`,
    abi: DIAGNOSTIC_ABI,
    functionName: 'totalPooledCore',
    query: { 
      enabled: !!contracts.StakeBasket,
      staleTime: 30000, // Cache for 30 seconds
      retry: 1
    }
  })

  const { data: corePrice, error: priceError } = useReadContract({
    address: (contracts.CoreOracle || contracts.PriceFeed) as `0x${string}`,
    abi: DIAGNOSTIC_ABI,
    functionName: 'getPrice',
    args: ['CORE'],
    query: { 
      enabled: !!(contracts.CoreOracle || contracts.PriceFeed),
      staleTime: 30000, // Cache for 30 seconds
      retry: 1
    }
  })

  const getStatusIcon = (condition: boolean, error?: any) => {
    if (error) return <XCircle className="h-3 w-3 text-destructive inline mr-1" />
    return condition 
      ? <CheckCircle className="h-3 w-3 text-chart-2 inline mr-1" />
      : <AlertTriangle className="h-3 w-3 text-chart-1 inline mr-1" />
  }

  // Expected addresses based on network
  const getExpectedAddresses = () => {
    if (chainId === 31337) {
      // Local network addresses
      return {
        StakeBasket: '0x7C8BaafA542c57fF9B2B90612bf8aB9E86e22C09',
        StakeBasketToken: '0x22a9B82A6c3D2BFB68F324B2e8367f346Dd6f32a',
        PriceFeed: '0x1343248Cbd4e291C6979e70a138f4c774e902561'
      }
    } else {
      // Live network - use actual deployed addresses
      return {
        StakeBasket: contracts.StakeBasket || 'Not deployed',
        StakeBasketToken: contracts.StakeBasketToken || 'Not deployed', 
        PriceFeed: contracts.CoreOracle || contracts.PriceFeed || 'Not deployed'
      }
    }
  }
  
  const expectedAddresses = getExpectedAddresses()

  return (
    <div className="space-y-4">
      {/* Price Feed Fallback Component */}
      {priceFeedStatus.hasError && !proceedWithFallback && (
        <PriceFeedFallback
          priceError={priceFeedStatus.hasError}
          onProceedAnyway={() => setProceedWithFallback(true)}
          chainId={chainId}
        />
      )}
      
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <Settings className="h-4 w-4" />
          System Diagnostic
        </h3>
        <Button 
          onClick={() => window.location.reload()} 
          size="sm" 
          variant="outline"
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Network Status */}
        <div>
          <h4 className="font-semibold text-foreground mb-2">Network Status</h4>
          <div className="space-y-1">
            <p>{getStatusIcon(rpcStatus === 'connected')} RPC Connection: {rpcStatus}</p>
            <p>{getStatusIcon(chainId === 31337 || chainId === 1114 || chainId === 1115)} Chain ID: {chainId} (expected: 31337 for local, 1114/1115 for Core)</p>
            <p>{getStatusIcon(blockNumber > 0)} Block Number: {blockNumber}</p>
            <p>{getStatusIcon(!!address)} Wallet Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Address: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          </div>
        </div>

        {/* Contract Status */}
        <div>
          <h4 className="font-semibold text-foreground mb-2">Contract Status</h4>
          <div className="space-y-1">
            <p>{getStatusIcon(contracts.StakeBasket === expectedAddresses.StakeBasket)} StakeBasket Address</p>
            <p className="text-muted-foreground text-xs ml-4">{contracts.StakeBasket}</p>
            
            <p>{getStatusIcon(contracts.StakeBasketToken === expectedAddresses.StakeBasketToken)} StakeBasketToken Address</p>
            <p className="text-muted-foreground text-xs ml-4">{contracts.StakeBasketToken}</p>
            
            <p>{getStatusIcon(!!(contracts.CoreOracle || contracts.PriceFeed))} PriceFeed/Oracle Address</p>
            <p className="text-muted-foreground text-xs ml-4">{contracts.CoreOracle || contracts.PriceFeed || 'Not configured'}</p>
          </div>
        </div>

        {/* Contract Functionality */}
        <div>
          <h4 className="font-semibold text-foreground mb-2">Contract Calls</h4>
          <div className="space-y-1">
            <p>{getStatusIcon(!!totalPooled && !poolError, poolError)} StakeBasket.totalPooledCore()</p>
            {poolError && <p className="text-destructive text-xs ml-4">Error: {poolError.message}</p>}
            {totalPooled && <p className="text-muted-foreground text-xs ml-4">Value: {totalPooled.toString()}</p>}
            
            <p>{getStatusIcon(!!corePrice && !priceError, priceError)} Oracle.getPrice("CORE")</p>
            {priceError && <p className="text-destructive text-xs ml-4">Error: {priceError.message}</p>}
            {corePrice && <p className="text-muted-foreground text-xs ml-4">Price: ${(Number(corePrice) / 1e18).toFixed(6)} USD</p>}
            {corePrice && <p className="text-muted-foreground text-xs ml-4">Raw value: {corePrice.toString()}</p>}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-semibold text-foreground mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <Button 
              onClick={() => localStorage.clear()}
              size="sm" 
              variant="destructive"
              className="w-full text-xs"
            >
              Clear Cache
            </Button>
            <Button 
              onClick={() => {
                if (window.ethereum) {
                  // @ts-ignore
                  window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{
                    chainId: '0x7a69',
                    chainName: 'Hardhat Local',
                    rpcUrls: ['http://localhost:8545'],
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                  }]})
                }
              }}
              size="sm" 
              variant="secondary"
              className="w-full text-xs"
            >
              Add Network to Wallet
            </Button>
          </div>
        </div>
      </div>

      {/* Error Summary */}
      {(rpcStatus === 'failed' || (chainId !== 31337 && chainId !== 1114 && chainId !== 1115) || !isConnected || poolError || priceError) && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
          <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Issues Detected:
          </h4>
          <ul className="text-sm text-destructive/80 space-y-1">
            {rpcStatus === 'failed' && <li className="flex items-start gap-2"><XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />Hardhat node not responding - restart with: npx hardhat node</li>}
            {(chainId !== 31337 && chainId !== 1114 && chainId !== 1115) && <li className="flex items-start gap-2"><XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />Unsupported network - switch to Hardhat Local (31337) or Core Testnet (1114/1115)</li>}
            {!isConnected && <li className="flex items-start gap-2"><XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />Wallet not connected - connect your wallet first</li>}
            {poolError && <li className="flex items-start gap-2"><XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />StakeBasket contract not responding - contracts may need redeployment</li>}
            {priceError && <li className="flex items-start gap-2"><XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />Price oracle not responding - check Switchboard integration or update prices</li>}
          </ul>
        </div>
      )}
      </div>
    </div>
  )
}