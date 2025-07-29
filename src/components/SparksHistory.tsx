import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useState, useEffect } from 'react'
import { History, TrendingUp, TrendingDown, Calendar, Zap } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { SPARKS_MANAGER_ABI } from '../config/abis'
import { CONTRACT_ADDRESSES } from '../config/contracts'

interface SparksRecord {
  timestamp: bigint
  amount: bigint
  reason: string
  isEarning: boolean
}

interface SparksHistoryProps {
  className?: string
  limit?: number
}

export function SparksHistory({ className = '', limit = 10 }: SparksHistoryProps) {
  const { address } = useAccount()
  const [offset, setOffset] = useState(0)
  const [history, setHistory] = useState<SparksRecord[]>([])
  const [loading] = useState(false)

  // Read user's Sparks history from contract (disabled during development)
  const { data: historyData, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.hardhat.SparksManager as `0x${string}`,
    abi: SPARKS_MANAGER_ABI,
    functionName: 'getSparksHistory',
    args: address ? [address, BigInt(offset), BigInt(limit)] : undefined,
    query: {
      enabled: false // Disable during development until contracts are deployed
    }
  })

  useEffect(() => {
    if (historyData) {
      const records = historyData as SparksRecord[]
      if (offset === 0) {
        setHistory(records)
      } else {
        setHistory(prev => [...prev, ...records])
      }
    } else if (address && offset === 0) {
      // Mock data for development
      const mockHistory: SparksRecord[] = [
        {
          timestamp: BigInt(Math.floor(Date.now() / 1000) - 86400),
          amount: BigInt('100000000000000000000'),
          reason: 'STAKEBASKET_DEPOSIT',
          isEarning: true
        },
        {
          timestamp: BigInt(Math.floor(Date.now() / 1000) - 172800),
          amount: BigInt('50000000000000000000'),
          reason: 'BASKET_HOLDING',
          isEarning: true
        },
        {
          timestamp: BigInt(Math.floor(Date.now() / 1000) - 259200),
          amount: BigInt('25000000000000000000'),
          reason: 'FEE_REDUCTION',
          isEarning: false
        }
      ]
      setHistory(mockHistory)
    }
  }, [historyData, offset, address])

  const loadMore = () => {
    setOffset(prev => prev + limit)
    refetch()
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReasonBadge = (reason: string) => {
    const reasonMap: Record<string, { label: string; color: string }> = {
      'BASKET_HOLDING': { label: 'Holding Reward', color: 'bg-primary text-primary-foreground' },
      'STAKEBASKET_DEPOSIT': { label: 'Deposit Bonus', color: 'bg-secondary text-secondary-foreground' },
      'DUAL_STAKING': { label: 'Dual Staking', color: 'bg-accent text-accent-foreground' },
      'FEE_REDUCTION': { label: 'Fee Reduction', color: 'bg-destructive text-destructive-foreground' },
      'EXCLUSIVE_ACCESS': { label: 'Exclusive Access', color: 'bg-primary text-primary-foreground' },
    }

    const info = reasonMap[reason] || { 
      label: reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()), 
      color: 'bg-muted text-muted-foreground'
    }

    return (
      <Badge className={`${info.color} text-xs`}>
        {info.label}
      </Badge>
    )
  }

  if (!address) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sparks History
          </CardTitle>
          <CardDescription>
            Connect your wallet to view your Sparks earning history
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Sparks History
        </CardTitle>
        <CardDescription>
          Track your Sparks earnings and spending over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No Sparks activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start using StakeBasket to earn your first Sparks!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    record.isEarning 
                      ? 'bg-primary/10 text-primary'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {record.isEarning ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${
                        record.isEarning ? 'text-primary' : 'text-destructive'
                      }`}>
                        {record.isEarning ? '+' : '-'}{Number(formatEther(record.amount)).toLocaleString()} ⚡
                      </span>
                      {getReasonBadge(record.reason)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(record.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {history.length >= limit && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}