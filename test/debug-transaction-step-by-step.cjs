const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 DEBUG TRANSACTION STEP BY STEP");
    console.log("==================================");
    
    const [deployer, alice] = await ethers.getSigners();
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("TestBTC", deploymentData.contracts.btcToken);
    const dualStaking = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    
    console.log("\\n🔧 Setting up Alice with tokens...");
    
    const coreAmount = ethers.parseEther("100"); // 100 CORE
    const btcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    // Give Alice tokens
    await mockCORE.mint(alice.address, coreAmount);
    await btcToken.mint(alice.address, btcAmount);
    
    // Approve tokens
    await mockCORE.connect(alice).approve(dualStaking.target, coreAmount);
    await btcToken.connect(alice).approve(dualStaking.target, btcAmount);
    
    console.log("✅ Alice set up with tokens and approvals");
    
    console.log("\\n🔍 DEBUGGING CONTRACT CONFIGURATION");
    console.log("===================================");
    
    try {
        // Check if contract is properly initialized
        const basketTokenAddr = await dualStaking.basketToken();
        const priceFeedAddr = await dualStaking.priceFeed();
        const coreTokenAddr = await dualStaking.coreToken();
        const btcTokenAddr = await dualStaking.btcToken();
        
        console.log(`DualStaking configuration:`);
        console.log(`- BasketToken: ${basketTokenAddr}`);
        console.log(`- PriceFeed: ${priceFeedAddr}`);
        console.log(`- CoreToken: ${coreTokenAddr}`);
        console.log(`- BtcToken: ${btcTokenAddr}`);
        
        console.log(`\\nExpected addresses:`);
        console.log(`- BasketToken: ${deploymentData.contracts.stakeBasketToken}`);
        console.log(`- PriceFeed: ${deploymentData.contracts.priceFeed}`);
        console.log(`- CoreToken: ${deploymentData.contracts.mockCORE}`);
        console.log(`- BtcToken: ${deploymentData.contracts.btcToken}`);
        
        const configMatch = 
            basketTokenAddr === deploymentData.contracts.stakeBasketToken &&
            priceFeedAddr === deploymentData.contracts.priceFeed &&
            coreTokenAddr === deploymentData.contracts.mockCORE &&
            btcTokenAddr === deploymentData.contracts.btcToken;
            
        console.log(`\\n✅ Configuration match: ${configMatch}`);
        
        if (!configMatch) {
            console.log("❌ CONTRACT CONFIGURATION MISMATCH!");
            if (basketTokenAddr !== deploymentData.contracts.stakeBasketToken) {
                console.log(`  BasketToken mismatch: got ${basketTokenAddr}, expected ${deploymentData.contracts.stakeBasketToken}`);
            }
            if (priceFeedAddr !== deploymentData.contracts.priceFeed) {
                console.log(`  PriceFeed mismatch: got ${priceFeedAddr}, expected ${deploymentData.contracts.priceFeed}`);
            }
            if (coreTokenAddr !== deploymentData.contracts.mockCORE) {
                console.log(`  CoreToken mismatch: got ${coreTokenAddr}, expected ${deploymentData.contracts.mockCORE}`);
            }
            if (btcTokenAddr !== deploymentData.contracts.btcToken) {
                console.log(`  BtcToken mismatch: got ${btcTokenAddr}, expected ${deploymentData.contracts.btcToken}`);
            }
        }
    } catch (error) {
        console.log(`❌ Failed to read contract configuration: ${error.message}`);
    }
    
    console.log("\\n🔍 DEBUGGING TIER CALCULATIONS");
    console.log("===============================");
    
    try {
        // Check minimum requirements
        const minCoreDeposit = await dualStaking.minCoreDeposit();
        const minBtcDeposit = await dualStaking.minBtcDeposit();
        const minUsdValue = await dualStaking.minUsdValue();
        
        console.log(`Minimum requirements:`);
        console.log(`- Min CORE: ${ethers.formatEther(minCoreDeposit)}`);
        console.log(`- Min BTC: ${ethers.formatUnits(minBtcDeposit, 8)}`);
        console.log(`- Min USD: $${minUsdValue}`);
        
        const meetsMinimums = 
            coreAmount >= minCoreDeposit &&
            btcAmount >= minBtcDeposit;
            
        console.log(`\\n✅ Meets minimum amounts: ${meetsMinimums}`);
        
        // Check tier thresholds
        const tierMinUSD = [];
        for (let i = 0; i < 4; i++) {
            const minUSD = await dualStaking.tierMinUSD(i);
            tierMinUSD.push(minUSD);
        }
        
        console.log(`\\nTier thresholds:`);
        console.log(`- Bronze: $${tierMinUSD[0]}`);
        console.log(`- Silver: $${tierMinUSD[1]}`);
        console.log(`- Gold: $${tierMinUSD[2]}`);
        console.log(`- Satoshi: $${tierMinUSD[3]}`);
        
        // Test USD calculation
        const corePrice = await priceFeed.getCorePrice();
        const btcPrice = await priceFeed.getSolvBTCPrice();
        
        console.log(`\\nPrices:`);
        console.log(`- CORE: $${ethers.formatEther(corePrice)}`);
        console.log(`- BTC: $${ethers.formatEther(btcPrice)}`);
        
        // Manual USD calculation (matching the fixed contract logic)
        const coreValue = (coreAmount * corePrice) / ethers.parseEther("1") / ethers.parseEther("1");
        const btcValue = (btcAmount * btcPrice) / ethers.parseUnits("1", 8) / ethers.parseEther("1");
        const totalUSD = coreValue + btcValue;
        
        console.log(`\\nUSD calculation:`);
        console.log(`- CORE value: ${coreValue.toString()}`);
        console.log(`- BTC value: ${btcValue.toString()}`);
        console.log(`- Total USD: ${totalUSD.toString()}`);
        
        const qualifiesForTier = totalUSD >= tierMinUSD[0]; // Bronze
        console.log(`\\n✅ Qualifies for Bronze tier: ${qualifiesForTier}`);
        
        if (totalUSD < minUsdValue) {
            console.log(`❌ FAILS minimum USD value requirement: ${totalUSD} < ${minUsdValue}`);
        }
        
    } catch (error) {
        console.log(`❌ Failed tier calculation debug: ${error.message}`);
    }
    
    console.log("\\n🔍 ATTEMPTING GAS ESTIMATION");
    console.log("=============================");
    
    try {
        const gasEstimate = await dualStaking.connect(alice).deposit.estimateGas(coreAmount, btcAmount);
        console.log(`✅ Gas estimation successful: ${gasEstimate.toString()}`);
        console.log("This means the transaction SHOULD work - trying actual execution...");
        
        try {
            const tx = await dualStaking.connect(alice).deposit(coreAmount, btcAmount);
            const receipt = await tx.wait();
            console.log(`\\n🎉 SUCCESS! Transaction hash: ${receipt.hash}`);
            console.log(`Gas used: ${receipt.gasUsed.toString()}`);
            
            const basketBalance = await basketToken.balanceOf(alice.address);
            console.log(`Alice received: ${ethers.formatEther(basketBalance)} BASKET tokens`);
            
        } catch (execError) {
            console.log(`\\n❌ Execution failed: ${execError.message}`);
            console.log("Gas estimation worked but execution failed - this suggests a state change issue");
        }
        
    } catch (gasError) {
        console.log(`❌ Gas estimation failed: ${gasError.message}`);
        console.log("This gives us a clue about where exactly the function reverts");
        
        // Try to get more specific error
        if (gasError.reason) {
            console.log(`Revert reason: ${gasError.reason}`);
        }
        if (gasError.data) {
            console.log(`Error data: ${gasError.data}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });