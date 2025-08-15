import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { parseEther } from 'viem';

interface TokenBalance {
  CORE: string;
  coreBTC: string;
  BASKET: string;
}

interface FaucetStatus {
  tokens: Array<{
    name: string;
    symbol: string;
    address: string;
    faucetAmount: string;
    maxBalance: string;
    type: string;
  }>;
  cooldownMinutes: number;
  network: string;
}

interface CooldownInfo {
  active: boolean;
  remainingMinutes: number;
}

const FaucetInterface: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  
  const [balances, setBalances] = useState<TokenBalance>({ CORE: '0', coreBTC: '0', BASKET: '0' });
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus | null>(null);
  const [cooldown, setCooldown] = useState<CooldownInfo>({ active: false, remainingMinutes: 0 });
  const [customAddress, setCustomAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingToken, setLoadingToken] = useState<string | null>(null);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash 
  });

  // Add token to MetaMask
  const addTokenToMetaMask = async (tokenAddress: string, tokenSymbol: string, tokenDecimals: number) => {
    try {
      if (!window.ethereum) {
        toast.error('MetaMask not found');
        return;
      }

      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
          },
        },
      });

      if (wasAdded) {
        toast.success(`${tokenSymbol} added to MetaMask!`);
      }
    } catch (error) {
      toast.error('Failed to add token to MetaMask');
    }
  };

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.PROD ? 'https://api.yourdomain.com' : 'http://localhost:3001');

  // Load contract addresses from deployment file (or fallback)
  const [deploymentData, setDeploymentData] = useState(null);
  
  useEffect(() => {
    // Try to load deployment data
    fetch('/deployment-data/local-deployment.json')
      .then(res => res.json())
      .then(data => setDeploymentData(data))
      .catch(() => console.log('Could not load deployment data, using fallback'));
  }, []);

  const LOCAL_CONTRACTS = deploymentData ? {
    MockCORE: deploymentData.contracts.mockCORE,
    MockCoreBTC: deploymentData.contracts.mockCoreBTC, 
    StakeBasketToken: deploymentData.contracts.stakeBasketToken,
  } : {
    MockCORE: '0x04C89607413713Ec9775E14b954286519d836FEf',
    MockCoreBTC: '0x4C4a2f8c81640e47606d3fd77B353E87Ba015584',
    StakeBasketToken: '0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2',
  };
  
  const DEPLOYER_ADDRESS = deploymentData?.deployer || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // Load ABIs dynamically (in a real app, these would be imported)
  const FAUCET_ABI = [
    {
      inputs: [],
      name: 'faucet',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  const BASKET_TOKEN_ABI = [
    {
      inputs: [
        { internalType: 'address', name: 'to', type: 'address' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' }
      ],
      name: 'mint',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'address', name: '_stakeBasketContract', type: 'address' }
      ],
      name: 'emergencySetStakeBasketContract',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'stakeBasketContract',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  // Check if we're on a supported network (Hardhat local or Core Testnet2)
  const isCorrectNetwork = chainId === 31337 || chainId === 1114;
  const isTestnet = chainId === 1114;
  const isLocalNetwork = chainId === 31337;

  useEffect(() => {
    if (!isTestnet && !isLocalNetwork) {
      fetchFaucetStatus();
    } else if (isLocalNetwork) {
      // Set local faucet status
      setFaucetStatus({
        tokens: [
          { name: 'Test Bitcoin (MockCORE)', symbol: 'testBTC', address: LOCAL_CONTRACTS.MockCORE, faucetAmount: '1', maxBalance: '100', type: 'mock' },
          { name: 'Test Bitcoin (MockCoreBTC)', symbol: 'testBTC', address: LOCAL_CONTRACTS.MockCoreBTC, faucetAmount: '1', maxBalance: '100', type: 'mock' },
          { name: 'BASKET Token', symbol: 'BASKET', address: LOCAL_CONTRACTS.StakeBasketToken, faucetAmount: '1000', maxBalance: 'unlimited', type: 'managed' }
        ],
        cooldownMinutes: 0, // No cooldown for local
        network: 'Hardhat Local (31337)'
      });
    }
  }, [isTestnet, isLocalNetwork]);

  useEffect(() => {
    if (address && isCorrectNetwork) {
      if (!isTestnet && !isLocalNetwork) {
        fetchBalances(address);
      }
      // For local and testnet, we don't fetch balances from backend
    }
  }, [address, isCorrectNetwork, isTestnet, isLocalNetwork]);

  const fetchFaucetStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/faucet/status`);
      const data = await response.json();
      
      if (data.success) {
        setFaucetStatus(data.data);
      } else {
        // Set a default status if backend fails
        setFaucetStatus({
          tokens: [],
          cooldownMinutes: 5,
          network: 'Local Network (31337)'
        });
      }
    } catch (error) {
      console.error('Failed to fetch faucet status:', error);
      // Set a default status for local development when backend is not running
      setFaucetStatus({
        tokens: [
          { name: 'CORE Token', symbol: 'CORE', address: '', faucetAmount: '100', maxBalance: '1000', type: 'erc20' },
          { name: 'coreBTC Token', symbol: 'coreBTC', address: '', faucetAmount: '1', maxBalance: '10', type: 'erc20' },
          { name: 'BASKET Token', symbol: 'BASKET', address: '', faucetAmount: '50', maxBalance: '500', type: 'erc20' }
        ],
        cooldownMinutes: 5,
        network: 'Local Network (31337)'
      });
    }
  };

  const fetchBalances = async (targetAddress: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/faucet/balances/${targetAddress}`);
      const data = await response.json();
      
      if (data.success) {
        setBalances(data.data.balances);
        setCooldown(data.data.cooldown);
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  };

  const requestTokens = async (tokenName: string, tokenAddress: string) => {
    if (isLocalNetwork) {
      // Use direct contract interaction for local network
      await requestTokensDirectly(tokenName, tokenAddress);
      return;
    }

    // Backend flow for non-local networks
    const targetAddress = customAddress || address;
    
    if (!targetAddress) {
      toast.error('Please connect wallet or enter an address');
      return;
    }

    if (!isCorrectNetwork && !customAddress) {
      toast.error('Please switch to Hardhat Local (31337) or Core Testnet2 (1114)');
      return;
    }

    setLoadingToken(token);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/faucet/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: targetAddress,
          token,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully sent ${data.data.amount} to ${data.data.recipient}`);
        // Refresh balances
        await fetchBalances(targetAddress);
      } else {
        toast.error(data.error || 'Failed to request tokens');
      }
    } catch (error) {
      toast.error('Network error: Failed to request tokens');
      console.error('Request error:', error);
    } finally {
      setLoadingToken(null);
    }
  };


  // Direct contract interaction for local network
  const requestTokensDirectly = async (tokenName: string, tokenAddress: string) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoadingToken(tokenName);
    
    try {
      if (tokenAddress === LOCAL_CONTRACTS.MockCORE || tokenAddress === LOCAL_CONTRACTS.MockCoreBTC) {
        // Both use TestBTC contract with faucet function
        writeContract({
          address: tokenAddress as `0x${string}`,
          abi: FAUCET_ABI,
          functionName: 'faucet',
        });
      } else if (tokenAddress === LOCAL_CONTRACTS.StakeBasketToken) {
        // BASKET tokens require complex setup - show instructions
        toast.error('BASKET tokens require running: npx hardhat run mint-basket-tokens.cjs --network localhost');
        setLoadingToken(null);
        return;
      }
    } catch (error) {
      toast.error('Failed to request tokens: ' + error.message);
      setLoadingToken(null);
    }
  };

  const requestAllTokens = async () => {
    if (isLocalNetwork) {
      // For local network, use direct contract calls
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }
      
      setLoading(true);
      toast.success('Requesting all tokens directly from contracts...');
      
      // Request each token sequentially
      const tokens = faucetStatus?.tokens || [];
      tokens.forEach((token, index) => {
        setTimeout(() => requestTokensDirectly(token.name, token.address), index * 1000);
      });
      
      setLoading(false);
      return;
    }

    // Backend flow for non-local networks
    const targetAddress = customAddress || address;
    
    if (!targetAddress) {
      toast.error('Please connect wallet or enter an address');
      return;
    }

    if (!isCorrectNetwork && !customAddress) {
      toast.error('Please switch to Hardhat Local (31337) or Core Testnet2 (1114)');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/faucet/request-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: targetAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const { successful, failed } = data.data;
        
        if (successful.length > 0) {
          toast.success(`Successfully received ${successful.length} token types`);
        }
        
        if (failed.length > 0) {
          failed.forEach((failure: any) => {
            toast.warning(`${failure.token}: ${failure.error}`);
          });
        }
        
        // Refresh balances
        await fetchBalances(targetAddress);
      } else {
        toast.error(data.error || 'Failed to request tokens');
      }
    } catch (error) {
      toast.error('Network error: Failed to request tokens');
      console.error('Request error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: string, decimals: number = 18): string => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.001) return '< 0.001';
    return num.toFixed(decimals === 8 ? 8 : 3);
  };

  // Transaction success handling for local and testnet
  useEffect(() => {
    if (isSuccess) {
      toast.success('Tokens claimed successfully!');
      setLoadingToken(null);
      setLoading(false);
    }
    if (error) {
      toast.error('Failed to claim tokens: ' + error.message);
      setLoadingToken(null);
      setLoading(false);
    }
  }, [isSuccess, error]);

  // For Local Network, show direct contract interaction - no backend needed
  if (isLocalNetwork) {
    return (
      <div className="space-y-6">
        {/* Network Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Network Status</h3>
              <p className="text-sm text-muted-foreground">Hardhat Local (31337)</p>
            </div>
            <Badge variant="default">Connected</Badge>
          </div>
        </Card>

        {/* Request All Tokens */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Get All Test Tokens</h3>
          <Button 
            onClick={requestAllTokens}
            disabled={loading || isPending || isConfirming || !address}
            className="w-full mb-4"
            size="lg"
          >
            {loading || isPending || isConfirming ? 'Requesting...' : 'Request All Tokens'}
          </Button>
        </Card>

        {/* Individual Token Requests */}
        {faucetStatus?.tokens.map((token, index) => (
          <Card key={`${token.address}-${index}`} className="p-4">
            <h3 className="font-medium mb-4">Get {token.name}</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Click to get {token.faucetAmount} {token.symbol} tokens directly from the contract:
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => requestTokens(token.name, token.address)}
                  disabled={
                    loadingToken === token.name || 
                    isPending || 
                    isConfirming || 
                    !address ||
                    (address === DEPLOYER_ADDRESS && token.symbol === 'testBTC') // Disable for deployer with testBTC
                  }
                  className="flex-1"
                >
                  {loadingToken === token.name || (isPending || isConfirming) ? 
                    'Claiming...' : 
                    (address === DEPLOYER_ADDRESS && token.symbol === 'testBTC') ? 
                      'Max Balance Reached' : 
                      `Get ${token.faucetAmount} ${token.symbol}`
                  }
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Use actual contract symbols and decimals
                    const decimals = token.symbol === 'testBTC' ? 8 : 18;
                    addTokenToMetaMask(token.address, token.symbol, decimals);
                  }}
                  className="whitespace-nowrap"
                >
                  Add to MetaMask
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Contract: {token.address}</p>
                <p>Direct contract interaction - no cooldowns!</p>
              </div>
            </div>
          </Card>
        ))}

        {/* Transaction Status */}
        {hash && (
          <Card className="p-4">
            <h3 className="font-medium mb-2">Transaction Status</h3>
            <div className="space-y-2">
              <p className="text-sm">
                {isConfirming ? 'Confirming transaction...' : 'Transaction sent!'}
              </p>
              <p className="text-xs text-muted-foreground break-all">
                Hash: {hash}
              </p>
              {isSuccess && (
                <Badge variant="default">Success</Badge>
              )}
            </div>
          </Card>
        )}

        {/* Information */}
        <Card className="p-4">
          <h3 className="font-medium mb-2">Local Development Info</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Direct contract interaction - no backend needed</li>
            <li>• testBTC tokens: 1 BTC per claim, 100 BTC max balance</li>
            <li>• testBTC faucet: Works with any wallet (except deployer - already has max)</li>
            <li>• BASKET: Requires special minting script (see below)</li>
          </ul>
          
          {address === DEPLOYER_ADDRESS && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> Deployer account already has 1000 testBTC (max is 100). 
                <br />Switch to a different account to use the testBTC faucets, or transfer some tokens manually.
              </p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800 font-medium mb-2">🧺 To get BASKET tokens:</p>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Open terminal in the project root</li>
              <li>2. Run: <code className="bg-blue-100 px-1 rounded">npx hardhat run mint-basket-tokens.cjs --network localhost</code></li>
              <li>3. BASKET tokens will be minted to the deployer account</li>
              <li>4. You can then transfer some to other accounts for testing</li>
            </ol>
          </div>
          
          {address !== DEPLOYER_ADDRESS && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> To mint BASKET tokens, please import the deployer account:
                <br />
                <code className="text-xs bg-yellow-100 px-1 rounded">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</code>
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // For Core Testnet, show direct contract interaction - no backend needed
  if (isTestnet) {
    return (
      <div className="space-y-6">
        {/* Network Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Network Status</h3>
              <p className="text-sm text-muted-foreground">Core Testnet2 (1114)</p>
            </div>
            <Badge variant="default">Connected</Badge>
          </div>
        </Card>

        {/* CORE Tokens */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Get CORE Tokens</h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Get CORE tokens from the official Core Testnet faucet:
            </p>
            <Button 
              onClick={() => window.open('https://scan.test2.btcs.network/faucet', '_blank')}
              className="w-full"
            >
              Open Core Testnet Faucet
            </Button>
            <div className="text-xs text-muted-foreground">
              <p>Official testnet faucet provides CORE tokens</p>
            </div>
          </div>
        </Card>

        {/* MockCORE Tokens */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Claim MockCORE Tokens</h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Claim 1000 MockCORE tokens (ERC-20) for dual staking:
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (!address) {
                    toast.error('Please connect your wallet');
                    return;
                  }
                  writeContract({
                    address: '0xFb9c7Fb19351316B48eaD2c96E19880Cabc1BbC1', // MockCORE contract
                    abi: [{
                      inputs: [],
                      name: 'faucet',
                      outputs: [],
                      stateMutability: 'nonpayable',
                      type: 'function',
                    }],
                    functionName: 'faucet',
                  });
                }}
                disabled={isPending || isConfirming || !address}
                className="flex-1"
              >
                {isPending || isConfirming ? 'Claiming...' : 'Claim 1000 MockCORE'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => addTokenToMetaMask('0xFb9c7Fb19351316B48eaD2c96E19880Cabc1BbC1', 'MockCORE', 18)}
                className="whitespace-nowrap"
              >
                Add to MetaMask
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>MockCORE: 0xFb9c7Fb19351316B48eaD2c96E19880Cabc1BbC1</p>
              <p>ERC-20 CORE tokens for dual staking contracts</p>
            </div>
          </div>
        </Card>

        {/* BTC Tokens */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Claim Test BTC Tokens</h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Claim 1 sBTC from the simple faucet contract (no limits):
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (!address) {
                    toast.error('Please connect your wallet');
                    return;
                  }
                  writeContract({
                    address: '0x213db03D2D75979360FcE41CDbeEcbc903D1BD30', // SimpleBTCFaucet contract
                    abi: [{
                      inputs: [],
                      name: 'faucet',
                      outputs: [],
                      stateMutability: 'nonpayable',
                      type: 'function',
                    }],
                    functionName: 'faucet',
                  });
                }}
                disabled={isPending || isConfirming || !address}
                className="flex-1"
              >
                {isPending || isConfirming ? 'Claiming...' : 'Claim 1 sBTC'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => addTokenToMetaMask('0x213db03D2D75979360FcE41CDbeEcbc903D1BD30', 'sBTC', 8)}
                className="whitespace-nowrap"
              >
                Add to MetaMask
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>SimpleBTC: 0x213db03D2D75979360FcE41CDbeEcbc903D1BD30</p>
              <p>Unlimited claims, no cooldown - perfect for testing!</p>
            </div>
          </div>
        </Card>

        {/* BASKET Tokens */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Get BASKET Tokens</h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              BASKET tokens are earned by depositing CORE tokens into the StakeBasket contract:
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (!address) {
                    toast.error('Please connect your wallet');
                    return;
                  }
                  // Call deposit function with 1 CORE token (using correct address)
                  writeContract({
                    address: '0x13F8b7693445c180Ec11f211d9Af425920B795Af', // StakeBasket contract (now matches)
                    abi: [{
                      inputs: [{ name: 'amount', type: 'uint256' }],
                      name: 'deposit',
                      outputs: [],
                      stateMutability: 'nonpayable',
                      type: 'function',
                    }],
                    functionName: 'deposit',
                    args: [parseEther('1')], // Deposit 1 CORE token
                  });
                }}
                disabled={isPending || isConfirming || !address}
                className="flex-1"
              >
                {isPending || isConfirming ? 'Depositing...' : 'Deposit 1 CORE → Get BASKET'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => addTokenToMetaMask('0x78B9B8e98d3df0F05cB0f7790524fB1432d430fD', 'BASKET', 18)} // Correct BASKET token address
                className="whitespace-nowrap"
              >
                Add to MetaMask
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>StakeBasket: 0x13F8b7693445c180Ec11f211d9Af425920B795Af</p>
              <p>Note: You need CORE tokens first!</p>
            </div>
          </div>
        </Card>

        {/* Transaction Status */}
        {hash && (
          <Card className="p-4">
            <h3 className="font-medium mb-2">Transaction Status</h3>
            <div className="space-y-2">
              <p className="text-sm">
                {isConfirming ? 'Confirming transaction...' : 'Transaction sent!'}
              </p>
              <p className="text-xs text-muted-foreground break-all">
                Hash: {hash}
              </p>
              {isSuccess && (
                <Badge variant="default">Success</Badge>
              )}
            </div>
          </Card>
        )}

        {/* Information */}
        <Card className="p-4">
          <h3 className="font-medium mb-2">How to Use</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Connect your wallet to Core Testnet2</li>
            <li>• Click the claim buttons to get test tokens</li>
            <li>• Replace BTC contract address with your deployed address</li>
            <li>• Make sure your contracts have faucet() functions</li>
          </ul>
        </Card>
      </div>
    );
  }

  if (!faucetStatus) {
    return (
      <Card className="p-6">
        <div className="text-center">Loading faucet...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Network Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Network Status</h3>
            <p className="text-sm text-muted-foreground">{faucetStatus.network}</p>
          </div>
          <Badge variant={isCorrectNetwork ? "default" : "destructive"}>
            {isCorrectNetwork ? "Connected" : "Wrong Network"}
          </Badge>
        </div>
      </Card>

      {/* Custom Address Input */}
      <Card className="p-4">
        <div className="space-y-3">
          <h3 className="font-medium">Target Address</h3>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter address (leave empty to use connected wallet)"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (customAddress) {
                  fetchBalances(customAddress);
                } else if (address) {
                  fetchBalances(address);
                }
              }}
              disabled={!customAddress && !address}
            >
              Check Balance
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Current target: {customAddress || address || 'Not connected'}
          </p>
        </div>
      </Card>

      {/* Current Balances */}
      {(address || customAddress) && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Current Balances</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatBalance(balances.CORE)}</div>
              <div className="text-sm text-muted-foreground">CORE</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatBalance(balances.coreBTC, 8)}</div>
              <div className="text-sm text-muted-foreground">coreBTC</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatBalance(balances.BASKET)}</div>
              <div className="text-sm text-muted-foreground">BASKET</div>
            </div>
          </div>
        </Card>
      )}

      {/* Cooldown Status */}
      {cooldown.active && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Cooldown Active</Badge>
            <span className="text-sm">
              Try again in {cooldown.remainingMinutes} minutes
            </span>
          </div>
        </Card>
      )}

      {/* Token Faucets */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">Request Test Tokens</h3>
        
        <div className="space-y-4">
          {/* Request All Button */}
          <Button
            onClick={requestAllTokens}
            disabled={loading || cooldown.active || (!address && !customAddress)}
            className="w-full"
            size="lg"
          >
            {loading ? 'Requesting All Tokens...' : 'Request All Tokens'}
          </Button>

          {/* Individual Token Requests */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {faucetStatus.tokens.map((token) => (
              <div key={token.symbol} className="border rounded-lg p-4">
                <div className="text-center space-y-2">
                  <h4 className="font-medium">{token.name}</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Get: {token.faucetAmount} {token.symbol}</div>
                    <div>Max: {token.maxBalance} {token.symbol}</div>
                  </div>
                  <Button
                    onClick={() => requestTokens(token.symbol)}
                    disabled={loadingToken === token.symbol || cooldown.active || (!address && !customAddress)}
                    size="sm"
                    className="w-full"
                  >
                    {loadingToken === token.symbol ? 'Requesting...' : `Get ${token.symbol}`}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Information */}
      <Card className="p-4">
        <h3 className="font-medium mb-2">How it works</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          {chainId === 31337 ? (
            <>
              <li>• CORE & coreBTC: Built-in faucet functions with balance limits</li>
              <li>• BASKET: Minted by the faucet service (no balance limit)</li>
            </>
          ) : (
            <>
              <li>• BASKET: Minted by the faucet service for testnet testing</li>
              <li>• CORE: Use real testnet CORE from faucet.btcs.network</li>
              <li>• coreBTC: Not available (production deployment)</li>
            </>
          )}
          <li>• {faucetStatus.cooldownMinutes} minute cooldown between requests</li>
          <li>• Works on Hardhat Local (31337) and Core Testnet2 (1114)</li>
          <li>• You can request tokens for any address</li>
        </ul>
      </Card>
    </div>
  );
};

export default FaucetInterface;