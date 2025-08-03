const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Read deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Minting tokens for:", deployer.address);
  
  // Get contracts
  const mockCORE = await ethers.getContractAt("MockCORE", deploymentInfo.contracts.mockCORE);
  const mockCoreBTC = await ethers.getContractAt("MockCoreBTC", deploymentInfo.contracts.mockCoreBTC);
  const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentInfo.contracts.stakeBasketToken);
  
  // Mint CORE tokens (using faucet)
  console.log("Minting CORE tokens...");
  await mockCORE.faucet();
  const coreBalance = await mockCORE.balanceOf(deployer.address);
  console.log("CORE balance:", ethers.formatEther(coreBalance));
  
  // Mint coreBTC tokens (using faucet)
  console.log("Minting coreBTC tokens...");
  await mockCoreBTC.faucet();
  const coreBTCBalance = await mockCoreBTC.balanceOf(deployer.address);
  console.log("coreBTC balance:", ethers.formatEther(coreBTCBalance));
  
  // Mint BASKET tokens (this needs to be done by the owner/minter)
  console.log("Minting BASKET tokens...");
  try {
    // Try to mint 1000 BASKET tokens
    await basketToken.mint(deployer.address, ethers.parseEther("1000"));
    const basketBalance = await basketToken.balanceOf(deployer.address);
    console.log("BASKET balance:", ethers.formatEther(basketBalance));
  } catch (error) {
    console.log("Could not mint BASKET tokens:", error.message);
    console.log("BASKET token owner:", await basketToken.owner());
    console.log("StakeBasket contract:", await basketToken.stakeBasketContract());
  }
  
  console.log("\nToken balances:");
  console.log("CORE:", ethers.formatEther(await mockCORE.balanceOf(deployer.address)));
  console.log("coreBTC:", ethers.formatEther(await mockCoreBTC.balanceOf(deployer.address)));
  console.log("BASKET:", ethers.formatEther(await basketToken.balanceOf(deployer.address)));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });