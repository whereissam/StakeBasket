import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { useChainId } from 'wagmi'
import { useEffect } from 'react'
import { config } from '../config/wagmi'
import { useNetworkStore } from '../store/useNetworkStore'

const queryClient = new QueryClient()

interface Web3ProviderProps {
  children: React.ReactNode
}

// Network detection component that runs inside WagmiProvider
function NetworkDetector({ children }: { children: React.ReactNode }) {
  const chainId = useChainId()
  const { setChainId } = useNetworkStore()
  
  useEffect(() => {
    setChainId(chainId)
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