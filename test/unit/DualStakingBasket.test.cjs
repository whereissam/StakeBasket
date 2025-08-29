const { expect } = require("chai");
const { ethers } = require("hardhat");
const { TestSetup } = require("../helpers/TestSetup.cjs");

describe("DualStakingBasket", function () {
  let setup;
  let dualStakingBasket, stakeBasketToken, mockPriceFeed, mockCORE, mockBTC;
  let owner, user1, user2, feeRecipient;

  const BRONZE_TIER = 0;
  const SILVER_TIER = 1;
  const GOLD_TIER = 2;
  const SATOSHI_TIER = 3;

  before(async function () {
    setup = new TestSetup();
    await setup.initialize();
    
    ({ dualStakingBasket, stakeBasketToken, mockPriceFeed } = setup.contracts);
    ({ mockCORE, mockBTC } = setup.tokens);
    ({ owner, user1, user2, feeRecipient } = setup);
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await dualStakingBasket.basketToken()).to.equal(await stakeBasketToken.getAddress());
      expect(await dualStakingBasket.priceFeed()).to.equal(await mockPriceFeed.getAddress());
      expect(await dualStakingBasket.coreToken()).to.equal(await mockCORE.getAddress());
      expect(await dualStakingBasket.btcToken()).to.equal(await mockBTC.getAddress());
      expect(await dualStakingBasket.targetTier()).to.equal(BRONZE_TIER);
    });

    it("Should initialize tier system correctly", async function () {
      // Check tier ratios
      expect(await dualStakingBasket.tierRatios(BRONZE_TIER)).to.equal(ethers.parseEther("5000"));
      expect(await dualStakingBasket.tierRatios(SILVER_TIER)).to.equal(ethers.parseEther("10000"));
      expect(await dualStakingBasket.tierRatios(GOLD_TIER)).to.equal(ethers.parseEther("20000"));
      expect(await dualStakingBasket.tierRatios(SATOSHI_TIER)).to.equal(ethers.parseEther("25000"));

      // Check USD thresholds
      expect(await dualStakingBasket.tierMinUSD(BRONZE_TIER)).to.equal(1000);
      expect(await dualStakingBasket.tierMinUSD(SILVER_TIER)).to.equal(10000);
      expect(await dualStakingBasket.tierMinUSD(GOLD_TIER)).to.equal(100000);
      expect(await dualStakingBasket.tierMinUSD(SATOSHI_TIER)).to.equal(500000);
    });
  });

  describe("Tier Calculation", function () {
    it("Should calculate Bronze tier for small deposits", async function () {
      // Setup user balances
      const coreAmount = ethers.parseEther("1000"); // 1000 CORE
      const btcAmount = ethers.parseUnits("0.01", 8); // 0.01 BTC
      
      await setup.setupUserBalances(user1, "2000", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "2000", "1");
      
      // This should be Bronze tier (~$1,965 USD value)
      await expect(
        dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount)
      ).to.not.be.reverted;
      
      expect(await dualStakingBasket.totalPooledCORE()).to.equal(coreAmount);
      expect(await dualStakingBasket.totalPooledBTC()).to.equal(btcAmount);
    });

    it("Should calculate Silver tier for medium deposits", async function () {
      const coreAmount = ethers.parseEther("10000"); // 10,000 CORE
      const btcAmount = ethers.parseUnits("0.1", 8); // 0.1 BTC
      
      await setup.setupUserBalances(user2, "20000", "1");
      await setup.approveTokens(user2, await dualStakingBasket.getAddress(), "20000", "1");
      
      // This should be Silver tier (~$24,500 USD value)
      await expect(
        dualStakingBasket.connect(user2).deposit(coreAmount, btcAmount)
      ).to.not.be.reverted;
    });

    it("Should revert for insufficient minimum deposits", async function () {
      const coreAmount = ethers.parseEther("5"); // Below minimum
      const btcAmount = ethers.parseUnits("0.001", 8);
      
      await setup.setupUserBalances(user1, "10", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "10", "1");
      
      await expect(
        dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount)
      ).to.be.revertedWith("DualStaking: insufficient CORE amount");
    });

    it("Should revert for insufficient USD value", async function () {
      const coreAmount = ethers.parseEther("15"); // Just above min CORE but low USD value
      const btcAmount = ethers.parseUnits("0.0001", 8); // Very small BTC
      
      await setup.setupUserBalances(user1, "20", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "20", "1");
      
      await expect(
        dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount)
      ).to.be.revertedWith("DualStaking: insufficient USD value");
    });
  });

  describe("Native CORE Deposits", function () {
    it("Should accept native CORE and ERC20 BTC", async function () {
      const coreAmount = ethers.parseEther("1000");
      const btcAmount = ethers.parseUnits("0.01", 8);
      
      await setup.setupUserBalances(user1, "0", "1"); // No ERC20 CORE needed
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "0", "1");
      
      const tx = await dualStakingBasket.connect(user1).depositNativeCORE(btcAmount, {
        value: coreAmount
      });
      
      await expect(tx)
        .to.emit(dualStakingBasket, "Deposited")
        .withArgs(user1.address, coreAmount, btcAmount, await dualStakingBasket.basketToken.staticCall().then(async (tokenAddr) => {
          const token = await ethers.getContractAt("StakeBasketToken", tokenAddr);
          return await token.balanceOf(user1.address);
        }));
    });

    it("Should require both assets for dual staking", async function () {
      const coreAmount = ethers.parseEther("1000");
      
      await expect(
        dualStakingBasket.connect(user1).depositNativeCORE(0, { value: coreAmount })
      ).to.be.revertedWith("DualStaking: both assets required for dual staking");
    });
  });

  describe("Rebalancing System", function () {
    beforeEach(async function () {
      // Set up initial deposit
      const coreAmount = ethers.parseEther("5000");
      const btcAmount = ethers.parseUnits("0.05", 8);
      
      await setup.setupUserBalances(user1, "10000", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "10000", "1");
      
      await dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount);
    });

    it("Should detect when rebalancing is needed", async function () {
      // Change target tier to create imbalance
      await dualStakingBasket.connect(owner).setTargetTier(SILVER_TIER);
      
      const needsRebalancing = await dualStakingBasket.needsRebalancing();
      expect(needsRebalancing).to.be.true;
    });

    it("Should not need rebalancing when ratio is optimal", async function () {
      const needsRebalancing = await dualStakingBasket.needsRebalancing();
      expect(needsRebalancing).to.be.false;
    });

    it("Should respect minimum rebalance interval", async function () {
      // Change tier to trigger rebalance need
      await dualStakingBasket.connect(owner).setTargetTier(SILVER_TIER);
      
      // Should need rebalancing
      expect(await dualStakingBasket.needsRebalancing()).to.be.true;
      
      // But not immediately after last rebalance time update
      await dualStakingBasket.connect(owner).setMinRebalanceInterval(3600); // 1 hour
      
      const needsRebalancing = await dualStakingBasket.needsRebalancing();
      expect(needsRebalancing).to.be.false; // Due to time constraint
    });
  });

  describe("Redemption", function () {
    beforeEach(async function () {
      const coreAmount = ethers.parseEther("1000");
      const btcAmount = ethers.parseUnits("0.01", 8);
      
      await setup.setupUserBalances(user1, "2000", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "2000", "1");
      
      await dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount);
    });

    it("Should redeem basket tokens for underlying assets", async function () {
      const userShares = await stakeBasketToken.balanceOf(user1.address);
      const halfShares = userShares / 2n;
      
      const coreBalanceBefore = await mockCORE.balanceOf(user1.address);
      const btcBalanceBefore = await mockBTC.balanceOf(user1.address);
      
      await dualStakingBasket.connect(user1).redeem(halfShares);
      
      const coreBalanceAfter = await mockCORE.balanceOf(user1.address);
      const btcBalanceAfter = await mockBTC.balanceOf(user1.address);
      
      expect(coreBalanceAfter).to.be.gt(coreBalanceBefore);
      expect(btcBalanceAfter).to.be.gt(btcBalanceBefore);
      
      // Check shares were burned
      expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(halfShares);
    });

    it("Should revert if insufficient shares", async function () {
      const excessiveShares = ethers.parseEther("999999");
      
      await expect(
        dualStakingBasket.connect(user1).redeem(excessiveShares)
      ).to.be.revertedWith("DualStaking: insufficient shares");
    });
  });

  describe("Tier Management", function () {
    it("Should update target tier and ratio", async function () {
      await dualStakingBasket.connect(owner).setTargetTier(GOLD_TIER);
      
      expect(await dualStakingBasket.targetTier()).to.equal(GOLD_TIER);
      expect(await dualStakingBasket.targetRatio()).to.equal(ethers.parseEther("20000"));
    });

    it("Should update tier ratios", async function () {
      const newRatio = ethers.parseEther("15000");
      
      await dualStakingBasket.connect(owner).updateTierRatio(SILVER_TIER, newRatio);
      
      expect(await dualStakingBasket.tierRatios(SILVER_TIER)).to.equal(newRatio);
    });

    it("Should get current tier status", async function () {
      const status = await dualStakingBasket.getCurrentTierStatus();
      
      expect(status.currentTier).to.be.oneOf([BRONZE_TIER, SILVER_TIER, GOLD_TIER, SATOSHI_TIER]);
      expect(status.currentRatio).to.be.a('bigint');
      expect(status.targetRatio_).to.be.a('bigint');
      expect(status.needsRebalance).to.be.a('boolean');
    });
  });

  describe("Pool Information", function () {
    beforeEach(async function () {
      const coreAmount = ethers.parseEther("1000");
      const btcAmount = ethers.parseUnits("0.01", 8);
      
      await setup.setupUserBalances(user1, "2000", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "2000", "1");
      
      await dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount);
    });

    it("Should return accurate pool information", async function () {
      const poolInfo = await dualStakingBasket.getPoolInfo();
      
      expect(poolInfo.totalCORE).to.equal(ethers.parseEther("1000"));
      expect(poolInfo.totalBTC).to.equal(ethers.parseUnits("0.01", 8));
      expect(poolInfo.totalValueUSD).to.be.gt(0);
      expect(poolInfo.sharePrice).to.be.gt(0);
    });

    it("Should return rebalance information", async function () {
      const rebalanceInfo = await dualStakingBasket.getRebalanceInfo();
      
      expect(rebalanceInfo.isPaused).to.be.a('boolean');
      expect(rebalanceInfo.lastRebalance).to.be.a('bigint');
      expect(rebalanceInfo.failureCount).to.be.a('bigint');
      expect(rebalanceInfo.totalRebalances).to.be.a('bigint');
      expect(rebalanceInfo.canRebalance).to.be.a('boolean');
    });

    it("Should return strategy information", async function () {
      const strategyInfo = await dualStakingBasket.getStrategyInfo();
      
      expect(strategyInfo.strategyName).to.include("CORE+BTC");
      expect(strategyInfo.description).to.include("dual staking");
      expect(strategyInfo.riskLevel).to.equal("Medium");
      expect(strategyInfo.currentAPY).to.be.gt(0);
    });

    it("Should return basket composition", async function () {
      const composition = await dualStakingBasket.getBasketComposition();
      
      expect(composition.assetNames).to.have.length(2);
      expect(composition.assetSymbols).to.include("CORE");
      expect(composition.assetSymbols).to.include("BTC");
      expect(composition.allocations).to.have.length(2);
      expect(composition.values).to.have.length(2);
      expect(composition.totalValue).to.be.gt(0);
    });
  });

  describe("User Position Tracking", function () {
    it("Should track user position accurately", async function () {
      const coreAmount = ethers.parseEther("1000");
      const btcAmount = ethers.parseUnits("0.01", 8);
      
      await setup.setupUserBalances(user1, "2000", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "2000", "1");
      
      await dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount);
      
      const position = await dualStakingBasket.getUserPosition(user1.address);
      
      expect(position.basketTokenBalance).to.be.gt(0);
      expect(position.valueInUSD).to.be.gt(0);
      expect(position.coreEquivalent).to.equal(coreAmount);
      expect(position.btcEquivalent).to.equal(btcAmount);
      expect(position.shareOfPool).to.equal(10000); // 100% since only user
    });
  });

  describe("Optimal Deposit Calculation", function () {
    it("Should calculate optimal deposit amounts", async function () {
      const usdAmount = 10000; // $10k
      
      const optimal = await dualStakingBasket.getOptimalDepositAmounts(usdAmount);
      
      expect(optimal.recommendedCoreAmount).to.be.gt(0);
      expect(optimal.recommendedBtcAmount).to.be.gt(0);
      expect(optimal.achievableTier).to.be.oneOf([BRONZE_TIER, SILVER_TIER, GOLD_TIER, SATOSHI_TIER]);
      expect(optimal.rationale).to.be.a('string');
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause/unpause", async function () {
      await dualStakingBasket.connect(owner).pause();
      expect(await dualStakingBasket.paused()).to.be.true;
      
      await dualStakingBasket.connect(owner).unpause();
      expect(await dualStakingBasket.paused()).to.be.false;
    });

    it("Should prevent non-owner from admin functions", async function () {
      await expect(
        dualStakingBasket.connect(user1).setTargetTier(GOLD_TIER)
      ).to.be.revertedWithCustomError(dualStakingBasket, "OwnableUnauthorizedAccount");
    });

    it("Should prevent deposits when paused", async function () {
      await dualStakingBasket.connect(owner).pause();
      
      const coreAmount = ethers.parseEther("1000");
      const btcAmount = ethers.parseUnits("0.01", 8);
      
      await expect(
        dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount)
      ).to.be.revertedWithCustomError(dualStakingBasket, "EnforcedPause");
    });
  });

  describe("Circuit Breaker", function () {
    it("Should pause rebalancing when circuit breaker triggers", async function () {
      await dualStakingBasket.connect(owner).pauseRebalancing("Testing circuit breaker");
      
      expect(await dualStakingBasket.rebalancingPaused()).to.be.true;
      expect(await dualStakingBasket.needsRebalancing()).to.be.false;
    });

    it("Should resume rebalancing", async function () {
      await dualStakingBasket.connect(owner).pauseRebalancing("Test");
      await dualStakingBasket.connect(owner).resumeRebalancing();
      
      expect(await dualStakingBasket.rebalancingPaused()).to.be.false;
      expect(await dualStakingBasket.rebalanceFailureCount()).to.equal(0);
    });
  });

  describe("Tier Benefits Information", function () {
    it("Should return tier benefits information", async function () {
      const benefits = await dualStakingBasket.getTierBenefits();
      
      expect(benefits.tierNames).to.have.length(4);
      expect(benefits.ratioRequirements).to.have.length(4);
      expect(benefits.apyBoosts).to.have.length(4);
      expect(benefits.descriptions).to.have.length(4);
      
      expect(benefits.tierNames[0]).to.equal("Bronze Pool");
      expect(benefits.tierNames[3]).to.equal("Satoshi Pool");
      
      expect(benefits.ratioRequirements[0]).to.equal(5000);
      expect(benefits.ratioRequirements[3]).to.equal(25000);
    });
  });
});