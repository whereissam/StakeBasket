const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Read deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Testing contract calls for:", deployer.address);
  
  // Get BasketStaking contract
  const basketStaking = await ethers.getContractAt("BasketStaking", deploymentInfo.contracts.basketStaking);
  
  console.log("\n=== Testing BasketStaking contract calls ===");
  
  try {
    console.log("1. Testing getUserStakeInfo...");
    const stakeInfo = await basketStaking.getUserStakeInfo(deployer.address);
    console.log("   Result:", stakeInfo);
    console.log("   Amount:", ethers.formatEther(stakeInfo[0]));
    console.log("   Pending Rewards:", ethers.formatEther(stakeInfo[1]));
    console.log("   Last Claim Time:", stakeInfo[2].toString());
    console.log("   Tier:", stakeInfo[3].toString());
  } catch (error) {
    console.log("   Error:", error.message);
  }
  
  try {
    console.log("\n2. Testing getUserTier...");
    const tier = await basketStaking.getUserTier(deployer.address);
    console.log("   Result:", tier.toString());
  } catch (error) {
    console.log("   Error:", error.message);
  }
  
  try {
    console.log("\n3. Testing stakeInfo mapping directly...");
    const stakeInfoDirect = await basketStaking.stakeInfo(deployer.address);
    console.log("   Result:", stakeInfoDirect);
  } catch (error) {
    console.log("   Error:", error.message);
  }
  
  try {
    console.log("\n4. Testing contract methods...");
    const methods = Object.getOwnPropertyNames(basketStaking.interface.functions);
    console.log("   Available functions:", methods);
  } catch (error) {
    console.log("   Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });