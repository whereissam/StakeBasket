const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 FIXING PRICE AND TIER ISSUES");
    console.log("===============================");
    console.log("🎯 Fix BTC price format and lower tier thresholds for testing");
    
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
    
    console.log("\\n🔧 STEP 1: FIX BTC PRICE");
    console.log("=========================");
    
    // Fix the BTC price - it should be $110,000 not the astronomical number we saw
    const correctBTCPrice = ethers.parseUnits("110000", 8); // $110,000 with 8 decimals for BTC
    const correctCOREPrice = ethers.parseEther("0.70"); // $0.70 with 18 decimals
    
    console.log(`Setting CORE price to: $${ethers.formatEther(correctCOREPrice)}`);
    console.log(`Setting SolvBTC price to: $${ethers.formatUnits(correctBTCPrice, 8)}`);
    
    try {
        await priceFeed.setPrice("CORE", correctCOREPrice);
        console.log("✅ CORE price set correctly");
    } catch (error) {
        console.log(`❌ Failed to set CORE price: ${error.message}`);
    }
    
    try {
        await priceFeed.setPrice("SolvBTC", correctBTCPrice);
        console.log("✅ SolvBTC price set correctly");
    } catch (error) {
        console.log(`❌ Failed to set SolvBTC price: ${error.message}`);
    }
    
    // Verify prices
    try {
        const corePrice = await priceFeed.getCorePrice();
        const btcPrice = await priceFeed.getSolvBTCPrice();
        console.log(`\\n📊 Verified prices:`);
        console.log(`- CORE: $${ethers.formatEther(corePrice)}`);
        console.log(`- SolvBTC: $${ethers.formatUnits(btcPrice, 8)}`);
    } catch (error) {
        console.log(`❌ Failed to verify prices: ${error.message}`);
    }
    
    console.log("\\n🔧 STEP 2: LOWER TIER THRESHOLDS FOR TESTING");
    console.log("=============================================");
    
    // Calculate expected USD value for our test
    const testCoreAmount = ethers.parseEther("100"); // 100 CORE
    const testBtcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    const expectedUSDValue = (100 * 0.70) + (0.001 * 110000); // $70 + $110 = $180
    console.log(`Expected test deposit USD value: $${expectedUSDValue}`);
    
    // Set Bronze tier threshold to be lower than our test amount
    const newBronzeMin = 100; // $100 minimum for Bronze tier
    const newSilverMin = 1000; // $1,000 for Silver
    const newGoldMin = 10000; // $10,000 for Gold  
    const newSatoshiMin = 50000; // $50,000 for Satoshi
    
    console.log(`Setting new tier thresholds:`);
    console.log(`- Bronze: $${newBronzeMin} (was $1000)`);
    console.log(`- Silver: $${newSilverMin} (was $10000)`);
    console.log(`- Gold: $${newGoldMin} (was $100000)`);
    console.log(`- Satoshi: $${newSatoshiMin} (was $500000)`);
    
    try {
        // Set tier thresholds (this might require owner privileges)
        await dualStaking.setTierThresholds(
            [newBronzeMin, newSilverMin, newGoldMin, newSatoshiMin],
            [newSilverMin-1, newGoldMin-1, newSatoshiMin-1, ethers.MaxUint256] // max thresholds
        );
        console.log("✅ Tier thresholds updated");
    } catch (error) {
        console.log(`⚠️ Could not update tier thresholds (might not have this function): ${error.message}`);
        
        // Alternative: check if we can set minimum USD value
        try {
            await dualStaking.setMinUsdValue(50); // Lower minimum to $50
            console.log("✅ Lowered minimum USD value to $50");
        } catch (altError) {
            console.log(`⚠️ Could not set min USD value: ${altError.message}`);
        }
    }
    
    console.log("\\n🧮 STEP 3: TEST USD VALUE CALCULATION");
    console.log("=====================================");
    
    // Calculate what the USD value should be now
    try {
        const corePrice = await priceFeed.getCorePrice();
        const btcPrice = await priceFeed.getSolvBTCPrice();
        
        console.log(`Using prices:`);
        console.log(`- CORE: $${ethers.formatEther(corePrice)} per token`);
        console.log(`- BTC: $${ethers.formatUnits(btcPrice, 8)} per token`);
        
        // Manual calculation
        const coreValue = (testCoreAmount * corePrice) / ethers.parseEther("1");
        const btcValue = (testBtcAmount * btcPrice) / ethers.parseUnits("1", 8);
        const totalUSD = coreValue + btcValue;
        
        console.log(`\\n💰 For test deposit (100 CORE + 0.001 BTC):`);
        console.log(`- CORE value: $${ethers.formatEther(coreValue)}`);
        console.log(`- BTC value: $${ethers.formatUnits(btcValue, 8)}`);
        console.log(`- Total USD: $${ethers.formatEther(totalUSD)}`);
        
        // Check tier requirements
        const minCoreDeposit = await dualStaking.minCoreDeposit();
        const minBtcDeposit = await dualStaking.minBtcDeposit();
        const minUsdValue = await dualStaking.minUsdValue();
        
        console.log(`\\n📋 Current requirements:`);
        console.log(`- Min CORE: ${ethers.formatEther(minCoreDeposit)}`);
        console.log(`- Min BTC: ${ethers.formatUnits(minBtcDeposit, 8)}`);
        console.log(`- Min USD: $${minUsdValue}`);
        
        const meetsAllRequirements = 
            testCoreAmount >= minCoreDeposit && 
            testBtcAmount >= minBtcDeposit && 
            totalUSD >= ethers.parseEther(minUsdValue.toString());
            
        console.log(`\\n✅ Test deposit meets all requirements: ${meetsAllRequirements}`);
        
        if (meetsAllRequirements) {
            console.log("🎯 Ready to test actual dual staking deposit!");
        } else {
            console.log("❌ Still need to adjust requirements");
        }
        
    } catch (error) {
        console.log(`❌ Failed to calculate USD value: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });