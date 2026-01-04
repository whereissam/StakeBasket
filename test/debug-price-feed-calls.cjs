const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 DEBUGGING PRICE FEED CALLS");
    console.log("==============================");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    let deploymentData;
    try {
        deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
        console.log("✅ Loaded deployment data");
    } catch (error) {
        console.log("❌ No deployment data found");
        return;
    }
    
    // Get contracts
    const priceFeedAddress = deploymentData.contracts.priceFeed;
    const dualStakingAddress = deploymentData.contracts.dualStakingBasket;
    
    console.log(`PriceFeed: ${priceFeedAddress}`);
    console.log(`DualStakingBasket: ${dualStakingAddress}`);
    
    // Connect to contracts
    const priceFeed = await ethers.getContractAt("PriceFeed", priceFeedAddress);
    const dualStaking = await ethers.getContractAt("DualStakingBasket", dualStakingAddress);
    
    console.log("\n📊 CHECKING PRICE FEED VALUES");
    console.log("=============================");
    
    try {
        const corePrice = await priceFeed.getCorePrice();
        console.log(`CORE Price: ${ethers.formatEther(corePrice)} USD`);
    } catch (error) {
        console.log(`❌ getCorePrice() failed: ${error.message}`);
        
        // Try alternative method
        try {
            const corePriceAlt = await priceFeed.getPrice("CORE");
            console.log(`CORE Price (alt): ${ethers.formatEther(corePriceAlt)} USD`);
        } catch (altError) {
            console.log(`❌ getPrice("CORE") also failed: ${altError.message}`);
        }
    }
    
    try {
        const btcPrice = await priceFeed.getSolvBTCPrice();
        console.log(`SolvBTC Price: ${ethers.formatUnits(btcPrice, 8)} USD`);
    } catch (error) {
        console.log(`❌ getSolvBTCPrice() failed: ${error.message}`);
        
        // Try alternative method
        try {
            const btcPriceAlt = await priceFeed.getPrice("SolvBTC");
            console.log(`SolvBTC Price (alt): ${ethers.formatUnits(btcPriceAlt, 8)} USD`);
        } catch (altError) {
            console.log(`❌ getPrice("SolvBTC") also failed: ${altError.message}`);
        }
    }
    
    console.log("\n🧮 TESTING USD VALUE CALCULATION");
    console.log("================================");
    
    const testCoreAmount = ethers.parseEther("100"); // 100 CORE
    const testBtcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    try {
        // Try to call the internal function via a view function or simulate it
        console.log(`Test amounts: ${ethers.formatEther(testCoreAmount)} CORE + ${ethers.formatUnits(testBtcAmount, 8)} BTC`);
        
        // Get the minimum requirements
        const minCoreDeposit = await dualStaking.minCoreDeposit();
        const minBtcDeposit = await dualStaking.minBtcDeposit();
        const minUsdValue = await dualStaking.minUsdValue();
        
        console.log(`\nMinimum Requirements:`);
        console.log(`- Min CORE: ${ethers.formatEther(minCoreDeposit)}`);
        console.log(`- Min BTC: ${ethers.formatUnits(minBtcDeposit, 8)}`);
        console.log(`- Min USD: $${minUsdValue}`);
        
        // Check if our amounts meet minimums
        const meetsCore = testCoreAmount >= minCoreDeposit;
        const meetsBtc = testBtcAmount >= minBtcDeposit;
        
        console.log(`\nRequirement Check:`);
        console.log(`- CORE amount sufficient: ${meetsCore}`);
        console.log(`- BTC amount sufficient: ${meetsBtc}`);
        
        if (!meetsCore || !meetsBtc) {
            console.log("❌ Test amounts don't meet minimum requirements!");
        }
        
    } catch (error) {
        console.log(`❌ Failed to check requirements: ${error.message}`);
    }
    
    console.log("\n🔍 CHECKING TIER USD THRESHOLDS");
    console.log("===============================");
    
    try {
        // Check tier thresholds
        const bronzeMin = await dualStaking.tierMinUSD(0); // BRONZE
        const silverMin = await dualStaking.tierMinUSD(1); // SILVER
        const goldMin = await dualStaking.tierMinUSD(2); // GOLD
        const satoshiMin = await dualStaking.tierMinUSD(3); // SATOSHI
        
        console.log(`Tier USD Minimums:`);
        console.log(`- Bronze: $${bronzeMin}`);
        console.log(`- Silver: $${silverMin}`);
        console.log(`- Gold: $${goldMin}`);
        console.log(`- Satoshi: $${satoshiMin}`);
        
    } catch (error) {
        console.log(`❌ Failed to get tier thresholds: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });