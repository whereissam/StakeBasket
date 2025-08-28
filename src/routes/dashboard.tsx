import { createFileRoute } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { useState, useEffect, useMemo, useCallback } from 'react'
import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { useDashboardData } from '../hooks/useDashboardData'
import { useStakeBasketTransactions } from '../hooks/useStakeBasketTransactions'
import { useAccount, useChainId } from 'wagmi'
import { NetworkStatus } from '../components/dashboard/NetworkStatus'
import { PortfolioOverview } from '../components/dashboard/PortfolioOverview'
import { StakeForm } from '../components/dashboard/StakeForm'
import { ContractInfo } from '../components/dashboard/ContractInfo'
import { TransactionHistory } from '../components/dashboard/TransactionHistory'
import { WalletConnectionPrompt } from '../components/dashboard/WalletConnectionPrompt'
import { ApiWithdrawForm } from '../components/dashboard/ApiWithdrawForm'
import { validateNetwork, getTokenSymbol } from '../utils/networkHandler'
import { toast } from 'sonner'
// import { DashboardDebug } from '../components/debug/DashboardDebug'
// import { ContractAddressDiagnostic } from '../components/debug/ContractAddressDiagnostic'
// import { StorageReset } from '../components/debug/StorageReset'
// import { SystemDiagnostic } from '../components/debug/SystemDiagnostic'
// import { DebugWrapper } from '../components/debug/DebugWrapper'
const Dashboard = React.memo(() => {
  const { address } = useAccount() 
  const chainId = useChainId()
  
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Memoize network validation to prevent recalculation on every render
  const networkValidation = useMemo(() => validateNetwork(chainId), [chainId])
  const tokenSymbol = useMemo(() => getTokenSymbol(chainId), [chainId])
  
  // Delay initialization to spread out API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true)
    }, 1000) // 1 second delay
    
    return () => clearTimeout(timer)
  }, [])
  
  // Use centralized dashboard data hook - RE-ENABLED TO FIX PROPERLY
  const dashboardData = useDashboardData(isInitialized)
  
  // Destructure only the variables actually used in this component
  const {
    walletConnected,
    contractAddresses,
    config,
    coreBalance,
    isConnected,
    refetchBasketBalance,
    healthSummary,
    runFullHealthCheck,
    isChecking,
    updateSuccess: priceUpdateSuccess,
    transactions,
    loading: txLoading,
    error: txError
  } = dashboardData || {
    // Fallback values to prevent errors
    walletConnected: false,
    contractAddresses: {},
    config: { name: 'Unknown', explorer: '' },
    coreBalance: 0,
    isConnected: false,
    refetchBasketBalance: () => {},
    healthSummary: { healthPercentage: 0, healthyContracts: 0, totalContracts: 0 },
    runFullHealthCheck: async () => {},
    isChecking: false,
    updateSuccess: false,
    transactions: [],
    loading: false,
    error: null
  }

  const [depositAmount, setDepositAmount] = useState('')
  
  // Use the real transaction hooks
  const stakeBasketHooks = useStakeBasketTransactions()
  const {
    depositCore,
    isDepositing,
    depositSuccess,
    depositHash
  } = stakeBasketHooks

  const handleDeposit = useCallback(async () => {
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
  }, [depositAmount, chainId, address, walletConnected, coreBalance, tokenSymbol, depositCore, networkValidation])



  // Memoize the balance refetch callback to prevent unnecessary re-renders
  const handleRefetchBalance = useCallback(() => {
    refetchBasketBalance?.()
  }, [refetchBasketBalance])

  // Clear inputs and refetch balances on successful transactions
  useEffect(() => {
    if (depositSuccess) {
      setDepositAmount('')
      handleRefetchBalance()
    }
  }, [depositSuccess, handleRefetchBalance])



  // Handle price update success
  useEffect(() => {
    if (priceUpdateSuccess) {
      // Refresh balance data after price update instead of full reload
      handleRefetchBalance()
    }
  }, [priceUpdateSuccess, handleRefetchBalance])

  // Early return if dashboard data is not yet loaded
  if (!dashboardData) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="text-center">Loading dashboard...</div>
      </div>
    )
  }
  
  if (!isConnected) {
    return <WalletConnectionPrompt config={config} chainId={chainId} />
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Debug Info - Only shown in development/local */}
      {/* <DebugWrapper>
        <SystemDiagnostic />
        <StorageReset />
        <ContractAddressDiagnostic />
        <DashboardDebug />
      </DebugWrapper> */}
      
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
            {/* <PriceStalenessIndicator 
              onUpdatePrice={updateCorePrice}
              isUpdating={isPriceUpdating}
            /> */}
            <div className="text-sm text-green-600">✅ Price feeds disabled for debugging</div>
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
        dashboardData={dashboardData}
        chainId={chainId}
      />

      <PortfolioOverview 
        dashboardData={dashboardData}
        chainId={chainId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StakeForm 
          dashboardData={dashboardData}
          chainId={chainId}
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          handleDeposit={handleDeposit}
          isDepositing={isDepositing}
        />
        
        <ApiWithdrawForm 
          chainId={chainId}
        />
       
        {/* <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
          Smart Withdrawal temporarily disabled to optimize performance
        </div> */}
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
  })

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})