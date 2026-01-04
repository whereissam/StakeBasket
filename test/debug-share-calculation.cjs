const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 DEBUG SHARE CALCULATION");
    console.log("===========================");
    
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    
    // Get actual prices
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    
    console.log(`\nActual price values:`);
    console.log(`- CORE price: ${corePrice.toString()} (${ethers.formatEther(corePrice)})`);
    console.log(`- BTC price: ${btcPrice.toString()} (${ethers.formatEther(btcPrice)})`);
    
    // Test amounts
    const coreAmount = ethers.parseEther("100"); // 100 CORE
    const btcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    console.log(`\nTest amounts:`);
    console.log(`- CORE amount: ${coreAmount.toString()} (${ethers.formatEther(coreAmount)})`);
    console.log(`- BTC amount: ${btcAmount.toString()} (${ethers.formatUnits(btcAmount, 8)})`);
    
    // Manual calculation step by step
    console.log(`\nStep-by-step calculation:`);
    
    // CORE value calculation
    const coreValueRaw = coreAmount * corePrice;
    console.log(`1. coreAmount * corePrice = ${coreValueRaw.toString()}`);
    
    const coreValueDivided = coreValueRaw / ethers.parseEther("1");
    console.log(`2. coreValueRaw / 1e18 = ${coreValueDivided.toString()}`);
    
    // BTC value calculation  
    const btcValueRaw = btcAmount * btcPrice;
    console.log(`3. btcAmount * btcPrice = ${btcValueRaw.toString()}`);
    
    const btcValueDivided = btcValueRaw / ethers.parseUnits("1", 8);
    console.log(`4. btcValueRaw / 1e8 = ${btcValueDivided.toString()}`);
    
    const totalValue = coreValueDivided + btcValueDivided;
    console.log(`5. total = ${totalValue.toString()}`);
    
    console.log(`\nExpected result:`);
    console.log(`- CORE value should be: 70 * 1e18 = ${(70n * ethers.parseEther("1")).toString()}`);
    console.log(`- BTC value should be: 110 * 1e18 = ${(110n * ethers.parseEther("1")).toString()}`);
    console.log(`- Total should be: 180 * 1e18 = ${(180n * ethers.parseEther("1")).toString()}`);
    
    // Check if basketToken total supply is 0
    const totalSupply = await basketToken.totalSupply();
    console.log(`\nBasket token total supply: ${totalSupply.toString()}`);
    
    // The issue might be that we're calculating wei amounts but expecting full tokens
    console.log(`\n💡 Analysis:`);
    console.log(`If the calculation gives ${totalValue.toString()} wei`);
    console.log(`That's ${ethers.formatEther(totalValue.toString())} BASKET tokens`);
    
    // The formula in the contract should be giving us tokens with 18 decimals
    // 180 USD should give 180 * 1e18 wei = 180 full BASKET tokens
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });