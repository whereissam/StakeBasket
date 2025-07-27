import { useState } from 'react'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, formatUnits } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { TrendingUp, Wallet, DollarSign, Users, AlertCircle } from 'lucide-react'
import { getContractAddress, isLocalNetwork } from '../config/contracts'
import { STAKEBASKET_ABI, STAKEBASKET_TOKEN_ABI, MOCK_CORE_ABI, MOCK_CORE_BTC_ABI } from '../config/abis'

export function DashboardV2() {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  // const [selectedAsset, setSelectedAsset] = useState<'CORE' | 'coreBTC'>('CORE')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  // Contract addresses
  const stakeBasketAddress = getContractAddress('StakeBasket')
  const stakeBasketTokenAddress = getContractAddress('StakeBasketToken')
  const mockCoreAddress = getContractAddress('MockCORE')
  const mockCoreBTCAddress = getContractAddress('MockCoreBTC')

  // Read contract data
  const { data: basketBalance } = useReadContract({
    address: stakeBasketTokenAddress as `0x${string}`,
    abi: STAKEBASKET_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: totalAUM } = useReadContract({
    address: stakeBasketAddress as `0x${string}`,
    abi: STAKEBASKET_ABI,
    functionName: 'getTotalAUM',
  })

  const { data: totalPooledCore } = useReadContract({
    address: stakeBasketAddress as `0x${string}`,
    abi: STAKEBASKET_ABI,
    functionName: 'totalPooledCore',
  })

  const { data: basketTotalSupply } = useReadContract({
    address: stakeBasketTokenAddress as `0x${string}`,
    abi: STAKEBASKET_TOKEN_ABI,
    functionName: 'totalSupply',
  })

  const { data: ethBalance } = useBalance({
    address: address,
  })

  const { data: mockCoreBalance } = useReadContract({
    address: mockCoreAddress as `0x${string}`,
    abi: MOCK_CORE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: mockCoreBTCBalance } = useReadContract({
    address: mockCoreBTCAddress as `0x${string}`,
    abi: MOCK_CORE_BTC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Write contract functions
  const { writeContract: writeStakeBasket, data: depositHash, isPending: isDepositing } = useWriteContract()
  const { writeContract: writeFaucet, data: faucetHash, isPending: isFauceting } = useWriteContract()

  // Wait for transaction confirmations
  const { isLoading: isDepositConfirming } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  const { isLoading: isFaucetConfirming } = useWaitForTransactionReceipt({
    hash: faucetHash,
  })

  // Calculations
  const navPerShare = basketTotalSupply && (basketTotalSupply as bigint) > 0n && totalAUM 
    ? Number(formatEther(totalAUM as bigint)) / Number(formatEther(basketTotalSupply as bigint))
    : 1

  const userBasketValue = basketBalance 
    ? Number(formatEther(basketBalance as bigint)) * navPerShare
    : 0

  const estimatedBasketTokens = depositAmount && navPerShare > 0
    ? parseFloat(depositAmount) / navPerShare
    : 0

  // Handlers
  const handleDeposit = async () => {
    if (!depositAmount || !address) return

    try {
      const amount = parseEther(depositAmount)
      await writeStakeBasket({
        address: stakeBasketAddress as `0x${string}`,
        abi: STAKEBASKET_ABI,
        functionName: 'deposit',
        args: [amount],
        value: amount, // Send ETH value for native CORE deposits
      })
      setDepositAmount('')
    } catch (error) {
      console.error('Deposit failed:', error)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || !basketBalance) return

    try {
      const shares = parseEther(withdrawAmount)
      await writeStakeBasket({
        address: stakeBasketAddress as `0x${string}`,
        abi: STAKEBASKET_ABI,
        functionName: 'redeem',
        args: [shares],
      })
      setWithdrawAmount('')
    } catch (error) {
      console.error('Withdrawal failed:', error)
    }
  }

  const handleFaucet = async (tokenType: 'CORE' | 'coreBTC') => {
    try {
      const tokenAddress = tokenType === 'CORE' ? mockCoreAddress : mockCoreBTCAddress
      await writeFaucet({
        address: tokenAddress as `0x${string}`,
        abi: tokenType === 'CORE' ? MOCK_CORE_ABI : MOCK_CORE_BTC_ABI,
        functionName: 'faucet',
      })
    } catch (error) {
      console.error('Faucet failed:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to start using StakeBasket
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">StakeBasket Dashboard</h1>
          <p className="text-muted-foreground">
            {isLocalNetwork() && (
              <span className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                <AlertCircle className="h-4 w-4" />
                Local Network - Test Mode
              </span>
            )}
          </p>
        </div>

        {/* Test Token Faucets (Local Network Only) */}
        {isLocalNetwork() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Token Faucets</CardTitle>
              <CardDescription>Get test tokens for local development</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  onClick={() => handleFaucet('CORE')}
                  disabled={isFauceting || isFaucetConfirming}
                  variant="outline"
                >
                  {(isFauceting || isFaucetConfirming) ? 'Getting CORE...' : 'Get Test CORE'}
                </Button>
                <Button 
                  onClick={() => handleFaucet('coreBTC')}
                  disabled={isFauceting || isFaucetConfirming}
                  variant="outline"
                >
                  {(isFauceting || isFaucetConfirming) ? 'Getting coreBTC...' : 'Get Test coreBTC'}
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Mock CORE Balance: </span>
                  <span className="font-mono">
                    {mockCoreBalance ? formatEther(mockCoreBalance as bigint) : '0'} CORE
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mock coreBTC Balance: </span>
                  <span className="font-mono">
                    {mockCoreBTCBalance ? formatUnits(mockCoreBTCBalance as bigint, 8) : '0'} coreBTC
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your BASKET Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {basketBalance ? formatEther(basketBalance as bigint) : '0'} BASKET
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ ${userBasketValue.toFixed(2)} USD
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalAUM ? formatEther(totalAUM as bigint) : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalPooledCore ? formatEther(totalPooledCore as bigint) : '0'} CORE pooled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NAV per Share</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${navPerShare.toFixed(4)}</div>
              <p className="text-xs text-muted-foreground">Per BASKET token</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your ETH Balance</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0'} ETH
              </div>
              <p className="text-xs text-muted-foreground">Available for deposits</p>
            </CardContent>
          </Card>
        </div>

        {/* Deposit Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Deposit</CardTitle>
              <CardDescription>
                Deposit ETH (representing CORE) to receive BASKET tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Amount to Deposit</label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  You will receive ~{estimatedBasketTokens.toFixed(4)} BASKET tokens
                </div>
                
                <Button 
                  onClick={handleDeposit}
                  disabled={!depositAmount || isDepositing || isDepositConfirming}
                  className="w-full"
                >
                  {isDepositing || isDepositConfirming ? 'Depositing...' : 'Deposit ETH'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Withdraw Section */}
          <Card>
            <CardHeader>
              <CardTitle>Withdraw</CardTitle>
              <CardDescription>
                Redeem your BASKET tokens for underlying assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">BASKET Tokens to Redeem</label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Max: {basketBalance ? formatEther(basketBalance as bigint) : '0'} BASKET
                </div>
                
                <Button 
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || !basketBalance}
                  variant="outline"
                  className="w-full"
                >
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}