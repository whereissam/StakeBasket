import { Hono } from 'hono'
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'
import { NETWORKS } from '../config/contracts'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import { rateLimit } from '../middleware/auth'
import { validateBody, faucetRequestSchema, sanitizeAddress } from '../middleware/validation'

const faucet = new Hono()

// Mock token ABIs - minimal interface for faucet functionality
const MOCK_TOKEN_ABI = [
  {
    inputs: [],
    name: 'faucet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const BASKET_TOKEN_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Initialize clients
const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
})

// Create wallet client with private key from environment
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY
if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error('DEPLOYER_PRIVATE_KEY or PRIVATE_KEY environment variable is required')
}
const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`)

const walletClient = createWalletClient({
  account,
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
})

// Rate limiting - simple in-memory store
const faucetCooldowns = new Map<string, number>()
const COOLDOWN_MINUTES = 5

function isOnCooldown(address: string): boolean {
  const lastRequest = faucetCooldowns.get(address.toLowerCase())
  if (!lastRequest) return false
  
  const now = Date.now()
  const cooldownTime = COOLDOWN_MINUTES * 60 * 1000
  return (now - lastRequest) < cooldownTime
}

function setCooldown(address: string) {
  faucetCooldowns.set(address.toLowerCase(), Date.now())
}

function getRemainingCooldown(address: string): number {
  const lastRequest = faucetCooldowns.get(address.toLowerCase())
  if (!lastRequest) return 0
  
  const now = Date.now()
  const cooldownTime = COOLDOWN_MINUTES * 60 * 1000
  const remaining = cooldownTime - (now - lastRequest)
  return Math.max(0, Math.ceil(remaining / 1000 / 60)) // Return minutes
}

// Helper function to get current network configuration
function getCurrentNetwork() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const network = process.env.NETWORK || 'hardhat'
  
  if (nodeEnv === 'production' || network === 'coreTestnet2') {
    return {
      key: 'coreTestnet2' as keyof typeof CONTRACT_ADDRESSES,
      config: NETWORKS.coreTestnet2,
      contracts: CONTRACT_ADDRESSES.coreTestnet2
    }
  }
  
  return {
    key: 'hardhat' as keyof typeof CONTRACT_ADDRESSES,
    config: NETWORKS.hardhat,
    contracts: CONTRACT_ADDRESSES.hardhat
  }
}

// Get faucet status and available tokens
faucet.get('/status', async (c) => {
  try {
    const { key, config, contracts } = getCurrentNetwork()
    
    let tokens = []
    
    if (key === 'hardhat') {
      // Hardhat network with mock tokens
      tokens = [
        {
          name: 'CORE',
          symbol: 'CORE',
          address: contracts.MockCORE,
          faucetAmount: '100',
          maxBalance: '1000',
          type: 'mock'
        },
        {
          name: 'coreBTC',
          symbol: 'coreBTC',
          address: contracts.MockCoreBTC,
          faucetAmount: '1',
          maxBalance: '10',
          type: 'mock'
        },
        {
          name: 'BASKET',
          symbol: 'BASKET',
          address: contracts.StakeBasketToken,
          faucetAmount: '1000',
          maxBalance: 'unlimited',
          type: 'managed'
        }
      ]
    } else {
      // Core Testnet2 with production contracts
      tokens = [
        {
          name: 'BASKET',
          symbol: 'BASKET',
          address: contracts.StakeBasketToken,
          faucetAmount: '500',
          maxBalance: 'unlimited',
          type: 'managed'
        }
      ]
    }

    return c.json({
      success: true,
      data: {
        tokens,
        cooldownMinutes: COOLDOWN_MINUTES,
        network: `${config.name} (${config.chainId})`
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Check user balances (rate limited)
faucet.get('/balances/:address', rateLimit(10, 60000), async (c) => {
  try {
    const rawAddress = c.req.param('address')
    const address = sanitizeAddress(rawAddress) as `0x${string}`
    
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ success: false, error: 'Invalid address format' }, 400)
    }

    // Get balances for all tokens
    const [coreBalance, coreBTCBalance, basketBalance] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.hardhat.MockCORE as `0x${string}`,
        abi: MOCK_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.hardhat.MockCoreBTC as `0x${string}`,
        abi: MOCK_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.hardhat.StakeBasketToken as `0x${string}`,
        abi: BASKET_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
    ])

    const balances = {
      CORE: formatEther(coreBalance),
      coreBTC: (Number(coreBTCBalance) / 10**8).toString(), // coreBTC has 8 decimals
      BASKET: formatEther(basketBalance),
    }

    const remainingCooldown = getRemainingCooldown(address)
    const onCooldown = isOnCooldown(address)

    return c.json({
      success: true,
      data: {
        address,
        balances,
        cooldown: {
          active: onCooldown,
          remainingMinutes: remainingCooldown,
        }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Request tokens from faucet (rate limited and validated)
faucet.post('/request', 
  rateLimit(3, 300000), // 3 requests per 5 minutes
  validateBody(faucetRequestSchema),
  async (c) => {
    try {
      const validatedBody = c.get('validatedBody')
      const { address: rawAddress, token } = validatedBody
      const address = sanitizeAddress(rawAddress) as `0x${string}`
      
      if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
        return c.json({ success: false, error: 'Invalid address format' }, 400)
      }

    if (!token || !['CORE', 'coreBTC', 'BASKET'].includes(token)) {
      return c.json({ success: false, error: 'Invalid token. Must be CORE, coreBTC, or BASKET' }, 400)
    }

    // Check cooldown
    if (isOnCooldown(address)) {
      const remainingMinutes = getRemainingCooldown(address)
      return c.json({ 
        success: false, 
        error: `Faucet on cooldown. Try again in ${remainingMinutes} minutes.` 
      }, 429)
    }

    let txHash: string
    let amount: string

    if (token === 'CORE') {
      // Use CORE faucet
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.hardhat.MockCORE as `0x${string}`,
        abi: MOCK_TOKEN_ABI,
        functionName: 'faucet',
        account: address as `0x${string}`,
      })
      txHash = hash
      amount = '100 CORE'
    } else if (token === 'coreBTC') {
      // Use coreBTC faucet
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.hardhat.MockCoreBTC as `0x${string}`,
        abi: MOCK_TOKEN_ABI,
        functionName: 'faucet',
        account: address as `0x${string}`,
      })
      txHash = hash
      amount = '1 coreBTC'
    } else if (token === 'BASKET') {
      // Mint BASKET tokens (requires owner privileges)
      const mintAmount = parseEther('1000')
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.hardhat.StakeBasketToken as `0x${string}`,
        abi: BASKET_TOKEN_ABI,
        functionName: 'mint',
        args: [address as `0x${string}`, mintAmount],
      })
      txHash = hash
      amount = '1000 BASKET'
    }

    // Set cooldown for this address
    setCooldown(address)

    return c.json({
      success: true,
      data: {
        token,
        amount,
        recipient: address,
        txHash,
        message: `Successfully sent ${amount} to ${address}`
      }
    })

  } catch (error) {
    console.error('Faucet request error:', error)
    
    // Handle specific contract errors
    if (error.message.includes('Already has enough tokens')) {
      return c.json({ 
        success: false, 
        error: 'You already have enough tokens. Use existing balance or wait for it to decrease.' 
      }, 400)
    }
    
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to send tokens' 
    }, 500)
  }
})

// Request all tokens at once
faucet.post('/request-all', async (c) => {
  try {
    const { address } = await c.req.json()
    
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ success: false, error: 'Invalid address format' }, 400)
    }

    // Check cooldown
    if (isOnCooldown(address)) {
      const remainingMinutes = getRemainingCooldown(address)
      return c.json({ 
        success: false, 
        error: `Faucet on cooldown. Try again in ${remainingMinutes} minutes.` 
      }, 429)
    }

    const results = []
    const errors = []

    // Try to get CORE tokens
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.hardhat.MockCORE as `0x${string}`,
        abi: MOCK_TOKEN_ABI,
        functionName: 'faucet',
        account: address as `0x${string}`,
      })
      results.push({ token: 'CORE', amount: '100 CORE', txHash: hash })
    } catch (error) {
      errors.push({ token: 'CORE', error: error.message })
    }

    // Try to get coreBTC tokens
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.hardhat.MockCoreBTC as `0x${string}`,
        abi: MOCK_TOKEN_ABI,
        functionName: 'faucet',
        account: address as `0x${string}`,
      })
      results.push({ token: 'coreBTC', amount: '1 coreBTC', txHash: hash })
    } catch (error) {
      errors.push({ token: 'coreBTC', error: error.message })
    }

    // Try to mint BASKET tokens
    try {
      const mintAmount = parseEther('1000')
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.hardhat.StakeBasketToken as `0x${string}`,
        abi: BASKET_TOKEN_ABI,
        functionName: 'mint',
        args: [address as `0x${string}`, mintAmount],
      })
      results.push({ token: 'BASKET', amount: '1000 BASKET', txHash: hash })
    } catch (error) {
      errors.push({ token: 'BASKET', error: error.message })
    }

    // Set cooldown regardless of success/failure
    setCooldown(address)

    return c.json({
      success: results.length > 0,
      data: {
        recipient: address,
        successful: results,
        failed: errors,
        message: `Processed ${results.length + errors.length} token requests. ${results.length} successful, ${errors.length} failed.`
      }
    })

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to process faucet requests' 
    }, 500)
  }
})

export { faucet as faucetRoutes }