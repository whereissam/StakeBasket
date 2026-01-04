const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 FINAL SYSTEMATIC DEBUG");
    console.log("==========================");
    
    const [deployer, alice] = await ethers.getSigners();
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("TestBTC", deploymentData.contracts.btcToken);
    const dualStaking = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    
    console.log("\\n📋 STEP 1: CHECK ALL REQUIREMENTS");
    console.log("==================================");
    
    // Get all minimums
    const minCoreDeposit = await dualStaking.minCoreDeposit();
    const minBtcDeposit = await dualStaking.minBtcDeposit();
    const minUsdValue = await dualStaking.minUsdValue();
    
    console.log(`Minimum requirements:`);
    console.log(`- Min CORE: ${ethers.formatEther(minCoreDeposit)}`);
    console.log(`- Min BTC: ${ethers.formatUnits(minBtcDeposit, 8)}`);
    console.log(`- Min USD: $${minUsdValue}`);
    
    // Get tier requirements  
    const bronzeMin = await dualStaking.tierMinUSD(0);
    console.log(`- Bronze tier min: $${bronzeMin}`);
    
    // Get prices
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    console.log(`\\nPrices:`);
    console.log(`- CORE: $${ethers.formatEther(corePrice)}`);
    console.log(`- BTC: $${ethers.formatEther(btcPrice)}`);
    
    console.log("\\n🧮 STEP 2: CALCULATE PERFECT AMOUNTS");
    console.log("=====================================");
    
    // We need at least $100 for Bronze tier, let's aim for $200 to be safe
    const targetUSD = 200;
    
    // Calculate amounts that will give us exactly $200
    // We need: CORE_value + BTC_value = 200
    // Let's use: 100 CORE ($70) + 0.0013 BTC ($130) = $200
    
    const coreAmount = ethers.parseEther("100"); // 100 CORE
    const btcAmount = ethers.parseUnits("0.00118", 8); // 0.00118 BTC ≈ $130
    
    console.log(`Target amounts:`);
    console.log(`- CORE: ${ethers.formatEther(coreAmount)}`);
    console.log(`- BTC: ${ethers.formatUnits(btcAmount, 8)}`);
    
    // Calculate expected USD using our fixed formula
    const coreValue = (coreAmount * corePrice) / ethers.parseEther("1") / ethers.parseEther("1");
    const btcValue = (btcAmount * btcPrice) / ethers.parseUnits("1", 8) / ethers.parseEther("1");
    const totalUSD = coreValue + btcValue;
    
    console.log(`Expected USD calculation:`);
    console.log(`- CORE value: ${coreValue.toString()}`);
    console.log(`- BTC value: ${btcValue.toString()}`);
    console.log(`- Total USD: ${totalUSD.toString()}`);
    
    // Check all requirements
    const meetsCoreMin = coreAmount >= minCoreDeposit;
    const meetsBtcMin = btcAmount >= minBtcDeposit;
    const meetsUsdMin = totalUSD >= minUsdValue;
    const meetsTierMin = totalUSD >= bronzeMin;
    
    console.log(`\\n✅ Requirements check:`);
    console.log(`- CORE minimum: ${meetsCoreMin}`);
    console.log(`- BTC minimum: ${meetsBtcMin}`);
    console.log(`- USD minimum: ${meetsUsdMin}`);
    console.log(`- Tier minimum: ${meetsTierMin}`);
    
    const allRequirementsMet = meetsCoreMin && meetsBtcMin && meetsUsdMin && meetsTierMin;
    console.log(`- ALL REQUIREMENTS: ${allRequirementsMet ? '✅ MET' : '❌ NOT MET'}`);
    
    if (!allRequirementsMet) {
        console.log("\\n❌ Requirements not met - need to adjust amounts");
        return false;
    }
    
    console.log("\\n🚀 STEP 3: SETUP AND EXECUTE DEPOSIT");
    console.log("=====================================");
    
    // Give Alice tokens - make sure she has enough
    await mockCORE.mint(alice.address, coreAmount);
    await btcToken.mint(alice.address, btcAmount);
    
    // Check Alice's balances
    const aliceCoreBalance = await mockCORE.balanceOf(alice.address);
    const aliceBtcBalance = await btcToken.balanceOf(alice.address);
    console.log(`Alice's balances:`);
    console.log(`- CORE: ${ethers.formatEther(aliceCoreBalance)}`);
    console.log(`- BTC: ${ethers.formatUnits(aliceBtcBalance, 8)}`);
    
    // Approve tokens
    await mockCORE.connect(alice).approve(dualStaking.target, coreAmount);
    await btcToken.connect(alice).approve(dualStaking.target, btcAmount);
    
    console.log(`✅ Tokens minted and approved`);
    
    // Check allowances
    const coreAllowance = await mockCORE.allowance(alice.address, dualStaking.target);
    const btcAllowance = await btcToken.allowance(alice.address, dualStaking.target);
    console.log(`Allowances:`);
    console.log(`- CORE: ${ethers.formatEther(coreAllowance)}`);
    console.log(`- BTC: ${ethers.formatUnits(btcAllowance, 8)}`);
    
    // Get initial BASKET balance
    const initialBasket = await basketToken.balanceOf(alice.address);
    console.log(`Initial BASKET: ${ethers.formatEther(initialBasket)}`);
    
    console.log("\\n🎯 EXECUTING DEPOSIT...");
    console.log("========================");
    
    try {
        // First try gas estimation
        console.log("1️⃣ Testing gas estimation...");
        const gasEstimate = await dualStaking.connect(alice).deposit.estimateGas(coreAmount, btcAmount);
        console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
        
        // Now try actual execution
        console.log("2️⃣ Executing deposit...");
        const tx = await dualStaking.connect(alice).deposit(coreAmount, btcAmount);
        console.log(`📤 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed!`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check results
        const finalBasket = await basketToken.balanceOf(alice.address);
        const basketReceived = finalBasket - initialBasket;
        
        console.log("\\n🎉 SUCCESS! DEPOSIT WORKED!");
        console.log("============================");
        console.log(`💰 BASKET tokens received: ${ethers.formatEther(basketReceived)}`);
        
        const basketPerUSD = parseFloat(ethers.formatEther(basketReceived)) / parseFloat(totalUSD.toString());
        const basketPerCORE = parseFloat(ethers.formatEther(basketReceived)) / parseFloat(ethers.formatEther(coreAmount));
        
        console.log(`📊 Conversion rates:`);
        console.log(`- BASKET per USD: ${basketPerUSD.toFixed(6)}`);
        console.log(`- BASKET per CORE: ${basketPerCORE.toFixed(6)}`);
        
        console.log("\\n🎯 REAL ANSWER TO YOUR QUESTION:");
        console.log(`${ethers.formatEther(coreAmount)} CORE + ${ethers.formatUnits(btcAmount, 8)} BTC = ${ethers.formatEther(basketReceived)} BASKET tokens`);
        
        return true;
        
    } catch (error) {
        console.log(`\\n❌ DEPOSIT FAILED: ${error.message}`);
        
        if (error.data) {
            console.log(`Error data: ${error.data}`);
        }
        if (error.reason) {
            console.log(`Revert reason: ${error.reason}`);
        }
        
        // Try to decode the error if possible
        console.log("\\n🔍 This suggests the issue is still in the contract execution");
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\\n🏆 FINALLY SUCCESSFUL!");
            console.log("We now have the REAL BASKET token amounts!");
        } else {
            console.log("\\n💀 Still failing - the issue runs deeper");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });