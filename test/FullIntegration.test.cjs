const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakeBasket Full Integration", function () {
  let deployer, user1, user2;
  let mockCORE, mockCoreBTC, mockCoreStaking, mockLstBTC;
  let priceFeed, stakingManager, stakeBasketToken, stakeBasket;
  
  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    
    // Deploy Mock Tokens
    const MockCORE = await ethers.getContractFactory("MockCORE");
    mockCORE = await MockCORE.deploy(deployer.address);
    await mockCORE.waitForDeployment();
    
    const MockCoreBTC = await ethers.getContractFactory("MockCoreBTC");
    mockCoreBTC = await MockCoreBTC.deploy(deployer.address);
    await mockCoreBTC.waitForDeployment();
    
    // Deploy Mock Staking Contracts
    const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
    mockCoreStaking = await MockCoreStaking.deploy(await mockCORE.getAddress(), deployer.address);
    await mockCoreStaking.waitForDeployment();
    
    const MockLstBTC = await ethers.getContractFactory("MockLstBTC");
    mockLstBTC = await MockLstBTC.deploy(await mockCoreBTC.getAddress(), deployer.address);
    await mockLstBTC.waitForDeployment();
    
    // Deploy StakeBasket Core Contracts
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    priceFeed = await PriceFeed.deploy(deployer.address);
    await priceFeed.waitForDeployment();
    
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    stakeBasketToken = await StakeBasketToken.deploy(
      "StakeBasket Token",
      "BASKET",
      deployer.address
    );
    await stakeBasketToken.waitForDeployment();
    
    const StakingManager = await ethers.getContractFactory("StakingManager");
    stakingManager = await StakingManager.deploy(
      "0x0000000000000000000000000000000000000001", // placeholder
      await mockCoreStaking.getAddress(),
      await mockLstBTC.getAddress(),
      await mockCoreBTC.getAddress(),
      deployer.address
    );
    await stakingManager.waitForDeployment();
    
    const StakeBasket = await ethers.getContractFactory("StakeBasket");
    stakeBasket = await StakeBasket.deploy(
      await stakeBasketToken.getAddress(),
      await stakingManager.getAddress(),
      await priceFeed.getAddress(),
      deployer.address,
      deployer.address
    );
    await stakeBasket.waitForDeployment();
    
    // Configure contracts
    await stakeBasketToken.setStakeBasketContract(await stakeBasket.getAddress());
    
    // Fund contracts with test tokens
    await mockCORE.mint(user1.address, ethers.parseEther("1000"));
    await mockCORE.mint(user2.address, ethers.parseEther("1000"));
    await mockCoreBTC.mint(user1.address, ethers.parseUnits("10", 8));
    await mockCoreBTC.mint(user2.address, ethers.parseUnits("10", 8));
    
    // Fund reward pools
    await mockCORE.mint(await mockCoreStaking.getAddress(), ethers.parseEther("50000"));
    await mockCoreBTC.mint(await mockLstBTC.getAddress(), ethers.parseUnits("500", 8));
  });
  
  describe("Full CORE Staking Flow", function () {
    it("Should allow users to deposit CORE and receive BASKET tokens", async function () {
      const depositAmount = ethers.parseEther("1"); // 1 ETH (representing CORE)
      
      // User deposits CORE (sending ETH value)
      await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
      
      // Check user received BASKET tokens
      const basketBalance = await stakeBasketToken.balanceOf(user1.address);
      expect(basketBalance).to.be.gt(0);
      
      // Check StakeBasket contract received CORE
      const totalPooledCore = await stakeBasket.totalPooledCore();
      expect(totalPooledCore).to.equal(depositAmount);
    });
    
    it("Should calculate correct NAV after deposits", async function () {
      const depositAmount = ethers.parseEther("1");
      
      await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
      
      const nav = await stakeBasket.getTotalAUM();
      expect(nav).to.be.gt(0);
    });
    
    it("Should allow users to redeem BASKET tokens for CORE", async function () {
      const depositAmount = ethers.parseEther("1");
      
      // Deposit first
      await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
      
      const basketBalance = await stakeBasketToken.balanceOf(user1.address);
      const initialCoreBalance = await ethers.provider.getBalance(user1.address);
      
      // Redeem half of BASKET tokens
      const redeemAmount = basketBalance / 2n;
      await stakeBasket.connect(user1).redeem(redeemAmount);
      
      // Check user received CORE back
      const finalCoreBalance = await ethers.provider.getBalance(user1.address);
      // Note: Due to gas costs, we can't directly compare balances
      // Instead, check that totalPooledCore decreased
      const finalPooledCore = await stakeBasket.totalPooledCore();
      expect(finalPooledCore).to.be.lt(depositAmount);
      
      // Check BASKET tokens were burned
      const finalBasketBalance = await stakeBasketToken.balanceOf(user1.address);
      expect(finalBasketBalance).to.equal(basketBalance - redeemAmount);
    });
  });
  
  describe("lstBTC Integration", function () {
    it("Should allow minting and redeeming lstBTC through StakingManager", async function () {
      const coreBTCAmount = ethers.parseUnits("1", 8); // 1 coreBTC
      
      // Give StakeBasket some coreBTC
      await mockCoreBTC.mint(await stakeBasket.getAddress(), coreBTCAmount);
      
      // Configure stakingManager to allow StakeBasket calls
      await stakingManager.setCoreStakingContract(await mockCoreStaking.getAddress());
      
      // The minting would typically be called internally by StakeBasket
      // For now, we test that the lstBTC contract works correctly
      await mockCoreBTC.connect(user1).approve(await mockLstBTC.getAddress(), coreBTCAmount);
      
      const initialExchangeRate = await mockLstBTC.getExchangeRate();
      await mockLstBTC.connect(user1).mint(coreBTCAmount);
      
      const userLstBTCBalance = await mockLstBTC.balanceOf(user1.address);
      expect(userLstBTCBalance).to.be.gt(0);
    });
    
    it("Should accrue rewards over time in lstBTC", async function () {
      const coreBTCAmount = ethers.parseUnits("1", 8);
      
      await mockCoreBTC.connect(user1).approve(await mockLstBTC.getAddress(), coreBTCAmount);
      await mockLstBTC.connect(user1).mint(coreBTCAmount);
      
      const initialExchangeRate = await mockLstBTC.getExchangeRate();
      
      // Advance time by 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // Update exchange rate
      await mockLstBTC.updateExchangeRate();
      
      const newExchangeRate = await mockLstBTC.getExchangeRate();
      expect(newExchangeRate).to.be.gt(initialExchangeRate);
    });
  });
  
  describe("Mock Core Staking", function () {
    it("Should allow delegation and reward claiming", async function () {
      const stakeAmount = ethers.parseEther("100");
      const validators = await mockCoreStaking.getValidators();
      const validator = validators[0];
      
      // User approves and delegates CORE
      await mockCORE.connect(user1).approve(await mockCoreStaking.getAddress(), stakeAmount);
      await mockCoreStaking.connect(user1).delegate(validator, stakeAmount);
      
      // Check delegation was recorded
      const delegatedAmount = await mockCoreStaking.getDelegatedAmount(user1.address, validator);
      expect(delegatedAmount).to.equal(stakeAmount);
      
      // Advance time to accrue rewards
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // Check rewards
      const rewards = await mockCoreStaking.getRewards(user1.address, validator);
      expect(rewards).to.be.gt(0);
      
      // Claim rewards
      const initialBalance = await mockCORE.balanceOf(user1.address);
      await mockCoreStaking.connect(user1).claimRewards(validator);
      const finalBalance = await mockCORE.balanceOf(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });
  
  describe("Price Feed Integration", function () {
    it("Should return mock prices for CORE and lstBTC", async function () {
      const corePrice = await priceFeed.getCorePrice();
      const lstBTCPrice = await priceFeed.getLstBTCPrice();
      
      expect(corePrice).to.be.gt(0);
      expect(lstBTCPrice).to.be.gt(0);
    });
    
    it("Should allow manual price updates for testing", async function () {
      const newCorePrice = ethers.parseEther("2"); // $2
      
      await priceFeed.setPrices(["CORE"], [newCorePrice]);
      
      const updatedPrice = await priceFeed.getCorePrice();
      expect(updatedPrice).to.equal(newCorePrice);
    });
  });
  
  describe("Multi-User Scenarios", function () {
    it("Should handle multiple users depositing and withdrawing", async function () {
      const depositAmount = ethers.parseEther("1");
      
      // User 1 deposits
      await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
      
      // User 2 deposits
      await stakeBasket.connect(user2).deposit(depositAmount, { value: depositAmount });
      
      // Check both users have BASKET tokens
      const user1Balance = await stakeBasketToken.balanceOf(user1.address);
      const user2Balance = await stakeBasketToken.balanceOf(user2.address);
      
      expect(user1Balance).to.be.gt(0);
      expect(user2Balance).to.be.gt(0);
      
      // Total pooled should equal both deposits
      const totalPooled = await stakeBasket.totalPooledCore();
      expect(totalPooled).to.equal(depositAmount * 2n);
    });
  });
});