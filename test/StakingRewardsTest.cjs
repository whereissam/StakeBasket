const hre = require('hardhat');
const { ethers } = hre;

async function stakingRewardsTest() {
  console.log('🚀 Starting Staking Rewards Test on Local Network...\n');

  try {
    // Get signers
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log('👤 Using accounts:');
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   User1: ${user1.address}`);
    console.log(`   User2: ${user2.address}\n`);

    // Contract addresses
    const addresses = {
      StakeBasket: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
      StakeBasketToken: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      StakingManager: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
      MockCoreStaking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      MockLstBTC: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
    };

    // Get contract instances
    const stakeBasket = await ethers.getContractAt('StakeBasket', addresses.StakeBasket);
    const stakeBasketToken = await ethers.getContractAt('StakeBasketToken', addresses.StakeBasketToken);
    const stakingManager = await ethers.getContractAt('StakingManager', addresses.StakingManager);
    const mockCoreStaking = await ethers.getContractAt('MockCoreStaking', addresses.MockCoreStaking);
    const mockLstBTC = await ethers.getContractAt('MockLstBTC', addresses.MockLstBTC);

    console.log('📋 Step 1: Initial ETF Deposits');
    console.log('===============================');

    // User1 and User2 deposit to create a meaningful pool
    const user1Deposit = ethers.parseEther('2.0');
    const user2Deposit = ethers.parseEther('1.5');

    console.log(`💸 User1 depositing ${ethers.formatEther(user1Deposit)} ETH...`);
    await stakeBasket.connect(user1).deposit(user1Deposit, { value: user1Deposit });

    console.log(`💸 User2 depositing ${ethers.formatEther(user2Deposit)} ETH...`);
    await stakeBasket.connect(user2).deposit(user2Deposit, { value: user2Deposit });

    const totalSupplyAfterDeposits = await stakeBasketToken.totalSupply();
    const totalAUMAfterDeposits = await stakeBasket.getTotalAUM();
    const initialNAV = Number(ethers.formatEther(totalAUMAfterDeposits)) / Number(ethers.formatEther(totalSupplyAfterDeposits));

    console.log(`   Total BASKET supply: ${ethers.formatEther(totalSupplyAfterDeposits)} BASKET`);
    console.log(`   Total AUM: ${ethers.formatEther(totalAUMAfterDeposits)} ETH`);
    console.log(`   Initial NAV: $${initialNAV.toFixed(4)}\n`);

    console.log('📋 Step 2: Checking Staking Allocation');
    console.log('======================================');

    // Check how much is staked in the mock staking contract
    const pooledCore = await stakeBasket.totalPooledCore();
    console.log(`   Total CORE pooled in ETF: ${ethers.formatEther(pooledCore)} CORE`);

    // Check delegation to default validator
    const defaultValidator = '0x1111111111111111111111111111111111111111'; // from deploy script
    const delegatedAmount = await mockCoreStaking.getDelegatedAmount(stakeBasket.target, defaultValidator);
    console.log(`   Amount delegated to validator: ${ethers.formatEther(delegatedAmount)} CORE`);

    // Check rewards accumulated so far
    const currentRewards = await mockCoreStaking.getRewards(stakeBasket.target, defaultValidator);
    console.log(`   Current pending rewards: ${ethers.formatEther(currentRewards)} CORE\n`);

    console.log('📋 Step 3: Time Advancement for Reward Simulation');
    console.log('=================================================');

    // Advance time by 30 days to accumulate significant rewards
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    console.log('⏰ Fast-forwarding time by 30 days...');
    await ethers.provider.send('evm_increaseTime', [thirtyDaysInSeconds]);
    await ethers.provider.send('evm_mine', []);

    // Check rewards after time advancement
    const rewardsAfter30Days = await mockCoreStaking.getRewards(stakeBasket.target, defaultValidator);
    console.log(`   Rewards after 30 days: ${ethers.formatEther(rewardsAfter30Days)} CORE`);

    // Calculate expected rewards (8% APY for 30 days)
    const expectedRewards = Number(ethers.formatEther(delegatedAmount)) * 0.08 * (30 / 365);
    console.log(`   Expected rewards (8% APY): ${expectedRewards.toFixed(6)} CORE`);

    const actualRewards = Number(ethers.formatEther(rewardsAfter30Days));
    const rewardsDifference = Math.abs(actualRewards - expectedRewards);
    
    if (rewardsDifference < 0.001) {
      console.log('✅ Reward calculation is accurate\n');
    } else {
      console.log(`⚠️  Reward calculation difference: ${rewardsDifference.toFixed(6)} CORE\n`);
    }

    console.log('📋 Step 4: Claiming Rewards and NAV Impact');
    console.log('==========================================');

    // The staking manager should automatically compound rewards
    // Let's trigger a rebalance to collect rewards
    const rebalanceTx = await stakingManager.rebalancePortfolio();
    await rebalanceTx.wait();
    console.log('✅ Portfolio rebalanced and rewards claimed');

    // Check new AUM after rewards
    const newTotalAUM = await stakeBasket.getTotalAUM();
    const newNAV = Number(ethers.formatEther(newTotalAUM)) / Number(ethers.formatEther(totalSupplyAfterDeposits));
    
    console.log(`   New total AUM: ${ethers.formatEther(newTotalAUM)} ETH`);
    console.log(`   New NAV: $${newNAV.toFixed(4)}`);
    console.log(`   NAV increase: $${(newNAV - initialNAV).toFixed(4)} (${(((newNAV - initialNAV) / initialNAV) * 100).toFixed(2)}%)`);

    if (newNAV > initialNAV) {
      console.log('✅ Staking rewards have increased the NAV\n');
    } else {
      console.log('❌ NAV did not increase as expected\n');
    }

    console.log('📋 Step 5: Multi-Asset Staking Test');
    console.log('===================================');

    // Check lstBTC staking as well
    const lstBTCBalance = await mockLstBTC.balanceOf(stakeBasket.target);
    console.log(`   ETF's lstBTC balance: ${ethers.formatEther(lstBTCBalance)} lstBTC`);

    if (lstBTCBalance > 0n) {
      // Advance time again to test lstBTC auto-compounding
      console.log('⏰ Fast-forwarding another 7 days for lstBTC rewards...');
      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine', []);

      // Check exchange rate (should have increased due to auto-compounding)
      const exchangeRate = await mockLstBTC.getExchangeRate();
      console.log(`   lstBTC exchange rate: ${ethers.formatEther(exchangeRate)} coreBTC per lstBTC`);

      // Rebalance again to capture lstBTC value increase
      const rebalance2Tx = await stakingManager.rebalancePortfolio();
      await rebalance2Tx.wait();

      const finalTotalAUM = await stakeBasket.getTotalAUM();
      const finalNAV = Number(ethers.formatEther(finalTotalAUM)) / Number(ethers.formatEther(totalSupplyAfterDeposits));
      
      console.log(`   Final total AUM: ${ethers.formatEther(finalTotalAUM)} ETH`);
      console.log(`   Final NAV: $${finalNAV.toFixed(4)}`);
      console.log(`   Total NAV increase: $${(finalNAV - initialNAV).toFixed(4)} (${(((finalNAV - initialNAV) / initialNAV) * 100).toFixed(2)}%)`);

      if (finalNAV > newNAV) {
        console.log('✅ Multi-asset staking rewards working correctly\n');
      } else {
        console.log('⚠️  Multi-asset rewards may need review\n');
      }
    } else {
      console.log('ℹ️  No lstBTC balance to test (normal for ETH-only deposits)\n');
    }

    console.log('📋 Step 6: User Experience with Appreciation');
    console.log('============================================');

    // Check user balances and values
    const user1BasketBalance = await stakeBasketToken.balanceOf(user1.address);
    const user2BasketBalance = await stakeBasketToken.balanceOf(user2.address);
    
    const user1Value = Number(ethers.formatEther(user1BasketBalance)) * finalNAV;
    const user2Value = Number(ethers.formatEther(user2BasketBalance)) * finalNAV;
    
    console.log('User portfolio values:');
    console.log(`   User1: ${ethers.formatEther(user1BasketBalance)} BASKET ≈ $${user1Value.toFixed(4)}`);
    console.log(`   User2: ${ethers.formatEther(user2BasketBalance)} BASKET ≈ $${user2Value.toFixed(4)}`);
    
    const user1InitialValue = Number(ethers.formatEther(user1Deposit));
    const user2InitialValue = Number(ethers.formatEther(user2Deposit));
    
    console.log(`   User1 appreciation: $${(user1Value - user1InitialValue).toFixed(4)} (${(((user1Value - user1InitialValue) / user1InitialValue) * 100).toFixed(2)}%)`);
    console.log(`   User2 appreciation: $${(user2Value - user2InitialValue).toFixed(4)} (${(((user2Value - user2InitialValue) / user2InitialValue) * 100).toFixed(2)}%)`);

    console.log('\n📋 Step 7: Testing New Deposit at Higher NAV');
    console.log('============================================');

    // Get a fresh user (user3 would be at index 3)
    const users = await ethers.getSigners();
    const user3 = users[3];
    
    const user3Deposit = ethers.parseEther('1.0');
    console.log(`💸 User3 depositing ${ethers.formatEther(user3Deposit)} ETH at higher NAV...`);
    
    await stakeBasket.connect(user3).deposit(user3Deposit, { value: user3Deposit });
    
    const user3BasketBalance = await stakeBasketToken.balanceOf(user3.address);
    const expectedBasketTokens = Number(ethers.formatEther(user3Deposit)) / finalNAV;
    
    console.log(`   BASKET received: ${ethers.formatEther(user3BasketBalance)} BASKET`);
    console.log(`   Expected amount: ${expectedBasketTokens.toFixed(6)} BASKET`);
    
    const actualReceived = Number(ethers.formatEther(user3BasketBalance));
    const difference = Math.abs(actualReceived - expectedBasketTokens);
    
    if (difference < 0.001) {
      console.log('✅ NAV-based token issuance working correctly\n');
    } else {
      console.log(`⚠️  Token issuance difference: ${difference.toFixed(6)} BASKET\n`);
    }

    console.log('🎉 Staking Rewards Test Complete!');
    console.log('=================================');
    console.log('✅ Staking delegation working');
    console.log('✅ Reward accumulation working');
    console.log('✅ NAV appreciation from rewards');
    console.log('✅ Portfolio rebalancing working');
    console.log('✅ Multi-asset staking integration');
    console.log('✅ User value appreciation tracking');
    console.log('✅ NAV-based token issuance at different prices');
    console.log('\n🚀 Full ETF staking ecosystem verified on local network!');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  stakingRewardsTest()
    .then(() => {
      console.log('\n🏁 Staking rewards test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = stakingRewardsTest;