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
        // For Core Testnet2, fetch real transaction history
        if (chainId === 1114) {
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
  if (!input || input === '0x' || input === 'null' || input === null) return 'Transfer'
  
  const methodId = input.slice(0, 10)
  
  // Common method signatures
  const methods: { [key: string]: string } = {
    '0xb6b55f25': 'Deposit',
    '0xdb006a75': 'Redeem',
    '0xa9059cbb': 'Transfer',
    '0x095ea7b3': 'Approve',
    '0x4a432a46': 'Get Price'
  }
  
  return methods[methodId] || 'Transfer'
}

function getTransactionType(input: string): 'deposit' | 'redeem' | 'other' {
  if (!input || input === '0x' || input === 'null' || input === null) return 'other'
  
  const methodId = input.slice(0, 10)
  
  if (methodId === '0xb6b55f25') return 'deposit'
  if (methodId === '0xdb006a75') return 'redeem'
  
  return 'other'
}