const { ethers } = require("hardhat");

async function main() {
  console.log("🚰 Getting test tokens from faucets...");
  
  // Get signers - will use the first available account
  const [user] = await ethers.getSigners();
  console.log(`🎯 User address: ${user.address}`);

  // Contract addresses from deployment
  const basketTokenAddress = "0xAD523115cd35a8d4E60B3C0953E0E0ac10418309";
  const mockCoreAddress = "0xB06c856C8eaBd1d8321b687E188204C1018BC4E5";
  const mockCoreBTCAddress = "0xaB7B4c595d3cE8C85e16DA86630f2fc223B05057";

  try {
    // Get contract instances
    const mockCore = await ethers.getContractAt("MockCORE", mockCoreAddress);
    const mockCoreBTC = await ethers.getContractAt("MockCoreBTC", mockCoreBTCAddress);
    const basketToken = await ethers.getContractAt("StakeBasketToken", basketTokenAddress);

    console.log("\n💰 Current balances:");
    let basketBalance = await basketToken.balanceOf(user.address);
    let coreBalance = await mockCore.balanceOf(user.address);
    let coreBTCBalance = await mockCoreBTC.balanceOf(user.address);
    
    console.log(`   BASKET: ${ethers.formatEther(basketBalance)}`);
    console.log(`   CORE: ${ethers.formatEther(coreBalance)}`);
    console.log(`   coreBTC: ${Number(coreBTCBalance) / (10**8)}`);

    console.log("\n🔄 Using faucets to get test tokens...");

    // Use CORE faucet (gives 100 CORE if balance < 1000)
    try {
      console.log("   🔥 Getting CORE from faucet...");
      await mockCore.faucet();
      console.log("   ✅ CORE faucet success");
    } catch (error) {
      console.log(`   ⚠️  CORE faucet: ${error.message}`);
    }

    // Use coreBTC faucet (gives 1 coreBTC if balance < 10)
    try {
      console.log("   ₿ Getting coreBTC from faucet...");
      await mockCoreBTC.faucet();
      console.log("   ✅ coreBTC faucet success");
    } catch (error) {
      console.log(`   ⚠️  coreBTC faucet: ${error.message}`);
    }

    // For BASKET tokens, we need to mint them (no faucet function)
    // We need to be the owner or have minting rights
    try {
      console.log("   📦 Minting BASKET tokens...");
      // Check if we can mint directly (if we're the deployer)
      await basketToken.mint(user.address, ethers.parseEther("10000"));
      console.log("   ✅ BASKET mint success");
    } catch (error) {
      console.log(`   ⚠️  BASKET mint failed: ${error.message}`);
      console.log("   💡 Try: npx hardhat run scripts/fund-wallet.cjs --network localhost " + user.address);
    }

    console.log("\n💰 Final balances:");
    basketBalance = await basketToken.balanceOf(user.address);
    coreBalance = await mockCore.balanceOf(user.address);
    coreBTCBalance = await mockCoreBTC.balanceOf(user.address);
    
    console.log(`   BASKET: ${ethers.formatEther(basketBalance)}`);
    console.log(`   CORE: ${ethers.formatEther(coreBalance)}`);
    console.log(`   coreBTC: ${Number(coreBTCBalance) / (10**8)}`);

    console.log("\n🎉 Ready to test staking!");

  } catch (error) {
    console.error("❌ Error getting test tokens:", error.message);
    console.log("\n💡 Alternative: Run the fund-wallet script with your address:");
    console.log(`npx hardhat run scripts/fund-wallet.cjs --network localhost ${user.address}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });