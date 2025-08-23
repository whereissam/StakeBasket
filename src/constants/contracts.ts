export const DUAL_STAKING_BASKET_ABI = [
  {
    inputs: [{ name: 'btcAmount', type: 'uint256' }],
    name: 'depositNativeCORE',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  }
] as const

export const CONTRACT_ADDRESSES = {
  // Core Testnet (1114)
  1114: {
    dualStaking: '0x78F398a57774429a41fA73e1CE7AC0915B37157a', // FINAL DualStaking with no timelock
    btcToken: '0x8646C9ad9FED5834d2972A5de25DcCDe1daF7F96', // NEW SimpleBTCFaucet with easy token access
  },
  // Local development (31337) 
  31337: {
    dualStaking: '0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849', // DualStakingBasket for local development
    btcToken: '0x38a024C0b412B9d1db8BC398140D00F5Af3093D4', // MockCoreBTC for local development
  }
} as const