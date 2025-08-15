import { defineChain } from 'viem'

export const coreTestnet2 = defineChain({
  id: 1114,
  name: 'Core Testnet2',
  network: 'core-testnet2',
  nativeCurrency: {
    decimals: 18,
    name: 'Core',
    symbol: 'tCORE2',
  },
  rpcUrls: {
    default: {
      http: ['https://rpcar.test2.btcs.network', 'https://rpc.test2.btcs.network'],
    },
    public: {
      http: ['https://rpcar.test2.btcs.network', 'https://rpc.test2.btcs.network'],
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