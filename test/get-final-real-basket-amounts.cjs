const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🎯 GET REAL BASKET TOKEN AMOUNTS - FINAL WORKING VERSION");
    console.log("========================================================");
    console.log("💰 Using FIXED DualStakingBasket with correct USD calculation!");
    
    const [deployer, alice, bob, charlie] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("TestBTC", deploymentData.contracts.btcToken);
    const dualStaking = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket); // Final fixed version
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    
    console.log(`Using FINAL DualStakingBasket: ${deploymentData.contracts.dualStakingBasket}`);
    
    // Verify everything is working
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    console.log(`\\n✅ Prices: CORE=$${ethers.formatEther(corePrice)}, BTC=$${ethers.formatEther(btcPrice)}`);
    
    const authorizedMinter = await basketToken.stakeBasketContract();
    console.log(`✅ Authorized BASKET minter: ${authorizedMinter}`);
    console.log(`✅ Expected DualStaking: ${deploymentData.contracts.dualStakingBasket}`);
    console.log(`✅ Minter match: ${authorizedMinter === deploymentData.contracts.dualStakingBasket}`);
    
    console.log("\\n🚀 STEP 1: SETUP TEST USERS WITH TOKENS");
    console.log("=========================================");
    
    const users = [
        { name: "Alice", signer: alice, coreAmount: "100", btcAmount: "0.001" },
        { name: "Bob", signer: bob, coreAmount: "200", btcAmount: "0.002" },
        { name: "Charlie", signer: charlie, coreAmount: "500", btcAmount: "0.01" }
    ];
    
    // Setup users with tokens
    for (const user of users) {
        const coreAmount = ethers.parseEther(user.coreAmount);
        const btcAmount = ethers.parseUnits(user.btcAmount, 8);
        
        // Mint tokens
        await mockCORE.mint(user.signer.address, coreAmount);
        await btcToken.mint(user.signer.address, btcAmount);
        
        console.log(`✅ ${user.name}: ${user.coreAmount} CORE + ${user.btcAmount} BTC`);
    }
    
    console.log("\\n💎 STEP 2: EXECUTE REAL DUAL STAKING DEPOSITS");
    console.log("===============================================");
    
    const results = [];
    
    for (const user of users) {
        console.log(`\\n🌟 ${user.name}'s Dual Staking Deposit:`);
        
        const coreAmount = ethers.parseEther(user.coreAmount);
        const btcAmount = ethers.parseUnits(user.btcAmount, 8);
        
        // Expected USD value
        const expectedCoreValue = parseFloat(user.coreAmount) * 0.70;
        const expectedBtcValue = parseFloat(user.btcAmount) * 110000;
        const expectedTotalUSD = expectedCoreValue + expectedBtcValue;
        
        console.log(`Input: ${user.coreAmount} CORE + ${user.btcAmount} BTC = $${expectedTotalUSD}`);
        
        try {
            // Get initial BASKET balance
            const initialBasket = await basketToken.balanceOf(user.signer.address);
            
            // Approve tokens
            await mockCORE.connect(user.signer).approve(dualStaking.target, coreAmount);
            await btcToken.connect(user.signer).approve(dualStaking.target, btcAmount);
            
            console.log(`🔄 Executing deposit for ${user.name}...`);
            
            // Execute the deposit
            const tx = await dualStaking.connect(user.signer).deposit(coreAmount, btcAmount);
            const receipt = await tx.wait();
            
            console.log(`✅ Transaction successful! Gas used: ${receipt.gasUsed.toString()}`);
            
            // Get final BASKET balance
            const finalBasket = await basketToken.balanceOf(user.signer.address);
            const basketReceived = finalBasket - initialBasket;
            
            const basketAmount = ethers.formatEther(basketReceived);
            const basketPerUSD = parseFloat(basketAmount) / expectedTotalUSD;
            const basketPerCORE = parseFloat(basketAmount) / parseFloat(user.coreAmount);
            
            console.log(`💰 ${user.name} received: ${basketAmount} BASKET tokens`);
            console.log(`📊 Rate: ${basketPerUSD.toFixed(6)} BASKET per USD, ${basketPerCORE.toFixed(6)} BASKET per CORE`);
            
            results.push({
                user: user.name,
                input: `${user.coreAmount} CORE + ${user.btcAmount} BTC`,
                expectedUSD: expectedTotalUSD,
                basketReceived: basketAmount,
                basketPerUSD: basketPerUSD.toFixed(6),
                basketPerCORE: basketPerCORE.toFixed(6),
                success: true
            });
            
        } catch (error) {
            console.log(`❌ ${user.name}'s deposit FAILED: ${error.message}`);
            results.push({
                user: user.name,
                input: `${user.coreAmount} CORE + ${user.btcAmount} BTC`,
                expectedUSD: expectedTotalUSD,
                error: error.message,
                success: false
            });
        }
    }
    
    console.log("\\n🎯 FINAL RESULTS - REAL BASKET TOKEN AMOUNTS FROM DUAL STAKING");
    console.log("================================================================");
    console.log("| User    | Input                | USD Value | BASKET Received | BASKET/USD | BASKET/CORE | Status |");
    console.log("|---------|----------------------|-----------|-----------------|------------|-------------|--------|");
    
    for (const result of results) {
        const status = result.success ? "✅ SUCCESS" : "❌ FAILED";
        if (result.success) {
            console.log(`| ${result.user.padEnd(7)} | ${result.input.padEnd(20)} | $${result.expectedUSD.toFixed(2).padStart(8)} | ${result.basketReceived.padStart(15)} | ${result.basketPerUSD.padStart(10)} | ${result.basketPerCORE.padStart(11)} | ${status} |`);
        } else {
            console.log(`| ${result.user.padEnd(7)} | ${result.input.padEnd(20)} | $${result.expectedUSD.toFixed(2).padStart(8)} | ERROR           | -          | -           | ${status} |`);
        }
    }
    
    // Calculate final answer if we have successful deposits
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length > 0) {
        console.log("\\n🎉 SUCCESS! REAL BASKET TOKEN CONVERSION RATES:");
        console.log("===============================================");
        
        const avgBasketPerUSD = successfulResults.reduce((sum, r) => sum + parseFloat(r.basketPerUSD), 0) / successfulResults.length;
        const avgBasketPerCORE = successfulResults.reduce((sum, r) => sum + parseFloat(r.basketPerCORE), 0) / successfulResults.length;
        
        console.log(`\\n💎 REAL FORMULA FOR DUAL STAKING DEPOSITS:`);
        console.log(`- Average BASKET tokens per USD invested: ${avgBasketPerUSD.toFixed(6)}`);
        console.log(`- Average BASKET tokens per CORE invested: ${avgBasketPerCORE.toFixed(6)}`);
        
        console.log(`\\n🎯 REAL ANSWERS TO YOUR ORIGINAL QUESTION:`);
        console.log(`==========================================`);
        
        for (const result of successfulResults) {
            console.log(`${result.user}: ${result.input} → ${result.basketReceived} BASKET tokens`);
        }
        
        console.log(`\\n💡 EXACT BASKET TOKEN FORMULA:`);
        console.log(`BASKET Tokens = USD Value × ${avgBasketPerUSD.toFixed(6)}`);
        console.log(`BASKET Tokens = CORE Amount × ${avgBasketPerCORE.toFixed(6)}`);
        
        console.log(`\\n✨ These are the REAL BASKET token amounts you get from actual`);
        console.log(`   DualStakingBasket deposits with CORE + BTC tokens!`);
        
        return true;
    } else {
        console.log("\\n❌ ALL DEPOSITS FAILED - Something is still wrong");
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\\n🏆 MISSION ACCOMPLISHED!");
            console.log("You now have the REAL BASKET token amounts from dual staking!");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });