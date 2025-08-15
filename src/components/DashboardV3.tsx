import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ContractAddress } from './ui/contract-address'
import { MobileTransactionCard } from './ui/mobile-transaction-card'
import { useState, useEffect } from 'react'
import * as React from 'react'
import { TrendingUp, Wallet, DollarSign, RefreshCw, ExternalLink } from 'lucide-react'
import { useContractData } from '../hooks/useContractData'
import { useStakeBasketTransactions } from '../hooks/useStakeBasketTransactions'
import { useTransactionHistory } from '../hooks/useTransactionHistory'
import { usePriceFeedManager } from '../hooks/usePriceFeedManager'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkByChainId } from '../config/contracts'
import { useContractStore, useEnvironmentContracts } from '../store/useContractStore'
import { useContractHealth } from '../hooks/useContractHealth'
import { ContractSettings } from './ContractSettings'
import { PriceStalenessIndicator } from './PriceStalenessIndicator'
// import { WalletDiagnostic } from './WalletDiagnostic'
import { DirectPriceUpdate } from './DirectPriceUpdate'
import { toast } from 'sonner'

export function DashboardV3() {
  const { address, isConnected: walletConnected, isConnecting, isReconnecting } = useAccount()
  const chainId = useChainId()
  const { config } = getNetworkByChainId(chainId)
  
  // Initialize environment contract overrides
  useEnvironmentContracts()
  
  // Get contract configuration from store
  const { setChainId, getAllAddresses } = useContractStore()
  const contractAddresses = getAllAddresses()
  
  // Get contract health status
  const { getHealthSummary, runFullHealthCheck, isChecking } = useContractHealth()
  const healthSummary = getHealthSummary()
  
  // Update store when chain changes
  React.useEffect(() => {
    if (chainId) {
      setChainId(chainId)
    }
  }, [chainId, setChainId])
  
  const {
    coreBalance,
    basketBalance,
    corePrice,
    btcPrice,
    totalPooledCore,
    supportedAssets,
    isConnected,
    priceError,
    priceLoading,
    refetchBasketBalance
  } = useContractData(address)


  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  
  // Use the transaction hooks
  const {
    depositCore,
    redeemBasket,
    approveBasketTokens,
    isDepositing,
    isRedeeming,
    isApprovingBasket,
    depositSuccess,
    redeemSuccess,
    approveSuccess,
    depositHash,
    redeemHash,
    approveHash,
    needsBasketApproval,
    basketAllowance
  } = useStakeBasketTransactions()

  // Price feed management
  const {
    updateCorePrice,
    isUpdating: isPriceUpdating,
    updateSuccess: priceUpdateSuccess
  } = usePriceFeedManager()

  // Get real transaction history from blockchain
  const { transactions, loading: txLoading, error: txError } = useTransactionHistory()

  // Calculate portfolio value
  const portfolioValueUSD = basketBalance * corePrice * 1.085 // Assume 8.5% premium for NAV

  const handleDeposit = async () => {
    if (!depositAmount) return
    
    // Check wallet connection first
    if (!address || !walletConnected) {
      toast.error('Wallet not connected. Please connect your wallet first.')
      return
    }
    
    // Validate sufficient balance
    const depositAmountNum = parseFloat(depositAmount)
    const gasEstimate = 0.02 // Estimate 0.02 for gas
    const totalNeeded = depositAmountNum + gasEstimate
    
    if (coreBalance < totalNeeded) {
      const shortfall = totalNeeded - coreBalance
      const tokenSymbol = chainId === 31337 ? 'ETH' : 'tCORE2'
      toast.error(`Insufficient balance. Need ${shortfall.toFixed(4)} more ${tokenSymbol} (including gas fees)`)
      return
    }
    
    try {
      await depositCore(depositAmount)
    } catch (error) {
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount) return
    
    try {
      // Check if approval is needed first
      if (needsBasketApproval(withdrawAmount)) {
        toast.info('Approving BASKET tokens first...')
        await approveBasketTokens(withdrawAmount)
        // Wait a moment for approval to be processed
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Now proceed with redemption
      await redeemBasket(withdrawAmount)
    } catch (error) {
      // Error handling is done in the hooks
    }
  }


  // Clear inputs and refetch balances on successful transactions
  useEffect(() => {
    if (depositSuccess) {
      setDepositAmount('')
      refetchBasketBalance?.() // Refresh BASKET token balance after deposit
    }
  }, [depositSuccess, refetchBasketBalance])

  useEffect(() => {
    if (redeemSuccess) {
      refetchBasketBalance?.() // Refresh BASKET token balance after redeem
      setWithdrawAmount('')
    }
  }, [redeemSuccess, refetchBasketBalance])


  // Handle price update success
  useEffect(() => {
    if (priceUpdateSuccess) {
      // Refresh data after price update
      window.location.reload() // Simple way to refresh all price-dependent data
    }
  }, [priceUpdateSuccess])

  if (!isConnected) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Connect to Core Network</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Please connect your wallet to view your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Current network: {config.name} (Chain ID: {chainId})
              </p>
              {chainId !== 1114 && chainId !== 31337 && (
                <div className="p-4 border border-border bg-accent/50 rounded-lg">
                  <p className="text-sm text-accent-foreground">
                    ⚠️ Please switch to Core Testnet2 (Chain ID: 1114) or Local Hardhat (Chain ID: 31337) to see your contracts and portfolio data.
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
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Wallet Diagnostic */}
      {/* <WalletDiagnostic /> */}
      
      {/* Direct Price Update */}
      {/* <DirectPriceUpdate /> */}
      
      {/* Contract Settings */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">StakeBasket Dashboard</h1>
          <p className="text-muted-foreground">
            Contract Health: {healthSummary.healthPercentage}% ({healthSummary.healthyContracts}/{healthSummary.totalContracts} healthy)
          </p>
          <div className="mt-2">
            <PriceStalenessIndicator 
              onUpdatePrice={updateCorePrice}
              isUpdating={isPriceUpdating}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runFullHealthCheck}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Health
          </Button>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={updateCorePrice}
            disabled={isPriceUpdating}
            className="bg-primary/5 hover:bg-primary/10 border-primary/20"
          >
            <DollarSign className={`h-4 w-4 mr-2 ${isPriceUpdating ? 'animate-spin' : ''}`} />
            {isPriceUpdating ? 'Updating...' : 'Update Prices'}
          </Button> */}
          {/* <ContractSettings /> */}
        </div>
      </div>
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
                <p className="text-muted-foreground">{chainId === 31337 ? 'ETH' : 'CORE'} Price</p>
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
                <p className="font-semibold">{totalPooledCore.toFixed(2)} {chainId === 31337 ? 'ETH' : 'CORE'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Oracle Assets</p>
                <p className="font-semibold">{supportedAssets.length} supported</p>
              </div>
            </div>
            
            {priceError && (
              <div className="p-2 bg-accent/50 border border-border rounded text-xs text-accent-foreground">
                ⚠️ {priceError}
                {priceError.includes('stale') && (
                  <div className="mt-2">
                    <Button
                      onClick={updateCorePrice}
                      disabled={isPriceUpdating}
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                    >
                      {isPriceUpdating ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Price Feed'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
            <CardTitle className="text-sm font-medium">{chainId === 31337 ? 'ETH' : 'CORE'} Balance</CardTitle>
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
            <CardTitle>Stake {chainId === 31337 ? 'ETH' : 'CORE'} Tokens</CardTitle>
            <CardDescription>Stake native {chainId === 31337 ? 'ETH (for local testing)' : 'CORE tokens'} to earn BASKET tokens and yield rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Stake</label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  type="number"
                  placeholder={`Enter ${chainId === 31337 ? 'ETH' : 'CORE'} amount to stake`}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleDeposit} 
                  disabled={isDepositing || !depositAmount}
                  className="w-full sm:w-auto sm:whitespace-nowrap min-h-[44px]"
                >
                  {isDepositing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Staking...
                    </>
                  ) : (
                    `Stake Native ${chainId === 31337 ? 'ETH' : 'CORE'}`
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Available: {coreBalance.toFixed(4)} native {chainId === 31337 ? 'ETH' : 'CORE'} (${(coreBalance * corePrice).toFixed(2)})</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      // Calculate max safe amount (leaving 0.02 for gas)
                      const maxSafe = Math.max(0, coreBalance - 0.02)
                      setDepositAmount(maxSafe.toFixed(4))
                    }}
                    className="text-primary hover:underline text-xs"
                  >
                    Max Safe
                  </button>
                  <button 
                    onClick={() => setDepositAmount(coreBalance.toFixed(4))}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Use All
                  </button>
                </div>
              </div>
              {coreBalance < 5.1 && coreBalance >= 1 && chainId !== 31337 && (
                <div className="text-yellow-600 mt-1">
                  ⚠️ For 5 tCORE2 deposit, you need 5.02 tCORE2 total (including gas). Try "Max Safe" button for your current balance.
                </div>
              )}
              {coreBalance < 1 && (
                <div className="text-red-600 mt-1">
                  ❌ Insufficient balance. {chainId === 31337 ? 'Get more ETH for local testing.' : 'Get more tCORE2 from faucet to make deposits.'}
                </div>
              )}
            </div>
            <div className="p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
              ℹ️ This ETF uses native {chainId === 31337 ? 'ETH tokens for local testing' : 'CORE tokens (not MockCORE ERC-20)'}. Your wallet balance shows your native tokens.
            </div>
            
            <PriceStalenessIndicator 
              onUpdatePrice={updateCorePrice}
              isUpdating={isPriceUpdating}
            />
            {parseFloat(depositAmount) > 0 && (
              <div className="p-3 bg-primary/10 rounded-md">
                <p className="text-sm text-primary">
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
            <CardDescription>Redeem your BASKET tokens for {chainId === 31337 ? 'ETH' : 'CORE'} tokens immediately</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">BASKET Tokens to Redeem</label>
              <div className="flex flex-col space-y-2">
                <Input
                  type="number"
                  placeholder="Enter BASKET amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1"
                />
                
                <Button 
                  onClick={handleWithdraw} 
                  disabled={isRedeeming || isApprovingBasket || !withdrawAmount}
                  className="w-full min-h-[44px]"
                >
                  {isApprovingBasket ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Approving BASKET Tokens...
                    </>
                  ) : isRedeeming ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    'Redeem BASKET Tokens'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Available: {basketBalance.toFixed(4)} BASKET (${portfolioValueUSD.toFixed(2)})
            </div>
            
            {/* BASKET Token Status */}
            <div className="p-3 bg-muted border border-border rounded-md">
              <h4 className="text-sm font-medium text-foreground mb-2">🔑 BASKET Token Status</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                {needsBasketApproval(withdrawAmount || '1') ? (
                  <p>• BASKET tokens will be approved automatically when you redeem</p>
                ) : (
                  <p>• ✅ BASKET tokens approved (allowance: {parseFloat(basketAllowance).toFixed(4)})</p>
                )}
                <p>• BASKET Token: {contractAddresses.StakeBasketToken}</p>
                <p>• Spender: {contractAddresses.StakeBasket}</p>
              </div>
            </div>
            
            {/* Withdrawal explanation */}
            <div className="p-3 bg-accent/50 border border-border rounded-md">
              <h4 className="text-sm font-medium text-accent-foreground mb-2">📋 How Withdrawal Works</h4>
              <div className="space-y-2 text-xs text-accent-foreground/80">
                <p>• BASKET tokens are redeemed immediately for {chainId === 31337 ? 'ETH' : 'CORE'} tokens</p>
                <p>• Withdrawal amount depends on current Net Asset Value (NAV)</p>
                <p>• Requires BASKET token approval before redemption</p>
              </div>
            </div>
            
            {parseFloat(withdrawAmount) > 0 && (
              <div className="p-3 bg-secondary/50 rounded-md">
                <p className="text-sm text-secondary-foreground">
                  You will receive approximately {(parseFloat(withdrawAmount) / 1.085).toFixed(4)} {chainId === 31337 ? 'ETH' : 'CORE'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Actual amount depends on current NAV per share
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContractAddress
              label="StakeBasket Contract"
              address={contractAddresses.StakeBasket}
              explorerUrl={`${config.explorer}/address/${contractAddresses.StakeBasket}`}
            />
            <ContractAddress
              label="BASKET Token"
              address={contractAddresses.StakeBasketToken}
              explorerUrl={`${config.explorer}/address/${contractAddresses.StakeBasketToken}`}
            />
            {contractAddresses.CoreOracle && (
              <ContractAddress
                label="Core Oracle"
                address={contractAddresses.CoreOracle}
                explorerUrl={`${config.explorer}/address/${contractAddresses.CoreOracle}`}
              />
            )}
            <ContractAddress
              label="Staking Manager"
              address={contractAddresses.StakingManager}
              explorerUrl={`${config.explorer}/address/${contractAddresses.StakingManager}`}
            />
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
            <div className="space-y-3">
              {/* Show pending transactions if they exist */}
              {depositSuccess && (
                <div className="p-3 bg-accent/50 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🕐</span>
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
                      <span className="text-lg">🕐</span>
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
              </div>
              
              {/* Link to view all transactions on explorer */}
              <div className="p-3 bg-muted border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📊</span>
                    <div>
                      <p className="font-medium text-sm">View All Transactions</p>
                      <p className="text-xs text-muted-foreground">Complete history on blockchain explorer</p>
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
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show pending transactions if they exist */}
              {depositSuccess && (
                <div className="p-3 bg-accent/50 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🕐</span>
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
                      <span className="text-lg">🕐</span>
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
              
              {/* Link to view all transactions on explorer when no transactions found */}
              <div className="p-3 bg-muted border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📊</span>
                    <div>
                      <p className="font-medium text-sm">View Complete History</p>
                      <p className="text-xs text-muted-foreground">See all ETF transactions on explorer</p>
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
              
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No recent ETF transactions found.</p>
                <p className="text-xs mt-1">Your deposit/redeem history will appear above.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}