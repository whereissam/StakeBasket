// import { useStakeBasketStore } from '../store/useStakeBasketStore' // TODO: Use for real data
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react'

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw'
  amount: string
  timestamp: Date
  hash: string
  status: 'pending' | 'completed' | 'failed'
}

export function TransactionHistory() {
  // Mock transaction data - in real app, fetch from blockchain or indexer
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'deposit',
      amount: '50.0',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      hash: '0x1234...5678',
      status: 'completed'
    },
    {
      id: '2',
      type: 'withdraw',
      amount: '25.0',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      hash: '0x9876...4321',
      status: 'completed'
    },
    {
      id: '3',
      type: 'deposit',
      amount: '100.0',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      hash: '0xabcd...efgh',
      status: 'completed'
    }
  ]

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Less than 1 hour ago'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>Your recent deposits and withdrawals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  tx.type === 'deposit' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {tx.type === 'deposit' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium capitalize">{tx.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(tx.timestamp)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium">
                  {tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.type === 'deposit' ? 'CORE' : 'BASKET'}
                </div>
                <div className={`text-sm capitalize ${getStatusColor(tx.status)}`}>
                  {tx.status}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground font-mono">
                <a 
                  href={`https://scan.test2.btcs.network/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  {tx.hash}
                </a>
              </div>
            </div>
          ))}
          
          {mockTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet. Make your first deposit to get started!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}