require('dotenv').config({ path: '.env' })
const { ethers } = require('hardhat')

async function checkAllowances() {
  console.log('🔍 Checking Token Allowances')
  console.log('============================\n')
  
  const [deployer] = await ethers.getSigners()
  console.log('Account:', deployer.address)
  
  // Contract addresses
  const dualStakingAddress = "0x468049459476d3733476bA8550dE4881dc623078"  // StakeBasket from deployment
  const btcTokenAddress = "0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7"      // MockCoreBTC
  
  // Get BTC token contract
  const MockCoreBTC = await ethers.getContractFactory('MockCoreBTC')
  const btcToken = MockCoreBTC.attach(btcTokenAddress)
  
  try {
    // Check current allowance
    const allowance = await btcToken.allowance(deployer.address, dualStakingAddress)
    const balance = await btcToken.balanceOf(deployer.address)
    
    console.log('📊 Current Token Status:')
    console.log(`BTC Balance: ${ethers.formatEther(balance)} BTC`)
    console.log(`BTC Allowance: ${ethers.formatEther(allowance)} BTC`)
    console.log('')
    
    console.log('🎯 Approval Scenarios:')
    console.log('======================')
    
    const testAmounts = ['0.1', '1.0', '5.0', '10.0', '15.0']
    
    for (const amount of testAmounts) {
      const amountWei = ethers.parseEther(amount)
      const needsApproval = allowance < amountWei
      const status = needsApproval ? '❌ NEEDS APPROVAL' : '✅ ALREADY APPROVED'
      
      console.log(`Stake ${amount} BTC: ${status}`)
    }
    
    console.log('\n💡 This explains why you don\'t see the BTC approval button!')
    console.log('Your allowance (10.0 BTC) covers most staking amounts.')
    
    if (allowance > 0n) {
      console.log('\n🔧 To test the approval flow:')
      console.log('1. Try staking > 10.0 BTC OR')
      console.log('2. Reset allowance to 0 (for testing)')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkAllowances().catch(console.error)