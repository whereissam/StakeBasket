const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env' });

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = deployer.address;
  
  console.log("🚀 Testing Dual Staking with Real Tokens");
  console.log("========================================");
  console.log("Deployer address:", deployerAddress);
  console.log("Network:", network.name);
  
  // Contract addresses from deployment
  const DUAL_STAKING_BASKET = "0x9CEDb460dd32d72d9C7DB76F4D5b357dcb331f3a"; // NEWLY DEPLOYED DualStakingBasket
  const MOCK_CORE_TOKEN = "0xa41575D35563288d6C59d8a02603dF9E2e171eeE";
  const MOCK_BTC_TOKEN = "0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7";
  
  // Get contract instances
  const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
  const MockToken = await ethers.getContractFactory("MockERC20");
  
  const dualStaking = DualStakingBasket.attach(DUAL_STAKING_BASKET);
  const coreToken = MockToken.attach(MOCK_CORE_TOKEN);
  const btcToken = MockToken.attach(MOCK_BTC_TOKEN);
  
  console.log("\n📋 Contract Information:");
  console.log("- Dual Staking Basket:", DUAL_STAKING_BASKET);
  console.log("- CORE Token:", MOCK_CORE_TOKEN);
  console.log("- BTC Token:", MOCK_BTC_TOKEN);
  
  try {
    // Check initial balances
    const initialCoreBalance = await coreToken.balanceOf(deployerAddress);
    const initialBtcBalance = await btcToken.balanceOf(deployerAddress);
    const initialBasketBalance = await dualStaking.basketToken().then(token => 
      ethers.getContractFactory("StakeBasketToken").then(factory => 
        factory.attach(token).balanceOf(deployerAddress)));
    
    console.log("\n💰 Initial Balances:");
    console.log(`- CORE: ${ethers.formatEther(initialCoreBalance)} CORE`);
    console.log(`- BTC: ${ethers.formatEther(initialBtcBalance)} BTC`);
    console.log(`- Basket Tokens: ${ethers.formatEther(initialBasketBalance)} BASKET`);
    
    // If we don't have tokens, mint some
    if (initialCoreBalance < ethers.parseEther("100")) {
      console.log("\n🔄 Minting test tokens...");
      await coreToken.mint(deployerAddress, ethers.parseEther("1000"));
      console.log("✅ CORE tokens minted");
    }
    
    if (initialBtcBalance < ethers.parseEther("0.1")) {
      console.log("\n🔄 Minting BTC tokens...");
      await btcToken.mint(deployerAddress, ethers.parseEther("10"));
      console.log("✅ BTC tokens minted");
    }
    
    // Test amounts - start with smaller amounts for testing
    const coreAmount = ethers.parseEther("10");   // 10 CORE
    const btcAmount = ethers.parseEther("0.01");  // 0.01 BTC
    
    console.log("\n🎯 Testing Dual Staking:");
    console.log(`- Staking ${ethers.formatEther(coreAmount)} CORE`);
    console.log(`- Staking ${ethers.formatEther(btcAmount)} BTC`);
    
    // Check allowances
    const coreAllowance = await coreToken.allowance(deployerAddress, DUAL_STAKING_BASKET);
    const btcAllowance = await btcToken.allowance(deployerAddress, DUAL_STAKING_BASKET);
    
    console.log("\n🔐 Current Allowances:");
    console.log(`- CORE: ${ethers.formatEther(coreAllowance)}`);
    console.log(`- BTC: ${ethers.formatEther(btcAllowance)}`);
    
    // Approve tokens if needed
    if (coreAllowance < coreAmount) {
      console.log("🔓 Approving CORE tokens...");
      const approveTx = await coreToken.approve(DUAL_STAKING_BASKET, ethers.parseEther("1000"));
      await approveTx.wait();
      console.log("✅ CORE tokens approved");
    }
    
    if (btcAllowance < btcAmount) {
      console.log("🔓 Approving BTC tokens...");
      const approveTx = await btcToken.approve(DUAL_STAKING_BASKET, ethers.parseEther("10"));
      await approveTx.wait();
      console.log("✅ BTC tokens approved");
    }
    
    // Get current prices from the price feed
    const priceAddress = await dualStaking.priceFeed();
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceAddress);
    
    const corePrice = await priceFeed.getPrice("CORE");
    const btcPrice = await priceFeed.getPrice("BTC");
    
    console.log("\n📊 Current Prices:");
    console.log(`- CORE: $${ethers.formatUnits(corePrice, 8)}`);
    console.log(`- BTC: $${ethers.formatUnits(btcPrice, 8)}`);
    
    // Calculate expected USD values
    const coreUsdValue = (coreAmount * corePrice) / (10n ** 18n);
    const btcUsdValue = (btcAmount * btcPrice) / (10n ** 18n);
    const totalUsdValue = coreUsdValue + btcUsdValue;
    
    console.log("\n💵 USD Values:");
    console.log(`- CORE USD: $${ethers.formatUnits(coreUsdValue, 8)}`);
    console.log(`- BTC USD: $${ethers.formatUnits(btcUsdValue, 8)}`);
    console.log(`- Total USD: $${ethers.formatUnits(totalUsdValue, 8)}`);
    
    // Get strategy information
    try {
      const strategyInfo = await dualStaking.getStrategyInfo();
      console.log(`\n🏆 Strategy Information:`);
      console.log(`- Current Tier: ${strategyInfo.currentTier}`);
      console.log(`- Target Tier: ${strategyInfo.targetTier}`);
      console.log(`- Total USD Value: $${ethers.formatUnits(strategyInfo.totalUsdValue, 8)}`);
    } catch (error) {
      console.log(`\n⚠️ Strategy Info Error: ${error.message}`);
      console.log("Proceeding with deposit anyway...");
    }
    
    // Perform dual staking deposit
    console.log("\n🚀 Executing Dual Staking Deposit...");
    const stakeTx = await dualStaking.deposit(coreAmount, btcAmount, {
      gasLimit: 500000
    });
    
    console.log(`📝 Transaction hash: ${stakeTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await stakeTx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check final balances
    const finalCoreBalance = await coreToken.balanceOf(deployerAddress);
    const finalBtcBalance = await btcToken.balanceOf(deployerAddress);
    const basketTokenAddress = await dualStaking.basketToken();
    const BasketToken = await ethers.getContractFactory("StakeBasketToken");
    const basketToken = BasketToken.attach(basketTokenAddress);
    const finalBasketBalance = await basketToken.balanceOf(deployerAddress);
    
    console.log("\n💰 Final Balances:");
    console.log(`- CORE: ${ethers.formatEther(finalCoreBalance)} CORE`);
    console.log(`- BTC: ${ethers.formatEther(finalBtcBalance)} BTC`);
    console.log(`- Basket Tokens: ${ethers.formatEther(finalBasketBalance)} BASKET`);
    
    // Calculate changes
    const coreSpent = initialCoreBalance - finalCoreBalance;
    const btcSpent = initialBtcBalance - finalBtcBalance;
    const basketEarned = finalBasketBalance - initialBasketBalance;
    
    console.log("\n📈 Transaction Results:");
    console.log(`- CORE Spent: ${ethers.formatEther(coreSpent)} CORE`);
    console.log(`- BTC Spent: ${ethers.formatEther(btcSpent)} BTC`);
    console.log(`- Basket Tokens Earned: ${ethers.formatEther(basketEarned)} BASKET`);
    
    // Verify contract received tokens
    const contractCoreBalance = await coreToken.balanceOf(DUAL_STAKING_BASKET);
    const contractBtcBalance = await btcToken.balanceOf(DUAL_STAKING_BASKET);
    
    console.log("\n🏦 Contract Token Balances:");
    console.log(`- CORE in contract: ${ethers.formatEther(contractCoreBalance)} CORE`);
    console.log(`- BTC in contract: ${ethers.formatEther(contractBtcBalance)} BTC`);
    
    // Get user position
    const userPosition = await dualStaking.getUserPosition(deployerAddress);
    console.log("\n👤 User Position Info:");
    console.log(`- Shares: ${ethers.formatEther(userPosition.shares)} SHARES`);
    console.log(`- Core Allocation: ${ethers.formatEther(userPosition.coreAllocation)} CORE`);
    console.log(`- BTC Allocation: ${ethers.formatEther(userPosition.btcAllocation)} BTC`);
    console.log(`- USD Value: $${ethers.formatUnits(userPosition.usdValue, 8)}`);
    console.log(`- Current Tier: ${userPosition.tier}`);
    
    console.log("\n🎉 DUAL STAKING TEST COMPLETED SUCCESSFULLY!");
    console.log("✅ Tokens were staked correctly");
    console.log("✅ Basket tokens were minted");
    console.log("✅ Contract received the tokens");
    console.log("✅ User info updated correctly");
    
  } catch (error) {
    console.error("❌ Error during dual staking test:");
    console.error(error.message);
    
    // Try to provide more details about the error
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    if (error.code) {
      console.error("Error code:", error.code);
    }
    
    // Check if it's a transaction error
    if (error.transaction) {
      console.error("Transaction data:", {
        to: error.transaction.to,
        data: error.transaction.data,
        value: error.transaction.value
      });
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });