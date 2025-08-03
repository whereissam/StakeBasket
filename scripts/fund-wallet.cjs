const { ethers } = require("hardhat");

async function main() {
  // Get the target address from environment variable or use default
  const targetAddress = process.env.TARGET_ADDRESS || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log("Usage: TARGET_ADDRESS=0xYourAddress npx hardhat run scripts/fund-wallet.cjs --network localhost");
  console.log(`Using address: ${targetAddress}`);

  console.log(`🎯 Funding wallet: ${targetAddress}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`💰 Using deployer: ${deployer.address}`);

  // Contract addresses from deployment
  const basketTokenAddress = "0xAD523115cd35a8d4E60B3C0953E0E0ac10418309";
  const mockCoreAddress = "0xB06c856C8eaBd1d8321b687E188204C1018BC4E5";
  const mockCoreBTCAddress = "0xaB7B4c595d3cE8C85e16DA86630f2fc223B05057";

  // Get contract instances
  const basketToken = await ethers.getContractAt("StakeBasketToken", basketTokenAddress);
  const mockCore = await ethers.getContractAt("MockCORE", mockCoreAddress);
  const mockCoreBTC = await ethers.getContractAt("MockCoreBTC", mockCoreBTCAddress);

  try {
    console.log("\n🔄 Transferring tokens...");
    
    // Transfer BASKET tokens (50,000 BASKET)
    console.log("   📦 Transferring 50,000 BASKET tokens...");
    await basketToken.mint(targetAddress, ethers.parseEther("50000"));
    
    // Transfer CORE tokens (100,000 CORE)
    console.log("   🔥 Transferring 100,000 CORE tokens...");
    await mockCore.transfer(targetAddress, ethers.parseEther("100000"));
    
    // Transfer coreBTC tokens (10 coreBTC - using 8 decimals)
    console.log("   ₿ Transferring 10 coreBTC tokens...");
    await mockCoreBTC.transfer(targetAddress, 10n * (10n ** 8n));

    console.log("\n✅ Funding complete!");
    console.log(`💳 ${targetAddress} now has:`);
    console.log("   • 50,000 BASKET tokens");
    console.log("   • 100,000 CORE tokens");
    console.log("   • 10 coreBTC tokens");
    
    // Verify balances
    const basketBalance = await basketToken.balanceOf(targetAddress);
    const coreBalance = await mockCore.balanceOf(targetAddress);
    const coreBTCBalance = await mockCoreBTC.balanceOf(targetAddress);
    
    console.log("\n🔍 Verified balances:");
    console.log(`   BASKET: ${ethers.formatEther(basketBalance)}`);
    console.log(`   CORE: ${ethers.formatEther(coreBalance)}`);
    console.log(`   coreBTC: ${Number(coreBTCBalance) / (10**8)}`);

  } catch (error) {
    console.error("❌ Error funding wallet:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });