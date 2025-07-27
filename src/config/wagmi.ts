import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { coreMainnet, coreTestnet, coreTestnet2 } from './chains'
import { localhost } from 'viem/chains'

export const config = getDefaultConfig({
  appName: 'StakeBasket',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [localhost, coreTestnet2, coreTestnet, coreMainnet],
  ssr: false,
})