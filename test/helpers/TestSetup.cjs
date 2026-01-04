const { ethers } = require("hardhat");
const { expect } = require("chai");

class TestSetup {
  constructor() {
    this.accounts = [];
    this.contracts = {};
    this.tokens = {};
  }

  async initialize() {
    // Get signers
    const signers = await ethers.getSigners();
    this.owner = signers[0];
    this.user1 = signers[1];
    this.user2 = signers[2];
    this.user3 = signers[3];
    this.feeRecipient = signers[4];
    this.protocolTreasury = signers[5];

    this.accounts = signers;

    // Deploy mock tokens first
    await this.deployMockTokens();
    
    // Deploy price feeds
    await this.deployPriceFeeds();
    
    // Deploy core contracts
    await this.deployCoreContracts();
    
    return this;
  }

  async deployMockTokens() {
    // Deploy Mock CORE Token (ERC20)
    const MockCORE = await ethers.getContractFactory("MockERC20");
    this.tokens.mockCORE = await MockCORE.deploy(
      "Mock CORE Token",
      "mCORE",
      18
    );
    await this.tokens.mockCORE.waitForDeployment();

    // Deploy Mock BTC Token
    const MockBTC = await ethers.getContractFactory("TestBTC");
    this.tokens.mockBTC = await MockBTC.deploy();
    await this.tokens.mockBTC.waitForDeployment();

    // Mint initial tokens to test accounts
    const initialAmount = ethers.parseEther("1000000"); // 1M tokens
    for (let i = 0; i < 6; i++) {
      await this.tokens.mockCORE.mint(this.accounts[i].address, initialAmount);
      await this.tokens.mockBTC.mint(this.accounts[i].address, initialAmount);
    }
  }

  async deployPriceFeeds() {
    // Deploy Mock Price Feed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    this.contracts.mockPriceFeed = await MockPriceFeed.deploy();
    await this.contracts.mockPriceFeed.waitForDeployment();

    // Set initial prices (MockPriceFeed uses 18 decimals) - Current market prices
    await this.contracts.mockPriceFeed.setPrice("CORE", ethers.parseEther("0.4481")); // $0.4481 current CORE price
    await this.contracts.mockPriceFeed.setPrice("BTC", ethers.parseEther("108916.96")); // $108,916.96 current BTC price
  }

  async deployCoreContracts() {
    // Deploy StakeBasketToken
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    this.contracts.stakeBasketToken = await StakeBasketToken.deploy(
      "StakeBasket Token",
      "BASKET",
      this.owner.address
    );
    await this.contracts.stakeBasketToken.waitForDeployment();

    // Deploy Mock Dual Staking Contract
    const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
    this.contracts.mockDualStaking = await MockDualStaking.deploy();
    await this.contracts.mockDualStaking.waitForDeployment();

    // Deploy StakingManager
    const StakingManager = await ethers.getContractFactory("StakingManager");
    this.contracts.stakingManager = await StakingManager.deploy(
      ethers.ZeroAddress, // stakeBasketContract - will be set later
      ethers.ZeroAddress, // coreStakingContract - not needed for tests
      ethers.ZeroAddress, // lstBTCContract - not needed for tests
      await this.tokens.mockBTC.getAddress(), // coreBTCContract
      await this.tokens.mockCORE.getAddress(), // coreToken
      this.owner.address // initialOwner
    );
    await this.contracts.stakingManager.waitForDeployment();

    // Deploy StakeBasket
    const StakeBasket = await ethers.getContractFactory("StakeBasket");
    this.contracts.stakeBasket = await StakeBasket.deploy(
      await this.contracts.stakeBasketToken.getAddress(),
      await this.contracts.stakingManager.getAddress(),
      await this.contracts.mockPriceFeed.getAddress(),
      this.feeRecipient.address,
      this.protocolTreasury.address,
      this.owner.address
    );
    await this.contracts.stakeBasket.waitForDeployment();

    // Deploy DualStakingBasket
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    this.contracts.dualStakingBasket = await DualStakingBasket.deploy(
      await this.contracts.stakeBasketToken.getAddress(),
      await this.contracts.mockPriceFeed.getAddress(),
      await this.tokens.mockCORE.getAddress(),
      await this.tokens.mockBTC.getAddress(),
      await this.contracts.mockDualStaking.getAddress(),
      this.feeRecipient.address,
      0, // BRONZE tier
      this.owner.address
    );
    await this.contracts.dualStakingBasket.waitForDeployment();

    // Set up permissions - allow StakeBasket contracts to mint/burn
    const basketAddress = await this.contracts.stakeBasket.getAddress();
    const dualBasketAddress = await this.contracts.dualStakingBasket.getAddress();
    
    // For testing, use emergency function to set the StakeBasket contract
    await this.contracts.stakeBasketToken.emergencySetStakeBasketContract(basketAddress);
    
    // Deploy BasketStaking
    const BasketStaking = await ethers.getContractFactory("BasketStaking");
    this.contracts.basketStaking = await BasketStaking.deploy(
      await this.contracts.stakeBasketToken.getAddress(),
      this.owner.address
    );
    await this.contracts.basketStaking.waitForDeployment();

    // Note: This simple approach only allows one contract to mint/burn
    // In production, you might need a more sophisticated approach for multiple baskets
  }

