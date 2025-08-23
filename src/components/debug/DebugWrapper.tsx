import { useChainId } from 'wagmi'
import { shouldShowDebugComponents } from '../../utils/environment'

interface DebugWrapperProps {
  children: React.ReactNode
  forceShow?: boolean
}

export function DebugWrapper({ children, forceShow = false }: DebugWrapperProps) {
  const chainId = useChainId()
  
  // Only show debug components in development or local networks
  if (!forceShow && !shouldShowDebugComponents(chainId)) {
    return null
  }
  
  return <>{children}</>
}