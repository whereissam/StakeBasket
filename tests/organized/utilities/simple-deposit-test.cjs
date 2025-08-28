const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env' });

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = deployer.address;
  
  console.log("🎯 Simple Deposit Test for DualStakingBasket");
  console.log("===========================================");
  console.log("Deployer address:", deployerAddress);
  
  // Contract addresses
  const DUAL_STAKING_BASKET = "0x9CEDb460dd32d72d9C7DB76F4D5b357dcb331f3a";
  const MOCK_CORE_TOKEN = "0xa41575D35563288d6C59d8a02603dF9E2e171eeE";
  const MOCK_BTC_TOKEN = "0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7";
  
  // Get contract instances
  const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
  const MockToken = await ethers.getContractFactory("MockERC20");
  
  const dualStaking = DualStakingBasket.attach(DUAL_STAKING_BASKET);
  const coreToken = MockToken.attach(MOCK_CORE_TOKEN);
  const btcToken = MockToken.attach(MOCK_BTC_TOKEN);
  
  // Ensure we have tokens
  console.log("\n🔄 Ensuring we have enough tokens...");
  await btcToken.mint(deployerAddress, ethers.parseEther("10"));
  console.log("✅ BTC tokens minted");
  
  // Very small test amounts first
  const coreAmount = ethers.parseEther("1");     // 1 CORE
  const btcAmount = ethers.parseEther("0.001");  // 0.001 BTC
  
  console.log("\n🎯 Testing with minimal amounts:");
  console.log(`- CORE: ${ethers.formatEther(coreAmount)} CORE`);
  console.log(`- BTC: ${ethers.formatEther(btcAmount)} BTC`);
  
  // Check balances
  const coreBalance = await coreToken.balanceOf(deployerAddress);
  const btcBalance = await btcToken.balanceOf(deployerAddress);
  console.log(`\n💰 Current Balances:`);
  console.log(`- CORE: ${ethers.formatEther(coreBalance)}`);
  console.log(`- BTC: ${ethers.formatEther(btcBalance)}`);
  
  // Approve tokens
  console.log("\n🔓 Approving tokens...");
  await coreToken.approve(DUAL_STAKING_BASKET, coreAmount);
  await btcToken.approve(DUAL_STAKING_BASKET, btcAmount);
  console.log("✅ Tokens approved");
  
  // Test deposit with error catching
  console.log("\n🚀 Attempting deposit...");
  try {
    // Try to get optimal deposit amounts first
    const usdValue = ethers.parseUnits("100", 8); // $100
    const optimalAmounts = await dualStaking.getOptimalDepositAmounts(usdValue);
    console.log("✅ Optimal amounts retrieved:");
    console.log(`- Optimal CORE: ${ethers.formatEther(optimalAmounts.coreAmount)}`);
    console.log(`- Optimal BTC: ${ethers.formatEther(optimalAmounts.btcAmount)}`);
    
  } catch (error) {
    console.log("⚠️ Could not get optimal amounts:", error.message);
  }
  
  try {
    // Estimate gas first
    const gasEstimate = await dualStaking.deposit.estimateGas(coreAmount, btcAmount);
    console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
    
    // Try the deposit
    const depositTx = await dualStaking.deposit(coreAmount, btcAmount, {
      gasLimit: Number(gasEstimate) + 50000 // Add buffer
    });
    
    console.log(`📝 Transaction hash: ${depositTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await depositTx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log("🎉 DEPOSIT SUCCESSFUL!");
    
    // Check new balances
    const newCoreBalance = await coreToken.balanceOf(deployerAddress);
    const newBtcBalance = await btcToken.balanceOf(deployerAddress);
    
    const basketTokenAddr = await dualStaking.basketToken();
    const BasketToken = await ethers.getContractFactory("StakeBasketToken");
    const basketToken = BasketToken.attach(basketTokenAddr);
    const basketBalance = await basketToken.balanceOf(deployerAddress);
    
    console.log("\n💰 New Balances:");
    console.log(`- CORE: ${ethers.formatEther(newCoreBalance)}`);
    console.log(`- BTC: ${ethers.formatEther(newBtcBalance)}`);
    console.log(`- Basket Tokens: ${ethers.formatEther(basketBalance)}`);
    
  } catch (error) {
    console.log("❌ Deposit failed:", error.message);
    
    if (error.reason) {
      console.log("Reason:", error.reason);
    }
    
    // Try to decode the error more specifically
    try {
      const result = await dualStaking.deposit.staticCall(coreAmount, btcAmount);
      console.log("✅ Static call succeeded, real tx should work");
    } catch (staticError) {
      console.log("❌ Static call also failed:", staticError.message);
      
      // Check specific requirements
      console.log("\n🔍 Checking requirements...");
      
      try {
        const paused = await dualStaking.paused();
        console.log(`- Contract paused: ${paused}`);
      } catch (e) { console.log("- Could not check paused status"); }
      
      try {
        const poolInfo = await dualStaking.getPoolInfo();
        console.log(`- Pool info accessible: true`);
      } catch (e) { 
        console.log(`- Pool info error: ${e.message}`);
      }
      
      // Check minimum deposits
      console.log("- Attempting to check minimum deposit requirements...");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });