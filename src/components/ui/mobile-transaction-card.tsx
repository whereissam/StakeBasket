import { ExternalLink } from 'lucide-react'
import { Button } from './button'

interface Transaction {
  hash: string
  type: 'deposit' | 'redeem' | 'other'
  method: string
  timestamp: number
  status?: 'success' | 'failed' | 'pending'
}

interface MobileTransactionCardProps {
  transaction: Transaction
  explorerUrl: string
}

export function MobileTransactionCard({ transaction, explorerUrl }: MobileTransactionCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '✅'
      case 'redeem':
        return '💰'
      default:
        return '🔄'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'failed':
        return 'text-red-600'
      case 'pending':
        return 'text-yellow-600'
      default:
        return 'text-green-600'
    }
  }

  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(transaction.type)}</span>
          <div>
            <p className="font-medium text-sm">{transaction.method}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(transaction.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
        {transaction.status && (
          <span className={`text-xs font-medium ${getStatusColor(transaction.status)}`}>
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </span>
        )}
      </div>

      {/* Transaction Hash */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Transaction Hash</p>
        <div className="flex items-center justify-between p-2 bg-muted rounded">
          <span className="font-mono text-xs text-foreground">
            {transaction.hash.slice(0, 8)}...{transaction.hash.slice(-6)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 w-8 p-0"
          >
            <a 
              href={`${explorerUrl}/tx/${transaction.hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground">
        {new Date(transaction.timestamp).toLocaleString()}
      </div>
    </div>
  )
}