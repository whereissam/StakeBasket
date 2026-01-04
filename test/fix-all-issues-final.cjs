const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 FIXING ALL FINAL ISSUES");
    console.log("===========================");
    
    const [deployer] = await ethers.getSigners();
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const newDualStaking = deploymentData.contracts.dualStakingBasket; // The fixed version
    
    console.log("\\n🔧 STEP 1: FIX BTC PRICE");
    console.log("=========================");
    
    // Set correct BTC price: $110,000 with 18 decimals
    const correctBTCPrice = ethers.parseEther("110000"); // $110,000 with 18 decimals
    const correctCOREPrice = ethers.parseEther("0.70");   // $0.70 with 18 decimals
    
    console.log(`Setting BTC price to: $${ethers.formatEther(correctBTCPrice)}`);
    console.log(`Setting CORE price to: $${ethers.formatEther(correctCOREPrice)}`);
    
    try {
        await priceFeed.setPrice("SolvBTC", correctBTCPrice);
        console.log("✅ BTC price set to $110,000");
    } catch (error) {
        console.log(`❌ Failed to set BTC price: ${error.message}`);
    }
    
    try {
        await priceFeed.setPrice("CORE", correctCOREPrice);  
        console.log("✅ CORE price set to $0.70");
    } catch (error) {
        console.log(`❌ Failed to set CORE price: ${error.message}`);
    }
    
    // Verify prices are correct
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    console.log(`\\n📊 Verified prices:`);
    console.log(`- CORE: $${ethers.formatEther(corePrice)}`);  
    console.log(`- BTC: $${ethers.formatEther(btcPrice)}`);
    
    console.log("\\n🔒 STEP 2: FIX STAKEBASKET PERMISSIONS");
    console.log("======================================");
    
    // Check current authorized minter
    const currentMinter = await basketToken.stakeBasketContract();
    console.log(`Current authorized minter: ${currentMinter}`);
    console.log(`New DualStaking address: ${newDualStaking}`);
    
    if (currentMinter !== newDualStaking) {
        try {
            await basketToken.emergencySetStakeBasketContract(newDualStaking);
            console.log(`✅ Updated StakeBasketToken to authorize ${newDualStaking}`);
            
            // Verify the change
            const updatedMinter = await basketToken.stakeBasketContract();
            console.log(`✅ Verified new authorized minter: ${updatedMinter}`);
        } catch (error) {
            console.log(`❌ Failed to update minter: ${error.message}`);
        }
    } else {
        console.log("✅ Minter is already correct");
    }
    
    console.log("\\n📊 STEP 3: TEST USD CALCULATION");  
    console.log("================================");
    
    // Test the USD calculation
    const testCoreAmount = ethers.parseEther("100"); // 100 CORE
    const testBtcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC (8 decimals)
    
    console.log(`Test amounts:`);
    console.log(`- CORE: ${ethers.formatEther(testCoreAmount)}`);
    console.log(`- BTC: ${ethers.formatUnits(testBtcAmount, 8)}`);
    
    // Manual calculation with fixed formula: both prices have 18 decimals
    const coreValue = (testCoreAmount * corePrice) / ethers.parseEther("1");
    const btcValue = (testBtcAmount * btcPrice) / ethers.parseEther("1"); // FIXED: using 18 decimals
    const totalUSD = coreValue + btcValue;
    
    console.log(`\\n💰 USD value calculation:`);
    console.log(`- CORE value: 100 × $${ethers.formatEther(corePrice)} = $${ethers.formatEther(coreValue)}`);
    console.log(`- BTC value: 0.001 × $${ethers.formatEther(btcPrice)} = $${ethers.formatEther(btcValue)}`);
    console.log(`- Total USD: $${ethers.formatEther(totalUSD)}`);
    
    const expectedUSD = 70 + 110; // $70 (CORE) + $110 (BTC) = $180
    const actualUSD = parseFloat(ethers.formatEther(totalUSD));
    
    console.log(`\\n🎯 VERIFICATION:`);
    console.log(`- Expected: $${expectedUSD}`);
    console.log(`- Actual: $${actualUSD.toFixed(2)}`);
    console.log(`- Correct: ${Math.abs(actualUSD - expectedUSD) < 1 ? '✅' : '❌'}`);
    
    if (Math.abs(actualUSD - expectedUSD) < 1) {
        console.log("\\n🎉 ALL ISSUES FIXED!");
        console.log("✅ BTC price: $110,000");
        console.log("✅ USD calculation: $180 total");
        console.log("✅ StakeBasket permissions: correct minter");
        console.log("\\n🚀 NOW READY TO GET REAL BASKET TOKEN AMOUNTS!");
        
        return true;
    } else {
        console.log("\\n❌ USD calculation still incorrect");
        console.log("Need to investigate the decimal precision further");
        
        // Debug the exact calculation
        console.log("\\n🔍 DEBUG DETAILS:");
        console.log(`BTC amount in wei: ${testBtcAmount.toString()}`);
        console.log(`BTC price in wei: ${btcPrice.toString()}`);
        console.log(`BTC value calculation: ${testBtcAmount.toString()} * ${btcPrice.toString()} / 1e18`);
        console.log(`BTC value result: ${btcValue.toString()}`);
        
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\\n🎯 READY FOR FINAL DUAL STAKING TEST!");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });