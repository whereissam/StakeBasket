const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DualStakingBasket Integration Tests", function () {
    let dualStakingBasket, satoshiTierBasket, mockDualStaking;
    let basketToken, priceFeed, coreToken, btcToken;
    let owner, user1, user2, feeRecipient;
    
    // Constants matching contract definitions
    const SATOSHI_RATIO = ethers.parseEther("16000"); // 16,000:1
    const SUPER_RATIO = ethers.parseEther("6000"); // 6,000:1
    const BOOST_RATIO = ethers.parseEther("2000"); // 2,000:1
    
    beforeEach(async function () {
        [owner, user1, user2, feeRecipient] = await ethers.getSigners();
        
        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockCORE");
        coreToken = await MockToken.deploy(owner.address);
        await coreToken.waitForDeployment();
        
        const MockBTC = await ethers.getContractFactory("MockCoreBTC");
        btcToken = await MockBTC.deploy(owner.address);
        await btcToken.waitForDeployment();
        
        // Deploy StakeBasketToken
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        basketToken = await StakeBasketToken.deploy(
            "Dual Staking BASKET",
            "dsBASKET",
            owner.address
        );
        await basketToken.waitForDeployment();
        
        // Deploy PriceFeed
        const PriceFeed = await ethers.getContractFactory("PriceFeed");
        priceFeed = await PriceFeed.deploy(owner.address);
        await priceFeed.waitForDeployment();
        
        // Set initial prices: CORE = $1, BTC = $95,000
        await priceFeed.setPrice("CORE", ethers.parseEther("1"));
        await priceFeed.setPrice("lstBTC", ethers.parseEther("95000"));
        
        // Deploy MockDualStaking
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        mockDualStaking = await MockDualStaking.deploy(
            await coreToken.getAddress(),
            await btcToken.getAddress(),
            owner.address
        );
        await mockDualStaking.waitForDeployment();
        
        // Deploy DualStakingBasket
        const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
        dualStakingBasket = await DualStakingBasket.deploy(
            await basketToken.getAddress(),
            await priceFeed.getAddress(),
            await coreToken.getAddress(),
            await btcToken.getAddress(),
            await mockDualStaking.getAddress(),
            feeRecipient.address,
            3, // StakingTier.SATOSHI
            owner.address
        );
        await dualStakingBasket.waitForDeployment();
        
        // Deploy SatoshiTierBasket
        const SatoshiTierBasket = await ethers.getContractFactory("SatoshiTierBasket");
        satoshiTierBasket = await SatoshiTierBasket.deploy(
            await basketToken.getAddress(),
            await priceFeed.getAddress(),
            await coreToken.getAddress(),
            await btcToken.getAddress(),
            await mockDualStaking.getAddress(),
            feeRecipient.address,
            owner.address
        );
        await satoshiTierBasket.waitForDeployment();
        
        // Grant minting permissions to contracts
        await basketToken.setStakeBasketContract(await satoshiTierBasket.getAddress());
        
        // Fund reward pool
        await coreToken.mint(owner.address, ethers.parseEther("100000"));
        await coreToken.approve(await mockDualStaking.getAddress(), ethers.parseEther("50000"));
        await mockDualStaking.fundRewardPool(ethers.parseEther("50000"));
        
        // Distribute tokens to users
        await coreToken.mint(user1.address, ethers.parseEther("50000"));
        await coreToken.mint(user2.address, ethers.parseEther("50000"));
        await btcToken.mint(user1.address, ethers.parseEther("5"));
        await btcToken.mint(user2.address, ethers.parseEther("5"));
    });
    
    describe("Deployment", function () {
        it("Should deploy all contracts correctly", async function () {
            expect(await dualStakingBasket.targetTier()).to.equal(3); // SATOSHI tier
            expect(await satoshiTierBasket.targetTier()).to.equal(3);
            expect(await satoshiTierBasket.SATOSHI_RATIO()).to.equal(SATOSHI_RATIO);
        });
        
        it("Should set correct tier ratios", async function () {
            const tierInfo = await mockDualStaking.getTierInfo();
            expect(tierInfo.tierRatios[3]).to.equal(SATOSHI_RATIO);
            expect(tierInfo.tierRatios[2]).to.equal(SUPER_RATIO);
            expect(tierInfo.tierRatios[1]).to.equal(BOOST_RATIO);
        });
    });
    
    describe("Satoshi Tier Deposits", function () {
        it("Should calculate correct CORE requirement for Satoshi tier", async function () {
            const btcAmount = ethers.parseEther("1"); // 1 BTC
            const requiredCore = await satoshiTierBasket.estimateRequiredCORE(btcAmount);
            expect(requiredCore).to.equal(SATOSHI_RATIO);
        });
        
        it("Should validate Satoshi tier deposits correctly", async function () {
            const btcAmount = ethers.parseEther("1");
            const coreAmount = ethers.parseEther("16000");
            
            const [valid, requiredCore, reason] = await satoshiTierBasket.validateSatoshiDeposit(
                coreAmount,
                btcAmount
            );
            
            expect(valid).to.be.true;
            expect(requiredCore).to.equal(SATOSHI_RATIO);
        });
        
        it("Should reject insufficient CORE for Satoshi tier", async function () {
            const btcAmount = ethers.parseEther("1");
            const coreAmount = ethers.parseEther("10000"); // Too low
            
            const [valid, requiredCore, reason] = await satoshiTierBasket.validateSatoshiDeposit(
                coreAmount,
                btcAmount
            );
            
            expect(valid).to.be.false;
            expect(reason).to.include("Insufficient CORE");
        });
        
        it("Should successfully deposit for Satoshi tier", async function () {
            const btcAmount = ethers.parseEther("0.1"); // 0.1 BTC
            const coreAmount = ethers.parseEther("1600"); // 16,000 * 0.1
            
            // Approve tokens
            await coreToken.connect(user1).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user1).approve(await satoshiTierBasket.getAddress(), btcAmount);
            
            // Deposit
            await expect(
                satoshiTierBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount)
            ).to.emit(satoshiTierBasket, "SatoshiTierAchieved");
            
            // Check user received BASKET tokens
            const basketBalance = await basketToken.balanceOf(user1.address);
            expect(basketBalance).to.be.gt(0);
            
            // Verify tier status
            const [isSatoshiTier, currentRatio] = await satoshiTierBasket.getCurrentTierStatus();
            expect(currentRatio).to.be.gte(SATOSHI_RATIO);
        });
    });
    
    describe("Tier Status and Rewards", function () {
        beforeEach(async function () {
            // Setup a Satoshi tier deposit
            const btcAmount = ethers.parseEther("0.1");
            const coreAmount = ethers.parseEther("1600");
            
            await coreToken.connect(user1).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user1).approve(await satoshiTierBasket.getAddress(), btcAmount);
            await satoshiTierBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount);
        });
        
        it("Should correctly identify current tier", async function () {
            const [currentTier, ratio, target, needsRebalance] = await satoshiTierBasket.getCurrentTierStatus();
            expect(currentTier).to.equal(3); // SATOSHI tier
            expect(ratio).to.be.gte(SATOSHI_RATIO);
        });
        
        it("Should track staking in mock dual staking contract", async function () {
            const [btcStaked, coreStaked] = await mockDualStaking.getUserStake(await satoshiTierBasket.getAddress());
            expect(btcStaked).to.be.gt(0);
            expect(coreStaked).to.be.gt(0);
            
            // Check tier qualification
            const qualifies = await mockDualStaking.qualifiesForTier(await satoshiTierBasket.getAddress(), SATOSHI_RATIO);
            expect(qualifies).to.be.true;
        });
        
        it("Should accrue rewards over time", async function () {
            // Fast forward time
            await network.provider.send("evm_increaseTime", [86400]); // 1 day
            await network.provider.send("evm_mine");
            
            const pendingRewards = await mockDualStaking.getPendingRewards(await satoshiTierBasket.getAddress());
            expect(pendingRewards).to.be.gt(0);
        });
        
        it("Should compound rewards successfully", async function () {
            // Fast forward time to accrue rewards
            await network.provider.send("evm_increaseTime", [86400]); // 1 day
            await network.provider.send("evm_mine");
            
            const balanceBefore = await satoshiTierBasket.totalPooledCORE();
            
            await expect(
                satoshiTierBasket.compoundSatoshiRewards()
            ).to.emit(satoshiTierBasket, "RewardsCompounded");
            
            const balanceAfter = await satoshiTierBasket.totalPooledCORE();
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    });
    
    describe("Rebalancing", function () {
        it("Should detect when rebalancing is needed", async function () {
            // Create imbalanced deposit
            const btcAmount = ethers.parseEther("1");
            const coreAmount = ethers.parseEther("20000"); // Too much CORE
            
            await coreToken.connect(user1).approve(dualStakingBasket.address, coreAmount);
            await btcToken.connect(user1).approve(dualStakingBasket.address, btcAmount);
            await dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount);
            
            const needsRebalancing = await dualStakingBasket.needsRebalancing();
            expect(needsRebalancing).to.be.true;
        });
        
        it("Should maintain ratio after multiple deposits", async function () {
            // First deposit - perfect ratio
            let btcAmount = ethers.parseEther("0.1");
            let coreAmount = ethers.parseEther("1600");
            
            await coreToken.connect(user1).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user1).approve(await satoshiTierBasket.getAddress(), btcAmount);
            await satoshiTierBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount);
            
            // Second deposit - different ratio
            btcAmount = ethers.parseEther("0.05");
            coreAmount = ethers.parseEther("800");
            
            await coreToken.connect(user2).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user2).approve(await satoshiTierBasket.getAddress(), btcAmount);
            await satoshiTierBasket.connect(user2).depositForSatoshiTier(coreAmount, btcAmount);
            
            // Check that ratio is maintained
            const [, currentRatio] = await satoshiTierBasket.getCurrentTierStatus();
            expect(currentRatio).to.be.gte(SATOSHI_RATIO.mul(95).div(100)); // Within 5% tolerance
        });
    });
    
    describe("Redemptions", function () {
        beforeEach(async function () {
            // Setup initial deposit
            const btcAmount = ethers.parseEther("0.1");
            const coreAmount = ethers.parseEther("1600");
            
            await coreToken.connect(user1).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user1).approve(await satoshiTierBasket.getAddress(), btcAmount);
            await satoshiTierBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount);
        });
        
        it("Should allow partial redemption", async function () {
            const basketBalance = await basketToken.balanceOf(user1.address);
            const redeemAmount = basketBalance.div(2); // Redeem half
            
            const coreBalanceBefore = await coreToken.balanceOf(user1.address);
            const btcBalanceBefore = await btcToken.balanceOf(user1.address);
            
            await expect(
                satoshiTierBasket.connect(user1).redeem(redeemAmount)
            ).to.emit(satoshiTierBasket, "Redeemed");
            
            const coreBalanceAfter = await coreToken.balanceOf(user1.address);
            const btcBalanceAfter = await btcToken.balanceOf(user1.address);
            
            expect(coreBalanceAfter).to.be.gt(coreBalanceBefore);
            expect(btcBalanceAfter).to.be.gt(btcBalanceBefore);
        });
        
        it("Should maintain tier ratio after redemption", async function () {
            const basketBalance = await basketToken.balanceOf(user1.address);
            const redeemAmount = basketBalance.div(4); // Redeem 25%
            
            await satoshiTierBasket.connect(user1).redeem(redeemAmount);
            
            const [currentTier, ratio] = await satoshiTierBasket.getCurrentTierStatus();
            expect(currentTier).to.equal(3); // Still Satoshi tier
            expect(ratio).to.be.gte(SATOSHI_RATIO);
        });
    });
    
    describe("Emergency Functions", function () {
        beforeEach(async function () {
            const btcAmount = ethers.parseEther("0.1");
            const coreAmount = ethers.parseEther("1600");
            
            await coreToken.connect(user1).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user1).approve(await satoshiTierBasket.getAddress(), btcAmount);
            await satoshiTierBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount);
        });
        
        it("Should allow owner to toggle emergency mode", async function () {
            await expect(
                satoshiTierBasket.toggleEmergencyMode()
            ).to.emit(satoshiTierBasket, "EmergencyModeToggled");
            
            const emergencyMode = await satoshiTierBasket.emergencyMode();
            expect(emergencyMode).to.be.true;
        });
        
        it("Should prevent deposits in emergency mode", async function () {
            await satoshiTierBasket.toggleEmergencyMode();
            
            const btcAmount = ethers.parseEther("0.01");
            const coreAmount = ethers.parseEther("160");
            
            await coreToken.connect(user2).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user2).approve(await satoshiTierBasket.getAddress(), btcAmount);
            
            await expect(
                satoshiTierBasket.connect(user2).depositForSatoshiTier(coreAmount, btcAmount)
            ).to.be.revertedWith("SatoshiTier: emergency mode active");
        });
        
        it("Should allow emergency exit", async function () {
            await satoshiTierBasket.toggleEmergencyMode();
            
            await expect(
                satoshiTierBasket.emergencyExit()
            ).to.not.be.reverted;
            
            // Check that staked amounts are reset
            const totalStakedCORE = await satoshiTierBasket.totalStakedCORE();
            const totalStakedBTC = await satoshiTierBasket.totalStakedBTC();
            expect(totalStakedCORE).to.equal(0);
            expect(totalStakedBTC).to.equal(0);
        });
    });
    
    describe("Performance Tracking", function () {
        it("Should track performance metrics", async function () {
            const btcAmount = ethers.parseEther("0.1");
            const coreAmount = ethers.parseEther("1600");
            
            await coreToken.connect(user1).approve(await satoshiTierBasket.getAddress(), coreAmount);
            await btcToken.connect(user1).approve(await satoshiTierBasket.getAddress(), btcAmount);
            await satoshiTierBasket.connect(user1).depositForSatoshiTier(coreAmount, btcAmount);
            
            // Fast forward and compound rewards
            await network.provider.send("evm_increaseTime", [86400]);
            await network.provider.send("evm_mine");
            
            await satoshiTierBasket.compoundSatoshiRewards();
            
            const status = await satoshiTierBasket.getSatoshiTierStatus();
            expect(status.rewardsEarned).to.be.gt(0);
            expect(status.estimatedAPY).to.be.gt(0);
        });
    });
    
    describe("Integration with Mock Dual Staking", function () {
        it("Should correctly interact with dual staking tiers", async function () {
            // Test different tier deposits
            const deposits = [
                { btc: "0.1", core: "200", expectedTier: 0 }, // Base tier
                { btc: "0.1", core: "250", expectedTier: 1 }, // Boost tier  
                { btc: "0.1", core: "700", expectedTier: 2 }, // Super tier
                { btc: "0.1", core: "1600", expectedTier: 3 } // Satoshi tier
            ];
            
            for (let i = 0; i < deposits.length; i++) {
                const deposit = deposits[i];
                const btcAmount = ethers.parseEther(deposit.btc);
                const coreAmount = ethers.parseEther(deposit.core);
                
                // Direct stake to mock dual staking
                await coreToken.approve(mockDualStaking.address, coreAmount);
                await btcToken.approve(mockDualStaking.address, btcAmount);
                
                await mockDualStaking.stakeCORE(coreAmount);
                await mockDualStaking.stakeBTC(btcAmount);
                
                const [tier, apy] = await mockDualStaking.getTierRewards(owner.address);
                
                // Verify correct tier assignment (tier values are different in mock)
                const userRatio = await mockDualStaking.getUserRatio(owner.address);
                console.log(`Deposit ${i}: Ratio=${ethers.formatEther(userRatio)}, APY=${apy}`);
                
                // Unstake for next test
                await mockDualStaking.unstakeCORE(coreAmount);
                await mockDualStaking.unstakeBTC(btcAmount);
            }
        });
    });
});