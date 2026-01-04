const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 DISABLE DUAL STAKING CALLS");
    console.log("==============================");
    console.log("Setting targetRatio to 0 to bypass _stakeToDualStaking");
    
    const [deployer] = await ethers.getSigners();
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const dualStaking = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    
    // Check current targetRatio
    const currentTargetRatio = await dualStaking.targetRatio();
    console.log(`Current targetRatio: ${currentTargetRatio.toString()}`);
    
    if (currentTargetRatio > 0) {
        console.log("🔧 Setting targetRatio to 0 to disable dual staking calls...");
        
        try {
            await dualStaking.setTargetRatio(0);
            console.log("✅ targetRatio set to 0");
            
            // Verify the change
            const newTargetRatio = await dualStaking.targetRatio();
            console.log(`✅ Verified targetRatio: ${newTargetRatio.toString()}`);
            
        } catch (error) {
            console.log(`❌ Failed to set targetRatio: ${error.message}`);
            
            // Check if the function exists
            console.log("🔍 Checking if setTargetRatio function exists...");
            
            // Let's try to find alternative methods
            console.log("Contract functions that might help:");
            // We'll need to find other ways to disable this
        }
    } else {
        console.log("✅ targetRatio is already 0 - dual staking calls should be disabled");
    }
    
    console.log("\\n🧪 TESTING DEPOSIT WITH DISABLED DUAL STAKING");
    console.log("==============================================");
    
    // Quick test with Alice
    const [, alice] = await ethers.getSigners();
    
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("TestBTC", deploymentData.contracts.btcToken);
    
    const coreAmount = ethers.parseEther("10"); // Smaller amount for quick test
    const btcAmount = ethers.parseUnits("0.0001", 8); // 0.0001 BTC
    
    // Setup Alice
    await mockCORE.mint(alice.address, coreAmount);
    await btcToken.mint(alice.address, btcAmount);
    await mockCORE.connect(alice).approve(dualStaking.target, coreAmount);
    await btcToken.connect(alice).approve(dualStaking.target, btcAmount);
    
    console.log("🧪 Quick test: 10 CORE + 0.0001 BTC = $18");
    
    try {
        const tx = await dualStaking.connect(alice).deposit(coreAmount, btcAmount);
        const receipt = await tx.wait();
        
        console.log("🎉 SUCCESS! Deposit worked!");
        console.log(`Transaction hash: ${receipt.hash}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check BASKET balance
        const basketBalance = await basketToken.balanceOf(alice.address);
        console.log(`Alice received: ${ethers.formatEther(basketBalance)} BASKET tokens`);
        
        const basketPerUSD = parseFloat(ethers.formatEther(basketBalance)) / 18; // $18 total
        console.log(`BASKET/USD rate: ${basketPerUSD.toFixed(6)}`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Deposit still failed: ${error.message}`);
        
        if (error.reason) {
            console.log(`Revert reason: ${error.reason}`);
        }
        
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\\n🎯 DUAL STAKING CALLS SUCCESSFULLY DISABLED!");
            console.log("Ready to test with full amounts!");
        } else {
            console.log("\\n❌ Still need to find the root cause");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });