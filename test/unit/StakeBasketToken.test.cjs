const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakeBasketToken", function () {
  let stakeBasketToken, mockStakeBasket;
  let owner, user1, user2, newStakeBasket;

  const TIMELOCK_DELAY = 2 * 24 * 60 * 60; // 2 days

  beforeEach(async function () {
    [owner, user1, user2, newStakeBasket] = await ethers.getSigners();

    // Deploy StakeBasketToken
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    stakeBasketToken = await StakeBasketToken.deploy(
      "StakeBasket Token",
      "BASKET", 
      await owner.getAddress()
    );
    await stakeBasketToken.waitForDeployment();

    // Deploy mock StakeBasket contract
    const MockStakeBasket = await ethers.getContractFactory("MockERC20");
    mockStakeBasket = await MockStakeBasket.deploy();
    await mockStakeBasket.waitForDeployment();

    // Set the StakeBasket contract for testing
    await stakeBasketToken.connect(owner).emergencySetStakeBasketContract(await mockStakeBasket.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await stakeBasketToken.name()).to.equal("StakeBasket Token");
      expect(await stakeBasketToken.symbol()).to.equal("BASKET");
      expect(await stakeBasketToken.decimals()).to.equal(18);
      expect(await stakeBasketToken.totalSupply()).to.equal(0);
      expect(await stakeBasketToken.owner()).to.equal(await owner.getAddress());
    });

    it("Should have correct timelock delay constant", async function () {
      expect(await stakeBasketToken.TIMELOCK_DELAY()).to.equal(TIMELOCK_DELAY);
    });

    it("Should have no initial StakeBasket contract set", async function () {
      // Deploy fresh token to test initial state
      const FreshStakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
      const freshToken = await FreshStakeBasketToken.deploy(
        "Fresh Token",
        "FRESH",
        await owner.getAddress()
      );
      
      expect(await freshToken.stakeBasketContract()).to.equal(ethers.ZeroAddress);
      expect(await freshToken.pendingStakeBasketContract()).to.equal(ethers.ZeroAddress);
      expect(await freshToken.stakeBasketContractSetTime()).to.equal(0);
    });
  });

  describe("StakeBasket Contract Management", function () {
    it("Should propose new StakeBasket contract", async function () {
      const newContract = await newStakeBasket.getAddress();
      const currentTime = await time.latest();
      
      await expect(
        stakeBasketToken.connect(owner).proposeStakeBasketContract(newContract)
      ).to.emit(stakeBasketToken, "StakeBasketContractProposed")
        .withArgs(newContract, currentTime + TIMELOCK_DELAY + 1);

      expect(await stakeBasketToken.pendingStakeBasketContract()).to.equal(newContract);
      expect(await stakeBasketToken.stakeBasketContractSetTime()).to.be.closeTo(
        currentTime + TIMELOCK_DELAY, 2
      );
    });

    it("Should reject invalid contract addresses", async function () {
      await expect(
        stakeBasketToken.connect(owner).proposeStakeBasketContract(ethers.ZeroAddress)
      ).to.be.revertedWith("StakeBasketToken: invalid contract address");
    });

    it("Should reject same contract address", async function () {
      const currentContract = await stakeBasketToken.stakeBasketContract();
      
      await expect(
        stakeBasketToken.connect(owner).proposeStakeBasketContract(currentContract)
      ).to.be.revertedWith("StakeBasketToken: same contract address");
    });

    it("Should reject proposals from non-owner", async function () {
      await expect(
        stakeBasketToken.connect(user1).proposeStakeBasketContract(await newStakeBasket.getAddress())
      ).to.be.revertedWithCustomError(stakeBasketToken, "OwnableUnauthorizedAccount");
    });

    it("Should confirm StakeBasket contract after timelock", async function () {
      const newContract = await newStakeBasket.getAddress();
      
      // Propose new contract
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(newContract);
      
      // Fast forward past timelock delay
      await time.increase(TIMELOCK_DELAY + 1);
      
      await expect(
        stakeBasketToken.connect(owner).confirmStakeBasketContract()
      ).to.emit(stakeBasketToken, "StakeBasketContractSet")
        .withArgs(newContract);

      expect(await stakeBasketToken.stakeBasketContract()).to.equal(newContract);
      expect(await stakeBasketToken.pendingStakeBasketContract()).to.equal(ethers.ZeroAddress);
      expect(await stakeBasketToken.stakeBasketContractSetTime()).to.equal(0);
    });

    it("Should reject confirmation before timelock expiry", async function () {
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(await newStakeBasket.getAddress());
      
      await expect(
        stakeBasketToken.connect(owner).confirmStakeBasketContract()
      ).to.be.revertedWith("StakeBasketToken: timelock not expired");
    });

    it("Should reject confirmation with no pending proposal", async function () {
      await expect(
        stakeBasketToken.connect(owner).confirmStakeBasketContract()
      ).to.be.revertedWith("StakeBasketToken: no pending contract");
    });

    it("Should cancel pending contract proposal", async function () {
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(await newStakeBasket.getAddress());
      
      expect(await stakeBasketToken.pendingStakeBasketContract()).to.not.equal(ethers.ZeroAddress);
      
      await stakeBasketToken.connect(owner).cancelStakeBasketContract();
      
      expect(await stakeBasketToken.pendingStakeBasketContract()).to.equal(ethers.ZeroAddress);
      expect(await stakeBasketToken.stakeBasketContractSetTime()).to.equal(0);
    });

    it("Should allow emergency contract setting", async function () {
      const newContract = await newStakeBasket.getAddress();
      
      await expect(
        stakeBasketToken.connect(owner).emergencySetStakeBasketContract(newContract)
      ).to.emit(stakeBasketToken, "StakeBasketContractSet")
        .withArgs(newContract);

      expect(await stakeBasketToken.stakeBasketContract()).to.equal(newContract);
    });

    it("Should reject emergency setting with invalid address", async function () {
      await expect(
        stakeBasketToken.connect(owner).emergencySetStakeBasketContract(ethers.ZeroAddress)
      ).to.be.revertedWith("StakeBasketToken: invalid contract address");
    });
  });

  describe("Minting", function () {
    it("Should mint tokens from StakeBasket contract", async function () {
      const amount = ethers.parseEther("1000");
      
      // Create a proper call from the mock StakeBasket contract
      const mintCall = stakeBasketToken.interface.encodeFunctionData("mint", [
        await user1.getAddress(),
        amount
      ]);
      
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), mintCall);
      await mockStakeBasket.makeCall();
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(amount);
      expect(await stakeBasketToken.totalSupply()).to.equal(amount);
    });

    it("Should reject minting from unauthorized address", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        stakeBasketToken.connect(user1).mint(await user2.getAddress(), amount)
      ).to.be.revertedWith("StakeBasketToken: caller is not the StakeBasket contract");
    });

    it("Should mint to multiple addresses", async function () {
      const amount1 = ethers.parseEther("500");
      const amount2 = ethers.parseEther("300");
      
      // First mint
      let mintCall = stakeBasketToken.interface.encodeFunctionData("mint", [
        await user1.getAddress(),
        amount1
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), mintCall);
      await mockStakeBasket.makeCall();
      
      // Second mint
      mintCall = stakeBasketToken.interface.encodeFunctionData("mint", [
        await user2.getAddress(),
        amount2
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), mintCall);
      await mockStakeBasket.makeCall();
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(amount1);
      expect(await stakeBasketToken.balanceOf(await user2.getAddress())).to.equal(amount2);
      expect(await stakeBasketToken.totalSupply()).to.equal(amount1 + amount2);
    });

    it("Should handle zero amount minting", async function () {
      const mintCall = stakeBasketToken.interface.encodeFunctionData("mint", [
        await user1.getAddress(),
        0
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), mintCall);
      
      await expect(mockStakeBasket.makeCall()).to.not.be.reverted;
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(0);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      const amount = ethers.parseEther("1000");
      const mintCall = stakeBasketToken.interface.encodeFunctionData("mint", [
        await user1.getAddress(),
        amount
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), mintCall);
      await mockStakeBasket.makeCall();
    });

    it("Should burn tokens from StakeBasket contract", async function () {
      const burnAmount = ethers.parseEther("300");
      const initialBalance = await stakeBasketToken.balanceOf(await user1.getAddress());
      const initialSupply = await stakeBasketToken.totalSupply();
      
      const burnCall = stakeBasketToken.interface.encodeFunctionData("burn", [
        await user1.getAddress(),
        burnAmount
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), burnCall);
      await mockStakeBasket.makeCall();
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(initialBalance - burnAmount);
      expect(await stakeBasketToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should reject burning from unauthorized address", async function () {
      const burnAmount = ethers.parseEther("300");
      
      await expect(
        stakeBasketToken.connect(user1).burn(await user1.getAddress(), burnAmount)
      ).to.be.revertedWith("StakeBasketToken: caller is not the StakeBasket contract");
    });

    it("Should revert when burning more than balance", async function () {
      const excessiveAmount = ethers.parseEther("2000");
      
      const burnCall = stakeBasketToken.interface.encodeFunctionData("burn", [
        await user1.getAddress(),
        excessiveAmount
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), burnCall);
      
      await expect(mockStakeBasket.makeCall()).to.be.reverted;
    });

    it("Should burn all tokens", async function () {
      const totalBalance = await stakeBasketToken.balanceOf(await user1.getAddress());
      
      const burnCall = stakeBasketToken.interface.encodeFunctionData("burn", [
        await user1.getAddress(),
        totalBalance
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), burnCall);
      await mockStakeBasket.makeCall();
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(0);
      expect(await stakeBasketToken.totalSupply()).to.equal(0);
    });

    it("Should handle zero amount burning", async function () {
      const burnCall = stakeBasketToken.interface.encodeFunctionData("burn", [
        await user1.getAddress(),
        0
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), burnCall);
      
      await expect(mockStakeBasket.makeCall()).to.not.be.reverted;
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("ERC20 Standard Compliance", function () {
    beforeEach(async function () {
      // Mint tokens to users
      const amount = ethers.parseEther("1000");
      
      for (const user of [user1, user2]) {
        const mintCall = stakeBasketToken.interface.encodeFunctionData("mint", [
          await user.getAddress(),
          amount
        ]);
        await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), mintCall);
        await mockStakeBasket.makeCall();
      }
    });

    it("Should handle transfers correctly", async function () {
      const transferAmount = ethers.parseEther("250");
      
      await expect(
        stakeBasketToken.connect(user1).transfer(await user2.getAddress(), transferAmount)
      ).to.emit(stakeBasketToken, "Transfer")
        .withArgs(await user1.getAddress(), await user2.getAddress(), transferAmount);
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("750"));
      expect(await stakeBasketToken.balanceOf(await user2.getAddress())).to.equal(ethers.parseEther("1250"));
    });

    it("Should handle approvals correctly", async function () {
      const approvalAmount = ethers.parseEther("500");
      
      await expect(
        stakeBasketToken.connect(user1).approve(await user2.getAddress(), approvalAmount)
      ).to.emit(stakeBasketToken, "Approval")
        .withArgs(await user1.getAddress(), await user2.getAddress(), approvalAmount);
      
      expect(await stakeBasketToken.allowance(await user1.getAddress(), await user2.getAddress())).to.equal(approvalAmount);
    });

    it("Should handle transferFrom correctly", async function () {
      const approvalAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("300");
      
      await stakeBasketToken.connect(user1).approve(await user2.getAddress(), approvalAmount);
      
      await expect(
        stakeBasketToken.connect(user2).transferFrom(await user1.getAddress(), await user2.getAddress(), transferAmount)
      ).to.emit(stakeBasketToken, "Transfer")
        .withArgs(await user1.getAddress(), await user2.getAddress(), transferAmount);
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("700"));
      expect(await stakeBasketToken.allowance(await user1.getAddress(), await user2.getAddress())).to.equal(approvalAmount - transferAmount);
    });

    it("Should revert on insufficient balance", async function () {
      const excessiveAmount = ethers.parseEther("2000");
      
      await expect(
        stakeBasketToken.connect(user1).transfer(await user2.getAddress(), excessiveAmount)
      ).to.be.revertedWithCustomError(stakeBasketToken, "ERC20InsufficientBalance");
    });

    it("Should revert on insufficient allowance", async function () {
      const transferAmount = ethers.parseEther("300");
      
      await expect(
        stakeBasketToken.connect(user2).transferFrom(await user1.getAddress(), await user2.getAddress(), transferAmount)
      ).to.be.revertedWithCustomError(stakeBasketToken, "ERC20InsufficientAllowance");
    });
  });

  describe("Access Control", function () {
    it("Should restrict StakeBasket contract management to owner", async function () {
      await expect(
        stakeBasketToken.connect(user1).proposeStakeBasketContract(await newStakeBasket.getAddress())
      ).to.be.revertedWithCustomError(stakeBasketToken, "OwnableUnauthorizedAccount");
      
      await expect(
        stakeBasketToken.connect(user1).confirmStakeBasketContract()
      ).to.be.revertedWithCustomError(stakeBasketToken, "OwnableUnauthorizedAccount");
      
      await expect(
        stakeBasketToken.connect(user1).cancelStakeBasketContract()
      ).to.be.revertedWithCustomError(stakeBasketToken, "OwnableUnauthorizedAccount");
      
      await expect(
        stakeBasketToken.connect(user1).emergencySetStakeBasketContract(await newStakeBasket.getAddress())
      ).to.be.revertedWithCustomError(stakeBasketToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to transfer ownership", async function () {
      await stakeBasketToken.connect(owner).transferOwnership(await user1.getAddress());
      expect(await stakeBasketToken.owner()).to.equal(await user1.getAddress());
    });

    it("Should restrict minting and burning to StakeBasket contract only", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(
        stakeBasketToken.connect(owner).mint(await user1.getAddress(), amount)
      ).to.be.revertedWith("StakeBasketToken: caller is not the StakeBasket contract");
      
      await expect(
        stakeBasketToken.connect(owner).burn(await user1.getAddress(), amount)
      ).to.be.revertedWith("StakeBasketToken: caller is not the StakeBasket contract");
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle complete contract upgrade workflow", async function () {
      const newContract = await newStakeBasket.getAddress();
      
      // Step 1: Propose new contract
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(newContract);
      
      // Verify proposal state
      expect(await stakeBasketToken.pendingStakeBasketContract()).to.equal(newContract);
      
      // Step 2: Wait for timelock
      await time.increase(TIMELOCK_DELAY + 1);
      
      // Step 3: Confirm new contract
      await stakeBasketToken.connect(owner).confirmStakeBasketContract();
      
      // Verify final state
      expect(await stakeBasketToken.stakeBasketContract()).to.equal(newContract);
      expect(await stakeBasketToken.pendingStakeBasketContract()).to.equal(ethers.ZeroAddress);
    });

    it("Should handle proposal cancellation workflow", async function () {
      const newContract = await newStakeBasket.getAddress();
      
      // Propose and then cancel
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(newContract);
      await stakeBasketToken.connect(owner).cancelStakeBasketContract();
      
      // Original contract should remain
      expect(await stakeBasketToken.stakeBasketContract()).to.equal(await mockStakeBasket.getAddress());
      expect(await stakeBasketToken.pendingStakeBasketContract()).to.equal(ethers.ZeroAddress);
    });

    it("Should handle mint and burn operations correctly", async function () {
      const mintAmount = ethers.parseEther("1000");
      const burnAmount = ethers.parseEther("300");
      
      // Mint tokens
      let call = stakeBasketToken.interface.encodeFunctionData("mint", [await user1.getAddress(), mintAmount]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), call);
      await mockStakeBasket.makeCall();
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(mintAmount);
      
      // Burn some tokens
      call = stakeBasketToken.interface.encodeFunctionData("burn", [await user1.getAddress(), burnAmount]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), call);
      await mockStakeBasket.makeCall();
      
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(mintAmount - burnAmount);
      expect(await stakeBasketToken.totalSupply()).to.equal(mintAmount - burnAmount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple pending proposals correctly", async function () {
      const contract1 = await newStakeBasket.getAddress();
      const contract2 = await user1.getAddress(); // Use as dummy address
      
      // First proposal
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(contract1);
      
      // Second proposal should overwrite first
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(contract2);
      
      expect(await stakeBasketToken.pendingStakeBasketContract()).to.equal(contract2);
    });

    it("Should handle very large token amounts", async function () {
      const largeAmount = ethers.parseEther("1000000000"); // 1 billion tokens
      
      const mintCall = stakeBasketToken.interface.encodeFunctionData("mint", [
        await user1.getAddress(),
        largeAmount
      ]);
      await mockStakeBasket.setCallData(await stakeBasketToken.getAddress(), mintCall);
      
      await expect(mockStakeBasket.makeCall()).to.not.be.reverted;
      expect(await stakeBasketToken.balanceOf(await user1.getAddress())).to.equal(largeAmount);
    });

    it("Should handle contract address changes after timelock expiry", async function () {
      const newContract = await newStakeBasket.getAddress();
      
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(newContract);
      
      // Fast forward way beyond timelock
      await time.increase(TIMELOCK_DELAY + 86400); // Extra day
      
      // Should still be able to confirm
      await expect(
        stakeBasketToken.connect(owner).confirmStakeBasketContract()
      ).to.not.be.reverted;
    });
  });
});