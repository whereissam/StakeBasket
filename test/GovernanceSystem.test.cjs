const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Enhanced BASKET Token Governance System", function () {
  let stakeBasketToken, basketStaking, basketGovernance, stakeBasket;
  let owner, user1, user2, user3, feeRecipient;
  
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000"); // 1M tokens
  const TIER_THRESHOLDS = {
    BRONZE: ethers.utils.parseEther("100"),
    SILVER: ethers.utils.parseEther("1000"), 
    GOLD: ethers.utils.parseEther("10000"),
    PLATINUM: ethers.utils.parseEther("100000")
  };

  beforeEach(async function () {
    [owner, user1, user2, user3, feeRecipient] = await ethers.getSigners();

    // Deploy StakeBasketToken
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    stakeBasketToken = await StakeBasketToken.deploy(
      "Stake Basket Token",
      "BASKET",
      owner.address
    );
    await stakeBasketToken.deployed();

    // Deploy BasketStaking
    const BasketStaking = await ethers.getContractFactory("BasketStaking");
    basketStaking = await BasketStaking.deploy(
      stakeBasketToken.address,
      owner.address
    );
    await basketStaking.deployed();

    // Deploy BasketGovernance
    const BasketGovernance = await ethers.getContractFactory("BasketGovernance");
    basketGovernance = await BasketGovernance.deploy(
      stakeBasketToken.address,
      basketStaking.address,
      owner.address
    );
    await basketGovernance.deployed();

    // Deploy mock StakeBasket for integration testing
    const StakeBasket = await ethers.getContractFactory("StakeBasket");
    stakeBasket = await StakeBasket.deploy(
      stakeBasketToken.address,
      ethers.constants.AddressZero, // No staking manager for test
      ethers.constants.AddressZero, // No price feed for test
      feeRecipient.address,
      basketGovernance.address, // Protocol treasury
      owner.address
    );
    await stakeBasket.deployed();

    // Set up relationships
    await stakeBasketToken.setStakeBasketContract(stakeBasket.address);
    await stakeBasket.setBasketStaking(basketStaking.address);
    await basketGovernance.setBasketStaking(basketStaking.address);

    // Mint tokens to users for testing
    await stakeBasketToken.mint(user1.address, ethers.utils.parseEther("50000"));
    await stakeBasketToken.mint(user2.address, ethers.utils.parseEther("25000"));
    await stakeBasketToken.mint(user3.address, ethers.utils.parseEther("15000"));
  });

  describe("BasketStaking Contract", function () {
    it("Should allow users to stake BASKET tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // Approve staking contract
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      
      // Stake tokens
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // Check staked amount
      const stakeInfo = await basketStaking.getUserStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount);
      expect(stakeInfo.tier).to.equal(2); // Silver tier
    });

    it("Should calculate correct tiers based on staked amounts", async function () {
      // Test Bronze tier
      await stakeBasketToken.connect(user1).approve(basketStaking.address, TIER_THRESHOLDS.BRONZE);
      await basketStaking.connect(user1).stake(TIER_THRESHOLDS.BRONZE);
      expect((await basketStaking.getUserStakeInfo(user1.address)).tier).to.equal(1);

      // Test Silver tier
      await stakeBasketToken.connect(user2).approve(basketStaking.address, TIER_THRESHOLDS.SILVER);
      await basketStaking.connect(user2).stake(TIER_THRESHOLDS.SILVER);
      expect((await basketStaking.getUserStakeInfo(user2.address)).tier).to.equal(2);

      // Test Gold tier
      await stakeBasketToken.connect(user1).approve(basketStaking.address, TIER_THRESHOLDS.GOLD.sub(TIER_THRESHOLDS.BRONZE));
      await basketStaking.connect(user1).stake(TIER_THRESHOLDS.GOLD.sub(TIER_THRESHOLDS.BRONZE));
      expect((await basketStaking.getUserStakeInfo(user1.address)).tier).to.equal(3);
    });

    it("Should allow users to unstake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const unstakeAmount = ethers.utils.parseEther("500");
      
      // Stake first
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // Unstake
      await basketStaking.connect(user1).unstake(unstakeAmount);
      
      // Check remaining staked amount
      const stakeInfo = await basketStaking.getUserStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount.sub(unstakeAmount));
    });

    it("Should distribute protocol fees as rewards", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const feeAmount = ethers.utils.parseEther("1");
      
      // User stakes tokens
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // Simulate protocol fee deposit
      await basketStaking.depositProtocolFees({ value: feeAmount });
      
      // Check pending rewards
      const pendingRewards = await basketStaking.getPendingRewards(user1.address);
      expect(pendingRewards).to.be.gt(0);
    });

    it("Should apply tier multipliers to rewards", async function () {
      const stakeAmount = TIER_THRESHOLDS.GOLD;
      const feeAmount = ethers.utils.parseEther("1");
      
      // User stakes to reach Gold tier
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // Deposit protocol fees
      await basketStaking.depositProtocolFees({ value: feeAmount });
      
      // Check that Gold tier gets 1.25x multiplier
      const pendingRewards = await basketStaking.getPendingRewards(user1.address);
      const expectedRewards = feeAmount.mul(12500).div(10000); // 1.25x multiplier
      expect(pendingRewards).to.equal(expectedRewards);
    });

    it("Should provide correct fee reductions based on tiers", async function () {
      // Test Gold tier fee reduction (25%)
      await stakeBasketToken.connect(user1).approve(basketStaking.address, TIER_THRESHOLDS.GOLD);
      await basketStaking.connect(user1).stake(TIER_THRESHOLDS.GOLD);
      
      const feeReduction = await basketStaking.getFeeReduction(user1.address);
      expect(feeReduction).to.equal(2500); // 25% in basis points
    });
  });

  describe("BasketGovernance Contract", function () {
    it("Should allow users with sufficient tokens to create proposals", async function () {
      const proposalThreshold = await basketGovernance.proposalThreshold();
      
      // User1 has enough tokens to propose
      await basketGovernance.connect(user1).propose(
        "Test Proposal",
        "This is a test proposal",
        0, // ParameterChange
        ethers.constants.AddressZero,
        "0x",
        0
      );
      
      expect(await basketGovernance.proposalCount()).to.equal(1);
    });

    it("Should prevent users without sufficient tokens from creating proposals", async function () {
      // User3 doesn't have enough tokens
      await expect(
        basketGovernance.connect(user3).propose(
          "Test Proposal",
          "This should fail",
          0,
          ethers.constants.AddressZero,
          "0x",
          0
        )
      ).to.be.revertedWith("BasketGovernance: insufficient tokens to propose");
    });

    it("Should allow voting on active proposals", async function () {
      // Create proposal
      await basketGovernance.connect(user1).propose(
        "Test Proposal",
        "Test Description",
        0,
        ethers.constants.AddressZero,
        "0x",
        0
      );
      
      // Vote on proposal
      await basketGovernance.connect(user1).castVote(1, 1); // Vote "for"
      
      const [, , , , , , , , , forVotes, , ,] = await basketGovernance.getProposal(1);
      expect(forVotes).to.be.gt(0);
    });

    it("Should integrate with staking contract for enhanced voting power", async function () {
      const stakeAmount = TIER_THRESHOLDS.GOLD;
      
      // User stakes to get enhanced voting power
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // Check voting power includes staking multiplier
      const votingPower = await basketGovernance.getVotingPower(user1.address);
      const expectedPower = (await stakeBasketToken.balanceOf(user1.address)).mul(12500).div(10000);
      expect(votingPower).to.equal(expectedPower);
    });

    it("Should execute successful proposals after delay", async function () {
      // Create and pass a proposal
      await basketGovernance.connect(user1).propose(
        "Test Proposal",
        "Test Description",
        0,
        ethers.constants.AddressZero,
        "0x",
        0
      );
      
      // Vote to pass the proposal
      await basketGovernance.connect(user1).castVote(1, 1);
      await basketGovernance.connect(user2).castVote(1, 1);
      
      // Fast forward time to end voting period
      await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]); // 3 days + 1 second
      await ethers.provider.send("evm_mine");
      
      // Queue the proposal
      await basketGovernance.queue(1);
      
      // Fast forward execution delay
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]); // 1 day + 1 second
      await ethers.provider.send("evm_mine");
      
      // Execute the proposal
      await basketGovernance.execute(1);
      
      const [, , , , , , , , , , , , executed] = await basketGovernance.getProposal(1);
      expect(executed).to.be.true;
    });
  });

  describe("Integration Tests", function () {
    it("Should integrate staking rewards with ETF fees", async function () {
      const depositAmount = ethers.utils.parseEther("10");
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // User stakes BASKET tokens
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // User deposits to ETF
      await stakeBasket.connect(user2).deposit(depositAmount, { value: depositAmount });
      
      // Simulate fee collection
      await stakeBasket.collectFees();
      
      // Check that staking contract received protocol fees
      const contractBalance = await ethers.provider.getBalance(basketStaking.address);
      expect(contractBalance).to.be.gt(0);
    });

    it("Should apply tier-based fee reductions in ETF deposits", async function () {
      const depositAmount = ethers.utils.parseEther("10");
      const stakeAmount = TIER_THRESHOLDS.GOLD;
      
      // User stakes to reach Gold tier
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // User deposits to ETF (should get fee reduction)
      const balanceBefore = await stakeBasketToken.balanceOf(user1.address);
      await stakeBasket.connect(user1).deposit(depositAmount, { value: depositAmount });
      const balanceAfter = await stakeBasketToken.balanceOf(user1.address);
      
      // User should receive more shares due to fee reduction
      const sharesReceived = balanceAfter.sub(balanceBefore);
      expect(sharesReceived).to.be.gt(depositAmount); // More shares than deposit due to fee reduction
    });

    it("Should coordinate governance voting with staking tiers", async function () {
      const stakeAmount = TIER_THRESHOLDS.PLATINUM;
      
      // User stakes to reach Platinum tier
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      // Create governance proposal
      await basketGovernance.connect(user1).propose(
        "Increase Management Fee",
        "Proposal to increase fee to 0.75%",
        3, // FeeAdjustment
        stakeBasket.address,
        stakeBasket.interface.encodeFunctionData("setManagementFee", [75]), // 0.75%
        0
      );
      
      // Vote with enhanced voting power
      await basketGovernance.connect(user1).castVote(1, 1);
      
      // Check that vote has 1.5x multiplier effect
      const [, , , , , , , , , forVotes, , ,] = await basketGovernance.getProposal(1);
      const expectedVotes = (await stakeBasketToken.balanceOf(user1.address)).mul(15000).div(10000);
      expect(forVotes).to.equal(expectedVotes);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should prevent double voting on proposals", async function () {
      // Create proposal
      await basketGovernance.connect(user1).propose(
        "Test Proposal",
        "Test Description",
        0,
        ethers.constants.AddressZero,
        "0x",
        0
      );
      
      // First vote should succeed
      await basketGovernance.connect(user1).castVote(1, 1);
      
      // Second vote should fail
      await expect(
        basketGovernance.connect(user1).castVote(1, 0)
      ).to.be.revertedWith("BasketGovernance: voter already voted");
    });

    it("Should prevent claiming rewards without staking", async function () {
      await expect(
        basketStaking.connect(user1).claimRewards()
      ).to.be.revertedWith("BasketStaking: no rewards to claim");
    });

    it("Should prevent unstaking more than staked amount", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const unstakeAmount = ethers.utils.parseEther("1500");
      
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      
      await expect(
        basketStaking.connect(user1).unstake(unstakeAmount)
      ).to.be.revertedWith("BasketStaking: insufficient staked amount");
    });

    it("Should handle tier changes correctly when unstaking", async function () {
      const stakeAmount = TIER_THRESHOLDS.GOLD;
      const unstakeAmount = ethers.utils.parseEther("9000"); // Drops below Gold threshold
      
      // Stake to Gold tier
      await stakeBasketToken.connect(user1).approve(basketStaking.address, stakeAmount);
      await basketStaking.connect(user1).stake(stakeAmount);
      expect((await basketStaking.getUserStakeInfo(user1.address)).tier).to.equal(3); // Gold
      
      // Unstake to drop to Silver tier
      await basketStaking.connect(user1).unstake(unstakeAmount);
      expect((await basketStaking.getUserStakeInfo(user1.address)).tier).to.equal(2); // Silver
    });
  });
});