const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing staking functionality...");
  
  const [user] = await ethers.getSigners();
  console.log(`👤 User: ${user.address}`);

  // Contract addresses
  const basketTokenAddress = "0xAD523115cd35a8d4E60B3C0953E0E0ac10418309";
  const basketStakingAddress = "0x5133BBdfCCa3Eb4F739D599ee4eC45cBCD0E16c5";

  // Get contract instances
  const basketToken = await ethers.getContractAt("StakeBasketToken", basketTokenAddress);
  const basketStaking = await ethers.getContractAt("BasketStaking", basketStakingAddress);

  try {
    console.log("\n📊 Current state:");
    
    // Check balances
    const balance = await basketToken.balanceOf(user.address);
    console.log(`   BASKET balance: ${ethers.formatEther(balance)}`);
    
    // Check allowance
    const allowance = await basketToken.allowance(user.address, basketStakingAddress);
    console.log(`   Current allowance: ${ethers.formatEther(allowance)}`);
    
    // Check staking info
    const stakeInfo = await basketStaking.getUserStakeInfo(user.address);
    console.log(`   Staked amount: ${ethers.formatEther(stakeInfo[0])}`);
    console.log(`   Pending rewards: ${ethers.formatEther(stakeInfo[1])}`);
    console.log(`   Tier: ${stakeInfo[3]}`);

    // Test staking 1000 BASKET tokens
    const stakeAmount = ethers.parseEther("1000");
    
    console.log("\n🔄 Testing staking process:");
    
    // Step 1: Approve
    console.log("   1️⃣ Approving BASKET tokens...");
    const approveTx = await basketToken.approve(basketStakingAddress, stakeAmount);
    await approveTx.wait();
    console.log("   ✅ Approval confirmed");
    
    // Verify approval
    const newAllowance = await basketToken.allowance(user.address, basketStakingAddress);
    console.log(`   💰 New allowance: ${ethers.formatEther(newAllowance)}`);
    
    // Step 2: Stake
    console.log("   2️⃣ Staking tokens...");
    const stakeTx = await basketStaking.stake(stakeAmount);
    await stakeTx.wait();
    console.log("   ✅ Staking confirmed");
    
    // Check final state
    console.log("\n📊 Final state:");
    const finalBalance = await basketToken.balanceOf(user.address);
    const finalStakeInfo = await basketStaking.getUserStakeInfo(user.address);
    
    console.log(`   BASKET balance: ${ethers.formatEther(finalBalance)}`);
    console.log(`   Staked amount: ${ethers.formatEther(finalStakeInfo[0])}`);
    console.log(`   Tier: ${finalStakeInfo[3]}`);
    
    console.log("\n🎉 Staking test completed successfully!");

  } catch (error) {
    console.error("❌ Error during staking test:", error.message);
    
    // Additional debugging
    console.log("\n🔍 Debug info:");
    console.log(`   basketToken address: ${basketTokenAddress}`);
    console.log(`   basketStaking address: ${basketStakingAddress}`);
    console.log(`   user address: ${user.address}`);
    
    if (error.message.includes("ERC20InsufficientAllowance")) {
      console.log("   💡 Issue: Insufficient allowance - approve more tokens");
    }
    if (error.message.includes("ERC20InsufficientBalance")) {
      console.log("   💡 Issue: Insufficient balance - get more BASKET tokens");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });