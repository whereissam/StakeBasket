const { expect } = require("chai");
const { ethers } = require("hardhat");
const { TestSetup } = require("../helpers/TestSetup.cjs");

describe("StakeBasket", function () {
  let setup;
  let stakeBasket, stakeBasketToken, mockPriceFeed;
  let owner, user1, user2, feeRecipient;

  before(async function () {
    setup = new TestSetup();
    await setup.initialize();
    
    ({ stakeBasket, stakeBasketToken, mockPriceFeed } = setup.contracts);
    ({ owner, user1, user2, feeRecipient } = setup);
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await stakeBasket.etfToken()).to.equal(await stakeBasketToken.getAddress());
      expect(await stakeBasket.feeRecipient()).to.equal(feeRecipient.address);
      expect(await stakeBasket.managementFeeBasisPoints()).to.equal(50); // 0.5%
      expect(await stakeBasket.performanceFeeBasisPoints()).to.equal(1000); // 10%
    });

    it("Should have correct initial state", async function () {
      expect(await stakeBasket.totalPooledCore()).to.equal(0);
      expect(await stakeBasket.totalPooledLstBTC()).to.equal(0);
      expect(await stakeBasket.emergencyReserveRatio()).to.equal(1000); // 10%
    });
  });

  describe("Native CORE Deposits", function () {
    it("Should accept native CORE deposits", async function () {
      const depositAmount = ethers.parseEther("10");
      
      const tx = await stakeBasket.connect(user1).deposit(depositAmount, {
        value: depositAmount
      });

      await expect(tx)
        .to.emit(stakeBasket, "Deposited")
        .withArgs(user1.address, depositAmount, depositAmount);

      expect(await stakeBasket.totalPooledCore()).to.equal(depositAmount);
      expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(depositAmount);
    });

    it("Should revert if sent value doesn't match amount", async function () {
      const depositAmount = ethers.parseEther("10");
      const sentValue = ethers.parseEther("5");

      await expect(
        stakeBasket.connect(user1).deposit(depositAmount, { value: sentValue })
      ).to.be.revertedWith("StakeBasket: sent value must equal amount");
    });

    it("Should calculate shares correctly for multiple deposits", async function () {
      // First deposit
      const firstDeposit = ethers.parseEther("100");
      await stakeBasket.connect(user1).deposit(firstDeposit, { value: firstDeposit });
      
      // Second deposit should get proportional shares
      const secondDeposit = ethers.parseEther("50");
      const totalSupplyBefore = await stakeBasketToken.totalSupply();
      const totalPooledBefore = await stakeBasket.totalPooledCore();
      
      await stakeBasket.connect(user2).deposit(secondDeposit, { value: secondDeposit });
      
      const expectedShares = (secondDeposit * totalSupplyBefore) / totalPooledBefore;
      const actualShares = await stakeBasketToken.balanceOf(user2.address);
      
      // Allow for small rounding differences
      expect(actualShares).to.be.closeTo(expectedShares, ethers.parseEther("0.1"));
    });
  });

  describe("NAV Calculation", function () {
    beforeEach(async function () {
      // Set up initial state with some deposits
      await stakeBasket.connect(user1).deposit(ethers.parseEther("100"), {
        value: ethers.parseEther("100")
      });
    });

    it("Should calculate NAV per share correctly", async function () {
      const navPerShare = await stakeBasket.getNAVPerShare();
      
      // With mock prices: CORE = $1.5
      // NAV should be around $1.5 per share
      const expectedNAV = ethers.parseEther("1.5");
      expect(navPerShare).to.be.closeTo(expectedNAV, ethers.parseEther("0.01"));
    });

    it("Should calculate total AUM correctly", async function () {
      const totalAUM = await stakeBasket.getTotalAUM();
      
      // 100 CORE at $1.5 each = $150
      const expectedAUM = ethers.parseEther("150");
      expect(totalAUM).to.be.closeTo(expectedAUM, ethers.parseEther("1"));
    });

    it("Should handle zero total supply", async function () {
      // Deploy fresh contract
      const freshStakeBasket = await ethers.deployContract("StakeBasket", [
        await stakeBasketToken.getAddress(),
        ethers.ZeroAddress,
        await mockPriceFeed.getAddress(),
        feeRecipient.address,
        owner.address,
        owner.address
      ]);

      const navPerShare = await freshStakeBasket.getNAVPerShare();
      expect(navPerShare).to.equal(ethers.parseEther("1")); // Initial NAV = 1 USD
    });
  });

  describe("Withdrawal System", function () {
    beforeEach(async function () {
      // User deposits 100 CORE
      await stakeBasket.connect(user1).deposit(ethers.parseEther("100"), {
        value: ethers.parseEther("100")
      });
    });

    describe("Request Withdrawal", function () {
      it("Should create withdrawal request", async function () {
        const shares = ethers.parseEther("50");
        
        // Approve transfer of shares
        await stakeBasketToken.connect(user1).approve(await stakeBasket.getAddress(), shares);
        
        const tx = await stakeBasket.connect(user1).requestWithdrawal(shares);
        
        await expect(tx)
          .to.emit(stakeBasket, "WithdrawalRequested")
          .withArgs(user1.address, shares, 0, await ethers.provider.getBlock("latest").then(b => b.timestamp));
        
        // Check shares are locked in contract
        expect(await stakeBasketToken.balanceOf(await stakeBasket.getAddress())).to.equal(shares);
        expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(ethers.parseEther("50"));
      });

      it("Should revert if insufficient shares", async function () {
        const shares = ethers.parseEther("200"); // More than user has
        
        await expect(
          stakeBasket.connect(user1).requestWithdrawal(shares)
        ).to.be.revertedWith("StakeBasket: insufficient shares");
      });
    });

    describe("Process Withdrawal", function () {
      let requestId;

      beforeEach(async function () {
        const shares = ethers.parseEther("50");
        await stakeBasketToken.connect(user1).approve(await stakeBasket.getAddress(), shares);
        await stakeBasket.connect(user1).requestWithdrawal(shares);
        requestId = 0;
      });

      it("Should process withdrawal after unbonding period", async function () {
        // Advance time past unbonding period (1 day)
        await setup.advanceTime(86400 + 1);
        
        const balanceBefore = await ethers.provider.getBalance(user1.address);
        
        const tx = await stakeBasket.connect(user1).processWithdrawal(requestId);
        
        // Check withdrawal was processed
        const request = await stakeBasket.withdrawalQueue(requestId);
        expect(request.isProcessed).to.be.true;
        
        // Check user received CORE
        const balanceAfter = await ethers.provider.getBalance(user1.address);
        expect(balanceAfter).to.be.gt(balanceBefore);
      });

      it("Should revert if unbonding period not complete", async function () {
        await expect(
          stakeBasket.connect(user1).processWithdrawal(requestId)
        ).to.be.revertedWith("StakeBasket: unbonding period not complete");
      });

      it("Should revert if not request owner", async function () {
        await setup.advanceTime(86400 + 1);
        
        await expect(
          stakeBasket.connect(user2).processWithdrawal(requestId)
        ).to.be.revertedWith("StakeBasket: not request owner");
      });
    });

    describe("Instant Redeem", function () {
      it("Should allow instant redemption within reserve limit", async function () {
        const shares = ethers.parseEther("5"); // Small amount within reserve
        
        const balanceBefore = await ethers.provider.getBalance(user1.address);
        
        await stakeBasket.connect(user1).instantRedeem(shares);
        
        const balanceAfter = await ethers.provider.getBalance(user1.address);
        expect(balanceAfter).to.be.gt(balanceBefore);
        
        // Check shares were burned
        expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(ethers.parseEther("95"));
      });

      it("Should revert if exceeds reserve limit", async function () {
        const shares = ethers.parseEther("50"); // Large amount
        
        await expect(
          stakeBasket.connect(user1).instantRedeem(shares)
        ).to.be.revertedWith("StakeBasket: exceeds instant redeem limit - use requestWithdrawal()");
      });
    });
  });

  describe("Fee Management", function () {
    beforeEach(async function () {
      // Set up some deposits
      await stakeBasket.connect(user1).deposit(ethers.parseEther("1000"), {
        value: ethers.parseEther("1000")
      });
    });

    it("Should collect management fees over time", async function () {
      // Advance time by 1 month
      await setup.advanceTime(30 * 24 * 60 * 60);
      
      const feeBalanceBefore = await stakeBasketToken.balanceOf(feeRecipient.address);
      
      await stakeBasket.collectFees();
      
      const feeBalanceAfter = await stakeBasketToken.balanceOf(feeRecipient.address);
      expect(feeBalanceAfter).to.be.gt(feeBalanceBefore);
    });

    it("Should update management fee", async function () {
      const newFee = 100; // 1%
      
      await stakeBasket.connect(owner).setManagementFee(newFee);
      
      expect(await stakeBasket.managementFeeBasisPoints()).to.equal(newFee);
    });

    it("Should revert if fee too high", async function () {
      const highFee = 1500; // 15% - too high
      
      await expect(
        stakeBasket.connect(owner).setManagementFee(highFee)
      ).to.be.revertedWith("StakeBasket: fee too high");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause/unpause", async function () {
      await stakeBasket.connect(owner).pause();
      expect(await stakeBasket.paused()).to.be.true;
      
      await stakeBasket.connect(owner).unpause();
      expect(await stakeBasket.paused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        stakeBasket.connect(user1).pause()
      ).to.be.revertedWithCustomError(stakeBasket, "OwnableUnauthorizedAccount");
    });

    it("Should prevent deposits when paused", async function () {
      await stakeBasket.connect(owner).pause();
      
      await expect(
        stakeBasket.connect(user1).deposit(ethers.parseEther("10"), {
          value: ethers.parseEther("10")
        })
      ).to.be.revertedWithCustomError(stakeBasket, "EnforcedPause");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero deposits gracefully", async function () {
      await expect(
        stakeBasket.connect(user1).deposit(0, { value: 0 })
      ).to.be.revertedWith("StakeBasket: amount must be greater than 0");
    });

    it("Should handle large numbers without overflow", async function () {
      const largeAmount = ethers.parseEther("1000000"); // 1M CORE
      
      // This should not revert due to overflow
      await stakeBasket.connect(user1).deposit(largeAmount, { value: largeAmount });
      
      expect(await stakeBasket.totalPooledCore()).to.equal(largeAmount);
    });

    it("Should calculate shares correctly when price feed is not set", async function () {
      // Deploy fresh contract without price feed
      const freshBasket = await ethers.deployContract("StakeBasket", [
        await stakeBasketToken.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress, // No price feed
        feeRecipient.address,
        owner.address,
        owner.address
      ]);

      const depositAmount = ethers.parseEther("10");
      await freshBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
      
      // Should use fallback prices and still work
      expect(await freshBasket.totalPooledCore()).to.equal(depositAmount);
    });
  });

  describe("User Withdrawal Requests View", function () {
    it("Should return user withdrawal requests", async function () {
      // Create multiple requests
      const shares1 = ethers.parseEther("25");
      const shares2 = ethers.parseEther("50");
      
      await stakeBasket.connect(user1).deposit(ethers.parseEther("100"), {
        value: ethers.parseEther("100")
      });
      
      await stakeBasketToken.connect(user1).approve(await stakeBasket.getAddress(), ethers.parseEther("75"));
      
      await stakeBasket.connect(user1).requestWithdrawal(shares1);
      await stakeBasket.connect(user1).requestWithdrawal(shares2);
      
      const requests = await stakeBasket.getUserWithdrawalRequests(user1.address);
      
      expect(requests.requestIds.length).to.equal(2);
      expect(requests.amounts[0]).to.equal(shares1);
      expect(requests.amounts[1]).to.equal(shares2);
      expect(requests.canProcess[0]).to.be.false; // Not enough time passed
      expect(requests.canProcess[1]).to.be.false;
    });
  });
});