  async deployGovernanceContracts() {
    // Deploy BasketGovernance
    const BasketGovernance = await ethers.getContractFactory("BasketGovernance");
    this.contracts.basketGovernance = await BasketGovernance.deploy(
      await this.contracts.stakeBasket.getAddress(),
      await this.contracts.basketStaking.getAddress(),
      this.owner.address
    );
    await this.contracts.basketGovernance.waitForDeployment();

    // Deploy CoreDAOGovernanceProxy
    const CoreDAOGovernanceProxy = await ethers.getContractFactory("CoreDAOGovernanceProxy");
    this.contracts.governanceProxy = await CoreDAOGovernanceProxy.deploy(
      this.owner.address
    );
    await this.contracts.governanceProxy.waitForDeployment();
  }

  async deploySecurityContracts() {
    // Deploy AccessControlManager
    const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    this.contracts.accessControlManager = await AccessControlManager.deploy(
      this.owner.address
    );
    await this.contracts.accessControlManager.waitForDeployment();

    // Deploy PriceSecurityModule
    const PriceSecurityModule = await ethers.getContractFactory("PriceSecurityModule");
    this.contracts.priceSecurityModule = await PriceSecurityModule.deploy(
      await this.contracts.mockPriceFeed.getAddress(),
      this.owner.address
    );
    await this.contracts.priceSecurityModule.waitForDeployment();
  }

  // Helper methods for testing
  async setupUserBalances(user, coreAmount = "1000", btcAmount = "1") {
    const core = ethers.parseEther(coreAmount);
    const btc = ethers.parseUnits(btcAmount, 8);
    
    await this.tokens.mockCORE.transfer(user.address, core);
    await this.tokens.mockBTC.transfer(user.address, btc);
    
    return { core, btc };
  }

  async approveTokens(user, spender, coreAmount = "1000", btcAmount = "1") {
    const core = ethers.parseEther(coreAmount);
    const btc = ethers.parseUnits(btcAmount, 8);
    
    await this.tokens.mockCORE.connect(user).approve(spender, core);
    await this.tokens.mockBTC.connect(user).approve(spender, btc);
    
    return { core, btc };
  }

  async getBalances(user) {
    return {
      core: await this.tokens.mockCORE.balanceOf(user.address),
      btc: await this.tokens.mockBTC.balanceOf(user.address),
      basket: await this.contracts.stakeBasketToken.balanceOf(user.address),
      eth: await ethers.provider.getBalance(user.address)
    };
  }

  async advanceTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  async snapshot() {
    return await ethers.provider.send("evm_snapshot");
  }

  async revert(snapshotId) {
    await ethers.provider.send("evm_revert", [snapshotId]);
  }

  // Common assertion helpers
  expectBigNumberEqual(actual, expected, message) {
    expect(actual.toString()).to.equal(expected.toString(), message);
  }

  expectBigNumberCloseTo(actual, expected, tolerance = 1, message) {
    const diff = actual > expected ? actual - expected : expected - actual;
    expect(diff).to.be.lte(tolerance, message);
  }
}

module.exports = { TestSetup };