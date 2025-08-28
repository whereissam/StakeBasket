import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { hardhat, coreMainnet, coreTestnet2 } from './chains'

console.log('🔧 Wagmi Config Debug:', {
  hardhat,
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  fallback: 'demo-project-id',
  actualUsed: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id'
})

import { http } from 'wagmi'

export const config = getDefaultConfig({
  appName: 'StakeBasket',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [hardhat, coreTestnet2, coreMainnet],
  ssr: false,
  // Add custom transport configuration
  transports: {
    [hardhat.id]: http('http://localhost:8545'),
    [coreTestnet2.id]: http('https://rpc.test2.btcs.network'),
    [coreMainnet.id]: http('https://rpc.coredao.org'),
  },
  // Configure polling at the client level instead
  pollingInterval: 4_000, // 4 seconds
})