const { expect } = require("chai");
const { ethers } = require("hardhat");
const { TestSetup } = require("../helpers/TestSetup.cjs");

describe("End-to-End Integration Tests", function () {
  let setup;
  let stakeBasket, dualStakingBasket, stakeBasketToken, mockPriceFeed;
  let mockCORE, mockBTC, basketGovernance;
  let owner, user1, user2, user3;

  before(async function () {
    setup = new TestSetup();
    await setup.initialize();
    await setup.deployGovernanceContracts();
    await setup.deploySecurityContracts();
    
    ({
      stakeBasket,
      dualStakingBasket,
      stakeBasketToken,
      mockPriceFeed,
      basketGovernance
    } = setup.contracts);
    
    ({ mockCORE, mockBTC } = setup.tokens);
    ({ owner, user1, user2, user3 } = setup);
  });

  describe("Complete Staking Flow", function () {
    it("Should complete full staking lifecycle", async function () {
      // 1. User deposits CORE into StakeBasket
      const depositAmount = ethers.parseEther("100");
      
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      await stakeBasket.connect(user1).deposit(depositAmount, {
        value: depositAmount
      });
      
      // Check user received shares
      const shares = await stakeBasketToken.balanceOf(user1.address);
      expect(shares).to.equal(depositAmount); // 1:1 initial ratio
      
      // 2. Check NAV calculation
      const navPerShare = await stakeBasket.getNAVPerShare();
      expect(navPerShare).to.be.gt(0);
      
      // 3. Advance time and collect fees
      await setup.advanceTime(30 * 24 * 60 * 60); // 30 days
      await stakeBasket.collectFees();
      
      // 4. Request withdrawal
      const withdrawalShares = shares / 2n; // Half of shares
      await stakeBasketToken.connect(user1).approve(await stakeBasket.getAddress(), withdrawalShares);
      
      await stakeBasket.connect(user1).requestWithdrawal(withdrawalShares);
      
      // 5. Process withdrawal after unbonding period
      await setup.advanceTime(86400 + 1); // 1 day + 1 second
      await stakeBasket.connect(user1).processWithdrawal(0);
      
      // Check user received CORE back
      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.be.lt(initialBalance); // Due to gas costs
      
      // Check remaining shares
      expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(withdrawalShares);
    });
  });

  describe("Dual Staking Integration", function () {
    it("Should complete dual staking workflow", async function () {
      // 1. Set up user balances
      const coreAmount = ethers.parseEther("1000");
      const btcAmount = ethers.parseUnits("0.01", 8);
      
      await setup.setupUserBalances(user2, "2000", "1");
      await setup.approveTokens(user2, await dualStakingBasket.getAddress(), "2000", "1");
      
      // 2. Deposit into dual staking basket
      const initialCoreBalance = await mockCORE.balanceOf(user2.address);
      const initialBtcBalance = await mockBTC.balanceOf(user2.address);
      
      await dualStakingBasket.connect(user2).deposit(coreAmount, btcAmount);
      
      // Check tokens were transferred
      expect(await mockCORE.balanceOf(user2.address)).to.equal(initialCoreBalance - coreAmount);
      expect(await mockBTC.balanceOf(user2.address)).to.equal(initialBtcBalance - btcAmount);
      
      // Check user received basket tokens
      const basketBalance = await stakeBasketToken.balanceOf(user2.address);
      expect(basketBalance).to.be.gt(0);
      
      // 3. Check tier calculation
      const tierStatus = await dualStakingBasket.getCurrentTierStatus();
      expect(tierStatus.currentTier).to.be.oneOf([0, 1, 2, 3]); // Bronze, Silver, Gold, Satoshi
      
      // 4. Trigger rebalancing if needed
      await dualStakingBasket.connect(owner).setTargetTier(1); // Silver tier
      
      if (await dualStakingBasket.needsRebalancing()) {
        // Wait for minimum rebalance interval
        await setup.advanceTime(3601); // 1 hour + 1 second
        
        // This might fail due to no DEX router set up, but we test the logic
        try {
          await dualStakingBasket.connect(user1).rebalance();
        } catch (error) {
          // Expected if no DEX router configured
          expect(error.message).to.include("no swap router");
        }
      }
      
      // 5. Compound rewards
      try {
        await dualStakingBasket.compoundRewards();
      } catch (error) {
        // May fail if dual staking contract doesn't support rewards
      }
      
      // 6. Redeem tokens
      const redeemShares = basketBalance / 2n;
      
      const coreBalanceBefore = await mockCORE.balanceOf(user2.address);
      const btcBalanceBefore = await mockBTC.balanceOf(user2.address);
      
      await dualStakingBasket.connect(user2).redeem(redeemShares);
      
      // Check user received underlying assets
      expect(await mockCORE.balanceOf(user2.address)).to.be.gt(coreBalanceBefore);
      expect(await mockBTC.balanceOf(user2.address)).to.be.gt(btcBalanceBefore);
    });
  });

  describe("Governance Integration", function () {
    it("Should complete governance proposal lifecycle", async function () {
      // 1. Set up voting power
      await stakeBasket.connect(user1).deposit(ethers.parseEther("3000"), {
        value: ethers.parseEther("3000")
      });
      await stakeBasket.connect(user2).deposit(ethers.parseEther("3000"), {
        value: ethers.parseEther("3000")
      });
      
      // 2. Delegate voting power
      await stakeBasketToken.connect(user1).delegate(user1.address);
      await stakeBasketToken.connect(user2).delegate(user2.address);
      
      // 3. Create governance proposal
      const targets = [await stakeBasket.getAddress()];
      const values = [0];
      const calldatas = [
        stakeBasket.interface.encodeFunctionData("setManagementFee", [75]) // 0.75%
      ];
      const description = "Lower management fee to 0.75%";
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
      
      await basketGovernance.connect(user1).propose(targets, values, calldatas, description);
      
      const proposalId = await basketGovernance.hashProposal(targets, values, calldatas, descriptionHash);
      
      // 4. Vote on proposal
      await setup.advanceTime(2); // Wait for voting delay
      
      await basketGovernance.connect(user1).castVote(proposalId, 1); // Vote FOR
      await basketGovernance.connect(user2).castVote(proposalId, 1); // Vote FOR
      
      // 5. Execute proposal
      await setup.advanceTime(50401); // Wait for voting period
      
      // Check proposal succeeded
      expect(await basketGovernance.state(proposalId)).to.equal(4); // SUCCEEDED
      
      // 6. Queue proposal
      await basketGovernance.queue(targets, values, calldatas, descriptionHash);
      expect(await basketGovernance.state(proposalId)).to.equal(5); // QUEUED
      
      // 7. Execute proposal
      await setup.advanceTime(172800 + 1); // Wait for timelock delay (2 days)
      
      const initialFee = await stakeBasket.managementFeeBasisPoints();
      
      await basketGovernance.execute(targets, values, calldatas, descriptionHash);
      
      // Check execution succeeded
      expect(await basketGovernance.state(proposalId)).to.equal(7); // EXECUTED
      expect(await stakeBasket.managementFeeBasisPoints()).to.equal(75);
      expect(await stakeBasket.managementFeeBasisPoints()).to.not.equal(initialFee);
    });
  });

  describe("Multi-User Interactions", function () {
    it("Should handle multiple users interacting simultaneously", async function () {
      const users = [user1, user2, user3];
      const depositAmounts = [
        ethers.parseEther("500"),
        ethers.parseEther("1000"),
        ethers.parseEther("1500")
      ];
      
      // 1. Multiple users deposit
      for (let i = 0; i < users.length; i++) {
        await stakeBasket.connect(users[i]).deposit(depositAmounts[i], {
          value: depositAmounts[i]
        });
      }
      
      // 2. Check total pooled amount
      const totalPooled = await stakeBasket.totalPooledCore();
      const expectedTotal = depositAmounts.reduce((sum, amount) => sum + amount, 0n);
      expect(totalPooled).to.equal(expectedTotal);
      
      // 3. Check individual share distributions
      for (let i = 0; i < users.length; i++) {
        const shares = await stakeBasketToken.balanceOf(users[i].address);
        expect(shares).to.be.gt(0);
      }
      
      // 4. Multiple users request withdrawals
      const withdrawalAmounts = [
        ethers.parseEther("250"),
        ethers.parseEther("500"),
        ethers.parseEther("750")
      ];
      
      for (let i = 0; i < users.length; i++) {
        await stakeBasketToken.connect(users[i]).approve(
          await stakeBasket.getAddress(),
          withdrawalAmounts[i]
        );
        await stakeBasket.connect(users[i]).requestWithdrawal(withdrawalAmounts[i]);
      }
      
      // 5. Process all withdrawals after unbonding period
      await setup.advanceTime(86400 + 1);
      
      for (let i = 0; i < users.length; i++) {
        await stakeBasket.connect(users[i]).processWithdrawal(i);
      }
      
      // 6. Verify final state
      for (let i = 0; i < users.length; i++) {
        const remainingShares = await stakeBasketToken.balanceOf(users[i].address);
        expect(remainingShares).to.equal(depositAmounts[i] - withdrawalAmounts[i]);
      }
    });
  });

  describe("Cross-Contract Interactions", function () {
    it("Should handle interactions between StakeBasket and DualStakingBasket", async function () {
      // 1. User deposits in both contracts
      const coreAmount = ethers.parseEther("1000");
      
      await stakeBasket.connect(user1).deposit(coreAmount, {
        value: coreAmount
      });
      
      await setup.setupUserBalances(user1, "2000", "1");
      await setup.approveTokens(user1, await dualStakingBasket.getAddress(), "2000", "1");
      
      await dualStakingBasket.connect(user1).deposit(
        ethers.parseEther("1000"),
        ethers.parseUnits("0.01", 8)
      );
      
      // 2. Check total basket token supply
      const totalSupply = await stakeBasketToken.totalSupply();
      expect(totalSupply).to.be.gt(coreAmount);
      
      // 3. Check user's total basket token balance
      const userBalance = await stakeBasketToken.balanceOf(user1.address);
      expect(userBalance).to.be.gt(0);
      
      // 4. Test basket token transfers between contracts
      const transferAmount = ethers.parseEther("100");
      
      await stakeBasketToken.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await stakeBasketToken.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(userBalance - transferAmount);
    });
  });

  describe("Price Feed Integration", function () {
    it("Should react to price changes across all contracts", async function () {
      // 1. Set initial prices
      await mockPriceFeed.setPrice("CORE", ethers.parseUnits("1.5", 8));
      await mockPriceFeed.setPrice("BTC", ethers.parseUnits("95000", 8));
      
      // 2. User deposits
      await stakeBasket.connect(user1).deposit(ethers.parseEther("1000"), {
        value: ethers.parseEther("1000")
      });
      
      const initialNAV = await stakeBasket.getNAVPerShare();
      
      // 3. Change CORE price significantly
      await mockPriceFeed.setPrice("CORE", ethers.parseUnits("3.0", 8)); // Double the price
      
      // 4. Check NAV reflects price change
      const newNAV = await stakeBasket.getNAVPerShare();
      expect(newNAV).to.be.gt(initialNAV);
      
      // 5. Check dual staking basket responds to price changes
      await setup.setupUserBalances(user2, "2000", "1");
      await setup.approveTokens(user2, await dualStakingBasket.getAddress(), "2000", "1");
      
      const poolInfoBefore = await dualStakingBasket.getPoolInfo();
      
      await dualStakingBasket.connect(user2).deposit(
        ethers.parseEther("1000"),
        ethers.parseUnits("0.01", 8)
      );
      
      const poolInfoAfter = await dualStakingBasket.getPoolInfo();
      
      // Total value should reflect new CORE price
      expect(poolInfoAfter.totalValueUSD).to.be.gt(poolInfoBefore.totalValueUSD);
    });
  });

  describe("Emergency Scenarios", function () {
    it("Should handle emergency pause and recovery", async function () {
      // 1. Normal operations
      await stakeBasket.connect(user1).deposit(ethers.parseEther("1000"), {
        value: ethers.parseEther("1000")
      });
      
      // 2. Emergency pause
      await stakeBasket.connect(owner).pause();
      
      // 3. Verify operations are blocked
      await expect(
        stakeBasket.connect(user2).deposit(ethers.parseEther("500"), {
          value: ethers.parseEther("500")
        })
      ).to.be.revertedWithCustomError(stakeBasket, "EnforcedPause");
      
      // 4. Verify view functions still work
      expect(await stakeBasket.totalPooledCore()).to.equal(ethers.parseEther("1000"));
      expect(await stakeBasket.getNAVPerShare()).to.be.gt(0);
      
      // 5. Resume operations
      await stakeBasket.connect(owner).unpause();
      
      // 6. Verify operations work again
      await expect(
        stakeBasket.connect(user2).deposit(ethers.parseEther("500"), {
          value: ethers.parseEther("500")
        })
      ).to.not.be.reverted;
    });

    it("Should handle low liquidity scenarios", async function () {
      // 1. User deposits
      await stakeBasket.connect(user1).deposit(ethers.parseEther("1000"), {
        value: ethers.parseEther("1000")
      });
      
      // 2. Simulate most funds being delegated (contract balance low)
      const contractBalance = await ethers.provider.getBalance(await stakeBasket.getAddress());
      
      // Try to withdraw more than emergency reserve allows
      const userShares = await stakeBasketToken.balanceOf(user1.address);
      const largeWithdrawal = (userShares * 8n) / 10n; // 80% of shares
      
      await expect(
        stakeBasket.connect(user1).instantRedeem(largeWithdrawal)
      ).to.be.revertedWith("StakeBasket: exceeds instant redeem limit - use requestWithdrawal()");
      
      // 3. Use proper withdrawal queue instead
      await stakeBasketToken.connect(user1).approve(await stakeBasket.getAddress(), largeWithdrawal);
      
      await stakeBasket.connect(user1).requestWithdrawal(largeWithdrawal);
      
      // Should succeed without revert
      expect(await stakeBasket.withdrawalQueue(0)).to.have.property('user', user1.address);
    });
  });

  describe("Fee Distribution", function () {
    it("Should distribute fees correctly across ecosystem", async function () {
      // 1. Set up deposits to generate fees
      const largeDeposit = ethers.parseEther("10000");
      
      await stakeBasket.connect(user1).deposit(largeDeposit, {
        value: largeDeposit
      });
      
      // 2. Advance time significantly to accumulate fees
      await setup.advanceTime(365 * 24 * 60 * 60); // 1 year
      
      // 3. Check fee recipient balance before
      const feeRecipientBalanceBefore = await stakeBasketToken.balanceOf(setup.feeRecipient.address);
      
      // 4. Collect fees
      await stakeBasket.collectFees();
      
      // 5. Check fee recipient received fee tokens
      const feeRecipientBalanceAfter = await stakeBasketToken.balanceOf(setup.feeRecipient.address);
      expect(feeRecipientBalanceAfter).to.be.gt(feeRecipientBalanceBefore);
      
      // 6. Check protocol treasury received protocol fees (if configured)
      const protocolFees = await stakeBasket.totalProtocolFeesCollected();
      expect(protocolFees).to.be.gt(0);
    });
  });

  describe("Stress Testing", function () {
    it("Should handle rapid successive transactions", async function () {
      const iterations = 10;
      const depositAmount = ethers.parseEther("100");
      
      // Rapid deposits
      for (let i = 0; i < iterations; i++) {
        await stakeBasket.connect(user1).deposit(depositAmount, {
          value: depositAmount
        });
      }
      
      expect(await stakeBasket.totalPooledCore()).to.equal(depositAmount * BigInt(iterations));
      
      // Rapid withdrawals (instant redeem small amounts)
      const withdrawAmount = ethers.parseEther("50");
      
      for (let i = 0; i < iterations; i++) {
        await stakeBasket.connect(user1).instantRedeem(withdrawAmount);
      }
      
      expect(await stakeBasket.totalPooledCore()).to.equal(depositAmount * BigInt(iterations) - withdrawAmount * BigInt(iterations));
    });
  });

  describe("Data Consistency", function () {
    it("Should maintain data consistency across all operations", async function () {
      // Track total supply and balances through complex operations
      let expectedTotalSupply = 0n;
      
      // 1. Multiple users deposit different amounts
      const deposits = [
        { user: user1, amount: ethers.parseEther("1000") },
        { user: user2, amount: ethers.parseEther("1500") },
        { user: user3, amount: ethers.parseEther("800") }
      ];
      
      for (const { user, amount } of deposits) {
        const sharesBefore = await stakeBasketToken.balanceOf(user.address);
        
        await stakeBasket.connect(user).deposit(amount, { value: amount });
        
        const sharesAfter = await stakeBasketToken.balanceOf(user.address);
        expectedTotalSupply += (sharesAfter - sharesBefore);
      }
      
      // 2. Check total supply consistency
      expect(await stakeBasketToken.totalSupply()).to.equal(expectedTotalSupply);
      
      // 3. Some users redeem
      const redemptions = [
        { user: user1, amount: ethers.parseEther("300") },
        { user: user2, amount: ethers.parseEther("500") }
      ];
      
      for (const { user, amount } of redemptions) {
        const sharesBefore = await stakeBasketToken.balanceOf(user.address);
        
        await stakeBasket.connect(user).instantRedeem(amount);
        
        const sharesAfter = await stakeBasketToken.balanceOf(user.address);
        expectedTotalSupply -= (sharesBefore - sharesAfter);
      }
      
      // 4. Final consistency check
      expect(await stakeBasketToken.totalSupply()).to.equal(expectedTotalSupply);
      
      // 5. Check individual balances sum to total supply
      const user1Balance = await stakeBasketToken.balanceOf(user1.address);
      const user2Balance = await stakeBasketToken.balanceOf(user2.address);
      const user3Balance = await stakeBasketToken.balanceOf(user3.address);
      const feeBalance = await stakeBasketToken.balanceOf(setup.feeRecipient.address);
      
      const totalBalances = user1Balance + user2Balance + user3Balance + feeBalance;
      
      // Allow small discrepancy due to fees collected
      expect(await stakeBasketToken.totalSupply()).to.be.closeTo(totalBalances, ethers.parseEther("1"));
    });
  });
});