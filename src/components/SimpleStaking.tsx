import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, formatEther, formatUnits } from 'viem';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';

// Simple staking contract ABI - only the functions we need
const SIMPLE_STAKING_ABI = [
  {
    "inputs": [{"name": "btcAmount", "type": "uint256"}],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "shares", "type": "uint256"}],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable", 
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolInfo",
    "outputs": [
      {"name": "totalCore", "type": "uint256"},
      {"name": "totalBtc", "type": "uint256"},
      {"name": "totalShares", "type": "uint256"},
      {"name": "sharePrice", "type": "uint256"},
      {"name": "currentRatio", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "needsRebalancing",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const BASKET_TOKEN_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf", 
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const BTC_TOKEN_ABI = [
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract addresses from test deployment
const CONTRACT_ADDRESSES = {
  SIMPLE_STAKING: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  BASKET_TOKEN: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", 
  BTC_TOKEN: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" // Mock BTC for testing
};

export function SimpleStaking() {
  const { address } = useAccount();
  const { data: coreBalance } = useBalance({ address });
  
  const [coreAmount, setCoreAmount] = useState('');
  const [btcAmount, setBtcAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');

  // Contract reads
  const { data: poolInfo, refetch: refetchPoolInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.SIMPLE_STAKING as `0x${string}`,
    abi: SIMPLE_STAKING_ABI,
    functionName: 'getPoolInfo'
  });

  const { data: userShares, refetch: refetchShares } = useReadContract({
    address: CONTRACT_ADDRESSES.BASKET_TOKEN as `0x${string}`,
    abi: BASKET_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  const { data: btcBalance, refetch: refetchBtcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.BTC_TOKEN as `0x${string}`,
    abi: BTC_TOKEN_ABI, 
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address && CONTRACT_ADDRESSES.BTC_TOKEN !== "0x0000000000000000000000000000000000000000" }
  });

  const { data: needsRebalancing } = useReadContract({
    address: CONTRACT_ADDRESSES.SIMPLE_STAKING as `0x${string}`,
    abi: SIMPLE_STAKING_ABI,
    functionName: 'needsRebalancing'
  });

  // Contract writes
  const { writeContract: approveAndDeposit, data: depositHash, isPending: isDepositing } = useWriteContract();
  const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawing } = useWriteContract();

  // Transaction confirmations
  const { isLoading: isDepositConfirming } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: isWithdrawConfirming } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Refresh data after successful transactions
  useEffect(() => {
    if (depositHash || withdrawHash) {
      const timer = setTimeout(() => {
        refetchPoolInfo();
        refetchShares();
        refetchBtcBalance();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [depositHash, withdrawHash, refetchPoolInfo, refetchShares, refetchBtcBalance]);

  const handleDeposit = async () => {
    if (!coreAmount || !btcAmount || !address) return;
    
    try {
      const coreWei = parseEther(coreAmount);
      const btcUnits = parseUnits(btcAmount, 8);
      
      // Approve BTC first if needed
      if (CONTRACT_ADDRESSES.BTC_TOKEN !== "0x0000000000000000000000000000000000000000") {
        await approveAndDeposit({
          address: CONTRACT_ADDRESSES.BTC_TOKEN as `0x${string}`,
          abi: BTC_TOKEN_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.SIMPLE_STAKING as `0x${string}`, btcUnits]
        });
      }
      
      // Then deposit
      await approveAndDeposit({
        address: CONTRACT_ADDRESSES.SIMPLE_STAKING as `0x${string}`,
        abi: SIMPLE_STAKING_ABI,
        functionName: 'deposit',
        args: [btcUnits],
        value: coreWei
      });
      
      toast.success('Deposit transaction submitted');
      setCoreAmount('');
      setBtcAmount('');
    } catch (error) {
      toast.error('Deposit failed: ' + (error as Error).message);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawShares || !address) return;
    
    try {
      const sharesWei = parseEther(withdrawShares);
      
      await withdraw({
        address: CONTRACT_ADDRESSES.SIMPLE_STAKING as `0x${string}`,
        abi: SIMPLE_STAKING_ABI,
        functionName: 'withdraw',
        args: [sharesWei]
      });
      
      toast.success('Withdraw transaction submitted');
      setWithdrawShares('');
    } catch (error) {
      toast.error('Withdraw failed: ' + (error as Error).message);
    }
  };

  const calculateOptimalBtc = (core: string) => {
    if (!core || !poolInfo) return '';
    const ratio = poolInfo[4]; // currentRatio
    const coreWei = parseEther(core);
    const btcUnits = coreWei / BigInt(ratio);
    return formatUnits(btcUnits, 8);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple CORE+BTC Staking</CardTitle>
          <CardDescription>
            Stake CORE and BTC tokens with automatic ratio maintenance for optimal rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Pool Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Total CORE</div>
              <div className="font-mono text-lg">
                {poolInfo ? formatEther(poolInfo[0]) : '0'} CORE
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Total BTC</div>
              <div className="font-mono text-lg">
                {poolInfo ? formatUnits(poolInfo[1], 8) : '0'} BTC
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Share Price</div>
              <div className="font-mono text-lg">
                ${poolInfo ? formatEther(poolInfo[3]) : '0'}
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Ratio</div>
              <div className="font-mono text-lg">
                {poolInfo ? poolInfo[4].toString() : '0'}:1
                {needsRebalancing && <span className="text-yellow-500 ml-2">⚠️</span>}
              </div>
            </div>
          </div>

          {/* User Position */}
          {address && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Your CORE</div>
                <div className="font-mono">
                  {coreBalance ? formatEther(coreBalance.value) : '0'} CORE
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Your BTC</div>
                <div className="font-mono">
                  {btcBalance ? formatUnits(btcBalance, 8) : '0'} BTC
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Your Shares</div>
                <div className="font-mono">
                  {userShares ? formatEther(userShares) : '0'} SBT
                </div>
              </div>
            </div>
          )}

          {/* Deposit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">CORE Amount</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={coreAmount}
                    onChange={(e) => {
                      setCoreAmount(e.target.value);
                      if (e.target.value && poolInfo) {
                        setBtcAmount(calculateOptimalBtc(e.target.value));
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">BTC Amount</label>
                  <Input
                    type="number" 
                    placeholder="0.1"
                    value={btcAmount}
                    onChange={(e) => setBtcAmount(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleDeposit}
                disabled={!coreAmount || !btcAmount || isDepositing || isDepositConfirming}
                className="w-full"
              >
                {isDepositing || isDepositConfirming ? 'Processing...' : 'Deposit'}
              </Button>
            </CardContent>
          </Card>

          {/* Withdraw Form */}
          {userShares && userShares > 0n && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Withdraw</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Shares to Withdraw</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={withdrawShares}
                    onChange={(e) => setWithdrawShares(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Max: {formatEther(userShares)} shares
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setWithdrawShares(formatEther(userShares / 2n))}
                  >
                    50%
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setWithdrawShares(formatEther(userShares))}
                  >
                    Max
                  </Button>
                </div>
                <Button 
                  onClick={handleWithdraw}
                  disabled={!withdrawShares || isWithdrawing || isWithdrawConfirming}
                  className="w-full"
                >
                  {isWithdrawing || isWithdrawConfirming ? 'Processing...' : 'Withdraw'}
                </Button>
              </CardContent>
            </Card>
          )}

          {needsRebalancing && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-sm text-yellow-700">
                    Pool ratio is off target. Rebalancing will occur on next deposit.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}