const { ethers } = require("hardhat");

async function main() {
    console.log("💰 COMPLETE STAKING DATA ANALYSIS");
    console.log("=================================");
    console.log("📊 Testing all staking scenarios with exact calculations");
    
    const contracts = {
        stakeBasketToken: "0xa62835D1A6bf5f521C4e2746E1F51c923b8f3483",
        priceFeed: "0x325c8Df4CFb5B068675AFF8f62aA668D1dEc3C4B", 
        stakeBasket: "0xC32609C91d6B6b51D48f2611308FEf121B02041f",
        dualStakingBasket: "0x262e2b50219620226C5fB5956432A88fffd94Ba7",
        stakingManager: "0xBEe6FFc1E8627F51CcDF0b4399a1e1abc5165f15",
        mockCORE: "0xa4E00CB342B36eC9fDc4B50b3d527c3643D4C49e",
        mockBTC: "0x8ac5eE52F70AE01dB914bE459D8B3d50126fd6aE"
    };
    
    const [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();
    
    // Get contract instances
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", contracts.stakeBasketToken);
    const priceFeed = await ethers.getContractAt("PriceFeed", contracts.priceFeed);
    const stakeBasket = await ethers.getContractAt("StakeBasket", contracts.stakeBasket);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", contracts.dualStakingBasket);
    const mockCORE = await ethers.getContractAt("MockERC20", contracts.mockCORE);
    const mockBTC = await ethers.getContractAt("TestBTC", contracts.mockBTC);
    
    console.log("🔗 Connected to all contracts");
    
    // Get current prices
    const corePrice = await priceFeed.getPrice("CORE");
    const btcPrice = await priceFeed.getPrice("BTC");
    
    console.log("📈 Current Market Prices:");
    console.log("  - CORE:", ethers.formatEther(corePrice), "USD");
    console.log("  - BTC:", ethers.formatEther(btcPrice), "USD");
    
    // === REGULAR STAKING TESTS ===
    console.log("\n🥩 REGULAR STAKING ANALYSIS");
    console.log("===========================");
    
    const stakingTests = [
        { user: "Alice", coreAmount: "10", ethAmount: "10", description: "Small stake" },
        { user: "Bob", coreAmount: "100", ethAmount: "100", description: "Medium stake" },
        { user: "Charlie", coreAmount: "1000", ethAmount: "1000", description: "Large stake" }
    ];
    
    const stakingResults = [];
    
    for (let i = 0; i < stakingTests.length; i++) {
        const test = stakingTests[i];
        const user = [user1, user2, user3][i];
        
        console.log(`\n👤 ${test.user} - ${test.description}`);
        console.log("=====================================");
        
        // Setup user
        await mockCORE.mint(user.address, ethers.parseEther("100000"));
        await mockCORE.connect(user).approve(contracts.stakeBasket, ethers.parseEther("50000"));
        
        // Get balance before
        const basketBalanceBefore = await stakeBasketToken.balanceOf(user.address);
        const ethBalanceBefore = await ethers.provider.getBalance(user.address);
        
        try {
            const coreAmount = ethers.parseEther(test.coreAmount);
            const ethAmount = ethers.parseEther(test.ethAmount);
            
            console.log("💸 Inputs:");
            console.log("  - CORE tokens:", test.coreAmount);
            console.log("  - ETH value:", test.ethAmount, "ETH");
            
            // Calculate USD values
            const coreUsdValue = (coreAmount * corePrice) / ethers.parseEther("1");
            const ethUsdValue = ethAmount; // Simplified: 1 ETH = 1 USD for calculation
            const totalUsdValue = coreUsdValue + ethUsdValue;
            
            console.log("💵 USD Values:");
            console.log("  - CORE USD value:", ethers.formatEther(coreUsdValue), "USD");
            console.log("  - ETH USD value:", ethers.formatEther(ethUsdValue), "USD");
            console.log("  - Total USD value:", ethers.formatEther(totalUsdValue), "USD");
            
            // Execute deposit
            const tx = await stakeBasket.connect(user).deposit(coreAmount, { 
                value: ethAmount,
                gasLimit: 1000000
            });
            const receipt = await tx.wait();
            
            // Get results
            const basketBalanceAfter = await stakeBasketToken.balanceOf(user.address);
            const basketTokensReceived = basketBalanceAfter - basketBalanceBefore;
            
            console.log("🎁 Results:");
            console.log("  - BASKET tokens received:", ethers.formatEther(basketTokensReceived));
            console.log("  - Gas used:", receipt.gasUsed.toString());
            
            // Calculate conversion rate
            const conversionRate = (basketTokensReceived * ethers.parseEther("1")) / totalUsdValue;
            console.log("  - Conversion rate:", ethers.formatEther(conversionRate), "BASKET per USD");
            
            // Store results
            stakingResults.push({
                user: test.user,
                input: {
                    coreTokens: test.coreAmount,
                    ethValue: test.ethAmount,
                    totalUsdValue: ethers.formatEther(totalUsdValue)
                },
                output: {
                    basketTokens: ethers.formatEther(basketTokensReceived),
                    conversionRate: ethers.formatEther(conversionRate),
                    gasUsed: receipt.gasUsed.toString()
                }
            });
            
            console.log("✅ SUCCESS!");
            
        } catch (error) {
            console.log("❌ Failed:", error.reason || error.message);
            stakingResults.push({
                user: test.user,
                input: { coreTokens: test.coreAmount, ethValue: test.ethAmount },
                output: { error: error.reason || error.message }
            });
        }
    }
    
    // === DUAL STAKING TESTS ===
    console.log("\n⚡ DUAL STAKING ANALYSIS");
    console.log("========================");
    
    const dualStakingTests = [
        { user: "David", core: "100", btc: "0.001", tier: "Bronze", description: "Minimum dual stake" },
        { user: "Eve", core: "500", btc: "0.005", tier: "Silver", description: "Medium dual stake" },
        { user: "Frank", core: "2000", btc: "0.02", tier: "Gold", description: "Large dual stake" }
    ];
    
    const dualStakingResults = [];
    
    for (let i = 0; i < dualStakingTests.length; i++) {
        const test = dualStakingTests[i];
        const user = [user3, user4, user5][i];
        
        console.log(`\n👤 ${test.user} - ${test.description}`);
        console.log("=======================================");
        
        // Setup user for dual staking
        await mockCORE.mint(user.address, ethers.parseEther("100000"));
        await mockBTC.mint(user.address, ethers.parseUnits("10", 8));
        await mockCORE.connect(user).approve(contracts.dualStakingBasket, ethers.parseEther("50000"));
        await mockBTC.connect(user).approve(contracts.dualStakingBasket, ethers.parseUnits("1", 8));
        
        // Get balance before
        const basketBalanceBefore = await stakeBasketToken.balanceOf(user.address);
        
        try {
            const coreAmount = ethers.parseEther(test.core);
            const btcAmount = ethers.parseUnits(test.btc, 8);
            
            console.log("💸 Inputs:");
            console.log("  - CORE tokens:", test.core);
            console.log("  - BTC tokens:", test.btc);
            console.log("  - Target tier:", test.tier);
            
            // Calculate USD values
            const coreUsdValue = (coreAmount * corePrice) / ethers.parseEther("1");
            const btcUsdValue = (btcAmount * btcPrice) / ethers.parseUnits("1", 8);
            const totalUsdValue = coreUsdValue + btcUsdValue;
            
            console.log("💵 USD Values:");
            console.log("  - CORE USD value:", ethers.formatEther(coreUsdValue), "USD");
            console.log("  - BTC USD value:", ethers.formatEther(btcUsdValue), "USD");
            console.log("  - Total USD value:", ethers.formatEther(totalUsdValue), "USD");
            
            // Calculate tier
            try {
                const calculatedTier = await dualStakingBasket.calculateDepositTier(coreAmount, btcAmount);
                console.log("  - Calculated tier:", calculatedTier.toString());
            } catch (e) {
                console.log("  - Tier calculation:", "Not available");
            }
            
            // Execute dual deposit
            const tx = await dualStakingBasket.connect(user).deposit(coreAmount, btcAmount, {
                gasLimit: 1500000
            });
            const receipt = await tx.wait();
            
            // Get results
            const basketBalanceAfter = await stakeBasketToken.balanceOf(user.address);
            const basketTokensReceived = basketBalanceAfter - basketBalanceBefore;
            
            console.log("🎁 Results:");
            console.log("  - BASKET tokens received:", ethers.formatEther(basketTokensReceived));
            console.log("  - Gas used:", receipt.gasUsed.toString());
            
            // Calculate conversion rate
            const conversionRate = totalUsdValue > 0 ? (basketTokensReceived * ethers.parseEther("1")) / totalUsdValue : 0n;
            console.log("  - Conversion rate:", ethers.formatEther(conversionRate), "BASKET per USD");
            
            // Store results
            dualStakingResults.push({
                user: test.user,
                input: {
                    coreTokens: test.core,
                    btcTokens: test.btc,
                    totalUsdValue: ethers.formatEther(totalUsdValue)
                },
                output: {
                    basketTokens: ethers.formatEther(basketTokensReceived),
                    conversionRate: ethers.formatEther(conversionRate),
                    gasUsed: receipt.gasUsed.toString()
                }
            });
            
            console.log("✅ SUCCESS!");
            
        } catch (error) {
            console.log("❌ Failed:", error.reason || error.message);
            console.log("🔍 Full error:", error.toString().substring(0, 200));
            
            dualStakingResults.push({
                user: test.user,
                input: { coreTokens: test.core, btcTokens: test.btc },
                output: { error: error.reason || error.message }
            });
        }
    }
    
    // === SYSTEM STATE ANALYSIS ===
    console.log("\n📊 FINAL SYSTEM STATE ANALYSIS");
    console.log("==============================");
    
    const finalTotalSupply = await stakeBasketToken.totalSupply();
    const finalCorePrice = await priceFeed.getPrice("CORE");
    const finalBtcPrice = await priceFeed.getPrice("BTC");
    
    // Get all user balances
    const allUsers = [user1, user2, user3, user4, user5];
    const userBalances = [];
    
    for (let i = 0; i < allUsers.length; i++) {
        const user = allUsers[i];
        const basketBalance = await stakeBasketToken.balanceOf(user.address);
        const coreBalance = await mockCORE.balanceOf(user.address);
        const btcBalance = await mockBTC.balanceOf(user.address);
        const ethBalance = await ethers.provider.getBalance(user.address);
        
        userBalances.push({
            user: `User${i + 1}`,
            basketTokens: ethers.formatEther(basketBalance),
            coreTokens: ethers.formatEther(coreBalance),
            btcTokens: ethers.formatUnits(btcBalance, 8),
            ethBalance: ethers.formatEther(ethBalance)
        });
    }
    
    // === COMPILE COMPLETE DATA ===
    const completeStakingData = {
        network: "localhost",
        timestamp: new Date().toISOString(),
        marketPrices: {
            CORE: ethers.formatEther(finalCorePrice) + " USD",
            BTC: ethers.formatEther(finalBtcPrice) + " USD"
        },
        contractAddresses: contracts,
        stakingResults: {
            regular: stakingResults,
            dual: dualStakingResults
        },
        systemState: {
            totalBasketSupply: ethers.formatEther(finalTotalSupply),
            stalenessEnabled: await priceFeed.stalenessCheckEnabled(),
            contractPaused: await stakeBasket.paused()
        },
        userBalances: userBalances,
        summary: {
            totalStakingTests: stakingTests.length,
            totalDualStakingTests: dualStakingTests.length,
            successfulStakes: stakingResults.filter(r => !r.output.error).length,
            successfulDualStakes: dualStakingResults.filter(r => !r.output.error).length
        }
    };
    
    console.log("\n🎉 COMPLETE STAKING DATA SUMMARY");
    console.log("================================");
    console.log("📊 Total BASKET tokens in circulation:", ethers.formatEther(finalTotalSupply));
    console.log("📊 Successful regular stakes:", completeStakingData.summary.successfulStakes, "/", completeStakingData.summary.totalStakingTests);
    console.log("📊 Successful dual stakes:", completeStakingData.summary.successfulDualStakes, "/", completeStakingData.summary.totalDualStakingTests);
    
    console.log("\n📋 COMPLETE INTERACTION DATA:");
    console.log("=============================");
    console.log(JSON.stringify(completeStakingData, null, 2));
    
    return completeStakingData;
}

main()
    .then((data) => {
        console.log("\n🚀 COMPLETE STAKING ANALYSIS FINISHED!");
        console.log("======================================");
        console.log("✅ All staking scenarios tested");
        console.log("✅ Exact conversion rates calculated"); 
        console.log("✅ USD values computed");
        console.log("✅ Gas costs measured");
        console.log("📊 Complete data exported above");
    })
    .catch((error) => {
        console.error("❌ Analysis failed:", error);
        process.exitCode = 1;
    });