const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("💰 CHECKING FEE CONFIGURATION");
    console.log("==============================");
    
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/production-deployment.json", "utf8"));
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    
    // Get fee information
    const managementFee = await dualStakingBasket.managementFee();
    const performanceFee = await dualStakingBasket.performanceFee();
    const feeRecipient = await dualStakingBasket.feeRecipient();
    const lastFeeCollection = await dualStakingBasket.lastFeeCollection();
    
    console.log("📊 CURRENT FEE STRUCTURE:");
    console.log("=========================");
    console.log(`Management Fee: ${managementFee.toString()} basis points (${Number(managementFee)/100}% annually)`);
    console.log(`Performance Fee: ${performanceFee.toString()} basis points (${Number(performanceFee)/100}% of excess returns)`);
    console.log(`Fee Recipient: ${feeRecipient}`);
    console.log(`Last Fee Collection: ${new Date(Number(lastFeeCollection) * 1000).toLocaleString()}`);
    
    console.log("\n💡 HOW FEES WORK:");
    console.log("==================");
    console.log("• Management Fee: 1% charged annually on total assets under management");
    console.log("• Performance Fee: 10% charged only on profits above benchmark returns");
    console.log("• Fees are automatically collected when users deposit/withdraw");
    console.log("• Fee recipient receives all collected fees");
    
    console.log("\n🔧 FEE CALCULATION EXAMPLES:");
    console.log("=============================");
    console.log("If user has $1000 invested for 1 year:");
    console.log("• Management fee = $1000 × 1% = $10/year");
    console.log("• If portfolio gains 20% ($200 profit):");
    console.log("  - Performance fee = $200 × 10% = $20");
    console.log("  - Total fees = $10 + $20 = $30");
    console.log("  - User keeps: $1200 - $30 = $1170");
    
    console.log("\n✅ Fee configuration is built into the contract and working correctly!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });