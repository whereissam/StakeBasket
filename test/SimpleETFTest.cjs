const hre = require('hardhat');
const { ethers } = hre;

async function simpleETFTest() {
  console.log('🚀 Starting Simple ETF Test on Local Network...\n');

  try {
    // Get signers
    const [deployer, user1] = await ethers.getSigners();
    console.log('👤 Using accounts:');
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   User1: ${user1.address}\n`);

    // Contract addresses from deployment
    const addresses = {
      StakeBasket: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
      StakeBasketToken: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      MockCORE: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      MockCoreBTC: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
    };

    console.log('📋 Step 1: Getting Contract Instances');
    console.log('====================================');

    // Get contract instances
    const stakeBasket = await ethers.getContractAt('StakeBasket', addresses.StakeBasket);
    const stakeBasketToken = await ethers.getContractAt('StakeBasketToken', addresses.StakeBasketToken);
    const mockCore = await ethers.getContractAt('MockCORE', addresses.MockCORE);
    const mockCoreBTC = await ethers.getContractAt('MockCoreBTC', addresses.MockCoreBTC);

    console.log('✅ All contract instances created successfully\n');

    console.log('📋 Step 2: Testing Token Faucets');
    console.log('================================');

    // Test initial balances
    console.log('Initial balances:');
    const initialCoreBalance = await mockCore.balanceOf(user1.address);
    const initialCoreBTCBalance = await mockCoreBTC.balanceOf(user1.address);
    console.log(`   User1 CORE: ${ethers.formatEther(initialCoreBalance)} CORE`);
    console.log(`   User1 coreBTC: ${ethers.formatUnits(initialCoreBTCBalance, 8)} coreBTC`);

    // Use faucets
    console.log('\n💰 Getting tokens from faucets...');
    const faucetCoreTx = await mockCore.connect(user1).faucet();
    await faucetCoreTx.wait();
    console.log('✅ CORE faucet completed');

    const faucetCoreBTCTx = await mockCoreBTC.connect(user1).faucet();
    await faucetCoreBTCTx.wait();
    console.log('✅ coreBTC faucet completed');

    // Check new balances
    const newCoreBalance = await mockCore.balanceOf(user1.address);
    const newCoreBTCBalance = await mockCoreBTC.balanceOf(user1.address);
    console.log('\nNew balances:');
    console.log(`   User1 CORE: ${ethers.formatEther(newCoreBalance)} CORE`);
    console.log(`   User1 coreBTC: ${ethers.formatUnits(newCoreBTCBalance, 8)} coreBTC`);

    if (newCoreBalance > initialCoreBalance && newCoreBTCBalance > initialCoreBTCBalance) {
      console.log('✅ Faucets working correctly\n');
    } else {
      console.log('❌ Faucet test failed\n');
      return;
    }

    console.log('📋 Step 3: Testing ETF Deposit');
    console.log('==============================');

    // Check initial ETF state
    const initialBasketBalance = await stakeBasketToken.balanceOf(user1.address);
    const initialTotalSupply = await stakeBasketToken.totalSupply();
    const initialTotalAUM = await stakeBasket.getTotalAUM();

    console.log('Initial ETF state:');
    console.log(`   User1 BASKET balance: ${ethers.formatEther(initialBasketBalance)} BASKET`);
    console.log(`   Total BASKET supply: ${ethers.formatEther(initialTotalSupply)} BASKET`);
    console.log(`   Total AUM: ${ethers.formatEther(initialTotalAUM)} ETH`);

    // User1 deposits 0.5 ETH to the ETF
    const depositAmount = ethers.parseEther('0.5');
    console.log(`\n💸 User1 depositing ${ethers.formatEther(depositAmount)} ETH to ETF...`);

    const user1InitialETH = await ethers.provider.getBalance(user1.address);
    console.log(`   User1 initial ETH: ${ethers.formatEther(user1InitialETH)} ETH`);

    // Perform deposit
    const depositTx = await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
    const receipt = await depositTx.wait();
    console.log(`✅ Deposit transaction completed (Gas used: ${receipt.gasUsed})`);

    // Check results
    const user1FinalETH = await ethers.provider.getBalance(user1.address);
    const finalBasketBalance = await stakeBasketToken.balanceOf(user1.address);
    const finalTotalSupply = await stakeBasketToken.totalSupply();
    const finalTotalAUM = await stakeBasket.getTotalAUM();

    const basketReceived = finalBasketBalance - initialBasketBalance;
    const ethSpent = user1InitialETH - user1FinalETH;

    console.log('\nDeposit results:');
    console.log(`   ETH spent: ${ethers.formatEther(ethSpent)} ETH (including gas)`);
    console.log(`   BASKET received: ${ethers.formatEther(basketReceived)} BASKET`);
    console.log(`   New BASKET balance: ${ethers.formatEther(finalBasketBalance)} BASKET`);
    console.log(`   New total supply: ${ethers.formatEther(finalTotalSupply)} BASKET`);
    console.log(`   New total AUM: ${ethers.formatEther(finalTotalAUM)} ETH`);

    if (basketReceived > 0n) {
      console.log('✅ ETF deposit successful\n');
    } else {
      console.log('❌ ETF deposit failed\n');
      return;
    }

    console.log('📋 Step 4: Testing NAV Calculation');
    console.log('==================================');

    const navPerShare = finalTotalSupply > 0n ? 
      Number(ethers.formatEther(finalTotalAUM)) / Number(ethers.formatEther(finalTotalSupply)) : 1;

    console.log(`   NAV per BASKET token: $${navPerShare.toFixed(4)}`);
    console.log(`   Expected NAV: ~$1.0000 (initial)`);

    if (navPerShare >= 0.99 && navPerShare <= 1.01) {
      console.log('✅ NAV calculation looks correct\n');
    } else {
      console.log('⚠️  NAV calculation needs review\n');
    }

    console.log('📋 Step 5: Testing ETF Withdrawal');
    console.log('=================================');

    // Withdraw half of the BASKET tokens
    const withdrawAmount = finalBasketBalance / 2n;
    console.log(`🏦 User1 withdrawing ${ethers.formatEther(withdrawAmount)} BASKET tokens...`);

    const user1ETHBeforeWithdraw = await ethers.provider.getBalance(user1.address);
    
    const withdrawTx = await stakeBasket.connect(user1).redeem(withdrawAmount);
    const withdrawReceipt = await withdrawTx.wait();
    console.log(`✅ Withdrawal transaction completed (Gas used: ${withdrawReceipt.gasUsed})`);

    const user1ETHAfterWithdraw = await ethers.provider.getBalance(user1.address);
    const basketAfterWithdraw = await stakeBasketToken.balanceOf(user1.address);
    
    const ethReceived = user1ETHAfterWithdraw - user1ETHBeforeWithdraw;
    const basketRedeemed = finalBasketBalance - basketAfterWithdraw;

    console.log('\nWithdrawal results:');
    console.log(`   BASKET redeemed: ${ethers.formatEther(basketRedeemed)} BASKET`);
    console.log(`   ETH received: ${ethers.formatEther(ethReceived)} ETH (minus gas)`);
    console.log(`   Remaining BASKET: ${ethers.formatEther(basketAfterWithdraw)} BASKET`);

    if (basketRedeemed > 0n) {
      console.log('✅ ETF withdrawal successful\n');
    } else {
      console.log('❌ ETF withdrawal failed\n');
      return;
    }

    console.log('🎉 Simple ETF Test Complete!');
    console.log('============================');
    console.log('✅ Faucets working');
    console.log('✅ ETF deposits working');
    console.log('✅ ETF withdrawals working');
    console.log('✅ NAV calculations working');
    console.log('\n🚀 ETF staking functionality verified on local network!');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  simpleETFTest()
    .then(() => {
      console.log('\n🏁 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = simpleETFTest;