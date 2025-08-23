import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { MobileTransactionCard } from '../ui/mobile-transaction-card'
import { RefreshCw, ExternalLink, Clock, CheckCircle, Coins, RotateCcw, AlertTriangle, BarChart3 } from 'lucide-react'

interface TransactionHistoryProps {
  txLoading: boolean
  txError: string | null | undefined
  transactions: any[]
  depositSuccess: boolean
  redeemSuccess: boolean
  depositHash?: string
  redeemHash?: string
  config: { explorer: string }
  address: string | null | undefined
}

export function TransactionHistory({
  txLoading,
  txError,
  transactions,
  depositSuccess,
  redeemSuccess,
  depositHash,
  redeemHash,
  config,
  address
}: TransactionHistoryProps) {
  const PendingTransactions = () => (
    <>
      {depositSuccess && (
        <div className="p-3 bg-accent/50 border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Deposit Pending</p>
                <p className="text-xs text-muted-foreground">Transaction submitted</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0"
            >
              <a 
                href={`${config.explorer}/tx/${depositHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      )}
      {redeemSuccess && (
        <div className="p-3 bg-accent/50 border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Withdrawal Pending</p>
                <p className="text-xs text-muted-foreground">Processing transaction</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0"
            >
              <a 
                href={`${config.explorer}/tx/${redeemHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </>
  )

  const ExplorerLink = ({ text, subtext }: { text: string; subtext: string }) => (
    <div className="p-3 bg-muted border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{text}</p>
            <p className="text-xs text-muted-foreground">{subtext}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 w-8 p-0"
        >
          <a 
            href={`${config.explorer}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          Your deposit and redeem transactions on the StakeBasket ETF
        </CardDescription>
      </CardHeader>
      <CardContent>
        {txLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading transactions...</span>
          </div>
        ) : txError ? (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {txError}
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-3">
            <PendingTransactions />
            
            {/* Mobile-optimized transaction cards */}
            <div className="sm:hidden space-y-3">
              {transactions.map((tx) => (
                <MobileTransactionCard
                  key={tx.hash}
                  transaction={tx}
                  explorerUrl={config.explorer}
                />
              ))}
            </div>
            
            {/* Desktop transaction list */}
            <div className="hidden sm:block space-y-2">
              {transactions.map((tx) => (
                <div key={tx.hash} className="p-3 bg-accent/10 border border-accent/20 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-foreground flex items-center gap-2">
                      {tx.type === 'deposit' ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : tx.type === 'redeem' ? (
                        <Coins className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>
                        <strong>{tx.method}</strong> - {new Date(tx.timestamp).toLocaleDateString()}
                        {tx.status === 'failed' && ' (Failed)'}
                      </span>
                    </div>
                    <a 
                      href={`${config.explorer}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Tx
                    </a>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Hash: {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                  </div>
                </div>
              ))}
            </div>
            
            <ExplorerLink 
              text="View All Transactions" 
              subtext="Complete history on blockchain explorer" 
            />
          </div>
        ) : (
          <div className="space-y-3">
            <PendingTransactions />
            
            <ExplorerLink 
              text="View Complete History" 
              subtext="See all ETF transactions on explorer" 
            />
            
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No recent ETF transactions found.</p>
              <p className="text-xs mt-1">Your deposit/redeem history will appear above.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}