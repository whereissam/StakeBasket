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
  // Core Testnet (1114) - LATEST DEPLOYMENT 2025-08-25 (UPDATED with working contracts)
  1114: {
    dualStaking: '0x88BC8a4398a6364290933a93DcE03AAad616dC01', // NEW working StakeBasket
    btcToken: '0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7', // MockCoreBTC
    coreToken: '0xa41575D35563288d6C59d8a02603dF9E2e171eeE', // MockCORE
    basketToken: '0xE0E0b66E661068Fd4311F6fbC34c0c1eb869784F', // NEW StakeBasketToken
    priceFeed: '0x8a12e5F90279f0a5682c33D6Cab5C430B71aC80F', // NEW PriceFeed
    stakingManager: '0x148E370Cd3277c4db666bDf28d8FE8Daf0e7abf6', // NEW StakingManager
  },
  // Local development (31337) 
  31337: {
    dualStaking: '0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849', // DualStakingBasket for local development
    btcToken: '0x38a024C0b412B9d1db8BC398140D00F5Af3093D4', // MockCoreBTC for local development
    coreToken: '0x0000000000000000000000000000000000000000', // To be set
    basketToken: '0x0000000000000000000000000000000000000000', // To be set
    priceFeed: '0x0000000000000000000000000000000000000000', // To be set
    stakingManager: '0x0000000000000000000000000000000000000000', // To be set
  }
} as const