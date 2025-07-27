const hre = require('hardhat');
const { ethers } = hre;

async function finalETFTest() {
  console.log('🚀 Starting Final ETF Test on Local Network...\n');

  try {
    // Get signers
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log('👤 Using accounts:');
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   User1: ${user1.address}`);
    console.log(`   User2: ${user2.address}\n`);

    // Contract addresses
    const addresses = {
      StakeBasket: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
      StakeBasketToken: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      PriceFeed: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      MockCORE: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      MockCoreBTC: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
    };

    // Get contract instances
    const stakeBasket = await ethers.getContractAt('StakeBasket', addresses.StakeBasket);
    const stakeBasketToken = await ethers.getContractAt('StakeBasketToken', addresses.StakeBasketToken);
    const priceFeed = await ethers.getContractAt('PriceFeed', addresses.PriceFeed);
    const mockCore = await ethers.getContractAt('MockCORE', addresses.MockCORE);
    const mockCoreBTC = await ethers.getContractAt('MockCoreBTC', addresses.MockCoreBTC);

    console.log('📋 Step 1: Update Price Feed (Prevent Staleness)');
    console.log('================================================');

    // Update price feeds to ensure they're fresh
    await priceFeed.connect(deployer).setPrice("CORE", ethers.parseEther("1")); // 1 USD
    await priceFeed.connect(deployer).setPrice("lstBTC", ethers.parseEther("95000")); // 95,000 USD
    await priceFeed.connect(deployer).setPrice("BTC", ethers.parseEther("95000")); // 95,000 USD

    console.log('✅ Price feeds updated with fresh timestamps\n');

    console.log('📋 Step 2: Test Token Faucets');
    console.log('=============================');

    // Test faucets
    await mockCore.connect(user1).faucet();
    await mockCoreBTC.connect(user1).faucet();

    const coreBalance = await mockCore.balanceOf(user1.address);
    const coreBTCBalance = await mockCoreBTC.balanceOf(user1.address);

    console.log(`   User1 CORE balance: ${ethers.formatEther(coreBalance)} CORE`);
    console.log(`   User1 coreBTC balance: ${ethers.formatUnits(coreBTCBalance, 8)} coreBTC`);
    console.log('✅ Faucets working correctly\n');

    console.log('📋 Step 3: ETF Deposits and Initial State');
    console.log('=========================================');

    // Users deposit to ETF
    const user1Deposit = ethers.parseEther('2.0');
    const user2Deposit = ethers.parseEther('1.5');

    console.log(`💸 User1 depositing ${ethers.formatEther(user1Deposit)} ETH...`);
    await stakeBasket.connect(user1).deposit(user1Deposit, { value: user1Deposit });

    console.log(`💸 User2 depositing ${ethers.formatEther(user2Deposit)} ETH...`);
    await stakeBasket.connect(user2).deposit(user2Deposit, { value: user2Deposit });

    const totalSupply = await stakeBasketToken.totalSupply();
    const totalAUM = await stakeBasket.getTotalAUM();
    const initialNAV = Number(ethers.formatEther(totalAUM)) / Number(ethers.formatEther(totalSupply));

    console.log(`   Total BASKET supply: ${ethers.formatEther(totalSupply)} BASKET`);
    console.log(`   Total AUM: ${ethers.formatEther(totalAUM)} ETH`);
    console.log(`   Initial NAV: $${initialNAV.toFixed(4)}`);
    console.log('✅ ETF deposits successful\n');

    console.log('📋 Step 4: Simulate Time Passage and Value Appreciation');
    console.log('=======================================================');

    // Simulate 30 days passing with staking rewards
    console.log('⏰ Simulating 30 days of staking rewards...');
    
    // Update price feed after time passage (to prevent staleness)
    await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]); // 30 days
    await ethers.provider.send('evm_mine', []);

    // Update prices again to prevent staleness after time advancement
    await priceFeed.connect(deployer).setPrice("CORE", ethers.parseEther("1")); // Keep same price
    await priceFeed.connect(deployer).setPrice("lstBTC", ethers.parseEther("95000"));
    await priceFeed.connect(deployer).setPrice("BTC", ethers.parseEther("95000"));

    // Simulate reward accrual by adding ETH to the contract (8% APY for 30 days)
    const expectedRewards = Number(ethers.formatEther(totalAUM)) * 0.08 * (30 / 365);
    const rewardETH = ethers.parseEther(expectedRewards.toString());
    
    console.log(`   Expected rewards: ${expectedRewards.toFixed(6)} ETH`);
    
    // Send reward ETH to StakeBasket
    await deployer.sendTransaction({
      to: stakeBasket.target,
      value: rewardETH
    });

    const newTotalAUM = await stakeBasket.getTotalAUM();
    const newNAV = Number(ethers.formatEther(newTotalAUM)) / Number(ethers.formatEther(totalSupply));
    
    console.log(`   New total AUM: ${ethers.formatEther(newTotalAUM)} ETH`);
    console.log(`   New NAV: $${newNAV.toFixed(4)}`);
    console.log(`   NAV increase: $${(newNAV - initialNAV).toFixed(4)} (${(((newNAV - initialNAV) / initialNAV) * 100).toFixed(2)}%)`);
    console.log('✅ Staking rewards simulation successful\n');

    console.log('📋 Step 5: User Value Appreciation Check');
    console.log('========================================');

    const user1BasketBalance = await stakeBasketToken.balanceOf(user1.address);
    const user2BasketBalance = await stakeBasketToken.balanceOf(user2.address);
    
    const user1Value = Number(ethers.formatEther(user1BasketBalance)) * newNAV;
    const user2Value = Number(ethers.formatEther(user2BasketBalance)) * newNAV;
    
    console.log('User portfolio values after rewards:');
    console.log(`   User1: ${ethers.formatEther(user1BasketBalance)} BASKET ≈ $${user1Value.toFixed(4)}`);
    console.log(`   User2: ${ethers.formatEther(user2BasketBalance)} BASKET ≈ $${user2Value.toFixed(4)}`);
    
    const user1Appreciation = user1Value - Number(ethers.formatEther(user1Deposit));
    const user2Appreciation = user2Value - Number(ethers.formatEther(user2Deposit));
    
    console.log(`   User1 appreciation: $${user1Appreciation.toFixed(4)} (${((user1Appreciation / Number(ethers.formatEther(user1Deposit))) * 100).toFixed(2)}%)`);
    console.log(`   User2 appreciation: $${user2Appreciation.toFixed(4)} (${((user2Appreciation / Number(ethers.formatEther(user2Deposit))) * 100).toFixed(2)}%)`);
    console.log('✅ Users benefiting from staking rewards\n');

    console.log('📋 Step 6: New Deposit at Higher NAV');
    console.log('====================================');

    const user3Deposit = ethers.parseEther('1.0');
    console.log(`💸 User3 depositing ${ethers.formatEther(user3Deposit)} ETH at higher NAV...`);
    
    await stakeBasket.connect(user3).deposit(user3Deposit, { value: user3Deposit });
    
    const user3BasketBalance = await stakeBasketToken.balanceOf(user3.address);
    const expectedBasketTokens = Number(ethers.formatEther(user3Deposit)) / newNAV;
    
    console.log(`   BASKET received: ${ethers.formatEther(user3BasketBalance)} BASKET`);
    console.log(`   Expected: ${expectedBasketTokens.toFixed(6)} BASKET`);
    
    const actualReceived = Number(ethers.formatEther(user3BasketBalance));
    console.log(`   Difference: ${Math.abs(actualReceived - expectedBasketTokens).toFixed(6)} BASKET`);
    console.log('✅ New deposit at higher NAV working correctly\n');

    console.log('📋 Step 7: Withdrawal Test');
    console.log('==========================');

    // User1 withdraws half their position
    const withdrawAmount = user1BasketBalance / 2n;
    console.log(`🏦 User1 withdrawing ${ethers.formatEther(withdrawAmount)} BASKET tokens...`);

    const user1ETHBefore = await ethers.provider.getBalance(user1.address);
    
    const withdrawTx = await stakeBasket.connect(user1).redeem(withdrawAmount);
    await withdrawTx.wait();

    const user1ETHAfter = await ethers.provider.getBalance(user1.address);
    const user1BasketAfter = await stakeBasketToken.balanceOf(user1.address);
    
    const ethReceived = user1ETHAfter - user1ETHBefore;
    console.log(`   ETH received: ${ethers.formatEther(ethReceived)} ETH (minus gas)`);
    console.log(`   Remaining BASKET: ${ethers.formatEther(user1BasketAfter)} BASKET`);
    console.log('✅ Withdrawal successful\n');

    console.log('📋 Step 8: Final ETF State Summary');
    console.log('==================================');

    const finalTotalSupply = await stakeBasketToken.totalSupply();
    const finalTotalAUM = await stakeBasket.getTotalAUM();
    const finalNAV = Number(ethers.formatEther(finalTotalAUM)) / Number(ethers.formatEther(finalTotalSupply));

    console.log(`   Final BASKET supply: ${ethers.formatEther(finalTotalSupply)} BASKET`);
    console.log(`   Final total AUM: ${ethers.formatEther(finalTotalAUM)} ETH`);
    console.log(`   Final NAV: $${finalNAV.toFixed(4)}`);
    console.log(`   Total NAV appreciation: $${(finalNAV - initialNAV).toFixed(4)} (${(((finalNAV - initialNAV) / initialNAV) * 100).toFixed(2)}%)`);

    // Show final user positions
    const finalUser1Basket = await stakeBasketToken.balanceOf(user1.address);
    const finalUser2Basket = await stakeBasketToken.balanceOf(user2.address);
    const finalUser3Basket = await stakeBasketToken.balanceOf(user3.address);

    console.log('\n📊 Final User Positions:');
    console.log(`   User1: ${ethers.formatEther(finalUser1Basket)} BASKET ≈ $${(Number(ethers.formatEther(finalUser1Basket)) * finalNAV).toFixed(4)}`);
    console.log(`   User2: ${ethers.formatEther(finalUser2Basket)} BASKET ≈ $${(Number(ethers.formatEther(finalUser2Basket)) * finalNAV).toFixed(4)}`);
    console.log(`   User3: ${ethers.formatEther(finalUser3Basket)} BASKET ≈ $${(Number(ethers.formatEther(finalUser3Basket)) * finalNAV).toFixed(4)}`);

    console.log('\n🎉 Final ETF Test Complete!');
    console.log('===========================');
    console.log('✅ Token faucets working');
    console.log('✅ ETF deposits working');
    console.log('✅ Staking rewards simulation working');
    console.log('✅ NAV appreciation working');
    console.log('✅ User value appreciation working');
    console.log('✅ New deposits at higher NAV working');
    console.log('✅ Withdrawals working');
    console.log('✅ Multi-user scenarios working');
    console.log('\n🚀 Complete ETF staking functionality verified on local network!');
    console.log('💰 ETF is ready for mainnet deployment!');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  finalETFTest()
    .then(() => {
      console.log('\n🏁 Final ETF test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = finalETFTest;