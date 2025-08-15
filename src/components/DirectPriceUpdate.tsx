import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect } from 'react'

// Direct PriceFeed ABI
const PRICE_FEED_ABI = [
  {
    "inputs": [
      {"name": "asset", "type": "string"},
      {"name": "price", "type": "uint256"}
    ],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

const PRICE_FEED_ADDRESS = '0x61C9A97fC6B790d09024676AFaC07e467cd4f74d'

export function DirectPriceUpdate() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isSuccess) {
      toast.success('Price updated successfully!')
    }
  }, [isSuccess])

  useEffect(() => {
    if (error) {
      toast.error(`Price update failed: ${error.message}`)
    }
  }, [error])

  const handleUpdatePrice = async () => {
    try {
      console.log('🔄 Direct price update attempt:', {
        contract: PRICE_FEED_ADDRESS,
        asset: 'CORE',
        price: parseEther('1.5').toString()
      })

      await writeContract({
        address: PRICE_FEED_ADDRESS as `0x${string}`,
        abi: PRICE_FEED_ABI,
        functionName: 'updatePrice',
        args: ['CORE', parseEther('1.5')], // $1.50
        gas: 100000n,
      })
    } catch (err) {
      console.error('Direct price update error:', err)
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800">🔧 Direct Price Feed Update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700">
          Manual price update to fix stale price data issue
        </p>
        
        <div className="space-y-2 text-xs">
          <div>Contract: {PRICE_FEED_ADDRESS}</div>
          <div>Function: updatePrice('CORE', 1.5e18)</div>
          <div>Current Status: {isLoading ? 'Processing...' : isSuccess ? 'Success ✅' : 'Ready'}</div>
        </div>

        <Button 
          onClick={handleUpdatePrice}
          disabled={isPending || isLoading}
          className="w-full"
          variant="outline"
        >
          {isPending || isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating Price...
            </>
          ) : (
            'Update CORE Price to $1.50'
          )}
        </Button>

        {error && (
          <div className="text-xs bg-red-50 border border-red-200 rounded p-2 text-red-700">
            <strong>Error:</strong> {error.message}
          </div>
        )}

        {hash && (
          <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
            <strong>Transaction:</strong> 
            <a 
              href={`https://scan.test2.btcs.network/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}