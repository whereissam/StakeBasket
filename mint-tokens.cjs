const { ethers } = require('hardhat');

async function mintTokens() {
  console.log('🪙 Minting BASKET tokens...');
  
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  
  const basketToken = await ethers.getContractAt('StakeBasketToken', '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707');
  
  // Check current balance
  const currentBalance = await basketToken.balanceOf(deployer.address);
  console.log('📊 Current BASKET balance:', ethers.utils.formatEther(currentBalance));
  
  // Mint 1000 BASKET tokens
  console.log('⏳ Minting 1000 BASKET tokens...');
  const mintAmount = ethers.utils.parseEther('1000');
  const mintTx = await basketToken.mint(deployer.address, mintAmount);
  console.log('📝 Mint tx hash:', mintTx.hash);
  
  const receipt = await mintTx.wait();
  console.log('✅ Mint successful! Gas used:', receipt.gasUsed.toString());
  
  // Check final balance
  const finalBalance = await basketToken.balanceOf(deployer.address);
  console.log('🎉 Final BASKET balance:', ethers.utils.formatEther(finalBalance));
}

mintTokens().catch(console.error);