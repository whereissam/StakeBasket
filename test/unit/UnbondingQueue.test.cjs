const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("UnbondingQueue", function () {
  let unbondingQueue;
  let owner, user1, user2, liquidityProvider1, liquidityProvider2;

  const CORE_ASSET = "CORE";
  const LSTBTC_ASSET = "lstBTC";
  const UNBONDING_PERIOD = 1 * 24 * 60 * 60; // 1 day
  const MAX_INSTANT_WITHDRAWAL = ethers.parseEther("100000");

  beforeEach(async function () {
    [owner, user1, user2, liquidityProvider1, liquidityProvider2] = await ethers.getSigners();

    const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
    unbondingQueue = await UnbondingQueue.deploy(await owner.getAddress());
    await unbondingQueue.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await unbondingQueue.owner()).to.equal(await owner.getAddress());
      expect(await unbondingQueue.CORE_UNBONDING_PERIOD()).to.equal(UNBONDING_PERIOD);
      expect(await unbondingQueue.LSTBTC_UNBONDING_PERIOD()).to.equal(UNBONDING_PERIOD);
      expect(await unbondingQueue.MAX_INSTANT_WITHDRAWAL()).to.equal(MAX_INSTANT_WITHDRAWAL);
    });

    it("Should have correct initial parameters", async function () {
      expect(await unbondingQueue.DEFAULT_RESERVE_RATIO()).to.equal(500); // 5%
      expect(await unbondingQueue.instantWithdrawalFee()).to.equal(25); // 0.25%
      expect(await unbondingQueue.liquidityProviderFee()).to.equal(10); // 0.1%
      expect(await unbondingQueue.maxInstantWithdrawalRatio()).to.equal(1000); // 10%
    });
  });

  describe("Unbonding Requests", function () {
    it("Should create unbonding request", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        unbondingQueue.connect(owner).requestUnbonding(
          await user1.getAddress(),
          amount,
          CORE_ASSET
        )
      ).to.emit(unbondingQueue, "UnbondingRequested");

      expect(await unbondingQueue.totalQueuedByAsset(CORE_ASSET)).to.equal(amount);
      expect(await unbondingQueue.nextRequestId()).to.equal(1);
    });

    it("Should create multiple requests for same user", async function () {
      const amount1 = ethers.parseEther("500");
      const amount2 = ethers.parseEther("300");
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        amount1,
        CORE_ASSET
      );
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        amount2,
        CORE_ASSET
      );

      expect(await unbondingQueue.totalQueuedByAsset(CORE_ASSET)).to.equal(amount1 + amount2);
      
      const pendingRequests = await unbondingQueue.getUserPendingRequests(await user1.getAddress());
      expect(pendingRequests.length).to.equal(2);
    });

    it("Should handle different asset types", async function () {
      const coreAmount = ethers.parseEther("1000");
      const lstBTCAmount = ethers.parseEther("500");
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        coreAmount,
        CORE_ASSET
      );
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        lstBTCAmount,
        LSTBTC_ASSET
      );

      expect(await unbondingQueue.totalQueuedByAsset(CORE_ASSET)).to.equal(coreAmount);
      expect(await unbondingQueue.totalQueuedByAsset(LSTBTC_ASSET)).to.equal(lstBTCAmount);
    });

    it("Should set correct unlock times", async function () {
      const amount = ethers.parseEther("1000");
      const beforeTime = await time.latest();
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        amount,
        CORE_ASSET
      );
      
      const afterTime = await time.latest();
      const pendingRequests = await unbondingQueue.getUserPendingRequests(await user1.getAddress());
      
      expect(pendingRequests[0].unlockTime).to.be.at.least(beforeTime + UNBONDING_PERIOD);
      expect(pendingRequests[0].unlockTime).to.be.at.most(afterTime + UNBONDING_PERIOD);
    });
  });

  describe("Queue Information", function () {
    beforeEach(async function () {
      // Create some requests
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        ethers.parseEther("1000"),
        CORE_ASSET
      );
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user2.getAddress(),
        ethers.parseEther("500"),
        CORE_ASSET
      );
    });

    it("Should return correct queue info", async function () {
      const queueInfo = await unbondingQueue.getQueueInfo(await user1.getAddress(), CORE_ASSET);
      
      expect(queueInfo.totalQueued).to.equal(ethers.parseEther("1500"));
      expect(queueInfo.averageWaitTime).to.equal(UNBONDING_PERIOD);
      expect(queueInfo.position).to.equal(1); // First in queue
      expect(queueInfo.estimatedUnlockTime).to.be.gt(0);
    });

    it("Should return correct queue statistics", async function () {
      const [totalCoreQueued, totalLstBTCQueued, totalRequests, avgWaitTime] = 
        await unbondingQueue.getQueueStats();
      
      expect(totalCoreQueued).to.equal(ethers.parseEther("1500"));
      expect(totalLstBTCQueued).to.equal(0);
      expect(totalRequests).to.equal(2);
      expect(avgWaitTime).to.equal(UNBONDING_PERIOD);
    });

    it("Should get user pending requests", async function () {
      const pendingRequests = await unbondingQueue.getUserPendingRequests(await user1.getAddress());
      
      expect(pendingRequests.length).to.equal(1);
      expect(pendingRequests[0].user).to.equal(await user1.getAddress());
      expect(pendingRequests[0].amount).to.equal(ethers.parseEther("1000"));
      expect(pendingRequests[0].assetType).to.equal(CORE_ASSET);
      expect(pendingRequests[0].processed).to.be.false;
    });
  });

  describe("Processing Requests", function () {
    beforeEach(async function () {
      // Create requests
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        ethers.parseEther("1000"),
        CORE_ASSET
      );
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user2.getAddress(),
        ethers.parseEther("500"),
        CORE_ASSET
      );
    });

    it("Should not process requests before unlock time", async function () {
      const processed = await unbondingQueue.connect(owner).processReadyRequests.staticCall();
      expect(processed).to.equal(0);
    });

    it("Should process ready requests after unlock time", async function () {
      // Fast forward time
      await time.increase(UNBONDING_PERIOD + 1);
      
      await expect(
        unbondingQueue.connect(owner).processReadyRequests()
      ).to.emit(unbondingQueue, "UnbondingProcessed");

      expect(await unbondingQueue.totalQueuedByAsset(CORE_ASSET)).to.equal(0);
    });

    it("Should process only ready requests", async function () {
      // Create another request after some time
      await time.increase(UNBONDING_PERIOD / 2);
      
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        ethers.parseEther("200"),
        CORE_ASSET
      );
      
      // Fast forward to make first two ready but not the third
      await time.increase(UNBONDING_PERIOD / 2 + 1);
      
      const processed = await unbondingQueue.connect(owner).processReadyRequests.staticCall();
      expect(processed).to.equal(2); // Only first two should be ready
    });
  });

  describe("Instant Withdrawals", function () {
    beforeEach(async function () {
      // Add liquidity to enable instant withdrawals
      await unbondingQueue.connect(owner).updateAvailableLiquidity(CORE_ASSET, ethers.parseEther("50000"));
    });

    it("Should check instant withdrawal eligibility", async function () {
      const smallAmount = ethers.parseEther("1000");
      const largeAmount = ethers.parseEther("200000");
      
      expect(await unbondingQueue.canWithdrawInstantly(smallAmount, CORE_ASSET)).to.be.true;
      expect(await unbondingQueue.canWithdrawInstantly(largeAmount, CORE_ASSET)).to.be.false;
    });

    it("Should calculate correct withdrawal fee", async function () {
      const amount = ethers.parseEther("1000");
      const expectedFee = amount * 25n / 10000n; // 0.25%
      
      expect(await unbondingQueue.getInstantWithdrawalFee(amount)).to.equal(expectedFee);
    });

    it("Should process instant withdrawal with fees", async function () {
      const amount = ethers.parseEther("1000");
      const expectedFee = amount * 25n / 10000n;
      const expectedNet = amount - expectedFee;
      
      await expect(
        unbondingQueue.connect(owner).processInstantWithdrawal(
          await user1.getAddress(),
          amount,
          CORE_ASSET
        )
      ).to.emit(unbondingQueue, "InstantWithdrawal")
        .withArgs(await user1.getAddress(), expectedNet, CORE_ASSET, expectedFee);

      // Check liquidity was reduced
      expect(await unbondingQueue.availableLiquidity(CORE_ASSET)).to.equal(
        ethers.parseEther("49000")
      );
    });

    it("Should reject instant withdrawal if not enough liquidity", async function () {
      const largeAmount = ethers.parseEther("60000"); // More than available
      
      await expect(
        unbondingQueue.connect(owner).processInstantWithdrawal(
          await user1.getAddress(),
          largeAmount,
          CORE_ASSET
        )
      ).to.be.revertedWith("UnbondingQueue: instant withdrawal not available");
    });

    it("Should respect maximum instant withdrawal ratio", async function () {
      // Max ratio is 10% of available liquidity (5000 CORE out of 50000)
      const maxAmount = ethers.parseEther("5000");
      const tooLargeAmount = ethers.parseEther("6000");
      
      expect(await unbondingQueue.canWithdrawInstantly(maxAmount, CORE_ASSET)).to.be.true;
      expect(await unbondingQueue.canWithdrawInstantly(tooLargeAmount, CORE_ASSET)).to.be.false;
    });
  });

  describe("Liquidity Management", function () {
    it("Should provide liquidity to pool", async function () {
      const amount = ethers.parseEther("10000");
      
      await expect(
        unbondingQueue.connect(owner).provideLiquidity(
          await liquidityProvider1.getAddress(),
          CORE_ASSET,
          amount
        )
      ).to.emit(unbondingQueue, "LiquidityProvided")
        .withArgs(await liquidityProvider1.getAddress(), CORE_ASSET, amount, amount);

      expect(await unbondingQueue.availableLiquidity(CORE_ASSET)).to.equal(amount);
      expect(await unbondingQueue.totalLiquidityProviderShares(CORE_ASSET)).to.equal(amount);
    });

    it("Should calculate correct shares for subsequent providers", async function () {
      const firstAmount = ethers.parseEther("10000");
      const secondAmount = ethers.parseEther("5000");
      
      // First provider gets 1:1 shares
      await unbondingQueue.connect(owner).provideLiquidity(
        await liquidityProvider1.getAddress(),
        CORE_ASSET,
        firstAmount
      );
      
      // Second provider should get proportional shares
      await unbondingQueue.connect(owner).provideLiquidity(
        await liquidityProvider2.getAddress(),
        CORE_ASSET,
        secondAmount
      );
      
      // Total liquidity: 15000, total shares should be 15000
      expect(await unbondingQueue.totalLiquidityProviderShares(CORE_ASSET)).to.equal(firstAmount);
      expect(await unbondingQueue.availableLiquidity(CORE_ASSET)).to.equal(firstAmount + secondAmount);
    });

    it("Should withdraw liquidity with correct calculations", async function () {
      const provideAmount = ethers.parseEther("10000");
      const withdrawShares = ethers.parseEther("5000");
      
      // Provide liquidity
      await unbondingQueue.connect(owner).provideLiquidity(
        await liquidityProvider1.getAddress(),
        CORE_ASSET,
        provideAmount
      );
      
      // Withdraw half
      await expect(
        unbondingQueue.connect(owner).withdrawLiquidity(
          await liquidityProvider1.getAddress(),
          CORE_ASSET,
          withdrawShares
        )
      ).to.emit(unbondingQueue, "LiquidityWithdrawn");

      expect(await unbondingQueue.availableLiquidity(CORE_ASSET)).to.equal(ethers.parseEther("5000"));
    });

    it("Should distribute rewards to liquidity providers", async function () {
      const provideAmount = ethers.parseEther("10000");
      const withdrawAmount = ethers.parseEther("1000");
      
      // Provide liquidity
      await unbondingQueue.connect(owner).provideLiquidity(
        await liquidityProvider1.getAddress(),
        CORE_ASSET,
        provideAmount
      );
      
      // Simulate instant withdrawal that generates fees
      await unbondingQueue.connect(owner).processInstantWithdrawal(
        await user1.getAddress(),
        withdrawAmount,
        CORE_ASSET
      );
      
      // Check that LP rewards were generated
      expect(await unbondingQueue.liquidityProviderRewards(CORE_ASSET)).to.be.gt(0);
      
      // Get LP info to check earned rewards
      const [shares, liquidityValue, earnedRewards] = await unbondingQueue.getLiquidityProviderInfo(
        await liquidityProvider1.getAddress(),
        CORE_ASSET
      );
      
      expect(earnedRewards).to.be.gt(0);
    });

    it("Should reject invalid liquidity operations", async function () {
      await expect(
        unbondingQueue.connect(owner).provideLiquidity(
          await liquidityProvider1.getAddress(),
          CORE_ASSET,
          0
        )
      ).to.be.revertedWith("UnbondingQueue: invalid amount");
      
      await expect(
        unbondingQueue.connect(owner).withdrawLiquidity(
          await liquidityProvider1.getAddress(),
          CORE_ASSET,
          0
        )
      ).to.be.revertedWith("UnbondingQueue: invalid shares");
    });
  });

  describe("Reserve Pool Management", function () {
    it("Should auto-size reserve pool", async function () {
      const liquidity = ethers.parseEther("10000");
      const queuedAmount = ethers.parseEther("5000");
      
      await unbondingQueue.connect(owner).updateAvailableLiquidity(CORE_ASSET, liquidity);
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        queuedAmount,
        CORE_ASSET
      );
      
      // Total value: 15000, default ratio: 5%, target size: 750
      const expectedTargetSize = (liquidity + queuedAmount) * 500n / 10000n;
      expect(await unbondingQueue.reservePoolSize(CORE_ASSET)).to.equal(expectedTargetSize);
    });

    it("Should set custom reserve pool ratio", async function () {
      const newRatio = 1000; // 10%
      
      await expect(
        unbondingQueue.connect(owner).setReservePoolRatio(CORE_ASSET, newRatio)
      ).to.emit(unbondingQueue, "ReservePoolSized");

      expect(await unbondingQueue.reservePoolRatio(CORE_ASSET)).to.equal(newRatio);
    });

    it("Should reject too high reserve ratio", async function () {
      await expect(
        unbondingQueue.connect(owner).setReservePoolRatio(CORE_ASSET, 2100) // 21%
      ).to.be.revertedWith("UnbondingQueue: ratio too high");
    });

    it("Should rebalance liquidity", async function () {
      await unbondingQueue.connect(owner).updateAvailableLiquidity(CORE_ASSET, ethers.parseEther("10000"));
      
      const targetLiquidity = ethers.parseEther("8000");
      
      await expect(
        unbondingQueue.connect(owner).rebalanceLiquidity(CORE_ASSET, targetLiquidity)
      ).to.emit(unbondingQueue, "LiquidityRebalanced");

      expect(await unbondingQueue.availableLiquidity(CORE_ASSET)).to.equal(targetLiquidity);
    });
  });

  describe("Parameter Updates", function () {
    it("Should update instant withdrawal parameters", async function () {
      const newWithdrawalFee = 50; // 0.5%
      const newLPFee = 20; // 0.2%
      const newMaxRatio = 1500; // 15%
      
      await unbondingQueue.connect(owner).setInstantWithdrawalParams(
        newWithdrawalFee,
        newLPFee,
        newMaxRatio
      );
      
      expect(await unbondingQueue.instantWithdrawalFee()).to.equal(newWithdrawalFee);
      expect(await unbondingQueue.liquidityProviderFee()).to.equal(newLPFee);
      expect(await unbondingQueue.maxInstantWithdrawalRatio()).to.equal(newMaxRatio);
    });

    it("Should reject invalid parameter updates", async function () {
      await expect(
        unbondingQueue.connect(owner).setInstantWithdrawalParams(150, 10, 1000) // 1.5% withdrawal fee
      ).to.be.revertedWith("UnbondingQueue: fee too high");
      
      await expect(
        unbondingQueue.connect(owner).setInstantWithdrawalParams(50, 60, 1000) // 0.6% LP fee
      ).to.be.revertedWith("UnbondingQueue: LP fee too high");
      
      await expect(
        unbondingQueue.connect(owner).setInstantWithdrawalParams(50, 20, 2100) // 21% max ratio
      ).to.be.revertedWith("UnbondingQueue: ratio too high");
    });
  });

  describe("Pool Health", function () {
    beforeEach(async function () {
      await unbondingQueue.connect(owner).updateAvailableLiquidity(CORE_ASSET, ethers.parseEther("10000"));
      await unbondingQueue.connect(owner).requestUnbonding(
        await user1.getAddress(),
        ethers.parseEther("5000"),
        CORE_ASSET
      );
    });

    it("Should calculate pool health metrics", async function () {
      const [utilizationRate, liquidityRatio, isHealthy] = await unbondingQueue.getPoolHealth(CORE_ASSET);
      
      // Total value: 15000, queued: 5000, available: 10000
      // Utilization: 33.33%, Liquidity: 66.66%
      expect(utilizationRate).to.equal(3333); // 33.33% in basis points
      expect(liquidityRatio).to.equal(6666); // 66.66% in basis points
      expect(isHealthy).to.be.true; // Above 5% default reserve ratio
    });

    it("Should identify unhealthy pool", async function () {
      // Reduce liquidity significantly
      await unbondingQueue.connect(owner).updateAvailableLiquidity(CORE_ASSET, ethers.parseEther("200"));
      
      const [utilizationRate, liquidityRatio, isHealthy] = await unbondingQueue.getPoolHealth(CORE_ASSET);
      
      expect(isHealthy).to.be.false; // Below reserve ratio threshold
      expect(utilizationRate).to.be.gt(9000); // High utilization
      expect(liquidityRatio).to.be.lt(1000); // Low liquidity
    });
  });

  describe("Access Control", function () {
    it("Should restrict owner-only functions", async function () {
      await expect(
        unbondingQueue.connect(user1).requestUnbonding(
          await user1.getAddress(),
          ethers.parseEther("1000"),
          CORE_ASSET
        )
      ).to.be.revertedWithCustomError(unbondingQueue, "OwnableUnauthorizedAccount");

      await expect(
        unbondingQueue.connect(user1).provideLiquidity(
          await liquidityProvider1.getAddress(),
          CORE_ASSET,
          ethers.parseEther("1000")
        )
      ).to.be.revertedWithCustomError(unbondingQueue, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to transfer ownership", async function () {
      await unbondingQueue.connect(owner).transferOwnership(await user1.getAddress());
      expect(await unbondingQueue.owner()).to.equal(await user1.getAddress());
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty queue", async function () {
      const queueInfo = await unbondingQueue.getQueueInfo(await user1.getAddress(), CORE_ASSET);
      expect(queueInfo.totalQueued).to.equal(0);
      expect(queueInfo.position).to.equal(0);
      
      const pendingRequests = await unbondingQueue.getUserPendingRequests(await user1.getAddress());
      expect(pendingRequests.length).to.equal(0);
    });

    it("Should handle zero liquidity", async function () {
      expect(await unbondingQueue.canWithdrawInstantly(ethers.parseEther("1000"), CORE_ASSET)).to.be.false;
      
      const [utilizationRate, liquidityRatio, isHealthy] = await unbondingQueue.getPoolHealth(CORE_ASSET);
      expect(utilizationRate).to.equal(0);
      expect(liquidityRatio).to.equal(0);
      expect(isHealthy).to.be.false;
    });

    it("Should handle multiple asset types independently", async function () {
      await unbondingQueue.connect(owner).updateAvailableLiquidity(CORE_ASSET, ethers.parseEther("10000"));
      await unbondingQueue.connect(owner).updateAvailableLiquidity(LSTBTC_ASSET, ethers.parseEther("5000"));
      
      expect(await unbondingQueue.canWithdrawInstantly(ethers.parseEther("1000"), CORE_ASSET)).to.be.true;
      expect(await unbondingQueue.canWithdrawInstantly(ethers.parseEther("1000"), LSTBTC_ASSET)).to.be.true;
      expect(await unbondingQueue.canWithdrawInstantly(ethers.parseEther("6000"), LSTBTC_ASSET)).to.be.false;
    });
  });
});