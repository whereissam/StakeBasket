const hre = require("hardhat");

async function main() {
  console.log("🔍 Quick Contract Interface Check");
  
  const CONTRACTS = {
    MockCORE: "0x16a77F70571b099B659BD5255d341ae57e913F52",
    StakeBasket: "0x4f57eaEF37eAC9A61f5dFaba62fE8BafcC11E422",
    CoreOracle: "0xf630BC778a0030dd658F116b40cB23B4dd37051E"
  };
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Using account:", signer.address);
  
  // Check CORE token
  console.log("\n📊 MockCORE Token:");
  const mockCORE = await hre.ethers.getContractAt("MockCORE", CONTRACTS.MockCORE);
  const coreBalance = await mockCORE.balanceOf(signer.address);
  console.log("  Balance:", hre.ethers.formatEther(coreBalance), "CORE");
  console.log("  Name:", await mockCORE.name());
  console.log("  Symbol:", await mockCORE.symbol());
  
  // Check Oracle
  console.log("\n🔮 CoreOracle:");
  const coreOracle = await hre.ethers.getContractAt("CoreOracle", CONTRACTS.CoreOracle);
  const corePrice = await coreOracle.getPrice("CORE");
  console.log("  CORE Price:", hre.ethers.formatUnits(corePrice, 8), "USD");
  const supportedAssets = await coreOracle.getSupportedAssets();
  console.log("  Supported Assets:", supportedAssets);
  
  // Check StakeBasket - inspect available functions
  console.log("\n🗄️ StakeBasket Contract:");
  const stakeBasket = await hre.ethers.getContractAt("StakeBasket", CONTRACTS.StakeBasket);
  
  try {
    const owner = await stakeBasket.owner();
    console.log("  Owner:", owner);
  } catch (e) {
    console.log("  Owner check failed:", e.message);
  }
  
  try {
    const totalPooledCore = await stakeBasket.totalPooledCore();
    console.log("  Total Pooled CORE:", hre.ethers.formatEther(totalPooledCore));
  } catch (e) {
    console.log("  Total pooled CORE check failed:", e.message);
  }
  
  try {
    const feeRecipient = await stakeBasket.feeRecipient();
    console.log("  Fee Recipient:", feeRecipient);
  } catch (e) {
    console.log("  Fee recipient check failed:", e.message);
  }
  
  // Test faucet functionality
  console.log("\n🚰 Testing Faucet:");
  try {
    // Check current balance first
    const balanceBefore = await mockCORE.balanceOf(signer.address);
    console.log("  Balance before faucet:", hre.ethers.formatEther(balanceBefore));
    
    if (balanceBefore < hre.ethers.parseEther("1000")) {
      console.log("  Using faucet...");
      const tx = await mockCORE.faucet();
      await tx.wait();
      
      const balanceAfter = await mockCORE.balanceOf(signer.address);
      console.log("  Balance after faucet:", hre.ethers.formatEther(balanceAfter));
      console.log("  ✅ Faucet successful!");
    } else {
      console.log("  Already have enough tokens, skipping faucet");
    }
  } catch (e) {
    console.log("  Faucet failed:", e.message);
  }
  
  console.log("\n✅ Quick test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });