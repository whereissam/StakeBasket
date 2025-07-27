import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Clock, AlertCircle, CheckCircle, Timer } from 'lucide-react'
import { getContractAddress } from '../config/contracts'

interface UnbondingRequest {
  user: string
  amount: string
  requestTime: string
  unlockTime: string
  processed: boolean
  assetType: string
}

interface QueueInfo {
  totalQueued: string
  averageWaitTime: number
  position: number
  estimatedUnlockTime: number
}

export default function UnbondingQueue() {
  const { address } = useAccount()
  const [pendingRequests, setPendingRequests] = useState<UnbondingRequest[]>([])
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null)
  const [withdrawalType, setWithdrawalType] = useState<'instant' | 'queue'>('instant')
  const [amount, setAmount] = useState('')
  const [assetType, setAssetType] = useState<'CORE' | 'lstBTC'>('CORE')

  // Contract interactions
  const { writeContract } = useWriteContract()

  // Get queue information
  const { data: queueData } = useReadContract({
    address: getContractAddress('StakeBasket') as `0x${string}`,
    abi: [
      {
        name: 'getQueueInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'user', type: 'address' },
          { name: 'assetType', type: 'string' }
        ],
        outputs: [
          {
            name: 'info',
            type: 'tuple',
            components: [
              { name: 'totalQueued', type: 'uint256' },
              { name: 'averageWaitTime', type: 'uint256' },
              { name: 'position', type: 'uint256' },
              { name: 'estimatedUnlockTime', type: 'uint256' }
            ]
          }
        ]
      }
    ],
    functionName: 'getQueueInfo',
    args: [address!, assetType],
    query: { enabled: !!address }
  })

  // Get pending requests
  const { data: pendingData } = useReadContract({
    address: getContractAddress('StakeBasket') as `0x${string}`,
    abi: [
      {
        name: 'getUserPendingRequests',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
          {
            name: '',
            type: 'tuple[]',
            components: [
              { name: 'user', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'requestTime', type: 'uint256' },
              { name: 'unlockTime', type: 'uint256' },
              { name: 'processed', type: 'bool' },
              { name: 'assetType', type: 'string' }
            ]
          }
        ]
      }
    ],
    functionName: 'getUserPendingRequests',
    args: [address!],
    query: { enabled: !!address }
  })

  // Check instant withdrawal availability
  const { data: canWithdrawInstantly } = useReadContract({
    address: getContractAddress('StakeBasket') as `0x${string}`,
    abi: [
      {
        name: 'canWithdrawInstantly',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'assetType', type: 'string' }
        ],
        outputs: [{ name: '', type: 'bool' }]
      }
    ],
    functionName: 'canWithdrawInstantly',
    args: [amount ? parseEther(amount) : 0n, assetType],
    query: { enabled: !!amount }
  })

  useEffect(() => {
    if (queueData) {
      setQueueInfo({
        totalQueued: formatEther(queueData.totalQueued),
        averageWaitTime: Number(queueData.averageWaitTime),
        position: Number(queueData.position),
        estimatedUnlockTime: Number(queueData.estimatedUnlockTime)
      })
    }
  }, [queueData])

  useEffect(() => {
    if (pendingData) {
      setPendingRequests(pendingData.map((request: {
        user: string;
        amount: bigint;
        requestTime: bigint;
        unlockTime: bigint;
        processed: boolean;
        assetType: string;
      }) => ({
        user: request.user,
        amount: formatEther(request.amount),
        requestTime: new Date(Number(request.requestTime) * 1000).toISOString(),
        unlockTime: new Date(Number(request.unlockTime) * 1000).toISOString(),
        processed: request.processed,
        assetType: request.assetType
      })))
    }
  }, [pendingData])

  const handleWithdrawal = async () => {
    if (!amount || !address) return

    try {
      if (withdrawalType === 'instant' && canWithdrawInstantly) {
        // Process instant withdrawal
        writeContract({
          address: getContractAddress('StakeBasket') as `0x${string}`,
          abi: [
            {
              name: 'processInstantWithdrawal',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'user', type: 'address' },
                { name: 'amount', type: 'uint256' },
                { name: 'assetType', type: 'string' }
              ]
            }
          ],
          functionName: 'processInstantWithdrawal',
          args: [address, parseEther(amount), assetType]
        })
      } else {
        // Queue withdrawal
        writeContract({
          address: getContractAddress('StakeBasket') as `0x${string}`,
          abi: [
            {
              name: 'requestUnbonding',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'user', type: 'address' },
                { name: 'amount', type: 'uint256' },
                { name: 'assetType', type: 'string' }
              ]
            }
          ],
          functionName: 'requestUnbonding',
          args: [address, parseEther(amount), assetType]
        })
      }
    } catch (error) {
      console.error('Withdrawal error:', error)
    }
  }

  const formatTimeRemaining = (unlockTime: string) => {
    const now = new Date()
    const unlock = new Date(unlockTime)
    const diff = unlock.getTime() - now.getTime()
    
    if (diff <= 0) return 'Ready to withdraw'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  const getUnbondingPeriod = (asset: string) => {
    return asset === 'CORE' ? '7 days' : '1 day'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Withdrawal Options
          </CardTitle>
          <CardDescription>
            Choose between instant withdrawal or queue for unbonding period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                className={`flex items-center justify-center gap-2 p-2 rounded text-sm transition-colors ${
                  withdrawalType === 'instant' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                }`}
                onClick={() => setWithdrawalType('instant')}
              >
                <CheckCircle className="h-4 w-4" />
                Instant
              </button>
              <button
                className={`flex items-center justify-center gap-2 p-2 rounded text-sm transition-colors ${
                  withdrawalType === 'queue' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                }`}
                onClick={() => setWithdrawalType('queue')}
              >
                <Clock className="h-4 w-4" />
                Queue ({getUnbondingPeriod(assetType)})
              </button>
            </div>

            {withdrawalType === 'instant' && (
              <div className="space-y-4">
                <div className="bg-secondary/50 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-primary font-medium mb-2">
                    <CheckCircle className="h-4 w-4" />
                    Instant Withdrawal Available
                  </div>
                  <p className="text-foreground text-sm">
                    Withdraw immediately from available liquidity pool. 
                    {canWithdrawInstantly ? 
                      ` ${amount} ${assetType} can be withdrawn instantly.` :
                      ' Amount exceeds available instant liquidity.'
                    }
                  </p>
                </div>

                {!canWithdrawInstantly && amount && (
                  <div className="bg-accent/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-accent-foreground font-medium mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Instant Withdrawal Not Available
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Amount exceeds available instant liquidity. Consider reducing amount or using queue withdrawal.
                    </p>
                  </div>
                )}
              </div>
            )}

            {withdrawalType === 'queue' && (
              <div className="space-y-4">
                <div className="bg-primary/10 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-primary font-medium mb-2">
                    <Clock className="h-4 w-4" />
                    Unbonding Period Required
                  </div>
                  <p className="text-foreground text-sm">
                    {assetType} requires a {getUnbondingPeriod(assetType)} unbonding period. 
                    Your withdrawal will be available after this period.
                  </p>
                </div>

                {queueInfo && queueInfo.position > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Queue Position</span>
                      <span>#{queueInfo.position}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Estimated Wait Time</span>
                      <span>{Math.floor(queueInfo.averageWaitTime / 3600)} hours</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Asset Type</label>
                <select 
                  value={assetType} 
                  onChange={(e) => setAssetType(e.target.value as 'CORE' | 'lstBTC')}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="CORE">CORE</option>
                  <option value="lstBTC">lstBTC</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full mt-1 p-2 border rounded-md"
                />
              </div>
            </div>

            <Button 
              onClick={handleWithdrawal}
              disabled={!amount || !address}
              className="w-full"
            >
              {withdrawalType === 'instant' ? 'Withdraw Instantly' : 'Queue Withdrawal'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status */}
      {queueInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Total Queued</div>
                <div className="text-lg font-semibold">{queueInfo.totalQueued} {assetType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Average Wait</div>
                <div className="text-lg font-semibold">
                  {Math.floor(queueInfo.averageWaitTime / 3600)}h
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Withdrawals */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Pending Withdrawals</CardTitle>
            <CardDescription>
              Track your unbonding requests and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium">{request.amount} {request.assetType}</div>
                      <div className="text-sm text-gray-600">
                        Requested {new Date(request.requestTime).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      new Date(request.unlockTime) <= new Date() 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {new Date(request.unlockTime) <= new Date() ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Unlock Time</span>
                      <span>{new Date(request.unlockTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Time Remaining</span>
                      <span>{formatTimeRemaining(request.unlockTime)}</span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, 
                            (Date.now() - new Date(request.requestTime).getTime()) / 
                            (new Date(request.unlockTime).getTime() - new Date(request.requestTime).getTime()) * 100
                          ))}%`
                        }}
                      />
                    </div>
                  </div>
                  
                  {new Date(request.unlockTime) <= new Date() && (
                    <Button className="w-full mt-3" size="sm">
                      Claim Withdrawal
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}