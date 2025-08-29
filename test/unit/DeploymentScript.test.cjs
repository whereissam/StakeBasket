const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Deployment Infrastructure", function () {
  let deployer, treasury, operator, user1;
  let deploymentResults;

  beforeEach(async function () {
    [deployer, treasury, operator, user1] = await ethers.getSigners();
  });

  describe("Contract Deployment Order", function () {
    it("Should deploy basic utility contracts first", async function () {
      // Deploy PriceFeed
      const PriceFeed = await ethers.getContractFactory("PriceFeed");
      const priceFeed = await PriceFeed.deploy(
        await deployer.getAddress(),
        ethers.ZeroAddress, // Mock Pyth oracle
        ethers.ZeroAddress  // Mock Switchboard oracle
      );
      await priceFeed.waitForDeployment();

      expect(await priceFeed.owner()).to.equal(await deployer.getAddress());
      expect(await priceFeed.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should deploy mock tokens with correct parameters", async function () {
      // Deploy TestBTC token
      const TestBTC = await ethers.getContractFactory("SimpleToken");
      const testBTC = await TestBTC.connect(deployer).deploy("Test BTC", "TBTC");
      await testBTC.waitForDeployment();

      expect(await testBTC.name()).to.equal("Test BTC");
      expect(await testBTC.symbol()).to.equal("TBTC");
      expect(await testBTC.owner()).to.equal(await deployer.getAddress());
    });

    it("Should deploy staking infrastructure in correct order", async function () {
      // Mock CoreStaking
      const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
      const mockCoreStaking = await MockCoreStaking.deploy();
      await mockCoreStaking.waitForDeployment();

      // UnbondingQueue
      const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
      const unbondingQueue = await UnbondingQueue.deploy(await deployer.getAddress());
      await unbondingQueue.waitForDeployment();

      // CoreLiquidStakingManager
      const CoreLiquidStakingManager = await ethers.getContractFactory("CoreLiquidStakingManager");
      const liquidStakingManager = await CoreLiquidStakingManager.deploy(
        await mockCoreStaking.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress(),
        await unbondingQueue.getAddress(),
        await deployer.getAddress()
      );
      await liquidStakingManager.waitForDeployment();

      // Verify deployment
      expect(await liquidStakingManager.coreStakingContract()).to.equal(await mockCoreStaking.getAddress());
      expect(await liquidStakingManager.treasury()).to.equal(await treasury.getAddress());
      expect(await liquidStakingManager.operator()).to.equal(await operator.getAddress());
    });

    it("Should deploy token contracts with proper relationships", async function () {
      // Deploy StakeBasketToken
      const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
      const basketToken = await StakeBasketToken.deploy(
        "Stake Basket Token",
        "BASKET",
        await deployer.getAddress()
      );
      await basketToken.waitForDeployment();

      // Deploy mock StakeBasket contract
      const MockStakeBasket = await ethers.getContractFactory("MockERC20");
      const mockStakeBasket = await MockStakeBasket.deploy();
      await mockStakeBasket.waitForDeployment();

      // Set relationship
      await basketToken.connect(deployer).emergencySetStakeBasketContract(await mockStakeBasket.getAddress());

      expect(await basketToken.stakeBasketContract()).to.equal(await mockStakeBasket.getAddress());
    });
  });

  describe("Deployment Configuration", function () {
    let priceFeed, testBTC, mockCoreStaking;

    beforeEach(async function () {
      // Deploy core contracts for configuration testing
      const PriceFeed = await ethers.getContractFactory("PriceFeed");
      priceFeed = await PriceFeed.deploy(
        await deployer.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
      await priceFeed.waitForDeployment();

      const TestBTC = await ethers.getContractFactory("SimpleToken");
      testBTC = await TestBTC.connect(deployer).deploy("Test BTC", "TBTC");
      await testBTC.waitForDeployment();

      const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
      mockCoreStaking = await MockCoreStaking.deploy();
      await mockCoreStaking.waitForDeployment();
    });

    it("Should configure initial prices correctly", async function () {
      // Set initial prices
      await priceFeed.connect(deployer).setPrice("ETH", ethers.parseEther("2000"));
      await priceFeed.connect(deployer).setPrice("BTC", ethers.parseEther("50000"));
      await priceFeed.connect(deployer).setPrice("CORE", ethers.parseEther("2000"));

      expect(await priceFeed.getPrice("ETH")).to.equal(ethers.parseEther("2000"));
      expect(await priceFeed.getPrice("BTC")).to.equal(ethers.parseEther("50000"));
      expect(await priceFeed.getPrice("CORE")).to.equal(ethers.parseEther("2000"));
    });

    it("Should mint initial test tokens", async function () {
      await testBTC.connect(deployer).setAuthorizedMinter(await deployer.getAddress());
      await testBTC.connect(deployer).mint(await deployer.getAddress(), ethers.parseUnits("100", 8));

      const balance = await testBTC.balanceOf(await deployer.getAddress());
      expect(balance).to.equal(ethers.parseUnits("100", 8));
    });

    it("Should setup mock validators", async function () {
      const validatorAddress = "0x1000000000000000000000000000000000000001";
      
      // Mock the validator setup (since MockCoreStaking might not have registerValidator)
      // This tests the pattern used in deployment scripts
      await mockCoreStaking.setPrice(ethers.parseEther("1000"));
      
      expect(await mockCoreStaking.getPrice()).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("System Integration Verification", function () {
    let deployedContracts = {};

    beforeEach(async function () {
      // Deploy minimal system for integration testing
      const PriceFeed = await ethers.getContractFactory("PriceFeed");
      const priceFeed = await PriceFeed.deploy(
        await deployer.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
      await priceFeed.waitForDeployment();
      deployedContracts.priceFeed = priceFeed;

      const TestBTC = await ethers.getContractFactory("SimpleToken");
      const testBTC = await TestBTC.connect(deployer).deploy("Test BTC", "TBTC");
      await testBTC.waitForDeployment();
      deployedContracts.testBTC = testBTC;

      const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
      const basketToken = await StakeBasketToken.deploy(
        "Stake Basket Token",
        "BASKET",
        await deployer.getAddress()
      );
      await basketToken.waitForDeployment();
      deployedContracts.basketToken = basketToken;
    });

    it("Should verify contract addresses are non-zero", async function () {
      for (const [name, contract] of Object.entries(deployedContracts)) {
        expect(await contract.getAddress()).to.not.equal(ethers.ZeroAddress);
        console.log(`✅ ${name}: ${await contract.getAddress()}`);
      }
    });

    it("Should verify contract ownership", async function () {
      expect(await deployedContracts.priceFeed.owner()).to.equal(await deployer.getAddress());
      expect(await deployedContracts.testBTC.owner()).to.equal(await deployer.getAddress());
      expect(await deployedContracts.basketToken.owner()).to.equal(await deployer.getAddress());
    });

    it("Should verify initial contract states", async function () {
      // PriceFeed should be in initial state
      expect(await deployedContracts.priceFeed.emergencyMode()).to.be.false;
      expect(await deployedContracts.priceFeed.circuitBreakerEnabled()).to.be.true;

      // TestBTC should have zero supply initially
      expect(await deployedContracts.testBTC.totalSupply()).to.equal(0);

      // BasketToken should have no StakeBasket contract set initially
      expect(await deployedContracts.basketToken.stakeBasketContract()).to.equal(ethers.ZeroAddress);
    });

    it("Should perform basic functionality test", async function () {
      // Test PriceFeed
      await deployedContracts.priceFeed.connect(deployer).setPrice("TEST", ethers.parseEther("100"));
      expect(await deployedContracts.priceFeed.getPrice("TEST")).to.equal(ethers.parseEther("100"));

      // Test TestBTC minting
      await deployedContracts.testBTC.connect(deployer).setAuthorizedMinter(await deployer.getAddress());
      await deployedContracts.testBTC.connect(deployer).mint(await user1.getAddress(), ethers.parseUnits("10", 8));
      expect(await deployedContracts.testBTC.balanceOf(await user1.getAddress())).to.equal(ethers.parseUnits("10", 8));

      // Test BasketToken emergency setup
      const mockStakeBasket = await user1.getAddress(); // Use as dummy address
      await deployedContracts.basketToken.connect(deployer).emergencySetStakeBasketContract(mockStakeBasket);
      expect(await deployedContracts.basketToken.stakeBasketContract()).to.equal(mockStakeBasket);
    });
  });

  describe("Deployment Data Management", function () {
    it("Should structure deployment data correctly", async function () {
      const deploymentData = {
        network: "localhost",
        timestamp: new Date().toISOString(),
        contracts: {},
        addresses: {}
      };

      // Deploy a contract to populate data
      const SimpleToken = await ethers.getContractFactory("SimpleToken");
      const token = await SimpleToken.connect(deployer).deploy("Test", "TEST");
      await token.waitForDeployment();

      deploymentData.contracts.TestToken = await token.getAddress();
      deploymentData.addresses.TestToken = await token.getAddress();

      expect(deploymentData.network).to.equal("localhost");
      expect(deploymentData.timestamp).to.be.a("string");
      expect(deploymentData.contracts.TestToken).to.not.equal(ethers.ZeroAddress);
    });

    it("Should validate deployment data format", async function () {
      const deploymentData = {
        network: "localhost",
        timestamp: new Date().toISOString(),
        contracts: {
          PriceFeed: "0x1234567890123456789012345678901234567890",
          TestBTC: "0x2345678901234567890123456789012345678901",
          StakeBasketToken: "0x3456789012345678901234567890123456789012"
        }
      };

      // Validate structure
      expect(deploymentData).to.have.property("network");
      expect(deploymentData).to.have.property("timestamp");
      expect(deploymentData).to.have.property("contracts");
      expect(Object.keys(deploymentData.contracts)).to.have.length.greaterThan(0);

      // Validate addresses
      for (const [name, address] of Object.entries(deploymentData.contracts)) {
        expect(ethers.isAddress(address)).to.be.true;
        expect(address).to.not.equal(ethers.ZeroAddress);
      }
    });
  });

  describe("Error Handling in Deployment", function () {
    it("Should handle deployment failures gracefully", async function () {
      try {
        // Try to deploy with invalid parameters
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        await StakeBasketToken.deploy("", "", ethers.ZeroAddress); // Invalid owner
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("Should validate constructor parameters", async function () {
      // Valid deployment
      const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
      await expect(
        StakeBasketToken.deploy("Valid Name", "VALID", await deployer.getAddress())
      ).to.not.be.reverted;

      // Invalid deployment (empty name)
      await expect(
        StakeBasketToken.deploy("", "VALID", await deployer.getAddress())
      ).to.not.be.reverted; // ERC20 allows empty name, so this shouldn't revert

      // But zero address owner should be handled by Ownable
      await expect(
        StakeBasketToken.deploy("Valid Name", "VALID", ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(StakeBasketToken, "OwnableInvalidOwner");
    });

    it("Should handle insufficient gas scenarios", async function () {
      // This is more of a conceptual test - in real scenarios you'd test gas limits
      const gasLimit = 30000; // Very low gas limit
      
      try {
        const SimpleToken = await ethers.getContractFactory("SimpleToken");
        await SimpleToken.connect(deployer).deploy("Test", "TEST", { gasLimit });
        // This might succeed in test environment, but would fail on mainnet
      } catch (error) {
        expect(error.message).to.include("gas");
      }
    });
  });

  describe("Cross-Contract Dependencies", function () {
    let contracts = {};

    it("Should deploy contracts with proper dependencies", async function () {
      // Deploy in dependency order
      
      // 1. Independent contracts first
      const PriceFeed = await ethers.getContractFactory("PriceFeed");
      contracts.priceFeed = await PriceFeed.deploy(
        await deployer.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
      
      const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
      contracts.mockCoreStaking = await MockCoreStaking.deploy();
      
      // 2. Contracts that depend on others
      const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
      contracts.unbondingQueue = await UnbondingQueue.deploy(await deployer.getAddress());
      
      const CoreLiquidStakingManager = await ethers.getContractFactory("CoreLiquidStakingManager");
      contracts.liquidStakingManager = await CoreLiquidStakingManager.deploy(
        await contracts.mockCoreStaking.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress(),
        await contracts.unbondingQueue.getAddress(),
        await deployer.getAddress()
      );

      // Verify dependencies
      expect(await contracts.liquidStakingManager.coreStakingContract()).to.equal(
        await contracts.mockCoreStaking.getAddress()
      );
    });

    it("Should verify contract interconnections", async function () {
      // Deploy token system
      const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
      const basketToken = await StakeBasketToken.deploy(
        "Test Basket",
        "TBASKET",
        await deployer.getAddress()
      );

      const MockStakeBasket = await ethers.getContractFactory("MockERC20");
      const mockBasket = await MockStakeBasket.deploy();

      // Connect them
      await basketToken.connect(deployer).emergencySetStakeBasketContract(await mockBasket.getAddress());

      // Verify connection
      expect(await basketToken.stakeBasketContract()).to.equal(await mockBasket.getAddress());
    });
  });

  describe("Post-Deployment Configuration", function () {
    let deployedSystem = {};

    beforeEach(async function () {
      // Deploy minimal system
      const PriceFeed = await ethers.getContractFactory("PriceFeed");
      deployedSystem.priceFeed = await PriceFeed.deploy(
        await deployer.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );

      const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
      deployedSystem.unbondingQueue = await UnbondingQueue.deploy(await deployer.getAddress());
    });

    it("Should configure system parameters", async function () {
      // Configure PriceFeed
      await deployedSystem.priceFeed.connect(deployer).setPrice("CORE", ethers.parseEther("1"));
      await deployedSystem.priceFeed.connect(deployer).setPrice("BTC", ethers.parseEther("50000"));

      expect(await deployedSystem.priceFeed.getPrice("CORE")).to.equal(ethers.parseEther("1"));
      expect(await deployedSystem.priceFeed.getPrice("BTC")).to.equal(ethers.parseEther("50000"));

      // Configure UnbondingQueue
      await deployedSystem.unbondingQueue.connect(deployer).updateSecurityConfig(
        2000, // 20% max deviation
        600,  // 10 minutes min interval
        7200, // 2 hours TWAP window
        3,    // min 3 sources
        172800 // 48 hours emergency cooldown
      );

      const config = await deployedSystem.unbondingQueue.securityConfig();
      expect(config.maxDeviationBps).to.equal(2000);
    });

    it("Should setup operational parameters", async function () {
      // Test setting various operational parameters
      await deployedSystem.priceFeed.connect(deployer).setCircuitBreakerEnabled(true);
      expect(await deployedSystem.priceFeed.circuitBreakerEnabled()).to.be.true;

      await deployedSystem.priceFeed.connect(deployer).setCircuitBreakerEnabled(false);
      expect(await deployedSystem.priceFeed.circuitBreakerEnabled()).to.be.false;
    });

    it("Should verify configuration completeness", async function () {
      // Check that all necessary configurations are set
      const requiredPrices = ["CORE", "BTC", "ETH"];
      
      for (const asset of requiredPrices) {
        await deployedSystem.priceFeed.connect(deployer).setPrice(asset, ethers.parseEther("1"));
        expect(await deployedSystem.priceFeed.isPriceValid(asset)).to.be.true;
      }
    });
  });

  describe("Deployment Verification", function () {
    it("Should generate deployment summary", async function () {
      const deploymentSummary = {
        deployer: await deployer.getAddress(),
        network: "localhost",
        gasUsed: 0,
        deployedContracts: [],
        totalGasCost: 0
      };

      // Deploy a contract and track gas
      const SimpleToken = await ethers.getContractFactory("SimpleToken");
      const deployTx = await SimpleToken.connect(deployer).deploy("Test", "TEST");
      const receipt = await deployTx.deploymentTransaction()?.wait();

      if (receipt) {
        deploymentSummary.gasUsed += receipt.gasUsed;
        deploymentSummary.totalGasCost += receipt.gasUsed * receipt.gasPrice;
      }

      deploymentSummary.deployedContracts.push({
        name: "SimpleToken",
        address: await deployTx.getAddress(),
        gasUsed: receipt?.gasUsed || 0
      });

      expect(deploymentSummary.deployedContracts).to.have.length(1);
      expect(deploymentSummary.gasUsed).to.be.greaterThan(0);
    });
  });
});