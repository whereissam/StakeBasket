const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const deploymentData = require('./deployment-data/local-deployment.json');
    
    console.log("Testing direct deposit to DualStakingBasket...");
    
    // Get contracts with correct names
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const mockCORE = MockCORE.attach(deploymentData.contracts.mockCORE);
    
    const MockCoreBTC = await ethers.getContractFactory("MockCoreBTC");
    const mockCoreBTC = MockCoreBTC.attach(deploymentData.contracts.mockCoreBTC);
    
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const dualBasket = DualStakingBasket.attach(deploymentData.contracts.dualStakingBasket);
    
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const basketToken = StakeBasketToken.attach(deploymentData.contracts.stakeBasketToken);
    
    // Check balances before
    const coreBalance = await mockCORE.balanceOf(deployer.address);
    const btcBalance = await mockCoreBTC.balanceOf(deployer.address);
    const basketBalance = await basketToken.balanceOf(deployer.address);
    
    console.log("Before deposit:");
    console.log("CORE:", ethers.formatUnits(coreBalance, 8));
    console.log("BTC:", ethers.formatUnits(btcBalance, 8));
    console.log("BASKET:", ethers.formatUnits(basketBalance, 8));
    
    // Set deposit amounts - smaller amounts
    const coreAmount = ethers.parseUnits("10", 8);    // 10 CORE
    const btcAmount = ethers.parseUnits("0.001", 8);  // 0.001 BTC
    
    // Approve tokens
    console.log("\n🔄 Approving tokens...");
    const approveTx1 = await mockCORE.approve(deploymentData.contracts.dualStakingBasket, coreAmount);
    await approveTx1.wait();
    const approveTx2 = await mockCoreBTC.approve(deploymentData.contracts.dualStakingBasket, btcAmount);
    await approveTx2.wait();
    console.log("✅ Tokens approved");
    
    // Check allowances
    const coreAllowance = await mockCORE.allowance(deployer.address, deploymentData.contracts.dualStakingBasket);
    const btcAllowance = await mockCoreBTC.allowance(deployer.address, deploymentData.contracts.dualStakingBasket);
    console.log("CORE allowance:", ethers.formatUnits(coreAllowance, 8));
    console.log("BTC allowance:", ethers.formatUnits(btcAllowance, 8));
    
    // Try deposit
    console.log("\n🚀 Attempting deposit...");
    console.log("Depositing:", ethers.formatUnits(coreAmount, 8), "CORE +", ethers.formatUnits(btcAmount, 8), "BTC");
    
    try {
        const tx = await dualBasket.deposit(coreAmount, btcAmount);
        const receipt = await tx.wait();
        console.log("✅ Deposit successful\!");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Transaction hash:", tx.hash);
        
        // Check balances after
        const newCoreBalance = await mockCORE.balanceOf(deployer.address);
        const newBtcBalance = await mockCoreBTC.balanceOf(deployer.address);
        const newBasketBalance = await basketToken.balanceOf(deployer.address);
        
        console.log("\nAfter deposit:");
        console.log("CORE:", ethers.formatUnits(newCoreBalance, 8));
        console.log("BTC:", ethers.formatUnits(newBtcBalance, 8));
        console.log("BASKET:", ethers.formatUnits(newBasketBalance, 8));
        
        console.log("\n🎉 SUCCESS\! DualStakingBasket deposit works correctly\!");
        
    } catch (error) {
        console.error("❌ Deposit failed:", error.message);
        
        // Try to identify the specific issue
        if (error.message.includes("StakeBasketToken")) {
            console.log("🔍 This is a StakeBasketToken minter permission issue");
        } else if (error.message.includes("PriceFeed")) {
            console.log("🔍 This is a PriceFeed stale price issue - need to update prices first");
        } else if (error.message.includes("allowance")) {
            console.log("🔍 This is a token allowance issue");
        } else if (error.message.includes("stale")) {
            console.log("🔍 This is a stale data issue - probably PriceFeed");
        }
    }
}

main().catch(console.error);
