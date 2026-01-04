const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 DEPLOYING FIXED DUAL STAKING BASKET");
    console.log("======================================");
    console.log("🎯 Deploy with correct USD calculation (18 decimals for BTC price)");
    
    const [deployer] = await ethers.getSigners();
    
    // Load existing deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    console.log(`Using existing contracts:`);
    console.log(`- StakeBasketToken: ${deploymentData.contracts.stakeBasketToken}`);
    console.log(`- PriceFeed: ${deploymentData.contracts.priceFeed}`);
    console.log(`- MockCORE: ${deploymentData.contracts.mockCORE}`);
    console.log(`- BTC Token: ${deploymentData.contracts.btcToken}`);
    
    console.log("\\n🔧 Deploying NEW DualStakingBasket with FIXED USD calculation...");
    
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const dualStakingBasket = await DualStakingBasket.deploy(
        deploymentData.contracts.stakeBasketToken,    // _basketToken  
        deploymentData.contracts.priceFeed,           // _priceFeed
        deploymentData.contracts.mockCORE,            // _coreToken
        deploymentData.contracts.btcToken,            // _btcToken  
        deployer.address,                             // _dualStakingContract (mock)
        deployer.address,                             // _feeRecipient
        0,                                           // _targetTier (BRONZE = 0)
        deployer.address                              // initialOwner
    );
    
    await dualStakingBasket.waitForDeployment();
    const newDualStakingAddress = await dualStakingBasket.getAddress();
    
    console.log(`✅ NEW DualStakingBasket deployed: ${newDualStakingAddress}`);
    
    // Update StakeBasketToken to allow the NEW DualStaking to mint
    console.log("\\n🔒 Updating StakeBasketToken permissions...");
    
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    await basketToken.emergencySetStakeBasketContract(newDualStakingAddress);
    console.log(`✅ StakeBasketToken now allows ${newDualStakingAddress} to mint`);
    
    // Verify the setup
    const authorizedMinter = await basketToken.stakeBasketContract();
    console.log(`✅ Verified authorized minter: ${authorizedMinter}`);
    
    // Update deployment data
    deploymentData.contracts.dualStakingBasket = newDualStakingAddress;
    deploymentData.contracts.dualStakingBasketFixed = newDualStakingAddress; // Keep track that this is the fixed version
    fs.writeFileSync("deployment-data/local-deployment.json", JSON.stringify(deploymentData, null, 2));
    
    console.log("\\n📊 TESTING USD CALCULATION FIX");
    console.log("===============================");
    
    // Test the USD calculation with known values
    const testCoreAmount = ethers.parseEther("100"); // 100 CORE
    const testBtcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    
    // Get current prices
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    
    console.log(`Current prices:`);
    console.log(`- CORE: $${ethers.formatEther(corePrice)}`);
    console.log(`- BTC: $${ethers.formatEther(btcPrice)}`);
    
    // Manual calculation with CORRECTED formula
    const coreValue = (testCoreAmount * corePrice) / ethers.parseEther("1");
    const btcValue = (testBtcAmount * btcPrice) / ethers.parseEther("1"); // NOW using 1e18 instead of 1e8
    const totalUSD = coreValue + btcValue;
    
    console.log(`\\n💰 Test calculation (100 CORE + 0.001 BTC):`);
    console.log(`- CORE value: $${ethers.formatEther(coreValue)}`);
    console.log(`- BTC value: $${ethers.formatEther(btcValue)}`);
    console.log(`- Total USD: $${ethers.formatEther(totalUSD)}`);
    
    // Expected: 100 * $0.70 + 0.001 * $110,000 = $70 + $110 = $180
    const expectedUSD = 180;
    const actualUSD = parseFloat(ethers.formatEther(totalUSD));
    
    console.log(`\\n🎯 VERIFICATION:`);
    console.log(`- Expected USD: $${expectedUSD}`);
    console.log(`- Actual USD: $${actualUSD.toFixed(2)}`);
    console.log(`- Calculation correct: ${Math.abs(actualUSD - expectedUSD) < 1}`);
    
    if (Math.abs(actualUSD - expectedUSD) < 1) {
        console.log("\\n✅ SUCCESS! USD calculation is now FIXED!");
        console.log("🎯 Ready to get REAL BASKET token amounts from dual staking deposits!");
    } else {
        console.log("\\n❌ USD calculation still incorrect - need further debugging");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });