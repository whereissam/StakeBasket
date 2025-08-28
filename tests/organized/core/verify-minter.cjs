const { ethers } = require("hardhat");

async function main() {
    const deploymentData = require('./deployment-data/local-deployment.json');
    
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const token = StakeBasketToken.attach(deploymentData.contracts.stakeBasketToken);
    
    console.log("🔍 Checking StakeBasketToken minter settings:");
    console.log("StakeBasketToken:", deploymentData.contracts.stakeBasketToken);
    console.log("StakeBasket:", deploymentData.contracts.stakeBasket);
    console.log("DualStakingBasket:", deploymentData.contracts.dualStakingBasket);
    
    const allowedMinter = await token.stakeBasketContract();
    console.log("Current allowed minter:", allowedMinter);
    
    if (allowedMinter.toLowerCase() === deploymentData.contracts.dualStakingBasket.toLowerCase()) {
        console.log("✅ DualStakingBasket is correctly set as minter");
    } else {
        console.log("❌ Wrong minter\! Fixing...");
        const tx = await token.emergencySetStakeBasketContract(deploymentData.contracts.dualStakingBasket);
        await tx.wait();
        console.log("✅ Fixed\! DualStakingBasket is now the minter");
    }
}

main().catch(console.error);
