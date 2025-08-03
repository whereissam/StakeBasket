const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Read deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Checking balances for:", deployer.address);
  
  // Get contracts
  const mockCORE = await ethers.getContractAt("MockCORE", deploymentInfo.contracts.mockCORE);
  const mockCoreBTC = await ethers.getContractAt("MockCoreBTC", deploymentInfo.contracts.mockCoreBTC);
  const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentInfo.contracts.stakeBasketToken);
  
  console.log("\nCurrent balances:");
  console.log("CORE:", ethers.formatEther(await mockCORE.balanceOf(deployer.address)));
  console.log("coreBTC:", ethers.formatEther(await mockCoreBTC.balanceOf(deployer.address)));
  console.log("BASKET:", ethers.formatEther(await basketToken.balanceOf(deployer.address)));
  
  console.log("\nContract info:");
  console.log("BASKET token owner:", await basketToken.owner());
  console.log("StakeBasket contract set in BASKET token:", await basketToken.stakeBasketContract());
  console.log("StakeBasket address:", deploymentInfo.contracts.stakeBasket);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });