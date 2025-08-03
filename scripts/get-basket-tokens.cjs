const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Read deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Getting BASKET tokens for:", deployer.address);
  
  // Get contracts
  const mockCORE = await ethers.getContractAt("MockCORE", deploymentInfo.contracts.mockCORE);
  const stakeBasket = await ethers.getContractAt("StakeBasket", deploymentInfo.contracts.stakeBasket);
  const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentInfo.contracts.stakeBasketToken);
  
  console.log("Current balances:");
  console.log("CORE:", ethers.formatEther(await mockCORE.balanceOf(deployer.address)));
  console.log("BASKET:", ethers.formatEther(await basketToken.balanceOf(deployer.address)));
  
  // Use faucet to get CORE tokens first
  console.log("\nGetting CORE tokens from faucet...");
  const coreBalance = await mockCORE.balanceOf(deployer.address);
  if (coreBalance < ethers.parseEther("1000")) {
    await mockCORE.faucet();
    console.log("Got CORE tokens from faucet");
  }
  
  // Amount to deposit (1000 CORE)
  const depositAmount = ethers.parseEther("1000");
  
  console.log("\nDepositing CORE to get BASKET ETF shares...");
  
  // Approve CORE tokens to StakeBasket
  await mockCORE.approve(deploymentInfo.contracts.stakeBasket, depositAmount);
  console.log("Approved CORE tokens");
  
  // Deposit CORE tokens to get BASKET ETF shares (send ETH value equal to deposit amount)
  await stakeBasket.deposit(depositAmount, { value: depositAmount });
  console.log("Deposited CORE tokens successfully");
  
  console.log("\nFinal balances:");
  console.log("CORE:", ethers.formatEther(await mockCORE.balanceOf(deployer.address)));
  console.log("BASKET:", ethers.formatEther(await basketToken.balanceOf(deployer.address)));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });