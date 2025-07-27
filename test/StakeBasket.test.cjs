const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakeBasket", function () {
  let stakeBasket;
  let stakeBasketToken;
  let stakingManager;
  let priceFeed;
  let owner;
  let user1;
  let user2;
  let feeRecipient;

  beforeEach(async function () {
    [owner, user1, user2, feeRecipient] = await ethers.getSigners();

    // Deploy PriceFeed
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    priceFeed = await PriceFeed.deploy(owner.address);
    await priceFeed.waitForDeployment();

    // Deploy StakeBasketToken
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    stakeBasketToken = await StakeBasketToken.deploy("StakeBasket Token", "BASKET", owner.address);
    await stakeBasketToken.waitForDeployment();

    // Deploy StakingManager (with placeholder addresses)
    const StakingManager = await ethers.getContractFactory("StakingManager");
    stakingManager = await StakingManager.deploy(
      "0x0000000000000000000000000000000000000001", // placeholder StakeBasket address
      "0x0000000000000000000000000000000000000000", // Core staking contract
      "0x0000000000000000000000000000000000000000", // lstBTC contract
      "0x0000000000000000000000000000000000000000", // coreBTC contract
      owner.address
    );
    await stakingManager.waitForDeployment();

    // Deploy StakeBasket
    const StakeBasket = await ethers.getContractFactory("StakeBasket");
    stakeBasket = await StakeBasket.deploy(
      await stakeBasketToken.getAddress(),
      await stakingManager.getAddress(),
      await priceFeed.getAddress(),
      feeRecipient.address,
      owner.address
    );
    await stakeBasket.waitForDeployment();

    // Set StakeBasket contract in StakeBasketToken
    await stakeBasketToken.setStakeBasketContract(await stakeBasket.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await stakeBasket.owner()).to.equal(owner.address);
      expect(await stakeBasketToken.owner()).to.equal(owner.address);
    });

    it("Should set the correct StakeBasket token address", async function () {
      expect(await stakeBasket.etfToken()).to.equal(await stakeBasketToken.getAddress());
    });

    it("Should set the correct fee recipient", async function () {
      expect(await stakeBasket.feeRecipient()).to.equal(feeRecipient.address);
    });
  });

  describe("Deposits", function () {
    it("Should allow users to deposit CORE and receive StakeBasket tokens", async function () {
      const depositAmount = ethers.parseEther("10"); // 10 CORE

      await expect(
        stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount })
      )
        .to.emit(stakeBasket, "Deposited")
        .withArgs(user1.address, depositAmount, depositAmount);

      expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await stakeBasket.totalPooledCore()).to.equal(depositAmount);
    });

    it("Should calculate correct shares for subsequent deposits", async function () {
      const firstDeposit = ethers.parseEther("100");
      const secondDeposit = ethers.parseEther("50");

      // First deposit
      await stakeBasket.connect(user1).deposit(firstDeposit, { value: firstDeposit });

      // Simulate some rewards
      await stakeBasket.simulateRewards();

      // Second deposit should get fewer shares due to increased NAV
      await stakeBasket.connect(user2).deposit(secondDeposit, { value: secondDeposit });

      const user1Balance = await stakeBasketToken.balanceOf(user1.address);
      const user2Balance = await stakeBasketToken.balanceOf(user2.address);

      expect(user1Balance).to.equal(firstDeposit);
      expect(user2Balance).to.be.lt(secondDeposit); // Should be less due to higher NAV
    });

    it("Should revert on zero deposit", async function () {
      await expect(
        stakeBasket.connect(user1).deposit(0, { value: 0 })
      ).to.be.revertedWith("StakeBasket: amount must be greater than 0");
    });

    it("Should revert if sent value doesn't match amount", async function () {
      const depositAmount = ethers.parseEther("10");
      const sentValue = ethers.parseEther("5");

      await expect(
        stakeBasket.connect(user1).deposit(depositAmount, { value: sentValue })
      ).to.be.revertedWith("StakeBasket: sent value must equal amount");
    });
  });

  describe("Redemptions", function () {
    beforeEach(async function () {
      // Setup initial deposit
      const depositAmount = ethers.parseEther("100");
      await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
    });

    it("Should allow users to redeem StakeBasket tokens for CORE", async function () {
      const redeemShares = ethers.parseEther("50");
      const initialBalance = await ethers.provider.getBalance(user1.address);

      await expect(
        stakeBasket.connect(user1).redeem(redeemShares)
      )
        .to.emit(stakeBasket, "Redeemed")
        .withArgs(user1.address, redeemShares, redeemShares);

      expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("50")
      );
    });

    it("Should revert on zero redemption", async function () {
      await expect(
        stakeBasket.connect(user1).redeem(0)
      ).to.be.revertedWith("StakeBasket: shares must be greater than 0");
    });

    it("Should revert if user has insufficient shares", async function () {
      const excessiveShares = ethers.parseEther("200");

      await expect(
        stakeBasket.connect(user1).redeem(excessiveShares)
      ).to.be.revertedWith("StakeBasket: insufficient shares");
    });
  });

  describe("NAV Calculation", function () {
    it("Should return correct initial NAV", async function () {
      const nav = await stakeBasket.getNAVPerShare();
      expect(nav).to.equal(ethers.parseEther("1")); // 1 USD initial NAV
    });

    it("Should update NAV after rewards", async function () {
      // Make initial deposit
      const depositAmount = ethers.parseEther("100");
      await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });

      const initialNAV = await stakeBasket.getNAVPerShare();

      // Simulate rewards
      await stakeBasket.simulateRewards();

      const newNAV = await stakeBasket.getNAVPerShare();
      expect(newNAV).to.be.gt(initialNAV);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update prices", async function () {
      const newCorePrice = ethers.parseEther("1.5");
      const newLstBTCPrice = ethers.parseEther("100000");

      await expect(
        stakeBasket.updatePrices(newCorePrice, newLstBTCPrice)
      )
        .to.emit(stakeBasket, "PriceUpdated")
        .withArgs("CORE", newCorePrice)
        .and.to.emit(stakeBasket, "PriceUpdated")
        .withArgs("lstBTC", newLstBTCPrice);

      expect(await stakeBasket.corePrice()).to.equal(newCorePrice);
      expect(await stakeBasket.lstBTCPrice()).to.equal(newLstBTCPrice);
    });

    it("Should allow owner to pause and unpause", async function () {
      await stakeBasket.pause();
      
      await expect(
        stakeBasket.connect(user1).deposit(ethers.parseEther("10"), { 
          value: ethers.parseEther("10") 
        })
      ).to.be.revertedWith("Pausable: paused");

      await stakeBasket.unpause();
      
      // Should work after unpause
      await expect(
        stakeBasket.connect(user1).deposit(ethers.parseEther("10"), { 
          value: ethers.parseEther("10") 
        })
      ).to.not.be.reverted;
    });

    it("Should prevent non-owner from calling admin functions", async function () {
      await expect(
        stakeBasket.connect(user1).updatePrices(
          ethers.parseEther("1.5"),
          ethers.parseEther("100000")
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        stakeBasket.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});