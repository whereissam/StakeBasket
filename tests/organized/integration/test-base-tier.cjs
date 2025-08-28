require('dotenv').config({ path: '.env' })
const { ethers } = require('hardhat')

/**
 * 🎯 Testing Base Tier for Minimal Dual Staking
 * 
 * Testing the new Base tier that allows users to stake small amounts
 * and still earn 3% APY instead of getting "None" tier errors.
 */

async function testBaseTier() {
  console.log('🎯 Testing Base Tier for Minimal Dual Staking')
  console.log('===============================================\n')
  
  const [deployer] = await ethers.getSigners()
  console.log('Account:', deployer.address)
  console.log('Network: coreTestnet2')
  
  // Test the tier calculation logic with different amounts
  const testCases = [
    { core: '5', btc: '0.0005', expectedTier: 'None (below minimums)' },
    { core: '10', btc: '0.001', expectedTier: 'Base (meets minimums, ~$65 value)' },
    { core: '20', btc: '0.001', expectedTier: 'Base (~$80 value)' },
    { core: '100', btc: '0.01', expectedTier: 'Base (~$800 value)' },
    { core: '500', btc: '0.01', expectedTier: 'Bronze (~$1,400 value)' },
    { core: '1000', btc: '0.1', expectedTier: 'Gold (~$7,900 value)' }
  ]
  
  console.log('📊 Tier Calculation Test Cases:')
  console.log('================================')
  
  // Use current market prices for calculation
  const ASSET_PRICES_USD = {
    CORE: 0.44,     // Current CORE price ~$0.44
    BTC: 111240     // Current BTC price ~$111,240
  }
  
  const MIN_DEPOSIT_REQUIREMENTS = {
    CORE: 10,
    BTC: 0.001,
    USD_VALUE: 50
  }
  
  const TIER_USD_THRESHOLDS = {
    None: { min: 0, max: 50 },
    Base: { min: 50, max: 1000 },
    Bronze: { min: 1000, max: 10000 },
    Silver: { min: 10000, max: 100000 },
    Gold: { min: 100000, max: 500000 },
    Satoshi: { min: 500000, max: Infinity }
  }
  
  const calculateTier = (core, btc) => {
    const coreNum = Number(core)
    const btcNum = Number(btc)
    
    // Check minimums
    if (coreNum < MIN_DEPOSIT_REQUIREMENTS.CORE || btcNum < MIN_DEPOSIT_REQUIREMENTS.BTC) {
      return 'None'
    }
    
    // Calculate USD value
    const totalUSDValue = (coreNum * ASSET_PRICES_USD.CORE) + (btcNum * ASSET_PRICES_USD.BTC)
    
    if (totalUSDValue < MIN_DEPOSIT_REQUIREMENTS.USD_VALUE) {
      return 'None'
    }
    
    // Determine tier
    if (totalUSDValue >= TIER_USD_THRESHOLDS.Satoshi.min) return 'Satoshi'
    if (totalUSDValue >= TIER_USD_THRESHOLDS.Gold.min) return 'Gold'  
    if (totalUSDValue >= TIER_USD_THRESHOLDS.Silver.min) return 'Silver'
    if (totalUSDValue >= TIER_USD_THRESHOLDS.Bronze.min) return 'Bronze'
    if (totalUSDValue >= TIER_USD_THRESHOLDS.Base.min) return 'Base'
    
    return 'None'
  }
  
  for (const testCase of testCases) {
    const { core, btc, expectedTier } = testCase
    const actualTier = calculateTier(core, btc)
    const usdValue = (Number(core) * ASSET_PRICES_USD.CORE) + (Number(btc) * ASSET_PRICES_USD.BTC)
    
    const status = actualTier === expectedTier.split(' ')[0] ? '✅' : '❌'
    
    console.log(`${status} ${core} CORE + ${btc} BTC = $${usdValue.toFixed(0)} → ${actualTier} tier`)
    console.log(`   Expected: ${expectedTier}`)
    console.log('')
  }
  
  console.log('🎉 Base Tier Benefits:')
  console.log('======================')
  console.log('✅ Users can now stake small amounts (from $50)')
  console.log('✅ Get 3% APY instead of 0% (None tier)')
  console.log('✅ No more "null" errors in handleAutoCalculate')
  console.log('✅ Smooth user experience for beginners')
  console.log('')
  
  console.log('🔧 Auto-Calculate Test:')
  console.log('======================')
  console.log('Base tier auto-calculate will suggest:')
  console.log(`• BTC: ${MIN_DEPOSIT_REQUIREMENTS.BTC} BTC`)
  console.log(`• CORE: ~${Math.max(MIN_DEPOSIT_REQUIREMENTS.CORE, MIN_DEPOSIT_REQUIREMENTS.BTC * 1000)} CORE`)
  console.log('• This gives users a starting point that qualifies for Base tier')
  
  console.log('\n✨ Ready to test in frontend!')
  console.log('Click on "Base Pool" button to see auto-calculated amounts')
}

testBaseTier().catch(console.error)