const { ethers } = require("hardhat");

async function verifyDeployment() {
  console.log("🔍 Verifying deployment configuration...\n");

  try {
    // Load deployment addresses (adjust path as needed)
    const fs = require('fs');
    let deploymentData;
    
    try {
      deploymentData = JSON.parse(fs.readFileSync('./deployment-data/deployment-info.json', 'utf8'));
    } catch (e) {
      console.log("⚠️  Could not load deployment-info.json, using testnet addresses...");
      deploymentData = {
        StakeBasketToken: "0xB82008565FdC7e44609fA118A4a681E92581e680",
        DualStakingBasket: "0x0C9A264bA0c35e327ae0CdB4507F2D6142BD8a3f",
        MockCORE: "0xFb9c7Fb19351316B48eaD2c96E19880Cabc1BbC1",
        MockCoreBTC: "0x213db03D2D75979360FcE41CDbeEcbc903D1BD30"
      };
    }

    console.log("📋 Using deployment addresses:", deploymentData);

    // Get contract instances
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.StakeBasketToken);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.DualStakingBasket);

    console.log("\n✅ Contract instances created successfully");

    // Check 1: Minting authorization
    console.log("\n🔐 Checking minting authorization...");
    const authorizedMinter = await stakeBasketToken.stakeBasketContract();
    const stakingAddress = deploymentData.DualStakingBasket;
    
    console.log(`   Authorized minter: ${authorizedMinter}`);
    console.log(`   Staking contract:  ${stakingAddress}`);
    
    if (authorizedMinter.toLowerCase() !== stakingAddress.toLowerCase()) {
      console.log("❌ CRITICAL ERROR: Minting authorization mismatch!");
      console.log("\n🔧 TO FIX THIS ISSUE:");
      console.log(`   1. Get StakeBasketToken contract:`);
      console.log(`      const token = await ethers.getContractAt("StakeBasketToken", "${deploymentData.StakeBasketToken}");`);
      console.log(`   2. Set correct minter:`);
      console.log(`      await token.setStakeBasketContract("${stakingAddress}");`);
      console.log(`   3. Verify:`);
      console.log(`      console.log(await token.stakeBasketContract());`);
      return false;
    } else {
      console.log("✅ Minting authorization is correct!");
    }

    // Check 2: Token addresses in staking contract
    console.log("\n🪙 Checking token configurations...");
    const basketTokenFromStaking = await dualStakingBasket.basketToken();
    const coreTokenFromStaking = await dualStakingBasket.coreToken();
    const btcTokenFromStaking = await dualStakingBasket.btcToken();
    
    console.log(`   StakeBasketToken in staking: ${basketTokenFromStaking}`);
    console.log(`   Expected StakeBasketToken:   ${deploymentData.StakeBasketToken}`);
    
    if (basketTokenFromStaking.toLowerCase() !== deploymentData.StakeBasketToken.toLowerCase()) {
      console.log("❌ CRITICAL ERROR: StakeBasketToken address mismatch!");
      console.log("   The DualStakingBasket contract is pointing to wrong token address.");
      console.log("   You may need to redeploy DualStakingBasket with correct token address.");
      return false;
    } else {
      console.log("✅ StakeBasketToken address is correct!");
    }

    console.log(`   CORE token: ${coreTokenFromStaking}`);
    console.log(`   BTC token:  ${btcTokenFromStaking}`);

    // Check 3: Contract ownership and permissions
    console.log("\n👤 Checking contract ownership...");
    try {
      const tokenOwner = await stakeBasketToken.owner();
      console.log(`   StakeBasketToken owner: ${tokenOwner}`);
    } catch (e) {
      console.log("   StakeBasketToken: No owner() function (normal for some implementations)");
    }

    // Check 4: Try a simulation call (this will fail if minting is broken)
    console.log("\n🧪 Testing contract interaction (simulation)...");
    try {
      // This will simulate the call without actually executing it
      const testAmount = ethers.parseEther("0.001");
      const gasEstimate = await dualStakingBasket.deposit.estimateGas(testAmount, 0);
      console.log(`✅ Contract interaction test passed (estimated gas: ${gasEstimate})`);
    } catch (error) {
      console.log("❌ CRITICAL ERROR: Contract interaction test failed!");
      console.log(`   Error: ${error.message}`);
      
      if (error.message.includes("caller is not the StakeBasket contract")) {
        console.log("\n🔧 This confirms the minting authorization issue!");
        console.log("   Run the fix command shown above.");
      }
      return false;
    }

    // Check 5: Verify token information
    console.log("\n📊 Token information:");
    const tokenName = await stakeBasketToken.name();
    const tokenSymbol = await stakeBasketToken.symbol();
    const tokenDecimals = await stakeBasketToken.decimals();
    
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${tokenDecimals}`);

    console.log("\n🎉 ALL DEPLOYMENT VERIFICATIONS PASSED!");
    console.log("✅ Your contracts are properly configured and ready for use.");
    return true;

  } catch (error) {
    console.log(`❌ VERIFICATION FAILED: ${error.message}`);
    console.log("\n🔧 Troubleshooting steps:");
    console.log("1. Check that all contracts are deployed");
    console.log("2. Verify contract addresses in deployment-info.json");
    console.log("3. Ensure you're connected to the correct network");
    console.log("4. Check that contracts are verified on the explorer");
    return false;
  }
}

async function main() {
  const success = await verifyDeployment();
  process.exit(success ? 0 : 1);
}

// Allow script to be called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { verifyDeployment };