const { ethers } = require("hardhat");

async function main() {
  const targetAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log(`🔍 Checking balances for: ${targetAddress}`);

  // Contract addresses from deployment
  const basketTokenAddress = "0xAD523115cd35a8d4E60B3C0953E0E0ac10418309";
  const mockCoreAddress = "0xB06c856C8eaBd1d8321b687E188204C1018BC4E5";
  const mockCoreBTCAddress = "0xaB7B4c595d3cE8C85e16DA86630f2fc223B05057";

  try {
    // Get contract instances
    const basketToken = await ethers.getContractAt("StakeBasketToken", basketTokenAddress);
    const mockCore = await ethers.getContractAt("MockCORE", mockCoreAddress);
    const mockCoreBTC = await ethers.getContractAt("MockCoreBTC", mockCoreBTCAddress);

    // Check balances
    const basketBalance = await basketToken.balanceOf(targetAddress);
    const coreBalance = await mockCore.balanceOf(targetAddress);
    const coreBTCBalance = await mockCoreBTC.balanceOf(targetAddress);
    
    console.log("\n💰 Token Balances:");
    console.log(`   BASKET: ${ethers.formatEther(basketBalance)} tokens`);
    console.log(`   CORE: ${ethers.formatEther(coreBalance)} tokens`);
    console.log(`   coreBTC: ${Number(coreBTCBalance) / (10**8)} tokens (8 decimals)`);

    console.log("\n📄 Contract Addresses:");
    console.log(`   BASKET: ${basketTokenAddress}`);
    console.log(`   CORE: ${mockCoreAddress}`);
    console.log(`   coreBTC: ${mockCoreBTCAddress}`);

    // Check if balances are zero and suggest funding
    if (coreBalance === 0n || coreBTCBalance === 0n) {
      console.log("\n⚠️  Missing tokens detected!");
      console.log("🔧 Run this to fund the address:");
      console.log(`TARGET_ADDRESS=${targetAddress} npx hardhat run scripts/fund-wallet.cjs --network localhost`);
    } else {
      console.log("\n✅ Address has tokens! Check frontend wallet connection.");
    }

  } catch (error) {
    console.error("❌ Error checking balances:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });