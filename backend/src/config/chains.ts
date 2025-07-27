import { defineChain } from 'viem'

export const coreTestnet = defineChain({
  id: 1115,
  name: 'Core Testnet',
  network: 'core-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Core',
    symbol: 'tCORE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.test.btcs.network'],
    },
    public: {
      http: ['https://rpc.test.btcs.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Core Testnet Explorer',
      url: 'https://scan.test.btcs.network',
    },
  },
  testnet: true,
})

export const coreMainnet = defineChain({
  id: 1116,
  name: 'Core Mainnet',
  network: 'core',
  nativeCurrency: {
    decimals: 18,
    name: 'Core',
    symbol: 'CORE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.coredao.org'],
    },
    public: {
      http: ['https://rpc.coredao.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Core Explorer',
      url: 'https://scan.coredao.org',
    },
  },
  testnet: false,
})