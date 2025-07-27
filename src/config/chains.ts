import { defineChain } from 'viem'

export const coreMainnet = defineChain({
  id: 1116,
  name: 'Core Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'CORE',
    symbol: 'CORE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.coredao.org/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Core Scan',
      url: 'https://scan.coredao.org',
    },
  },
})

export const coreTestnet2 = defineChain({
  id: 1114,
  name: 'Core Testnet2',
  nativeCurrency: {
    decimals: 18,
    name: 'tCORE2',
    symbol: 'tCORE2',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.test2.btcs.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Core Testnet2 Explorer',
      url: 'https://scan.test2.btcs.network',
    },
  },
  testnet: true,
})

export const coreTestnet = defineChain({
  id: 1115,
  name: 'Core Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'tCORE',
    symbol: 'tCORE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.test.btcs.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Core Testnet Explorer',
      url: 'https://scan.test2.btcs.network',
    },
  },
  testnet: true,
})