const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 CHECKING REDEEM FUNCTION SPECIFICS");
  console.log("=====================================\n");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  
  const STAKE_BASKET = "0x958C634b197fE5F09ba3012D45B4281F0C278821";
  const STAKE_BASKET_TOKEN = "0xf98167f5f4BFC87eD67D8eAe3590B00630f864b6";
  const PRICE_FEED = "0xd3fC275555C46Ffa4a6F9d15380D4edA9D9fb06b";
  
  const userAddress = "0x2b44f71B6EB9f2F981B08EA9Af582157075B34B9";
  const sharesAmount = ethers.parseEther("2");
  
  console.log("📋 Checking redeem function requirements...\n");

  const stakeBasket = await ethers.getContractAt("StakeBasket", STAKE_BASKET);
  const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", STAKE_BASKET_TOKEN);
  const priceFeed = await ethers.getContractAt("PriceFeed", PRICE_FEED);

  try {
    // Get critical state variables
    console.log("1️⃣ Checking critical contract parameters...");
    
    const emergencyReserveRatio = await stakeBasket.emergencyReserveRatio();
    const contractBalance = await provider.getBalance(STAKE_BASKET);
    const userBalance = await stakeBasketToken.balanceOf(userAddress);
    const totalPooledCore = await stakeBasket.totalPooledCore();
    
    console.log(`   Emergency Reserve Ratio: ${emergencyReserveRatio}/10000 = ${(Number(emergencyReserveRatio)/100).toFixed(2)}%`);
    console.log(`   Contract CORE balance: ${ethers.formatEther(contractBalance)} CORE`);
    console.log(`   User BASKET balance: ${ethers.formatEther(userBalance)} BASKET`);
    console.log(`   Total pooled CORE: ${ethers.formatEther(totalPooledCore)} CORE`);
    
    // Calculate expected redemption amount
    console.log("\n2️⃣ Calculating expected redemption...");
    const totalSupply = await stakeBasketToken.totalSupply();
    const expectedCore = (sharesAmount * totalPooledCore) / totalSupply;
    console.log(`   Expected CORE return: ${ethers.formatEther(expectedCore)} CORE`);
    
    // Check emergency reserve limit
    const maxInstantRedeem = (contractBalance * emergencyReserveRatio) / 10000n;
    console.log(`   Max instant redeem allowed: ${ethers.formatEther(maxInstantRedeem)} CORE`);
    
    if (expectedCore > maxInstantRedeem) {
      console.log("   ❌ ISSUE FOUND: Redemption exceeds emergency reserve limit!");
      console.log(`   Your redemption (${ethers.formatEther(expectedCore)} CORE) > Limit (${ethers.formatEther(maxInstantRedeem)} CORE)`);
      console.log("   You need to use requestWithdrawal() instead of redeem()");
      return;
    }
    
    // Check if PriceFeed is properly configured
    console.log("\n3️⃣ Checking PriceFeed configuration...");
    try {
      const corePrice = await priceFeed.getCorePrice();
      const btcPrice = await priceFeed.getPrimaryBTCPrice();
      console.log(`   CORE price: $${ethers.formatEther(corePrice)}`);
      console.log(`   BTC price: $${ethers.formatEther(btcPrice)}`);
      
      if (corePrice === 0n || btcPrice === 0n) {
        console.log("   ❌ ISSUE FOUND: PriceFeed returning zero prices!");
        return;
      }
      
      console.log("   ✅ PriceFeed appears to be working");
    } catch (error) {
      console.log(`   ❌ ISSUE FOUND: PriceFeed error - ${error.message}`);
      return;
    }
    
    // Check burn permissions
    console.log("\n4️⃣ Checking burn permissions...");
    try {
      // Try to find the minter role or similar
      const owner = await stakeBasketToken.owner();
      console.log(`   StakeBasketToken owner: ${owner}`);
      console.log(`   StakeBasket contract: ${STAKE_BASKET}`);
      
      if (owner.toLowerCase() !== STAKE_BASKET.toLowerCase()) {
        console.log("   ⚠️ StakeBasket is not the owner of StakeBasketToken - checking other permissions...");
        
        // Maybe there's a minter role or similar
        // Let's try to call burn and see what happens
        try {
          await stakeBasket.redeem.staticCall(sharesAmount, { from: userAddress });
          console.log("   ✅ Static call succeeded - burn permission should be OK");
        } catch (burnError) {
          console.log(`   ❌ Static call failed: ${burnError.message}`);
          if (burnError.message.includes("burn")) {
            console.log("   This appears to be a burn permission issue");
            return;
          }
        }
      } else {
        console.log("   ✅ StakeBasket owns StakeBasketToken");
      }
    } catch (error) {
      console.log(`   ⚠️ Could not check permissions: ${error.message}`);
    }
    
    // Final simulation attempt with more detailed error handling
    console.log("\n5️⃣ Final detailed simulation...");
    try {
      // First check with different gas limits
      const gasEstimate = await stakeBasket.redeem.estimateGas(sharesAmount, { from: userAddress });
      console.log(`   Gas estimate: ${gasEstimate.toString()}`);
      
      const result = await stakeBasket.redeem.staticCall(sharesAmount, { from: userAddress });
      console.log(`   ✅ SUCCESS! Would return: ${ethers.formatEther(result)} CORE`);
      console.log("\n🎉 The redeem function should work!");
      
    } catch (error) {
      console.log(`   ❌ Simulation failed: ${error.message}`);
      
      // Try to extract more specific error info
      if (error.data) {
        console.log(`   Error data: ${error.data}`);
      }
      if (error.reason) {
        console.log(`   Error reason: ${error.reason}`);
      }
      
      // Check if it's a gas issue
      if (error.message.includes("gas")) {
        console.log("   This appears to be a gas estimation issue");
        console.log("   Try setting a manual gas limit in your transaction");
      }
      
      // Check for common revert patterns
      if (error.message.includes("insufficient")) {
        console.log("   This appears to be an insufficient balance/liquidity issue");
      } else if (error.message.includes("exceed")) {
        console.log("   This appears to be a limit exceeded issue");
      } else if (error.message.includes("burn")) {
        console.log("   This appears to be a token burning permission issue");
      }
    }

  } catch (error) {
    console.log("❌ Unexpected error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });