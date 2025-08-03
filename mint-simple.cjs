const { ethers } = require('hardhat');

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Account:', signer.address);
  
  // Get the contract
  const basketTokenAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  const abi = [
    "function mint(address to, uint256 amount)",
    "function balanceOf(address account) view returns (uint256)"
  ];
  
  const contract = new ethers.Contract(basketTokenAddress, abi, signer);
  
  try {
    console.log('Minting 1000 BASKET tokens...');
    const tx = await contract.mint(signer.address, ethers.parseEther('1000'));
    await tx.wait();
    
    const balance = await contract.balanceOf(signer.address);
    console.log('Balance:', ethers.formatEther(balance), 'BASKET');
  } catch (error) {
    console.log('Error:', error.message);
  }
}

main();