import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { TransactionHistory } from './TransactionHistory'
import { useState, useEffect } from 'react'
import { TrendingUp, Wallet, DollarSign, RefreshCw, AlertCircle } from 'lucide-react'
import { useContractData } from '../hooks/useContractData'
import { useStakeBasketTransactions } from '../hooks/useStakeBasketTransactions'
import { useTransactionHistory } from '../hooks/useTransactionHistory'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkByChainId } from '../config/contracts'

export function DashboardV3() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { network, config } = getNetworkByChainId(chainId)
  
  const {
    coreBalance,
    basketBalance,
    corePrice,
    btcPrice,
    totalPooledCore,
    supportedAssets,
    contracts,
    isConnected,
    priceError,
    priceLoading
  } = useContractData(address)

  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  
  // Use the transaction hooks
  const {
    depositCore,
    redeemBasket,
    isDepositing,
    isRedeeming,
    depositSuccess,
    redeemSuccess,
    depositHash,
    redeemHash
  } = useStakeBasketTransactions()

  // Get real transaction history from blockchain
  const { transactions, loading: txLoading, error: txError } = useTransactionHistory()

  // Calculate portfolio value
  const portfolioValueUSD = basketBalance * corePrice * 1.085 // Assume 8.5% premium for NAV

  const handleDeposit = async () => {
    if (!depositAmount) return
    try {
      await depositCore(depositAmount)
    } catch (error) {
      console.error('Deposit failed:', error)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount) return
    try {
      await redeemBasket(withdrawAmount)
    } catch (error) {
      console.error('Redeem failed:', error)
    }
  }

  // Clear inputs on successful transactions
  useEffect(() => {
    if (depositSuccess) {
      setDepositAmount('')
    }
  }, [depositSuccess])

  useEffect(() => {
    if (redeemSuccess) {
      setWithdrawAmount('')
    }
  }, [redeemSuccess])

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Connect to Core Network</CardTitle>
            <CardDescription>
              Please connect your wallet to Core Testnet2 to view your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Current network: {config.name} (Chain ID: {chainId})
              </p>
              {chainId !== 1114 && (
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Please switch to Core Testnet2 (Chain ID: 1114) to see your contracts and portfolio data.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌐 Network Status
            <span className="text-sm font-normal text-muted-foreground">
              ({config.name} - Chain ID: {chainId})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">CORE Price</p>
                <p className="font-semibold">
                  {priceLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin inline" />
                  ) : (
                    `$${corePrice.toFixed(4)}`
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">BTC Price</p>
                <p className="font-semibold">
                  {priceLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin inline" />
                  ) : (
                    `$${btcPrice.toLocaleString()}`
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Pooled</p>
                <p className="font-semibold">{totalPooledCore.toFixed(2)} CORE</p>
              </div>
              <div>
                <p className="text-muted-foreground">Oracle Assets</p>
                <p className="font-semibold">{supportedAssets.length} supported</p>
              </div>
            </div>
            
            {priceError && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                ⚠️ {priceError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioValueUSD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {basketBalance.toFixed(4)} BASKET tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CORE Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coreBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ≈ ${(coreBalance * corePrice).toFixed(2)} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.5%</div>
            <p className="text-xs text-muted-foreground">Estimated annual yield</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NAV per Share</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(corePrice * 1.085).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">Net Asset Value</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit */}
        <Card>
          <CardHeader>
            <CardTitle>Deposit Assets</CardTitle>
            <CardDescription>Deposit native CORE tokens to your ETF portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Deposit</label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Enter native CORE amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <Button 
                  onClick={handleDeposit} 
                  disabled={isDepositing || !depositAmount}
                  className="whitespace-nowrap"
                >
                  {isDepositing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    'Deposit Native CORE'
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Available: {coreBalance.toFixed(4)} native CORE (${(coreBalance * corePrice).toFixed(2)})
            </div>
            <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
              ℹ️ This ETF uses native CORE tokens (not MockCORE ERC-20). Your wallet balance shows your native CORE.
            </div>
            {parseFloat(depositAmount) > 0 && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  You will receive approximately {(parseFloat(depositAmount) / 1.085).toFixed(4)} BASKET tokens
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdraw */}
        <Card>
          <CardHeader>
            <CardTitle>Withdraw Assets</CardTitle>
            <CardDescription>Redeem your BASKET tokens for underlying assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">BASKET Tokens to Redeem</label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Enter BASKET amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <Button 
                  onClick={handleWithdraw} 
                  disabled={isRedeeming || !withdrawAmount}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {isRedeeming ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    'Redeem'
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Available: {basketBalance.toFixed(4)} BASKET (${portfolioValueUSD.toFixed(2)})
            </div>
            {parseFloat(withdrawAmount) > 0 && (
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  You will receive approximately {(parseFloat(withdrawAmount) * 1.085).toFixed(4)} CORE
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contract Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Information</CardTitle>
          <CardDescription>
            Your ETF is deployed on {config.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">StakeBasket Contract</p>
              <a 
                href={`${config.explorer}/address/${contracts.StakeBasket}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs break-all text-primary hover:underline"
              >
                {contracts.StakeBasket}
              </a>
            </div>
            <div>
              <p className="text-muted-foreground">BASKET Token</p>
              <a 
                href={`${config.explorer}/address/${contracts.StakeBasketToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs break-all text-primary hover:underline"
              >
                {contracts.StakeBasketToken}
              </a>
            </div>
            <div>
              <p className="text-muted-foreground">Core Oracle</p>
              <a 
                href={`${config.explorer}/address/${contracts.CoreOracle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs break-all text-primary hover:underline"
              >
                {contracts.CoreOracle}
              </a>
            </div>
            <div>
              <p className="text-muted-foreground">Mock CORE Token</p>
              <a 
                href={`${config.explorer}/address/${contracts.MockCORE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs break-all text-primary hover:underline"
              >
                {contracts.MockCORE}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real Transaction History */}
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
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              ⚠️ {txError}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-2">
              {/* Show pending transaction if exists */}
              {depositSuccess && (
                <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      ⏳ <strong>Deposit Pending</strong> - Transaction submitted
                    </div>
                    <a 
                      href={`${config.explorer}/tx/${depositHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-2"
                    >
                      View Tx
                    </a>
                  </div>
                </div>
              )}
              {redeemSuccess && (
                <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      ⏳ <strong>Redeem Pending</strong> - Transaction submitted
                    </div>
                    <a 
                      href={`${config.explorer}/tx/${redeemHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-2"
                    >
                      View Tx
                    </a>
                  </div>
                </div>
              )}
              
              {/* Show real blockchain transactions */}
              {transactions.map((tx) => (
                <div key={tx.hash} className="p-3 bg-accent/10 border border-accent/20 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-foreground">
                      {tx.type === 'deposit' ? '✅' : tx.type === 'redeem' ? '💰' : '🔄'} 
                      <strong> {tx.method}</strong> - {new Date(tx.timestamp).toLocaleDateString()}
                      {tx.status === 'failed' && ' (Failed)'}
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
              
              {/* Link to view all transactions on explorer */}
              <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    📊 <strong>View All Transactions</strong> - See complete history on blockchain explorer
                  </div>
                  <a 
                    href={`${config.explorer}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-2"
                  >
                    View Explorer
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show pending transaction if exists */}
              {depositSuccess && (
                <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      ⏳ <strong>Deposit Pending</strong> - Transaction submitted
                    </div>
                    <a 
                      href={`${config.explorer}/tx/${depositHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-2"
                    >
                      View Tx
                    </a>
                  </div>
                </div>
              )}
              {redeemSuccess && (
                <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      ⏳ <strong>Redeem Pending</strong> - Transaction submitted
                    </div>
                    <a 
                      href={`${config.explorer}/tx/${redeemHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-2"
                    >
                      View Tx
                    </a>
                  </div>
                </div>
              )}
              
              {/* Link to view all transactions on explorer when no transactions found */}
              <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    📊 <strong>View Complete Transaction History</strong> - See all your ETF transactions on the blockchain explorer
                  </div>
                  <a 
                    href={`${config.explorer}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-2"
                  >
                    View on Explorer
                  </a>
                </div>
              </div>
              
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-xs">No recent ETF transactions found. Your deposit/redeem history will appear above.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}