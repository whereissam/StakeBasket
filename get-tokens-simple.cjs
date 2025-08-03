const { ethers } = require('hardhat');

async function getTokensForUser() {
  console.log('🎯 Getting BASKET tokens for user...');
  
  const [deployer] = await ethers.getSigners();
  console.log('👤 Account:', deployer.address);
  
  // Get contracts
  const mockCore = await ethers.getContractAt('MockCORE', '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  const basketToken = await ethers.getContractAt('StakeBasketToken', '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707');
  const stakeBasket = await ethers.getContractAt('StakeBasket', '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853');
  
  // Check current balances
  try {
    const coreBalance = await mockCore.balanceOf(deployer.address);
    console.log('💰 CORE balance:', ethers.utils.formatEther(coreBalance));
    
    // For BASKET, we need to handle the potential error
    let basketBalance;
    try {
      basketBalance = await basketToken.balanceOf(deployer.address);
      console.log('🪙 BASKET balance:', ethers.utils.formatEther(basketBalance));
    } catch (error) {
      console.log('🪙 BASKET balance: 0 (new account)');
      basketBalance = ethers.BigNumber.from('0');
    }
    
    // If no BASKET tokens, get some by depositing CORE
    if (basketBalance.eq(0)) {
      console.log('\\n⏳ Getting BASKET tokens...');
      
      // Check if we have CORE tokens
      if (coreBalance.lt(ethers.utils.parseEther('1000'))) {
        console.log('Getting more CORE tokens first...');
        // The faucet might fail if already has enough, that's OK
        try {
          await mockCore.faucet();
        } catch (error) {
          console.log('CORE faucet:', error.reason || 'Already has tokens');
        }
      }
      
      // Approve CORE for StakeBasket
      console.log('Approving CORE tokens...');
      const approveTx = await mockCore.approve(stakeBasket.address, ethers.utils.parseEther('1000'));
      await approveTx.wait();
      
      // Deposit CORE to get BASKET (sending 1000 ETH value + 1000 CORE tokens)
      console.log('Depositing 1000 CORE + 1000 ETH to get BASKET tokens...');
      const depositTx = await stakeBasket.deposit(
        ethers.utils.parseEther('1000'),
        { value: ethers.utils.parseEther('1000') }
      );
      await depositTx.wait();
      
      // Check final balance
      const finalBalance = await basketToken.balanceOf(deployer.address);
      console.log('🎉 Final BASKET balance:', ethers.utils.formatEther(finalBalance));
    } else {
      console.log('✅ Already have BASKET tokens!');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

getTokensForUser().catch(console.error);