const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy PriceFeed first
  console.log("\nDeploying PriceFeed...");
  const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
  const priceFeed = await PriceFeed.deploy(deployer.address);
  await priceFeed.waitForDeployment();
  const priceFeedAddress = await priceFeed.getAddress();
  console.log("PriceFeed deployed to:", priceFeedAddress);

  // Deploy StakeBasketToken
  console.log("\nDeploying StakeBasketToken...");
  const StakeBasketToken = await hre.ethers.getContractFactory("StakeBasketToken");
  const stakeBasketToken = await StakeBasketToken.deploy(
    "StakeBasket Token", // name
    "BASKET",          // symbol
    deployer.address    // initial owner
  );
  
  await stakeBasketToken.waitForDeployment();
  const stakeBasketTokenAddress = await stakeBasketToken.getAddress();
  console.log("StakeBasketToken deployed to:", stakeBasketTokenAddress);

  // Deploy StakingManager
  console.log("\nDeploying StakingManager...");
  const StakingManager = await hre.ethers.getContractFactory("StakingManager");
  // Note: Setting staking contracts to zero address for POC
  const stakingManager = await StakingManager.deploy(
    "0x0000000000000000000000000000000000000001", // placeholder for StakeBasket address
    "0x0000000000000000000000000000000000000000", // Core staking contract (not set for POC)
    "0x0000000000000000000000000000000000000000", // lstBTC contract (not set for POC)
    "0x0000000000000000000000000000000000000000", // coreBTC contract (not set for POC)
    deployer.address                                    // initial owner
  );
  await stakingManager.waitForDeployment();
  const stakingManagerAddress = await stakingManager.getAddress();
  console.log("StakingManager deployed to:", stakingManagerAddress);

  // Deploy StakeBasket
  console.log("\nDeploying StakeBasket...");
  const StakeBasket = await hre.ethers.getContractFactory("StakeBasket");
  const stakeBasket = await StakeBasket.deploy(
    stakeBasketTokenAddress, // StakeBasket token address
    stakingManagerAddress,   // StakingManager address
    priceFeedAddress,        // PriceFeed address
    deployer.address,        // fee recipient (using deployer for now)
    deployer.address         // initial owner
  );
  
  await stakeBasket.waitForDeployment();
  const stakeBasketAddress = await stakeBasket.getAddress();
  console.log("StakeBasket deployed to:", stakeBasketAddress);

  // Set StakeBasket contract in StakeBasketToken
  console.log("\nSetting StakeBasket contract in StakeBasketToken...");
  await stakeBasketToken.setStakeBasketContract(stakeBasketAddress);
  console.log("StakeBasket contract set in StakeBasketToken");

  // Update StakingManager with actual StakeBasket address
  console.log("\nUpdating StakingManager with StakeBasket address...");
  // Note: This would require updating the StakingManager constructor or adding a setter

  // Verify deployment
  console.log("\nVerifying deployment...");
  console.log("StakeBasket Token name:", await stakeBasketToken.name());
  console.log("StakeBasket Token symbol:", await stakeBasketToken.symbol());
  console.log("StakeBasket owner:", await stakeBasket.owner());
  console.log("StakeBasket Token stakeBasketContract:", await stakeBasketToken.stakeBasketContract());

  console.log("\n=== Deployment Summary ===");
  console.log("PriceFeed:", priceFeedAddress);
  console.log("StakingManager:", stakingManagerAddress);
  console.log("StakeBasketToken:", stakeBasketTokenAddress);
  console.log("StakeBasket:", stakeBasketAddress);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });