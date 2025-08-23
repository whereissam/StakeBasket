import { useChainId, useAccount } from 'wagmi'
import { useEffect, useState, useMemo } from 'react'
import { validateNetwork } from '../utils/networkHandler'

export function useNetworkDetection() {
  const chainId = useChainId()
  const { isConnected } = useAccount()
  const [showNetworkModal, setShowNetworkModal] = useState(false)
  
  // Memoize validation to prevent infinite re-renders
  const validation = useMemo(() => validateNetwork(chainId), [chainId])
  
  // Show modal when connected but on wrong network (with small delay to prevent flashing)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isConnected && (!validation.isSupported || !validation.isAvailable)) {
        setShowNetworkModal(true)
      } else {
        setShowNetworkModal(false)
      }
    }, 100) // Small delay to prevent flashing during wallet connection

    return () => clearTimeout(timer)
  }, [isConnected, validation.isSupported, validation.isAvailable])
  
  const dismissModal = () => {
    setShowNetworkModal(false)
  }
  
  const shouldBlockContractCalls = isConnected && (!validation.isSupported || !validation.isAvailable)
  
  return {
    chainId,
    isConnected,
    validation,
    showNetworkModal,
    dismissModal,
    shouldBlockContractCalls,
    isOnCorrectNetwork: validation.isSupported && validation.isAvailable
  }
}