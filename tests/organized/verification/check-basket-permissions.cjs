const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env' });

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔍 Checking StakeBasketToken Permissions");
  console.log("========================================");
  
  const BASKET_TOKEN = "0x53E7AF808A87A220E88e3627662C83e73B3C40Bc";
  const DUAL_STAKING_BASKET = "0x9CEDb460dd32d72d9C7DB76F4D5b357dcb331f3a";
  const STAKE_BASKET = "0x9675Db834f2B2209e787d0b458e195D0511305fC";
  
  const BasketToken = await ethers.getContractFactory("StakeBasketToken");
  const basketToken = BasketToken.attach(BASKET_TOKEN);
  
  console.log("📋 Contract addresses:");
  console.log(`- BasketToken: ${BASKET_TOKEN}`);
  console.log(`- DualStakingBasket: ${DUAL_STAKING_BASKET}`);
  console.log(`- StakeBasket: ${STAKE_BASKET}`);
  
  try {
    // Check current authorized contract
    const authorizedContract = await basketToken.stakeBasketContract();
    console.log(`\n🔐 Current authorized minter: ${authorizedContract}`);
    console.log(`- Is DualStakingBasket authorized? ${authorizedContract.toLowerCase() === DUAL_STAKING_BASKET.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Is StakeBasket authorized? ${authorizedContract.toLowerCase() === STAKE_BASKET.toLowerCase() ? '✅' : '❌'}`);
    
    // If DualStakingBasket is not authorized, authorize it
    if (authorizedContract.toLowerCase() !== DUAL_STAKING_BASKET.toLowerCase()) {
      console.log("\n🔧 DualStakingBasket is not authorized. Fixing...");
      
      const setContractTx = await basketToken.emergencySetStakeBasketContract(DUAL_STAKING_BASKET);
      await setContractTx.wait();
      console.log("✅ DualStakingBasket authorized as minter");
      
      // Verify the change
      const newAuthorizedContract = await basketToken.stakeBasketContract();
      console.log(`New authorized minter: ${newAuthorizedContract}`);
    } else {
      console.log("✅ DualStakingBasket is already authorized");
    }
    
    // Check owner permissions
    const owner = await basketToken.owner();
    console.log(`\n👤 BasketToken owner: ${owner}`);
    console.log(`- Is deployer the owner? ${owner.toLowerCase() === deployer.address.toLowerCase() ? '✅' : '❌'}`);
    
    // Try a test mint to see if it works
    console.log("\n🧪 Testing basket token minting...");
    try {
      // This should fail if called directly (not from authorized contract)
      await basketToken.mint.staticCall(deployer.address, ethers.parseEther("1"));
      console.log("❌ Direct mint succeeded (this shouldn't happen)");
    } catch (error) {
      console.log(`✅ Direct mint correctly failed: ${error.message.split('\n')[0]}`);
    }
    
    // Check if DualStakingBasket can mint (by calling deposit)
    console.log("\n🧪 Testing if DualStakingBasket can trigger minting...");
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const dualStaking = DualStakingBasket.attach(DUAL_STAKING_BASKET);
    
    // Update prices first to avoid stale price error
    const priceFeedAddr = await dualStaking.priceFeed();
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceFeedAddr);
    
    console.log("🔄 Updating prices...");
    await priceFeed.setPrice("CORE", ethers.parseUnits("0.4611", 8));
    await priceFeed.setPrice("BTC", ethers.parseUnits("112487.40", 8));
    console.log("✅ Prices updated");
    
    // Try deposit with very small amounts
    const coreAmount = ethers.parseEther("0.01");
    const btcAmount = ethers.parseEther("0.00001");
    
    const MockToken = await ethers.getContractFactory("MockERC20");
    const coreToken = MockToken.attach("0xa41575D35563288d6C59d8a02603dF9E2e171eeE");
    const btcToken = MockToken.attach("0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7");
    
    // Ensure approvals
    await coreToken.approve(DUAL_STAKING_BASKET, coreAmount);
    await btcToken.approve(DUAL_STAKING_BASKET, btcAmount);
    
    try {
      await dualStaking.deposit.staticCall(coreAmount, btcAmount);
      console.log("✅ DualStakingBasket deposit should work");
      
      // Try actual deposit
      console.log("🚀 Attempting actual deposit...");
      const depositTx = await dualStaking.deposit(coreAmount, btcAmount, {
        gasLimit: 500000
      });
      await depositTx.wait();
      console.log("🎉 DEPOSIT SUCCESSFUL!");
      
      // Check basket token balance
      const basketBalance = await basketToken.balanceOf(deployer.address);
      console.log(`Basket tokens received: ${ethers.formatEther(basketBalance)}`);
      
    } catch (depositError) {
      console.log(`❌ Deposit failed: ${depositError.message.split('\n')[0]}`);
      
      // Check if it's specifically a minting permission error
      if (depositError.message.includes("caller is not the StakeBasket contract")) {
        console.log("🎯 FOUND THE ISSUE: Basket token minting is restricted to StakeBasket contract only!");
        console.log("DualStakingBasket cannot mint basket tokens even though we authorized it.");
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });