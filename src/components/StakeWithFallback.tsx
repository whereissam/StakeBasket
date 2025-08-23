import { useState } from 'react'
import { usePriceFeedStatus } from '../hooks/usePriceFeedStatus'
import { PriceFeedFallback } from './PriceFeedFallback'
import { useChainId } from 'wagmi'

interface StakeWithFallbackProps {
  children: React.ReactNode
}

export function StakeWithFallback({ children }: StakeWithFallbackProps) {
  const chainId = useChainId()
  const priceFeedStatus = usePriceFeedStatus()
  const [userAcceptedFallback, setUserAcceptedFallback] = useState(false)
  
  // If price feed is working or user has accepted fallback, show normal staking
  if (!priceFeedStatus.hasError || userAcceptedFallback) {
    return <>{children}</>
  }
  
  // Show the price feed fallback warning
  return (
    <div className="space-y-4">
      <PriceFeedFallback
        priceError={priceFeedStatus.hasError}
        onProceedAnyway={() => setUserAcceptedFallback(true)}
        chainId={chainId}
      />
      
      {/* Grayed out staking form behind the warning */}
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  )
}