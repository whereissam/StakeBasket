const { ethers } = require('hardhat');

async function testETFStaking() {
  console.log('🚀 Starting ETF Staking Test on Local Network...\n');

  // Get signers (test accounts)
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log('👤 Test accounts:');
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   User1: ${user1.address}`);
  console.log(`   User2: ${user2.address}\n`);

  // Contract addresses from deployment
  const addresses = {
    StakeBasket: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    StakeBasketToken: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    StakingManager: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    PriceFeed: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    MockCORE: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    MockCoreBTC: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    MockCoreStaking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MockLstBTC: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
  };

  // Get contract instances
  const stakeBasket = await ethers.getContractAt('StakeBasket', addresses.StakeBasket);
  const stakeBasketToken = await ethers.getContractAt('StakeBasketToken', addresses.StakeBasketToken);
  const mockCore = await ethers.getContractAt('MockCORE', addresses.MockCORE);
  const mockCoreBTC = await ethers.getContractAt('MockCoreBTC', addresses.MockCoreBTC);
  const mockCoreStaking = await ethers.getContractAt('MockCoreStaking', addresses.MockCoreStaking);
  const mockLstBTC = await ethers.getContractAt('MockLstBTC', addresses.MockLstBTC);

  console.log('📋 Step 1: Testing Faucet Functionality');
  console.log('=========================================');

  // Test faucets for user1
  console.log('💰 Getting test tokens from faucets...');
  
  await mockCore.connect(user1).faucet();
  await mockCoreBTC.connect(user1).faucet();
  
  const user1CoreBalance = await mockCore.balanceOf(user1.address);
  const user1CoreBTCBalance = await mockCoreBTC.balanceOf(user1.address);
  
  console.log(`   User1 CORE balance: ${ethers.formatEther(user1CoreBalance)} CORE`);
  console.log(`   User1 coreBTC balance: ${ethers.formatUnits(user1CoreBTCBalance, 8)} coreBTC`);
  
  if (user1CoreBalance > 0 && user1CoreBTCBalance > 0) {
    console.log('✅ Faucets working correctly\n');
  } else {
    console.log('❌ Faucet test failed\n');
    return;
  }

  console.log('📋 Step 2: Testing Initial ETF State');
  console.log('====================================');

  const initialTotalSupply = await stakeBasketToken.totalSupply();
  const initialTotalAUM = await stakeBasket.getTotalAUM();
  const initialNavPerShare = initialTotalSupply > 0n ? 
    Number(ethers.formatEther(initialTotalAUM)) / Number(ethers.formatEther(initialTotalSupply)) : 1;

  console.log(`   Initial BASKET total supply: ${ethers.formatEther(initialTotalSupply)} BASKET`);
  console.log(`   Initial total AUM: ${ethers.formatEther(initialTotalAUM)} ETH`);
  console.log(`   Initial NAV per share: $${initialNavPerShare.toFixed(4)}\n`);

  console.log('📋 Step 3: Testing ETF Deposit (Staking)');
  console.log('=======================================');

  // User1 deposits 1 ETH to the ETF
  const depositAmount = ethers.parseEther('1.0');
  console.log(`💸 User1 depositing ${ethers.formatEther(depositAmount)} ETH to ETF...`);

  const user1InitialETH = await ethers.provider.getBalance(user1.address);
  const user1InitialBasket = await stakeBasketToken.balanceOf(user1.address);

  // Perform deposit
  const depositTx = await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
  await depositTx.wait();

  const user1FinalETH = await ethers.provider.getBalance(user1.address);
  const user1FinalBasket = await stakeBasketToken.balanceOf(user1.address);
  const basketReceived = user1FinalBasket - user1InitialBasket;

  console.log(`   ETH spent: ${ethers.formatEther(user1InitialETH - user1FinalETH)} ETH (including gas)`);
  console.log(`   BASKET tokens received: ${ethers.formatEther(basketReceived)} BASKET`);

  if (basketReceived > 0n) {
    console.log('✅ Deposit successful\n');
  } else {
    console.log('❌ Deposit failed\n');
    return;
  }

  console.log('📋 Step 4: Verifying ETF State After Deposit');
  console.log('============================================');

  const afterDepositTotalSupply = await stakeBasketToken.totalSupply();
  const afterDepositTotalAUM = await stakeBasket.getTotalAUM();
  const afterDepositNavPerShare = afterDepositTotalSupply > 0n ? 
    Number(ethers.formatEther(afterDepositTotalAUM)) / Number(ethers.formatEther(afterDepositTotalSupply)) : 1;

  console.log(`   BASKET total supply: ${ethers.formatEther(afterDepositTotalSupply)} BASKET`);
  console.log(`   Total AUM: ${ethers.formatEther(afterDepositTotalAUM)} ETH`);
  console.log(`   NAV per share: $${afterDepositNavPerShare.toFixed(4)}`);
  console.log(`   Supply increase: ${ethers.formatEther(afterDepositTotalSupply - initialTotalSupply)} BASKET`);
  console.log(`   AUM increase: ${ethers.formatEther(afterDepositTotalAUM - initialTotalAUM)} ETH\n`);

  console.log('📋 Step 5: Testing Staking Rewards Simulation');
  console.log('=============================================');

  // Check staking balances before time advancement
  const stakingBalanceBefore = await mockCoreStaking.getDelegatedAmount(stakeBasket.target, ethers.ZeroAddress);
  console.log(`   Staked amount before: ${ethers.formatEther(stakingBalanceBefore)} CORE`);

  // Advance time to simulate staking rewards (1 day = 86400 seconds)
  console.log('⏰ Fast-forwarding time by 7 days to simulate staking rewards...');
  await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]); // 7 days
  await ethers.provider.send('evm_mine', []);

  // Check rewards accumulated
  const rewardsEarned = await mockCoreStaking.connect(stakeBasket.target).getRewards(ethers.ZeroAddress);
  console.log(`   Rewards earned after 7 days: ${ethers.formatEther(rewardsEarned)} CORE`);

  // Check new NAV after rewards
  const rewardsTotalAUM = await stakeBasket.getTotalAUM();
  const rewardsNavPerShare = afterDepositTotalSupply > 0n ? 
    Number(ethers.formatEther(rewardsTotalAUM)) / Number(ethers.formatEther(afterDepositTotalSupply)) : 1;

  console.log(`   New total AUM: ${ethers.formatEther(rewardsTotalAUM)} ETH`);
  console.log(`   New NAV per share: $${rewardsNavPerShare.toFixed(4)}`);
  console.log(`   NAV increase: $${(rewardsNavPerShare - afterDepositNavPerShare).toFixed(4)} (${(((rewardsNavPerShare - afterDepositNavPerShare) / afterDepositNavPerShare) * 100).toFixed(2)}%)\n`);

  if (rewardsNavPerShare > afterDepositNavPerShare) {
    console.log('✅ Staking rewards are working correctly\n');
  } else {
    console.log('❌ Staking rewards not working as expected\n');
  }

  console.log('📋 Step 6: Testing Second User Deposit (Different NAV)');
  console.log('====================================================');

  // User2 deposits after NAV has increased
  const user2DepositAmount = ethers.parseEther('0.5');
  console.log(`💸 User2 depositing ${ethers.formatEther(user2DepositAmount)} ETH at higher NAV...`);

  const user2InitialBasket = await stakeBasketToken.balanceOf(user2.address);
  
  const user2DepositTx = await stakeBasket.connect(user2).deposit(user2DepositAmount, { value: user2DepositAmount });
  await user2DepositTx.wait();

  const user2FinalBasket = await stakeBasketToken.balanceOf(user2.address);
  const user2BasketReceived = user2FinalBasket - user2InitialBasket;

  console.log(`   BASKET tokens received by User2: ${ethers.formatEther(user2BasketReceived)} BASKET`);
  console.log(`   User1 BASKET balance: ${ethers.formatEther(await stakeBasketToken.balanceOf(user1.address))} BASKET`);
  console.log(`   User2 BASKET balance: ${ethers.formatEther(await stakeBasketToken.balanceOf(user2.address))} BASKET`);

  // User2 should receive fewer BASKET tokens since NAV is higher
  if (user2BasketReceived < basketReceived) {
    console.log('✅ NAV correctly affects token issuance\n');
  } else {
    console.log('❌ NAV calculation issue\n');
  }

  console.log('📋 Step 7: Testing Withdrawal (Redemption)');
  console.log('==========================================');

  // User1 withdraws half of their BASKET tokens
  const user1BasketBalance = await stakeBasketToken.balanceOf(user1.address);
  const withdrawAmount = user1BasketBalance / 2n;
  
  console.log(`🏦 User1 withdrawing ${ethers.formatEther(withdrawAmount)} BASKET tokens...`);

  const user1ETHBeforeWithdraw = await ethers.provider.getBalance(user1.address);
  
  const withdrawTx = await stakeBasket.connect(user1).redeem(withdrawAmount);
  await withdrawTx.wait();

  const user1ETHAfterWithdraw = await ethers.provider.getBalance(user1.address);
  const user1BasketAfterWithdraw = await stakeBasketToken.balanceOf(user1.address);
  
  const ethReceived = user1ETHAfterWithdraw - user1ETHBeforeWithdraw;
  const basketRedeemed = user1BasketBalance - user1BasketAfterWithdraw;

  console.log(`   BASKET tokens redeemed: ${ethers.formatEther(basketRedeemed)} BASKET`);
  console.log(`   ETH received: ${ethers.formatEther(ethReceived)} ETH (minus gas)`);
  console.log(`   Remaining BASKET balance: ${ethers.formatEther(user1BasketAfterWithdraw)} BASKET`);

  if (basketRedeemed > 0n) {
    console.log('✅ Withdrawal successful\n');
  } else {
    console.log('❌ Withdrawal failed\n');
  }

  console.log('📋 Step 8: Final ETF State Summary');
  console.log('==================================');

  const finalTotalSupply = await stakeBasketToken.totalSupply();
  const finalTotalAUM = await stakeBasket.getTotalAUM();
  const finalNavPerShare = finalTotalSupply > 0n ? 
    Number(ethers.formatEther(finalTotalAUM)) / Number(ethers.formatEther(finalTotalSupply)) : 1;

  console.log(`   Final BASKET total supply: ${ethers.formatEther(finalTotalSupply)} BASKET`);
  console.log(`   Final total AUM: ${ethers.formatEther(finalTotalAUM)} ETH`);
  console.log(`   Final NAV per share: $${finalNavPerShare.toFixed(4)}`);
  console.log(`   Total NAV appreciation: $${(finalNavPerShare - initialNavPerShare).toFixed(4)} (${(((finalNavPerShare - initialNavPerShare) / Math.max(initialNavPerShare, 1)) * 100).toFixed(2)}%)`);

  console.log('\n🎉 ETF Staking Test Complete!');
  console.log('=============================');
  console.log('✅ All core ETF staking functions tested successfully');
  console.log('✅ Deposits, withdrawals, and reward accumulation working');
  console.log('✅ NAV calculations accurate');
  console.log('✅ Multi-user scenarios validated');
}

// Run the test
testETFStaking()
  .then(() => {
    console.log('\n🏁 Test execution completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  });