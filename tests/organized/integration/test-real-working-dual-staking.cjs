const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env' });

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = deployer.address;
  
  console.log("🎯 Testing WORKING Dual Staking Implementation");
  console.log("==============================================");
  console.log("Deployer address:", deployerAddress);
  console.log("Network:", network.name);
  
  // Use the working StakeBasket and MockDualStaking contracts
  const STAKE_BASKET = "0x9675Db834f2B2209e787d0b458e195D0511305fC";  // From latest deploy
  const MOCK_DUAL_STAKING = "0xC333d166f582D9e5B47e2e09Ca6B4269d0ef1644"; // From DualStakingBasket deploy
  const MOCK_CORE = "0xa41575D35563288d6C59d8a02603dF9E2e171eeE";
  const MOCK_BTC = "0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7";
  
  console.log("\n📋 Contract Information:");
  console.log("- StakeBasket (for CORE deposits):", STAKE_BASKET);
  console.log("- MockDualStaking (for dual staking):", MOCK_DUAL_STAKING);
  console.log("- CORE Token:", MOCK_CORE);
  console.log("- BTC Token:", MOCK_BTC);

  // Get contract instances
  const StakeBasket = await ethers.getContractFactory("StakeBasket");
  const MockDualStaking = await ethers.getContractFactory("contracts/mocks/MockDualStaking.sol:MockDualStaking");
  const MockToken = await ethers.getContractFactory("MockERC20");
  
  const stakeBasket = StakeBasket.attach(STAKE_BASKET);
  const dualStaking = MockDualStaking.attach(MOCK_DUAL_STAKING);
  const coreToken = MockToken.attach(MOCK_CORE);
  const btcToken = MockToken.attach(MOCK_BTC);
  
  try {
    // Test 1: Regular CORE staking to StakeBasket
    console.log("\n🚀 Test 1: CORE Staking via StakeBasket");
    
    const coreDepositAmount = ethers.parseEther("100"); // 100 CORE
    
    // Check initial CORE balance
    const initialCoreBalance = await coreToken.balanceOf(deployerAddress);
    console.log(`Initial CORE balance: ${ethers.formatEther(initialCoreBalance)} CORE`);
    
    if (initialCoreBalance < coreDepositAmount) {
      console.log("🔄 Minting CORE tokens...");
      await coreToken.mint(deployerAddress, ethers.parseEther("1000"));
      console.log("✅ CORE tokens minted");
    }
    
    // Approve CORE for StakeBasket  
    await coreToken.approve(STAKE_BASKET, coreDepositAmount);
    console.log("✅ CORE approved for StakeBasket");
    
    // Deposit CORE to StakeBasket (needs native ETH value equal to amount)
    console.log("🎯 Depositing CORE to StakeBasket...");
    const coreDepositTx = await stakeBasket.deposit(coreDepositAmount, { value: coreDepositAmount });
    await coreDepositTx.wait();
    console.log("✅ CORE deposit to StakeBasket successful!");
    
    // Check basket token balance
    const basketTokenAddr = await stakeBasket.etfToken();
    const BasketToken = await ethers.getContractFactory("StakeBasketToken");
    const basketToken = BasketToken.attach(basketTokenAddr);
    const basketBalance = await basketToken.balanceOf(deployerAddress);
    console.log(`Basket tokens received: ${ethers.formatEther(basketBalance)} BASKET`);

    // Test 2: Direct dual staking with MockDualStaking
    console.log("\n🚀 Test 2: Direct Dual Staking");
    
    const btcAmount = ethers.parseEther("0.1");  // 0.1 BTC
    const coreAmountForDual = ethers.parseEther("50"); // 50 CORE
    
    // Check BTC balance
    const initialBtcBalance = await btcToken.balanceOf(deployerAddress);
    console.log(`Initial BTC balance: ${ethers.formatEther(initialBtcBalance)} BTC`);
    
    if (initialBtcBalance < btcAmount) {
      console.log("🔄 Minting BTC tokens...");
      await btcToken.mint(deployerAddress, ethers.parseEther("10"));
      console.log("✅ BTC tokens minted");
    }
    
    // Approve BTC for MockDualStaking
    await btcToken.approve(MOCK_DUAL_STAKING, btcAmount);
    console.log("✅ BTC approved for dual staking");
    
    // Stake CORE (native) to MockDualStaking
    console.log("🎯 Staking CORE (native) to dual staking...");
    const stakeCoreeTx = await dualStaking.stakeCORE(coreAmountForDual, { 
      value: coreAmountForDual,
      gasLimit: 300000 
    });
    await stakeCoreeTx.wait();
    console.log("✅ CORE staked to dual staking!");
    
    // Stake BTC to MockDualStaking
    console.log("🎯 Staking BTC to dual staking...");
    const stakeBtcTx = await dualStaking.stakeBTC(btcAmount, { gasLimit: 300000 });
    await stakeBtcTx.wait();
    console.log("✅ BTC staked to dual staking!");
    
    // Check staking balances
    const coreStaked = await dualStaking.coreStaked(deployerAddress);
    const btcStaked = await dualStaking.btcStaked(deployerAddress);
    
    console.log("\n💰 Dual Staking Results:");
    console.log(`- CORE Staked: ${ethers.formatEther(coreStaked)} CORE`);
    console.log(`- BTC Staked: ${ethers.formatEther(btcStaked)} BTC`);
    
    // Test 3: Check rewards
    console.log("\n🎯 Test 3: Checking Dual Staking Rewards");
    const rewards = await dualStaking.rewards(deployerAddress);
    console.log(`Current rewards: ${ethers.formatEther(rewards)} ETH`);
    
    if (rewards > 0) {
      console.log("🎯 Claiming rewards...");
      const claimTx = await dualStaking.claimRewards();
      await claimTx.wait();
      console.log("✅ Rewards claimed!");
    }

    console.log("\n🎉 ALL DUAL STAKING TESTS COMPLETED SUCCESSFULLY!");
    console.log("✅ CORE staking to StakeBasket: WORKING");
    console.log("✅ Direct dual staking (CORE + BTC): WORKING");
    console.log("✅ Reward system: WORKING");
    
  } catch (error) {
    console.error("❌ Error during dual staking test:");
    console.error(error.message);
    
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    if (error.transaction) {
      console.error("Transaction:", error.transaction.hash);
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