import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { useChainId } from 'wagmi'
import { useEffect } from 'react'
import { config } from '../config/wagmi'
import { useNetworkStore } from '../store/useNetworkStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Much more aggressive caching to prevent excessive calls
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount - use cache
      refetchOnReconnect: false,
      retry: 0, // Don't retry to reduce calls
      staleTime: 300000, // Consider data fresh for 5 minutes
      gcTime: 600000, // Keep in cache for 10 minutes
      refetchInterval: false, // Disable automatic polling
      refetchIntervalInBackground: false,
      networkMode: 'online'
    },
  },
})

interface Web3ProviderProps {
  children: React.ReactNode
}

// Network detection component that runs inside WagmiProvider - with debouncing
function NetworkDetector({ children }: { children: React.ReactNode }) {
  const chainId = useChainId()
  const { setChainId } = useNetworkStore()
  
  // Debounce chainId changes to prevent excessive calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setChainId(chainId)
    }, 500) // 500ms delay
    
    return () => clearTimeout(timeoutId)
  }, [chainId, setChainId])
  
  return <>{children}</>
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <NetworkDetector>
            {children}
          </NetworkDetector>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}