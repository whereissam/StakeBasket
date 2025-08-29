const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleToken", function () {
  let simpleToken;
  let owner, minter, user1, user2, unauthorized;

  beforeEach(async function () {
    [owner, minter, user1, user2, unauthorized] = await ethers.getSigners();

    // Deploy SimpleToken
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    simpleToken = await SimpleToken.connect(owner).deploy("Simple Token", "SIMPLE");
    await simpleToken.waitForDeployment();

    // Set authorized minter
    await simpleToken.connect(owner).setAuthorizedMinter(await minter.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await simpleToken.name()).to.equal("Simple Token");
      expect(await simpleToken.symbol()).to.equal("SIMPLE");
      expect(await simpleToken.decimals()).to.equal(18);
      expect(await simpleToken.totalSupply()).to.equal(0);
      expect(await simpleToken.owner()).to.equal(await owner.getAddress());
    });

    it("Should have no initial authorized minter", async function () {
      // Deploy fresh token to test initial state
      const FreshSimpleToken = await ethers.getContractFactory("SimpleToken");
      const freshToken = await FreshSimpleToken.connect(owner).deploy("Fresh Token", "FRESH");
      
      expect(await freshToken.authorizedMinter()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Minter Authorization", function () {
    it("Should set authorized minter", async function () {
      const newMinter = await user1.getAddress();
      
      await simpleToken.connect(owner).setAuthorizedMinter(newMinter);
      
      expect(await simpleToken.authorizedMinter()).to.equal(newMinter);
    });

    it("Should allow owner to change minter", async function () {
      const firstMinter = await minter.getAddress();
      const secondMinter = await user1.getAddress();
      
      // Initial minter
      expect(await simpleToken.authorizedMinter()).to.equal(firstMinter);
      
      // Change minter
      await simpleToken.connect(owner).setAuthorizedMinter(secondMinter);
      expect(await simpleToken.authorizedMinter()).to.equal(secondMinter);
    });

    it("Should allow setting minter to zero address", async function () {
      await simpleToken.connect(owner).setAuthorizedMinter(ethers.ZeroAddress);
      expect(await simpleToken.authorizedMinter()).to.equal(ethers.ZeroAddress);
    });

    it("Should reject minter changes from non-owner", async function () {
      await expect(
        simpleToken.connect(user1).setAuthorizedMinter(await user2.getAddress())
      ).to.be.revertedWithCustomError(simpleToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    it("Should mint tokens from authorized minter", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        simpleToken.connect(minter).mint(await user1.getAddress(), amount)
      ).to.emit(simpleToken, "Transfer")
        .withArgs(ethers.ZeroAddress, await user1.getAddress(), amount);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(amount);
      expect(await simpleToken.totalSupply()).to.equal(amount);
    });

    it("Should reject minting from unauthorized address", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        simpleToken.connect(unauthorized).mint(await user1.getAddress(), amount)
      ).to.be.revertedWith("SimpleToken: not authorized");
    });

    it("Should reject minting from owner if not authorized minter", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        simpleToken.connect(owner).mint(await user1.getAddress(), amount)
      ).to.be.revertedWith("SimpleToken: not authorized");
    });

    it("Should mint to multiple addresses", async function () {
      const amount1 = ethers.parseEther("500");
      const amount2 = ethers.parseEther("300");
      
      await simpleToken.connect(minter).mint(await user1.getAddress(), amount1);
      await simpleToken.connect(minter).mint(await user2.getAddress(), amount2);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(amount1);
      expect(await simpleToken.balanceOf(await user2.getAddress())).to.equal(amount2);
      expect(await simpleToken.totalSupply()).to.equal(amount1 + amount2);
    });

    it("Should handle zero amount minting", async function () {
      await expect(
        simpleToken.connect(minter).mint(await user1.getAddress(), 0)
      ).to.not.be.reverted;
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(0);
      expect(await simpleToken.totalSupply()).to.equal(0);
    });

    it("Should mint to the same address multiple times", async function () {
      const amount1 = ethers.parseEther("200");
      const amount2 = ethers.parseEther("300");
      
      await simpleToken.connect(minter).mint(await user1.getAddress(), amount1);
      await simpleToken.connect(minter).mint(await user1.getAddress(), amount2);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(amount1 + amount2);
      expect(await simpleToken.totalSupply()).to.equal(amount1 + amount2);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      const amount = ethers.parseEther("1000");
      await simpleToken.connect(minter).mint(await user1.getAddress(), amount);
    });

    it("Should burn tokens from authorized minter", async function () {
      const burnAmount = ethers.parseEther("300");
      const initialBalance = await simpleToken.balanceOf(await user1.getAddress());
      const initialSupply = await simpleToken.totalSupply();
      
      await expect(
        simpleToken.connect(minter).burn(await user1.getAddress(), burnAmount)
      ).to.emit(simpleToken, "Transfer")
        .withArgs(await user1.getAddress(), ethers.ZeroAddress, burnAmount);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(initialBalance - burnAmount);
      expect(await simpleToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should reject burning from unauthorized address", async function () {
      const burnAmount = ethers.parseEther("300");
      
      await expect(
        simpleToken.connect(unauthorized).burn(await user1.getAddress(), burnAmount)
      ).to.be.revertedWith("SimpleToken: not authorized");
    });

    it("Should reject burning from owner if not authorized minter", async function () {
      const burnAmount = ethers.parseEther("300");
      
      await expect(
        simpleToken.connect(owner).burn(await user1.getAddress(), burnAmount)
      ).to.be.revertedWith("SimpleToken: not authorized");
    });

    it("Should revert when burning more than balance", async function () {
      const excessiveAmount = ethers.parseEther("2000");
      
      await expect(
        simpleToken.connect(minter).burn(await user1.getAddress(), excessiveAmount)
      ).to.be.revertedWithCustomError(simpleToken, "ERC20InsufficientBalance");
    });

    it("Should burn all tokens", async function () {
      const totalBalance = await simpleToken.balanceOf(await user1.getAddress());
      
      await simpleToken.connect(minter).burn(await user1.getAddress(), totalBalance);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(0);
      expect(await simpleToken.totalSupply()).to.equal(0);
    });

    it("Should handle zero amount burning", async function () {
      const initialBalance = await simpleToken.balanceOf(await user1.getAddress());
      
      await expect(
        simpleToken.connect(minter).burn(await user1.getAddress(), 0)
      ).to.not.be.reverted;
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(initialBalance);
    });

    it("Should burn from multiple addresses", async function () {
      // Mint to user2 first
      await simpleToken.connect(minter).mint(await user2.getAddress(), ethers.parseEther("500"));
      
      const burnAmount1 = ethers.parseEther("200");
      const burnAmount2 = ethers.parseEther("150");
      
      await simpleToken.connect(minter).burn(await user1.getAddress(), burnAmount1);
      await simpleToken.connect(minter).burn(await user2.getAddress(), burnAmount2);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("800"));
      expect(await simpleToken.balanceOf(await user2.getAddress())).to.equal(ethers.parseEther("350"));
    });
  });

  describe("ERC20 Standard Compliance", function () {
    beforeEach(async function () {
      // Mint tokens to users for testing
      const amount = ethers.parseEther("1000");
      await simpleToken.connect(minter).mint(await user1.getAddress(), amount);
      await simpleToken.connect(minter).mint(await user2.getAddress(), amount);
    });

    it("Should handle transfers correctly", async function () {
      const transferAmount = ethers.parseEther("250");
      
      await expect(
        simpleToken.connect(user1).transfer(await user2.getAddress(), transferAmount)
      ).to.emit(simpleToken, "Transfer")
        .withArgs(await user1.getAddress(), await user2.getAddress(), transferAmount);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("750"));
      expect(await simpleToken.balanceOf(await user2.getAddress())).to.equal(ethers.parseEther("1250"));
    });

    it("Should handle approvals correctly", async function () {
      const approvalAmount = ethers.parseEther("500");
      
      await expect(
        simpleToken.connect(user1).approve(await user2.getAddress(), approvalAmount)
      ).to.emit(simpleToken, "Approval")
        .withArgs(await user1.getAddress(), await user2.getAddress(), approvalAmount);
      
      expect(await simpleToken.allowance(await user1.getAddress(), await user2.getAddress())).to.equal(approvalAmount);
    });

    it("Should handle transferFrom correctly", async function () {
      const approvalAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("300");
      
      await simpleToken.connect(user1).approve(await user2.getAddress(), approvalAmount);
      
      await expect(
        simpleToken.connect(user2).transferFrom(await user1.getAddress(), await user2.getAddress(), transferAmount)
      ).to.emit(simpleToken, "Transfer")
        .withArgs(await user1.getAddress(), await user2.getAddress(), transferAmount);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("700"));
      expect(await simpleToken.allowance(await user1.getAddress(), await user2.getAddress())).to.equal(approvalAmount - transferAmount);
    });

    it("Should revert on insufficient balance", async function () {
      const excessiveAmount = ethers.parseEther("2000");
      
      await expect(
        simpleToken.connect(user1).transfer(await user2.getAddress(), excessiveAmount)
      ).to.be.revertedWithCustomError(simpleToken, "ERC20InsufficientBalance");
    });

    it("Should revert on insufficient allowance", async function () {
      const transferAmount = ethers.parseEther("300");
      
      await expect(
        simpleToken.connect(user2).transferFrom(await user1.getAddress(), await user2.getAddress(), transferAmount)
      ).to.be.revertedWithCustomError(simpleToken, "ERC20InsufficientAllowance");
    });
  });

  describe("Access Control", function () {
    it("Should restrict minter management to owner", async function () {
      await expect(
        simpleToken.connect(user1).setAuthorizedMinter(await user2.getAddress())
      ).to.be.revertedWithCustomError(simpleToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to transfer ownership", async function () {
      await simpleToken.connect(owner).transferOwnership(await user1.getAddress());
      expect(await simpleToken.owner()).to.equal(await user1.getAddress());
      
      // New owner should be able to set minter
      await expect(
        simpleToken.connect(user1).setAuthorizedMinter(await user2.getAddress())
      ).to.not.be.reverted;
    });

    it("Should restrict minting and burning to authorized minter only", async function () {
      const amount = ethers.parseEther("100");
      
      // Even owner cannot mint/burn without being authorized minter
      await expect(
        simpleToken.connect(owner).mint(await user1.getAddress(), amount)
      ).to.be.revertedWith("SimpleToken: not authorized");
      
      await expect(
        simpleToken.connect(owner).burn(await user1.getAddress(), amount)
      ).to.be.revertedWith("SimpleToken: not authorized");
    });
  });

  describe("Minter Role Transfer", function () {
    it("Should handle minter role transfer correctly", async function () {
      const newMinter = await user1.getAddress();
      const amount = ethers.parseEther("100");
      
      // Initial minter can mint
      await expect(
        simpleToken.connect(minter).mint(await user2.getAddress(), amount)
      ).to.not.be.reverted;
      
      // Transfer minter role
      await simpleToken.connect(owner).setAuthorizedMinter(newMinter);
      
      // Old minter cannot mint anymore
      await expect(
        simpleToken.connect(minter).mint(await user2.getAddress(), amount)
      ).to.be.revertedWith("SimpleToken: not authorized");
      
      // New minter can mint
      await expect(
        simpleToken.connect(user1).mint(await user2.getAddress(), amount)
      ).to.not.be.reverted;
    });

    it("Should handle disabling minter role", async function () {
      const amount = ethers.parseEther("100");
      
      // Disable minter by setting to zero address
      await simpleToken.connect(owner).setAuthorizedMinter(ethers.ZeroAddress);
      
      // No one can mint now
      await expect(
        simpleToken.connect(minter).mint(await user1.getAddress(), amount)
      ).to.be.revertedWith("SimpleToken: not authorized");
      
      await expect(
        simpleToken.connect(owner).mint(await user1.getAddress(), amount)
      ).to.be.revertedWith("SimpleToken: not authorized");
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle complete mint and burn workflow", async function () {
      const mintAmount = ethers.parseEther("1000");
      const burnAmount = ethers.parseEther("300");
      const transferAmount = ethers.parseEther("200");
      
      // Step 1: Mint tokens
      await simpleToken.connect(minter).mint(await user1.getAddress(), mintAmount);
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(mintAmount);
      
      // Step 2: Transfer some tokens
      await simpleToken.connect(user1).transfer(await user2.getAddress(), transferAmount);
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(mintAmount - transferAmount);
      expect(await simpleToken.balanceOf(await user2.getAddress())).to.equal(transferAmount);
      
      // Step 3: Burn tokens from user1
      await simpleToken.connect(minter).burn(await user1.getAddress(), burnAmount);
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(mintAmount - transferAmount - burnAmount);
      
      // Step 4: Verify total supply
      expect(await simpleToken.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("Should handle minter change during active operations", async function () {
      const amount = ethers.parseEther("500");
      
      // Initial operations with first minter
      await simpleToken.connect(minter).mint(await user1.getAddress(), amount);
      
      // Change minter
      await simpleToken.connect(owner).setAuthorizedMinter(await user1.getAddress());
      
      // New minter can continue operations
      await simpleToken.connect(user1).burn(await user1.getAddress(), amount / 2n);
      await simpleToken.connect(user1).mint(await user2.getAddress(), amount);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(amount / 2n);
      expect(await simpleToken.balanceOf(await user2.getAddress())).to.equal(amount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large token amounts", async function () {
      const largeAmount = ethers.parseEther("1000000000"); // 1 billion tokens
      
      await expect(
        simpleToken.connect(minter).mint(await user1.getAddress(), largeAmount)
      ).to.not.be.reverted;
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(largeAmount);
    });

    it("Should handle maximum uint256 amounts", async function () {
      // This tests the limits of the token
      const maxAmount = ethers.MaxUint256;
      
      // This should not revert due to our implementation
      // But may revert due to ERC20 internal checks - that's expected behavior
      try {
        await simpleToken.connect(minter).mint(await user1.getAddress(), maxAmount);
        expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(maxAmount);
      } catch (error) {
        // Expected to potentially fail due to overflow protection
        expect(error.message).to.include("overflow");
      }
    });

    it("Should handle rapid minter changes", async function () {
      const minters = [user1, user2, unauthorized];
      const amount = ethers.parseEther("100");
      
      for (const newMinter of minters) {
        await simpleToken.connect(owner).setAuthorizedMinter(await newMinter.getAddress());
        
        await expect(
          simpleToken.connect(newMinter).mint(await user1.getAddress(), amount)
        ).to.not.be.reverted;
        
        expect(await simpleToken.authorizedMinter()).to.equal(await newMinter.getAddress());
      }
    });

    it("Should handle zero address operations correctly", async function () {
      const amount = ethers.parseEther("100");
      
      // Minting to zero address should revert
      await expect(
        simpleToken.connect(minter).mint(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(simpleToken, "ERC20InvalidReceiver");
      
      // Burning from zero address should revert
      await expect(
        simpleToken.connect(minter).burn(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(simpleToken, "ERC20InvalidSender");
    });
  });
});