import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { hardhat, coreMainnet, coreTestnet2 } from './chains'

console.log('🔧 Wagmi Config Debug:', {
  hardhat,
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  fallback: 'demo-project-id',
  actualUsed: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id'
})

export const config = getDefaultConfig({
  appName: 'StakeBasket',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [hardhat, coreTestnet2, coreMainnet],
  ssr: false,
})