const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Read existing deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BasketStaking with account:", deployer.address);

  // Deploy BasketStaking contract
  console.log("\nDeploying BasketStaking...");
  const BasketStaking = await ethers.getContractFactory("BasketStaking");
  const basketStaking = await BasketStaking.deploy(
    deploymentInfo.contracts.stakeBasketToken, // basketToken address
    deployer.address  // initialOwner
  );
  await basketStaking.waitForDeployment();
  const basketStakingAddress = await basketStaking.getAddress();
  
  console.log("BasketStaking deployed to:", basketStakingAddress);

  // Update deployment info
  deploymentInfo.contracts.basketStaking = basketStakingAddress;
  
  // Write updated deployment info
  fs.writeFileSync("deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\nDeployment complete!");
  console.log("BasketStaking:", basketStakingAddress);
  console.log("BASKET Token:", deploymentInfo.contracts.stakeBasketToken);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });