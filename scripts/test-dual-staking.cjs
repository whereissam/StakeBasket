const { ethers } = require("hardhat");

async function testDualStakingIntegration() {
    console.log("🧪 Testing CoreDAO Dual Staking BASKET Integration...\n");
    
    const [deployer, user1] = await ethers.getSigners();
    console.log("Using accounts:");
    console.log("  Deployer:", deployer.address);
    console.log("  User1:", user1.address);
    
    try {
        // Load deployment info
        const fs = require('fs');
        const deploymentInfo = JSON.parse(fs.readFileSync('./dual-staking-deployment.json', 'utf8'));
        console.log("\n📋 Loading deployed contracts...");
        
        // Get contract instances
        const coreToken = await ethers.getContractAt("MockCORE", deploymentInfo.contracts.coreToken);
        const btcToken = await ethers.getContractAt("MockCoreBTC", deploymentInfo.contracts.btcToken);
        const mockDualStaking = await ethers.getContractAt("MockDualStaking", deploymentInfo.contracts.mockDualStaking);
        const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentInfo.contracts.basketToken);
        const satoshiTierBasket = await ethers.getContractAt("SatoshiTierBasket", deploymentInfo.contracts.satoshiTierBasket);
        
        console.log("✅ All contracts loaded successfully");
        
        // Test 1: Check tier ratios
        console.log("\n🎯 Test 1: Verify tier ratios...");
        const tierInfo = await mockDualStaking.getTierInfo();
        const expectedRatios = ["0.0", "2000.0", "6000.0", "16000.0"];
        const tierNames = ["Base", "Boost", "Super", "Satoshi"];
        
        for (let i = 0; i < 4; i++) {
            const ratio = ethers.formatEther(tierInfo.tierRatios[i]);
            const apy = Number(tierInfo.tierAPYs[i]);
            console.log(`  ${tierNames[i]} Tier: ${ratio}:1 ratio, ${apy/100}% APY`);
            
            if (ratio !== expectedRatios[i]) {
                throw new Error(`Incorrect ratio for ${tierNames[i]} tier: expected ${expectedRatios[i]}, got ${ratio}`);
            }
        }
        console.log("✅ All tier ratios verified");
        
        // Test 2: Give user1 some tokens
        console.log("\n💰 Test 2: Mint tokens for user1...");
        await coreToken.mint(user1.address, ethers.parseEther("20000"));
        await btcToken.mint(user1.address, ethers.parseEther("2"));
        
        const coreBalance = await coreToken.balanceOf(user1.address);
        const btcBalance = await btcToken.balanceOf(user1.address);
        console.log(`  User1 CORE balance: ${ethers.formatEther(coreBalance)}`);
        console.log(`  User1 BTC balance: ${ethers.formatEther(btcBalance)}`);
        console.log("✅ Tokens minted successfully");
        
        // Test 3: Satoshi Tier deposit validation
        console.log("\n🔍 Test 3: Test deposit validation...");
        const btcAmount = ethers.parseEther("0.1");
        const coreAmount = ethers.parseEther("1600");
        
        const [valid, requiredCore, reason] = await satoshiTierBasket.validateSatoshiDeposit(coreAmount, btcAmount);
        console.log(`  Deposit validation: ${valid ? 'VALID' : 'INVALID'}`);
        console.log(`  Required CORE: ${ethers.formatEther(requiredCore)}`);
        
        if (!valid) {
            throw new Error(`Deposit validation failed: ${reason}`);
        }
        console.log("✅ Deposit validation passed");
        
        // Test 4: Perform Satoshi Tier deposit
        console.log("\n💎 Test 4: Perform Satoshi Tier deposit...");
        
        // Approve tokens
        await coreToken.connect(user1).approve(deploymentInfo.contracts.satoshiTierBasket, coreAmount);
        await btcToken.connect(user1).approve(deploymentInfo.contracts.satoshiTierBasket, btcAmount);
        
        // Make deposit
        const depositTx = await satoshiTierBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount);
        const receipt = await depositTx.wait();
        
        // Check for events
        const events = receipt.logs.filter(log => {
            try {
                const parsed = satoshiTierBasket.interface.parseLog(log);
                return parsed.name === "SatoshiTierAchieved" || parsed.name === "Deposited";
            } catch (e) {
                return false;
            }
        });
        
        console.log(`  Transaction hash: ${receipt.hash}`);
        console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`  Events emitted: ${events.length}`);
        
        // Check BASKET balance
        const basketBalance = await basketToken.balanceOf(user1.address);
        console.log(`  BASKET tokens received: ${ethers.formatEther(basketBalance)}`);
        
        if (basketBalance === 0n) {
            throw new Error("No BASKET tokens were minted");
        }
        console.log("✅ Deposit successful");
        
        // Test 5: Check tier status
        console.log("\n📊 Test 5: Verify tier status...");
        const tierStatus = await satoshiTierBasket.getSatoshiTierStatus();
        
        console.log(`  Is Satoshi Tier: ${tierStatus.isSatoshiTier}`);
        console.log(`  Current Ratio: ${ethers.formatEther(tierStatus.currentRatio)}:1`);
        console.log(`  Target Ratio: ${ethers.formatEther(tierStatus.targetRatio_)}:1`);
        console.log(`  Needs Rebalance: ${tierStatus.needsRebalance}`);
        
        if (!tierStatus.isSatoshiTier) {
            throw new Error("Failed to achieve Satoshi tier");
        }
        console.log("✅ Satoshi tier achieved");
        
        // Test 6: Check dual staking integration
        console.log("\n🎯 Test 6: Verify dual staking integration...");
        const [btcStaked, coreStaked] = await mockDualStaking.getUserStake(deploymentInfo.contracts.satoshiTierBasket);
        console.log(`  BTC staked: ${ethers.formatEther(btcStaked)}`);
        console.log(`  CORE staked: ${ethers.formatEther(coreStaked)}`);
        
        // Check tier qualification in mock contract
        const satoshiRatio = ethers.parseEther("16000");
        const qualifies = await mockDualStaking.qualifiesForTier(deploymentInfo.contracts.satoshiTierBasket, satoshiRatio);
        console.log(`  Qualifies for Satoshi tier: ${qualifies}`);
        
        if (btcStaked === 0n || coreStaked === 0n) {
            throw new Error("Assets not properly staked in dual staking contract");
        }
        console.log("✅ Dual staking integration verified");
        
        // Test 7: Check rewards accrual (simulate time)
        console.log("\n⏰ Test 7: Test rewards accrual...");
        const pendingBefore = await mockDualStaking.getPendingRewards(deploymentInfo.contracts.satoshiTierBasket);
        console.log(`  Pending rewards before: ${ethers.formatEther(pendingBefore)}`);
        
        // Fast forward time (simulate 1 hour)
        await network.provider.send("evm_increaseTime", [3600]);
        await network.provider.send("evm_mine");
        
        const pendingAfter = await mockDualStaking.getPendingRewards(deploymentInfo.contracts.satoshiTierBasket);
        console.log(`  Pending rewards after 1 hour: ${ethers.formatEther(pendingAfter)}`);
        
        if (pendingAfter <= pendingBefore) {
            throw new Error("Rewards not accruing properly");
        }
        console.log("✅ Rewards accruing successfully");
        
        // Test 8: Test reward compounding
        console.log("\n🔄 Test 8: Test reward compounding...");
        const pooledCoreBefore = await satoshiTierBasket.totalPooledCORE();
        
        await satoshiTierBasket.compoundSatoshiRewards();
        
        const pooledCoreAfter = await satoshiTierBasket.totalPooledCORE();
        console.log(`  Pool CORE before: ${ethers.formatEther(pooledCoreBefore)}`);
        console.log(`  Pool CORE after: ${ethers.formatEther(pooledCoreAfter)}`);
        
        if (pooledCoreAfter <= pooledCoreBefore) {
            throw new Error("Rewards not compounded properly");
        }
        console.log("✅ Reward compounding successful");
        
        console.log("\n🎉 All tests passed successfully!");
        console.log("\n📈 Integration Summary:");
        console.log("=======================");
        console.log(`• Deployed to: ${deploymentInfo.network} (Chain ID: ${deploymentInfo.chainId})`);
        console.log(`• Satoshi Tier Ratio: 16,000:1 CORE:BTC`);
        console.log(`• Test deposit: ${ethers.formatEther(coreAmount)} CORE + ${ethers.formatEther(btcAmount)} BTC`);
        console.log(`• BASKET tokens minted: ${ethers.formatEther(basketBalance)}`);
        console.log(`• Rewards accrued in 1 hour: ${ethers.formatEther(pendingAfter - pendingBefore)} CORE`);
        console.log(`• Gas used for deposit: ${receipt.gasUsed.toString()}`);
        
        return { success: true };
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        return { success: false, error: error.message };
    }
}

// Execute tests
if (require.main === module) {
    testDualStakingIntegration()
        .then((result) => {
            if (result.success) {
                console.log("\n✅ All tests completed successfully");
                process.exit(0);
            } else {
                console.log("\n❌ Tests failed");
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error("Fatal error:", error);
            process.exit(1);
        });
}

module.exports = { testDualStakingIntegration };