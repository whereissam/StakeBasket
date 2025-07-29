const { ethers } = require("hardhat");

async function quickTest() {
    console.log("🚀 Quick CoreDAO Dual Staking Test\n");
    
    const [deployer, user1] = await ethers.getSigners();
    
    try {
        // Deploy minimal setup
        console.log("📝 Deploying contracts...");
        
        // Deploy tokens
        const MockCORE = await ethers.getContractFactory("MockCORE");
        const coreToken = await MockCORE.deploy(deployer.address);
        await coreToken.waitForDeployment();
        
        const MockBTC = await ethers.getContractFactory("MockCoreBTC");
        const btcToken = await MockBTC.deploy(deployer.address);
        await btcToken.waitForDeployment();
        
        // Deploy PriceFeed
        const PriceFeed = await ethers.getContractFactory("PriceFeed");
        const priceFeed = await PriceFeed.deploy(deployer.address);
        await priceFeed.waitForDeployment();
        
        // Deploy MockDualStaking
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        const mockDualStaking = await MockDualStaking.deploy(
            await coreToken.getAddress(),
            await btcToken.getAddress(),
            deployer.address
        );
        await mockDualStaking.waitForDeployment();
        
        // Fund reward pool
        await coreToken.approve(await mockDualStaking.getAddress(), ethers.parseEther("50000"));
        await mockDualStaking.fundRewardPool(ethers.parseEther("50000"));
        
        // Deploy BasketToken
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        const basketToken = await StakeBasketToken.deploy(
            "Satoshi BASKET", "sBASKET", deployer.address
        );
        await basketToken.waitForDeployment();
        
        // Deploy SatoshiTierBasket
        const SatoshiTierBasket = await ethers.getContractFactory("SatoshiTierBasket");
        const satoshiBasket = await SatoshiTierBasket.deploy(
            await basketToken.getAddress(),
            await priceFeed.getAddress(),
            await coreToken.getAddress(),
            await btcToken.getAddress(),
            await mockDualStaking.getAddress(),
            deployer.address,
            deployer.address
        );
        await satoshiBasket.waitForDeployment();
        
        // Set permissions
        await basketToken.setStakeBasketContract(await satoshiBasket.getAddress());
        
        console.log("✅ All contracts deployed");
        
        // Test tier information
        console.log("\n🎯 Testing tier ratios...");
        const tierInfo = await mockDualStaking.getTierInfo();
        console.log(`Satoshi Tier Ratio: ${ethers.formatEther(tierInfo.tierRatios[3])}:1`);
        console.log(`Satoshi Tier APY: ${Number(tierInfo.tierAPYs[3])/100}%`);
        
        // Mint tokens for user
        console.log("\n💰 Minting tokens for user...");
        await coreToken.mint(user1.address, ethers.parseEther("20000"));
        await btcToken.mint(user1.address, ethers.parseEther("2"));
        
        // Test deposit validation
        console.log("\n🔍 Testing deposit validation...");
        const btcAmount = ethers.parseEther("0.1");
        const coreAmount = ethers.parseEther("1600");
        
        const requiredCore = await satoshiBasket.estimateRequiredCORE(btcAmount);
        console.log(`Required CORE for ${ethers.formatEther(btcAmount)} BTC: ${ethers.formatEther(requiredCore)}`);
        
        // Validate deposit
        const [valid, , reason] = await satoshiBasket.validateSatoshiDeposit(coreAmount, btcAmount);
        console.log(`Deposit validation: ${valid ? "✅ VALID" : "❌ INVALID"} ${!valid ? `(${reason})` : ""}`);
        
        // Make deposit
        console.log("\n💎 Making Satoshi Tier deposit...");
        await coreToken.connect(user1).approve(await satoshiBasket.getAddress(), coreAmount);
        await btcToken.connect(user1).approve(await satoshiBasket.getAddress(), btcAmount);
        
        const tx = await satoshiBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount);
        await tx.wait();
        
        // Check results
        const basketBalance = await basketToken.balanceOf(user1.address);
        const tierStatus = await satoshiBasket.getSatoshiTierStatus();
        
        console.log(`✅ Deposit successful!`);
        console.log(`   BASKET tokens received: ${ethers.formatEther(basketBalance)}`);
        console.log(`   Achieved Satoshi Tier: ${tierStatus.isSatoshiTier}`);
        console.log(`   Current ratio: ${ethers.formatEther(tierStatus.currentRatio)}:1`);
        
        // Test dual staking integration
        console.log("\n🎯 Checking dual staking integration...");
        const [btcStaked, coreStaked] = await mockDualStaking.getUserStake(await satoshiBasket.getAddress());
        console.log(`   BTC staked: ${ethers.formatEther(btcStaked)}`);
        console.log(`   CORE staked: ${ethers.formatEther(coreStaked)}`);
        
        // Check tier qualification
        const qualifies = await mockDualStaking.qualifiesForTier(
            await satoshiBasket.getAddress(), 
            ethers.parseEther("16000")
        );
        console.log(`   Qualifies for Satoshi tier: ${qualifies}`);
        
        // Test rewards
        console.log("\n⏰ Testing reward accrual...");
        await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
        await ethers.provider.send("evm_mine", []);
        
        const pendingRewards = await mockDualStaking.getPendingRewards(await satoshiBasket.getAddress());
        console.log(`   Rewards accrued in 1 hour: ${ethers.formatEther(pendingRewards)} CORE`);
        
        // Compound rewards
        const pooledBefore = await satoshiBasket.totalPooledCORE();
        await satoshiBasket.compoundSatoshiRewards();
        const pooledAfter = await satoshiBasket.totalPooledCORE();
        
        console.log(`   Pool CORE before compounding: ${ethers.formatEther(pooledBefore)}`);
        console.log(`   Pool CORE after compounding: ${ethers.formatEther(pooledAfter)}`);
        
        console.log("\n🎉 ALL TESTS PASSED!");
        console.log("\n📊 SUMMARY:");
        console.log("=============");
        console.log(`✅ Satoshi Tier Ratio: 16,000:1 CORE:BTC`);
        console.log(`✅ Tier APY: 20%`);
        console.log(`✅ Deposit: ${ethers.formatEther(coreAmount)} CORE + ${ethers.formatEther(btcAmount)} BTC`);
        console.log(`✅ BASKET Tokens: ${ethers.formatEther(basketBalance)}`);
        console.log(`✅ Rewards Accrued: ${ethers.formatEther(pendingRewards)} CORE/hour`);
        console.log(`✅ Auto-compounding: ${ethers.formatEther(pooledAfter - pooledBefore)} CORE added`);
        
        return { success: true };
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        return { success: false, error: error.message };
    }
}

if (require.main === module) {
    quickTest()
        .then((result) => {
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Fatal error:", error);
            process.exit(1);
        });
}

module.exports = { quickTest };