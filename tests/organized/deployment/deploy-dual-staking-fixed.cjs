require('dotenv').config({ path: '.env' });
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying DualStakingBasket with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
  
  // Use the WORKING PriceFeed with Switchboard integration
  const priceFeedAddress = "0xADBD20E27FfF3B90CF73fA5A327ce77D32138ded"; // WORKING Switchboard PriceFeed
  const stakeBasketTokenAddress = "0x6A8AcE3426e0332bbAbC632F1635214Cbf969070";
  const btcTokenAddress = "0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7"; // MockCoreBTC/SimpleBTCFaucet
  
  console.log("Using existing contracts:");
  console.log("PriceFeed:", priceFeedAddress);
  console.log("StakeBasketToken:", stakeBasketTokenAddress);
  console.log("BTC Token:", btcTokenAddress);
  
  // Deploy DualStakingBasket
  const DualStakingBasket = await hre.ethers.getContractFactory("DualStakingBasket");
  
  const dualStakingBasket = await DualStakingBasket.deploy(
    stakeBasketTokenAddress,    // _basketToken
    priceFeedAddress,           // _priceFeed  
    "0x0000000000000000000000000000000000000000", // _coreToken (null for native)
    btcTokenAddress,            // _btcToken
    "0xd7c4D6f6f0aFCABaAa3B2c514Fb1C2f62cf8326A", // _dualStakingContract (MockCoreStaking)
    deployer.address,           // _feeRecipient
    2,                          // _targetTier (Silver = 2)
    deployer.address            // initialOwner
  );
  
  await dualStakingBasket.waitForDeployment();
  const dualStakingAddress = await dualStakingBasket.getAddress();
  
  console.log("DualStakingBasket deployed to:", dualStakingAddress);
  
  // Set the DualStakingBasket as authorized minter in StakeBasketToken
  console.log("Setting DualStakingBasket as authorized minter...");
  const StakeBasketToken = await hre.ethers.getContractAt("StakeBasketToken", stakeBasketTokenAddress);
  
  try {
    await StakeBasketToken.emergencySetStakeBasketContract(dualStakingAddress);
    console.log("✅ DualStakingBasket set as authorized minter");
  } catch (error) {
    console.log("❌ Failed to set minter:", error.message);
  }
  
  // Verify the setup
  console.log("\n=== Verification ===");
  const basketTokenAddress = await dualStakingBasket.basketToken();
  const priceFeedAddr = await dualStakingBasket.priceFeed();
  const btcTokenAddr = await dualStakingBasket.btcToken();
  const coreTokenAddr = await dualStakingBasket.coreToken();
  
  console.log("Basket Token:", basketTokenAddress);
  console.log("Price Feed:", priceFeedAddr);
  console.log("BTC Token:", btcTokenAddr);
  console.log("CORE Token:", coreTokenAddr);
  
  console.log("\n=== Deployment Complete ===");
  console.log("DualStakingBasket:", dualStakingAddress);
  console.log("Ready to use for dual staking!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });