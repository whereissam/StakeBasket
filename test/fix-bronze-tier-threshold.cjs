const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 FIXING BRONZE TIER THRESHOLD");
    console.log("===============================");
    console.log("🎯 Lower Bronze tier to accept $180 deposits");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    const dualStakingAddress = deploymentData.contracts.dualStakingBasket;
    
    console.log(`DualStakingBasket: ${dualStakingAddress}`);
    
    // Connect to contract
    const dualStaking = await ethers.getContractAt("DualStakingBasket", dualStakingAddress);
    
    // Check current Bronze threshold
    const currentBronzeMin = await dualStaking.tierMinUSD(0); // BRONZE = 0
    const currentBronzeMax = await dualStaking.tierMaxUSD(0);
    console.log(`Current Bronze tier: $${currentBronzeMin} - $${currentBronzeMax}`);
    
    // Set Bronze tier to accept smaller amounts
    const newBronzeMin = 100; // $100 minimum (our test deposit is $180)
    const newBronzeMax = 10000; // Keep the same maximum
    
    console.log(`Setting Bronze tier to: $${newBronzeMin} - $${newBronzeMax}`);
    
    try {
        await dualStaking.setTierThresholds(0, newBronzeMin, newBronzeMax); // BRONZE = 0
        console.log("✅ Bronze tier threshold updated");
        
        // Verify the change
        const updatedBronzeMin = await dualStaking.tierMinUSD(0);
        const updatedBronzeMax = await dualStaking.tierMaxUSD(0);
        console.log(`✅ Verified Bronze tier: $${updatedBronzeMin} - $${updatedBronzeMax}`);
        
    } catch (error) {
        console.log(`❌ Failed to update Bronze tier: ${error.message}`);
    }
    
    console.log("\\n🧮 TESTING DEPOSIT ELIGIBILITY");
    console.log("==============================");
    
    const testCoreAmount = ethers.parseEther("100"); // 100 CORE
    const testBtcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    // Calculate expected USD value: $70 + $110 = $180
    console.log(`Test deposit: 100 CORE + 0.001 BTC = $180`);
    
    // Check all tier thresholds
    console.log(`\\nCurrent tier thresholds:`);
    for (let tier = 0; tier <= 3; tier++) {
        const minUSD = await dualStaking.tierMinUSD(tier);
        const maxUSD = await dualStaking.tierMaxUSD(tier);
        const tierNames = ['Bronze', 'Silver', 'Gold', 'Satoshi'];
        console.log(`- ${tierNames[tier]}: $${minUSD} - $${maxUSD === ethers.MaxUint256 ? 'unlimited' : maxUSD}`);
    }
    
    console.log(`\\n💡 Test deposit ($180) should qualify for: Bronze tier`);
    console.log("🎯 Ready to test the actual deposit!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });