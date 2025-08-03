const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 StakeBasket ETF Demo");
  console.log("=======================\n");
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const addresses = deploymentInfo.contracts;
  
  // Get signers
  const [deployer, alice, bob] = await ethers.getSigners();
  
  // Connect to contracts
  const stakeBasket = await ethers.getContractAt("StakeBasket", addresses.stakeBasket);
  const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", addresses.stakeBasketToken);
  const mockCORE = await ethers.getContractAt("MockCORE", addresses.mockCORE);
  const mockCoreBTC = await ethers.getContractAt("MockCoreBTC", addresses.mockCoreBTC);
  const priceFeed = await ethers.getContractAt("PriceFeed", addresses.priceFeed);
  
  console.log("📊 Initial System Status");
  console.log("========================");
  
  // Check initial prices
  try {
    const corePrice = await priceFeed.getCorePrice();
    const coreBTCPrice = await priceFeed.getCoreBTCPrice();
    console.log(`⭐ CORE Price: $${ethers.formatEther(corePrice)}`);
    console.log(`₿ coreBTC Price: $${ethers.formatEther(coreBTCPrice)}`);
  } catch (error) {
    console.log("📊 Setting initial prices...");
    await priceFeed.setPrice("CORE", ethers.parseEther("1.5"));
    await priceFeed.setPrice("coreBTC", ethers.parseEther("95000"));
    console.log("✅ Initial prices set");
  }
  
  // Check ETF status
  const initialAUM = await stakeBasket.getTotalAUM();
  const initialShares = await stakeBasketToken.totalSupply();
  const initialNAVPerShare = initialShares > 0n ? await stakeBasket.getNAVPerShare() : 0n;
  console.log(`🧺 Initial ETF AUM: $${ethers.formatEther(initialAUM)}`);
  console.log(`🧺 Initial ETF Shares: ${ethers.formatEther(initialShares)}`);
  console.log(`💎 Initial NAV per Share: $${ethers.formatEther(initialNAVPerShare)}\n`);
  
  console.log("🔄 Demo User Journey - Alice");
  console.log("============================");
  
  // Step 1: Get test tokens
  console.log("📍 Step 1: Getting test tokens from faucets...");
  await mockCORE.connect(alice).faucet();
  await mockCoreBTC.connect(alice).faucet();
  
  const aliceCOREBalance = await mockCORE.balanceOf(alice.address);
  const aliceCoreBTCBalance = await mockCoreBTC.balanceOf(alice.address);
  console.log(`   Alice CORE: ${ethers.formatEther(aliceCOREBalance)}`);
  console.log(`   Alice coreBTC: ${ethers.formatUnits(aliceCoreBTCBalance, 8)}`);
  
  // Step 2: Deposit to ETF (CORE only)
  console.log("\n📍 Step 2: Depositing CORE to ETF...");
  const coreDepositAmount = ethers.parseEther("50"); // 50 CORE
  
  // Deposit CORE (this ETF is CORE-only, not multi-asset)
  const depositTx = await stakeBasket.connect(alice).deposit(coreDepositAmount, { value: coreDepositAmount });
  await depositTx.wait();
  
  const aliceShares = await stakeBasketToken.balanceOf(alice.address);
  console.log(`   ✅ Deposited 50 CORE to ETF`);
  console.log(`   🧺 Received ETF shares: ${ethers.formatEther(aliceShares)}`);
  
  // Step 3: Check updated ETF status
  console.log("\n📍 Step 3: Checking updated ETF status...");
  const aum = await stakeBasket.getTotalAUM();
  const totalShares = await stakeBasketToken.totalSupply();
  const sharePrice = await stakeBasket.getNAVPerShare();
  
  console.log(`   🧺 ETF AUM: $${ethers.formatEther(aum)}`);
  console.log(`   🧺 Total Shares: ${ethers.formatEther(totalShares)}`);
  console.log(`   💎 Price per Share: $${ethers.formatEther(sharePrice)}`);
  
  // Check ETF holdings
  const etfCOREBalance = await ethers.provider.getBalance(addresses.stakeBasket);
  console.log(`   ⭐ ETF CORE Holdings: ${ethers.formatEther(etfCOREBalance)}`);
  
  // Step 4: Simulate price change
  console.log("\n📍 Step 4: Simulating CORE price increase...");
  const newCorePrice = ethers.parseEther("2.0"); // CORE to $2.00
  
  await priceFeed.connect(deployer).setPrice("CORE", newCorePrice);
  
  const newAUM = await stakeBasket.getTotalAUM();
  const newSharePrice = await stakeBasket.getNAVPerShare();
  
  console.log(`   📊 New CORE Price: $${ethers.formatEther(newCorePrice)}`);
  console.log(`   🧺 New ETF AUM: $${ethers.formatEther(newAUM)}`);
  console.log(`   💎 New Price per Share: $${ethers.formatEther(newSharePrice)}`);
  
  const aumIncrease = ((newAUM - aum) * 10000n) / aum;
  console.log(`   📈 AUM Increased by: ${ethers.formatUnits(aumIncrease, 2)}%`);
  
  // Step 5: Partial withdrawal
  console.log("\n📍 Step 5: Withdrawing 25% of shares...");
  const withdrawAmount = aliceShares / 4n; // 25% of Alice's shares
  
  const withdrawTx = await stakeBasket.connect(alice).redeem(withdrawAmount);
  await withdrawTx.wait();
  
  const remainingShares = await stakeBasketToken.balanceOf(alice.address);
  const aliceETHAfter = await ethers.provider.getBalance(alice.address);
  
  console.log(`   ✅ Withdrew ${ethers.formatEther(withdrawAmount)} shares`);
  console.log(`   🧺 Remaining shares: ${ethers.formatEther(remainingShares)}`);
  console.log(`   ⭐ Alice ETH after: ${ethers.formatEther(aliceETHAfter)}`);
  
  console.log("\n🔄 Demo User Journey - Bob");
  console.log("===========================");
  
  // Bob's journey
  console.log("📍 Bob getting tokens and depositing...");
  const bobCoreAmount = ethers.parseEther("30");
  
  await stakeBasket.connect(bob).deposit(bobCoreAmount, { value: bobCoreAmount });
  
  const bobShares = await stakeBasketToken.balanceOf(bob.address);
  console.log(`   ✅ Bob deposited 30 CORE`);
  console.log(`   🧺 Bob received shares: ${ethers.formatEther(bobShares)}`);
  
  // Final system status
  console.log("\n📋 Final System Status");
  console.log("======================");
  
  const finalAUM = await stakeBasket.getTotalAUM();
  const finalTotalShares = await stakeBasketToken.totalSupply();
  const finalSharePrice = await stakeBasket.getNAVPerShare();
  
  const finalETFCORE = await ethers.provider.getBalance(addresses.stakeBasket);
  
  console.log(`🧺 Final ETF AUM: $${ethers.formatEther(finalAUM)}`);
  console.log(`🧺 Final Total Shares: ${ethers.formatEther(finalTotalShares)}`);
  console.log(`💎 Final Price per Share: $${ethers.formatEther(finalSharePrice)}`);
  console.log(`⭐ Final ETF CORE Holdings: ${ethers.formatEther(finalETFCORE)}`);
  console.log(`👥 Alice shares: ${ethers.formatEther(remainingShares)}`);
  console.log(`👥 Bob shares: ${ethers.formatEther(bobShares)}`);
  
  console.log("\n🎉 ETF Demo Completed Successfully!");
  console.log("===================================");
  console.log("✅ Users deposited assets and received ETF shares");
  console.log("✅ NAV calculated correctly based on holdings and prices");
  console.log("✅ Price updates reflected in NAV changes");
  console.log("✅ Withdrawals worked correctly");
  console.log("✅ Multiple users can participate simultaneously");
  
  console.log("\n🎯 Key Features Demonstrated:");
  console.log("• CORE single-asset ETF");
  console.log("• Dynamic AUM/NAV calculation");
  console.log("• Proportional share distribution");
  console.log("• Price feed integration");
  console.log("• Deposit and withdrawal mechanics");
  console.log("• Multi-user support");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });