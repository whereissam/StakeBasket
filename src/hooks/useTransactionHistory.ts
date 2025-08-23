import { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkByChainId } from '../config/contracts'

interface Transaction {
  hash: string
  method: string
  type: 'deposit' | 'redeem' | 'other'
  timestamp: number
  value: string
  status: 'success' | 'failed'
  blockNumber: number
}

export function useTransactionHistory() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { contracts } = getNetworkByChainId(chainId)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address || !contracts.StakeBasket) return

    const fetchTransactions = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // For local Hardhat network, fetch from local RPC
        if (chainId === 31337) {
          console.log('Fetching local transaction history for address:', address)
          
          try {
            // Get latest block number
            const latestBlockResponse = await fetch('http://localhost:8545', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
              })
            })
            
            if (!latestBlockResponse.ok) {
              throw new Error('Failed to get latest block')
            }
            
            const latestBlockData = await latestBlockResponse.json()
            const latestBlock = parseInt(latestBlockData.result, 16)
            
            console.log('Latest block:', latestBlock)
            
            // Fetch last 20 blocks of transactions
            const blockPromises = []
            const startBlock = Math.max(0, latestBlock - 20)
            
            for (let i = latestBlock; i >= startBlock; i--) {
              blockPromises.push(
                fetch('http://localhost:8545', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getBlockByNumber',
                    params: [`0x${i.toString(16)}`, true],
                    id: i
                  })
                }).then(res => res.json())
              )
            }
            
            const blockResults = await Promise.all(blockPromises)
            const localTxs: Transaction[] = []
            
            blockResults.forEach((blockData) => {
              if (blockData.result && blockData.result.transactions) {
                blockData.result.transactions.forEach((tx: any) => {
                  const isFromUser = tx.from?.toLowerCase() === address?.toLowerCase()
                  const isToStakeBasket = tx.to?.toLowerCase() === contracts.StakeBasket.toLowerCase()
                  const isToBasketToken = tx.to?.toLowerCase() === contracts.StakeBasketToken.toLowerCase()
                  
                  if (isFromUser && (isToStakeBasket || isToBasketToken) && tx.hash) {
                    console.log('🔍 Processing transaction:', {
                      hash: tx.hash,
                      input: tx.input,
                      methodName: getMethodName(tx.input || '0x'),
                      type: getTransactionType(tx.input || '0x')
                    })
                    localTxs.push({
                      hash: tx.hash,
                      method: getMethodName(tx.input || '0x'),
                      type: getTransactionType(tx.input || '0x'),
                      timestamp: parseInt(blockData.result.timestamp, 16) * 1000,
                      value: tx.value || '0',
                      status: 'success', // Local transactions are typically successful if they appear in blocks
                      blockNumber: parseInt(blockData.result.number, 16)
                    })
                  }
                })
              }
            })
            
            // Sort by timestamp (newest first) and limit to 10
            localTxs.sort((a, b) => b.timestamp - a.timestamp)
            setTransactions(localTxs.slice(0, 10))
            console.log('Found local transactions:', localTxs)
            
          } catch (localError) {
            console.error('Failed to fetch local transaction history:', localError)
            setError('Failed to load local transaction history')
          }
        }
        // For Core Testnet2, fetch real transaction history
        else if (chainId === 1114) {
          const apiKey = import.meta.env.VITE_CORE_TEST2_BTCS_KEY || '6f207a377c3b41d3aa74bd6832684cc7'
          
          // Try multiple Core API endpoints for transaction history
          let data = null
          
          // Use the correct Core API endpoint
          try {
            const response = await fetch(
              `https://api.test2.btcs.network/api/accounts/list_of_txs_by_address/${address}?apikey=${apiKey}`
            )
            if (response.ok) {
              data = await response.json()
              console.log('Core list_of_txs API response:', data)
            }
          } catch (e) {
            console.log('Core list_of_txs API failed:', e)
          }
          
          // If that fails, try the etherscan-style API as fallback
          if (!data || data.status !== '1') {
            try {
              const response = await fetch(
                `https://scan.test2.btcs.network/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`
              )
              if (response.ok) {
                data = await response.json()
                console.log('Etherscan-style API response:', data)
              }
            } catch (e) {
              console.log('Etherscan-style API also failed:', e)
            }
          }
          
          if (data && data.status === '1' && data.result) {
            const transactions = Array.isArray(data.result) ? data.result : [data.result]
            
            const parsedTxs: Transaction[] = transactions
              .filter((tx: any) => {
                const isFromUser = tx.from?.toLowerCase() === address?.toLowerCase()
                const isToStakeBasket = tx.to?.toLowerCase() === contracts.StakeBasket.toLowerCase()
                const isToBasketToken = tx.to?.toLowerCase() === contracts.StakeBasketToken.toLowerCase()
                
                // Show transactions from user to StakeBasket contract or BASKET token
                return isFromUser && (isToStakeBasket || isToBasketToken)
              })
              .map((tx: any) => ({
                hash: tx.hash || '',
                method: getMethodName(tx.input || ''),
                type: getTransactionType(tx.input || ''),
                timestamp: tx.timeStamp ? Date.parse(tx.timeStamp) : Date.now(),
                value: tx.value || '0',
                status: tx.isError === '0' ? 'success' : 'failed',
                blockNumber: parseInt(tx.blockNumber || '0')
              }))
              .slice(0, 5) // Show last 5 transactions
            
            setTransactions(parsedTxs)
          } else {
            // If no transactions found, show empty array (will display the fallback message)
            setTransactions([])
          }
        }
      } catch (err) {
        console.error('Failed to fetch transaction history:', err)
        setError('Failed to load transaction history')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTransactions, 30000)
    
    return () => clearInterval(interval)
  }, [address, chainId, contracts.StakeBasket])

  return { transactions, loading, error }
}

function getMethodName(input: string): string {
  if (!input || input === '0x' || input === 'null' || input === null) return 'Deposit'
  
  const methodId = input.slice(0, 10)
  
  // Common method signatures (updated for StakeBasket contract)
  const methods: { [key: string]: string } = {
    '0xb6b55f25': 'Deposit',           // deposit()
    '0x2e1a7d4d': 'Withdraw',         // withdraw(uint256)
    '0xdb006a75': 'Redeem',           // redeem()
    '0xa9059cbb': 'Transfer',         // transfer(address,uint256)
    '0x095ea7b3': 'Approve',          // approve(address,uint256)
    '0x4a432a46': 'Get Price',        // getPrice()
    '0x6a627842': 'Mint',             // mint(address,uint256)
    '0x40c10f19': 'Mint',             // mint(address,uint256) - alternative
    '0x23b872dd': 'Transfer From',    // transferFrom(address,address,uint256)
  }
  
  return methods[methodId] || 'Deposit'
}

function getTransactionType(input: string): 'deposit' | 'redeem' | 'other' {
  if (!input || input === '0x' || input === 'null' || input === null) return 'other'
  
  const methodId = input.slice(0, 10)
  
  if (methodId === '0xb6b55f25') return 'deposit'      // deposit()
  if (methodId === '0x2e1a7d4d') return 'redeem'       // withdraw(uint256)
  if (methodId === '0xdb006a75') return 'redeem'       // redeem()
  
  return 'other'
}