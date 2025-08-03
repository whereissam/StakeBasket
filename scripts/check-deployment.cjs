const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Checking Current Deployment Status...\n");
  
  try {
    // Check if deployment info exists
    const deploymentPath = path.join(__dirname, "../deployment-info.json");
    if (!fs.existsSync(deploymentPath)) {
      console.log("❌ No deployment info found - contracts not deployed");
      console.log("   Run: npm run deploy:mocks");
      return;
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("✅ Deployment info file found");
    
    // Try to connect to deployed contracts
    const stakeBasket = await ethers.getContractAt("StakeBasket", deploymentInfo.contracts.stakeBasket);
    const aum = await stakeBasket.getTotalAUM();
    
    console.log("✅ Contracts are deployed and accessible");
    console.log(`📊 Current ETF AUM: $${ethers.formatEther(aum)}`);
    console.log(`🏗️ Deployed to: localhost network`);
    console.log(`📍 StakeBasket: ${deploymentInfo.contracts.stakeBasket}`);
    
    console.log("\n🎯 Ready for testing!");
    console.log("Available commands:");
    console.log("• npm run test:automated   - Run comprehensive tests");
    console.log("• npm run test:demo        - Run ETF demo");
    console.log("• npm run test:interactive - Interactive menu system");
    
  } catch (error) {
    console.log("❌ Contracts not accessible:", error.message);
    console.log("\n🔧 Need to deploy contracts:");
    console.log("   npm run deploy:mocks");
  }
}

main().catch(console.error);