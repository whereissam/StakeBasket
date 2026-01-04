const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("💰 GET REAL BASKET TOKEN AMOUNTS FROM DUAL STAKING");
    console.log("==================================================");
    console.log("🎯 FINALLY getting the actual BASKET tokens from DualStakingBasket deposits");
    
    const [deployer, alice, bob, charlie] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    // Get all contracts
    const contracts = {};
    for (const [name, address] of Object.entries(deploymentData.contracts)) {
        console.log(`${name}: ${address}`);
    }
    
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("TestBTC", deploymentData.contracts.btcToken);
    const dualStaking = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    
    console.log("\\n📊 CURRENT SYSTEM STATE");
    console.log("========================");
    
    // Verify prices
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    console.log(`CORE Price: $${ethers.formatEther(corePrice)}`);
    console.log(`BTC Price: $${ethers.formatUnits(btcPrice, 8)}`);
    
    // Check Bronze tier
    const bronzeMin = await dualStaking.tierMinUSD(0);
    console.log(`Bronze tier minimum: $${bronzeMin}`);
    
    console.log("\\n💰 STEP 1: SETUP TEST USERS");
    console.log("============================");
    
    // Give users tokens
    const users = [
        { name: "Alice", address: alice.address, signer: alice, coreAmount: "100", btcAmount: "0.001" },
        { name: "Bob", address: bob.address, signer: bob, coreAmount: "200", btcAmount: "0.002" },
        { name: "Charlie", address: charlie.address, signer: charlie, coreAmount: "500", btcAmount: "0.01" }
    ];
    
    // Mint tokens to users
    for (const user of users) {
        const coreAmount = ethers.parseEther(user.coreAmount);
        const btcAmount = ethers.parseUnits(user.btcAmount, 8);
        
        try {
            // Mint CORE tokens
            await mockCORE.mint(user.address, coreAmount);
            console.log(`✅ Minted ${user.coreAmount} CORE to ${user.name}`);
            
            // Mint BTC tokens
            await btcToken.mint(user.address, btcAmount);
            console.log(`✅ Minted ${user.btcAmount} BTC to ${user.name}`);
            
            // Check balances
            const coreBalance = await mockCORE.balanceOf(user.address);
            const btcBalance = await btcToken.balanceOf(user.address);
            console.log(`   ${user.name}: ${ethers.formatEther(coreBalance)} CORE + ${ethers.formatUnits(btcBalance, 8)} BTC`);
            
        } catch (error) {
            console.log(`❌ Failed to mint tokens to ${user.name}: ${error.message}`);
        }
    }
    
    console.log("\\n🚀 STEP 2: PERFORM DUAL STAKING DEPOSITS");
    console.log("=========================================");
    
    const results = [];
    
    for (const user of users) {
        console.log(`\\n💫 ${user.name}'s deposit:`);
        console.log(`- Amount: ${user.coreAmount} CORE + ${user.btcAmount} BTC`);
        
        const coreAmount = ethers.parseEther(user.coreAmount);
        const btcAmount = ethers.parseUnits(user.btcAmount, 8);
        
        // Calculate expected USD value
        const expectedCoreValue = parseFloat(user.coreAmount) * 0.70;
        const expectedBtcValue = parseFloat(user.btcAmount) * 110000;
        const expectedTotalUSD = expectedCoreValue + expectedBtcValue;
        
        console.log(`- Expected USD value: $${expectedTotalUSD}`);
        
        try {
            // Get initial BASKET balance
            const initialBasketBalance = await basketToken.balanceOf(user.address);
            console.log(`- Initial BASKET: ${ethers.formatEther(initialBasketBalance)}`);
            
            // Approve tokens for dual staking
            await mockCORE.connect(user.signer).approve(dualStaking.target, coreAmount);
            await btcToken.connect(user.signer).approve(dualStaking.target, btcAmount);
            console.log(`✅ Approved tokens for ${user.name}`);
            
            // Perform the dual staking deposit
            console.log(`🔄 Executing dual staking deposit for ${user.name}...`);
            const tx = await dualStaking.connect(user.signer).deposit(coreAmount, btcAmount);
            await tx.wait();
            console.log(`✅ Deposit successful!`);
            
            // Get final BASKET balance
            const finalBasketBalance = await basketToken.balanceOf(user.address);
            const basketReceived = finalBasketBalance - initialBasketBalance;
            
            console.log(`- Final BASKET: ${ethers.formatEther(finalBasketBalance)}`);
            console.log(`- BASKET received: ${ethers.formatEther(basketReceived)}`);
            
            // Calculate rate
            const basketPerUSD = parseFloat(ethers.formatEther(basketReceived)) / expectedTotalUSD;
            const basketPerCORE = parseFloat(ethers.formatEther(basketReceived)) / parseFloat(user.coreAmount);
            
            results.push({
                user: user.name,
                coreAmount: user.coreAmount,
                btcAmount: user.btcAmount,
                expectedUSD: expectedTotalUSD,
                basketReceived: ethers.formatEther(basketReceived),
                basketPerUSD: basketPerUSD.toFixed(6),
                basketPerCORE: basketPerCORE.toFixed(6)
            });
            
            console.log(`📊 ${user.name}'s results:`);
            console.log(`   - BASKET/USD rate: ${basketPerUSD.toFixed(6)}`);
            console.log(`   - BASKET/CORE rate: ${basketPerCORE.toFixed(6)}`);
            
        } catch (error) {
            console.log(`❌ ${user.name}'s deposit failed: ${error.message}`);
            results.push({
                user: user.name,
                coreAmount: user.coreAmount,
                btcAmount: user.btcAmount,
                expectedUSD: expectedTotalUSD,
                error: error.message
            });
        }
    }
    
    console.log("\\n🎯 FINAL RESULTS - REAL BASKET TOKEN AMOUNTS");
    console.log("=============================================");
    console.log("| User    | Input                | USD Value | BASKET Received | BASKET/USD | BASKET/CORE |");
    console.log("|---------|----------------------|-----------|-----------------|------------|-------------|");
    
    for (const result of results) {
        if (result.error) {
            console.log(`| ${result.user.padEnd(7)} | ${(result.coreAmount + " CORE + " + result.btcAmount + " BTC").padEnd(20)} | $${result.expectedUSD.toFixed(2).padStart(8)} | ERROR           | -          | -           |`);
        } else {
            console.log(`| ${result.user.padEnd(7)} | ${(result.coreAmount + " CORE + " + result.btcAmount + " BTC").padEnd(20)} | $${result.expectedUSD.toFixed(2).padStart(8)} | ${result.basketReceived.padStart(15)} | ${result.basketPerUSD.padStart(10)} | ${result.basketPerCORE.padStart(11)} |`);
        }
    }
    
    // Calculate average rates if we have successful deposits
    const successfulResults = results.filter(r => !r.error);
    if (successfulResults.length > 0) {
        const avgBasketPerUSD = successfulResults.reduce((sum, r) => sum + parseFloat(r.basketPerUSD), 0) / successfulResults.length;
        const avgBasketPerCORE = successfulResults.reduce((sum, r) => sum + parseFloat(r.basketPerCORE), 0) / successfulResults.length;
        
        console.log("\\n🎯 REAL BASKET TOKEN CONVERSION RATES:");
        console.log(`- Average BASKET per USD: ${avgBasketPerUSD.toFixed(6)}`);
        console.log(`- Average BASKET per CORE: ${avgBasketPerCORE.toFixed(6)}`);
        
        console.log("\\n💡 REAL FORMULA FOR DUAL STAKING:");
        console.log(`BASKET Tokens = USD Value × ${avgBasketPerUSD.toFixed(6)}`);
        console.log(`BASKET Tokens = CORE Amount × ${avgBasketPerCORE.toFixed(6)}`);
        
        console.log("\\n✅ SUCCESS! These are the REAL BASKET token amounts from actual DualStakingBasket deposits!");
    } else {
        console.log("\\n❌ No successful deposits - need to debug further");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });