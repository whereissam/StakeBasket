const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const deploymentData = require('./deployment-data/local-deployment.json');
    
    console.log("🧪 Testing with EXACT amounts from UI transaction:");
    
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const dualBasket = DualStakingBasket.attach(deploymentData.contracts.dualStakingBasket);
    
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const mockCORE = MockCORE.attach(deploymentData.contracts.mockCORE);
    
    const MockCoreBTC = await ethers.getContractFactory("MockCoreBTC");
    const mockCoreBTC = MockCoreBTC.attach(deploymentData.contracts.mockCoreBTC);
    
    // Use EXACT amounts from failed UI transaction
    const coreAmount = BigInt("200000000");  // 2 CORE (8 decimals)
    const btcAmount = BigInt("100000");      // 0.001 BTC (8 decimals)
    
    console.log("Testing amounts:");
    console.log("CORE:", ethers.formatUnits(coreAmount, 8));
    console.log("BTC:", ethers.formatUnits(btcAmount, 8));
    
    // Check balances first
    const coreBalance = await mockCORE.balanceOf(deployer.address);
    const btcBalance = await mockCoreBTC.balanceOf(deployer.address);
    
    console.log("\nCurrent balances:");
    console.log("CORE:", ethers.formatUnits(coreBalance, 8));
    console.log("BTC:", ethers.formatUnits(btcBalance, 8));
    
    // Check allowances
    const coreAllowance = await mockCORE.allowance(deployer.address, deploymentData.contracts.dualStakingBasket);
    const btcAllowance = await mockCoreBTC.allowance(deployer.address, deploymentData.contracts.dualStakingBasket);
    
    console.log("\nCurrent allowances:");
    console.log("CORE:", ethers.formatUnits(coreAllowance, 8));
    console.log("BTC:", ethers.formatUnits(btcAllowance, 8));
    
    // Approve tokens if needed
    if (coreAllowance < coreAmount) {
        console.log("Approving CORE...");
        const tx1 = await mockCORE.approve(deploymentData.contracts.dualStakingBasket, coreAmount);
        await tx1.wait();
    }
    
    if (btcAllowance < btcAmount) {
        console.log("Approving BTC...");
        const tx2 = await mockCoreBTC.approve(deploymentData.contracts.dualStakingBasket, btcAmount);
        await tx2.wait();
    }
    
    // Try deposit with EXACT UI amounts
    try {
        console.log("\n🚀 Attempting deposit with UI amounts...");
        const tx = await dualBasket.deposit(coreAmount, btcAmount);
        const receipt = await tx.wait();
        
        console.log("✅ SUCCESS\! UI amounts work fine\!");
        console.log("Transaction hash:", tx.hash);
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // This means the issue is in the UI calling logic, not the contract
        console.log("\n🔍 CONCLUSION: Contract works fine, issue is in UI transaction setup");
        
    } catch (error) {
        console.log("❌ FAILED with UI amounts:", error.message);
        
        // Check specific error types
        if (error.message.includes("insufficient allowance")) {
            console.log("🚨 Issue: Insufficient token allowance");
        } else if (error.message.includes("stale")) {
            console.log("🚨 Issue: Stale price data");
        } else if (error.message.includes("StakeBasket")) {
            console.log("🚨 Issue: StakeBasket minter permission");
        } else {
            console.log("🚨 Issue: Unknown contract error");
        }
    }
}

main().catch(console.error);
