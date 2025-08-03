const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Read deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Depositing CORE to get BASKET tokens for:", deployer.address);
  
  // Get contracts
  const mockCORE = await ethers.getContractAt("MockCORE", deploymentInfo.contracts.mockCORE);
  const stakeBasket = await ethers.getContractAt("StakeBasket", deploymentInfo.contracts.stakeBasket);
  const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentInfo.contracts.stakeBasketToken);
  
  // Amount to deposit (1000 CORE)
  const depositAmount = ethers.parseEther("1000");
  
  console.log("Current CORE balance:", ethers.formatEther(await mockCORE.balanceOf(deployer.address)));
  console.log("Current BASKET balance:", ethers.formatEther(await basketToken.balanceOf(deployer.address)));
  
  // Approve CORE tokens to StakeBasket
  console.log("\nApproving CORE tokens...");
  await mockCORE.approve(deploymentInfo.contracts.stakeBasket, depositAmount);
  
  // Deposit CORE tokens to get BASKET ETF shares (send ETH value equal to deposit amount)
  console.log("Depositing CORE tokens to StakeBasket...");
  await stakeBasket.deposit(depositAmount, { value: depositAmount });
  
  console.log("\nAfter deposit:");
  console.log("CORE balance:", ethers.formatEther(await mockCORE.balanceOf(deployer.address)));
  console.log("BASKET balance:", ethers.formatEther(await basketToken.balanceOf(deployer.address)));
  
  // Now mint some BASKET governance tokens for staking rewards
  console.log("\nMinting additional BASKET tokens for staking...");
  await basketToken.mint(deployer.address, ethers.parseEther("10000"));
  
  console.log("Final BASKET balance:", ethers.formatEther(await basketToken.balanceOf(deployer.address)));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });