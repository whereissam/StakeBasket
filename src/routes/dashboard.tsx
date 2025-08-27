import { createFileRoute } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { useState, useEffect } from 'react'
import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { useContractData } from '../hooks/useContractData'
import { useStakeBasketTransactions } from '../hooks/useStakeBasketTransactions'
import { useTransactionHistory } from '../hooks/useTransactionHistory'
import { usePriceFeedManager } from '../hooks/usePriceFeedManager'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkByChainId } from '../config/contracts'
import { useContractStore, useEnvironmentContracts } from '../store/useContractStore'
import { useContractHealth } from '../hooks/useContractHealth'
import { PriceStalenessIndicator } from '../components/PriceStalenessIndicator'
import { NetworkStatus } from '../components/dashboard/NetworkStatus'
import { PortfolioOverview } from '../components/dashboard/PortfolioOverview'
import { StakeForm } from '../components/dashboard/StakeForm'
import { ContractInfo } from '../components/dashboard/ContractInfo'
import { TransactionHistory } from '../components/dashboard/TransactionHistory'
import { WalletConnectionPrompt } from '../components/dashboard/WalletConnectionPrompt'
import { ApiWithdrawForm } from '../components/dashboard/ApiWithdrawForm'
import { validateNetwork, getTokenSymbol } from '../utils/networkHandler'
import { toast } from 'sonner'
import { DashboardDebug } from '../components/debug/DashboardDebug'
import { ContractAddressDiagnostic } from '../components/debug/ContractAddressDiagnostic'
import { StorageReset } from '../components/debug/StorageReset'
import { SystemDiagnostic } from '../components/debug/SystemDiagnostic'
import { DebugWrapper } from '../components/debug/DebugWrapper'
function Dashboard() {
  const { address, isConnected: walletConnected } = useAccount()
  const chainId = useChainId()
  const { config } = getNetworkByChainId(chainId)
  
  // Validate network
  const networkValidation = validateNetwork(chainId)
  const tokenSymbol = getTokenSymbol(chainId)
  
  
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
  
  // Use the transaction hooks
  const stakeBasketHooks = useStakeBasketTransactions()
  const {
    depositCore,
    isDepositing,
    depositSuccess,
    depositHash
  } = stakeBasketHooks

  // Use the flexible withdraw flow hook

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
    
    // Clear any existing toasts first
    toast.dismiss()

    console.log('🔍 Environment Debug:', {
      chainId,
      walletConnectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
      allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
    })
    
    // CRITICAL SECURITY CHECK: Verify user is on correct network
    const currentValidation = validateNetwork(chainId)
    if (!currentValidation.isSupported || !currentValidation.isAvailable) {
      toast.error(`⚠️ Wrong Network! You're on chain ${chainId}. Please switch to a supported network (Hardhat Local, Core Testnet2, or Core Mainnet) before making transactions.`, {
        duration: 8000
      })
      return
    }
    
    // Check wallet connection
    if (!address || !walletConnected) {
      toast.error('Wallet not connected. Please connect your wallet first.')
      return
    }
    
    // Validate sufficient balance
    const depositAmountNum = parseFloat(depositAmount)
    const gasEstimate = 0.001 // Very conservative gas estimate (300k gas * 1 gwei = 0.0003 ETH)
    const totalNeeded = depositAmountNum + gasEstimate
    
    if (coreBalance < totalNeeded) {
      const shortfall = totalNeeded - coreBalance
      toast.error(`Insufficient balance. Need ${shortfall.toFixed(4)} more ${tokenSymbol} (including gas fees)`)
      return
    }
    
    try {
      console.log('🚀 Starting deposit:', {
        depositAmount,
        depositAmountNum,
        coreBalance,
        totalNeeded,
        chainId,
        address,
        walletConnected,
        networkValidation
      })
      
      // Additional wallet balance debugging
      console.log('💰 Balance Debug:', {
        displayedBalance: coreBalance,
        depositAmountWei: parseFloat(depositAmount) * 1e18,
        hasEnoughForDeposit: coreBalance >= depositAmountNum,
        hasEnoughTotal: coreBalance >= totalNeeded
      })
      
      await depositCore(depositAmount)
    } catch (error) {
      console.error('❌ Deposit failed in handleDeposit:', error)
      // Error already handled by depositCore
    }
  }



  // Clear inputs and refetch balances on successful transactions
  useEffect(() => {
    if (depositSuccess) {
      setDepositAmount('')
      refetchBasketBalance?.() // Refresh BASKET token balance after deposit
    }
  }, [depositSuccess, refetchBasketBalance])



  // Handle price update success
  useEffect(() => {
    if (priceUpdateSuccess) {
      // Refresh data after price update
      window.location.reload() // Simple way to refresh all price-dependent data
    }
  }, [priceUpdateSuccess])

  if (!isConnected) {
    return <WalletConnectionPrompt config={config} chainId={chainId} />
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Debug Info - Only shown in development/local */}
      <DebugWrapper>
        <SystemDiagnostic />
        <StorageReset />
        <ContractAddressDiagnostic />
        <DashboardDebug />
      </DebugWrapper>
      
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
      <NetworkStatus 
        config={config}
        chainId={chainId}
        corePrice={corePrice}
        btcPrice={btcPrice}
        totalPooledCore={totalPooledCore}
        supportedAssets={supportedAssets}
        priceLoading={priceLoading}
        priceError={priceError}
        updateCorePrice={updateCorePrice}
        isPriceUpdating={isPriceUpdating}
      />

      <PortfolioOverview 
        portfolioValueUSD={portfolioValueUSD}
        basketBalance={basketBalance}
        coreBalance={coreBalance}
        corePrice={corePrice}
        chainId={chainId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StakeForm 
          chainId={chainId}
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          handleDeposit={handleDeposit}
          isDepositing={isDepositing}
          coreBalance={coreBalance}
          corePrice={corePrice}
          updateCorePrice={updateCorePrice}
          isPriceUpdating={isPriceUpdating}
        />
        
        <ApiWithdrawForm 
          chainId={chainId}
        />
      </div>


      <ContractInfo 
        config={config}
        contractAddresses={contractAddresses}
      />

      <TransactionHistory 
        txLoading={txLoading}
        txError={txError}
        transactions={transactions}
        depositSuccess={depositSuccess}
        redeemSuccess={false}
        depositHash={depositHash}
        redeemHash={stakeBasketHooks.redeemHash}
        config={config}
        address={address ?? undefined}
      />
      </div>
    )
  }

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})