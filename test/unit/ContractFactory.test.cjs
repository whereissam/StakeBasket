const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ContractFactory", function () {
  let contractFactory;
  let owner, treasury, operator, user1;

  beforeEach(async function () {
    [owner, treasury, operator, user1] = await ethers.getSigners();

    const ContractFactory = await ethers.getContractFactory("ContractFactory");
    contractFactory = await ContractFactory.deploy();
    await contractFactory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await contractFactory.owner()).to.equal(await owner.getAddress());
      expect(await contractFactory.isDeployed()).to.be.false;
    });

    it("Should have empty initial deployment state", async function () {
      const contracts = await contractFactory.deployedContracts();
      
      expect(contracts.stakeBasketToken).to.equal(ethers.ZeroAddress);
      expect(contracts.simpleToken).to.equal(ethers.ZeroAddress);
      expect(contracts.coreLiquidStakingManager).to.equal(ethers.ZeroAddress);
      expect(contracts.priceFeed).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Basic System Deployment", function () {
    let deployedAddresses;

    it("Should deploy basic system successfully", async function () {
      const tx = await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );

      await expect(tx).to.emit(contractFactory, "SystemDeployed");

      expect(await contractFactory.isDeployed()).to.be.true;
      
      deployedAddresses = await contractFactory.getAllContracts();
      
      // Verify all addresses are non-zero
      for (let i = 0; i < deployedAddresses.length; i++) {
        expect(deployedAddresses[i]).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("Should reject duplicate deployment", async function () {
      // First deployment
      await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );

      // Second deployment should fail
      await expect(
        contractFactory.connect(owner).deployBasicSystem(
          await owner.getAddress(),
          await treasury.getAddress(),
          await operator.getAddress()
        )
      ).to.be.revertedWith("ContractFactory: system already deployed");
    });

    it("Should reject deployment from non-owner", async function () {
      await expect(
        contractFactory.connect(user1).deployBasicSystem(
          await user1.getAddress(),
          await treasury.getAddress(),
          await operator.getAddress()
        )
      ).to.be.revertedWithCustomError(contractFactory, "OwnableUnauthorizedAccount");
    });

    it("Should validate deployment parameters", async function () {
      // Invalid owner (zero address)
      await expect(
        contractFactory.connect(owner).deployBasicSystem(
          ethers.ZeroAddress,
          await treasury.getAddress(),
          await operator.getAddress()
        )
      ).to.be.revertedWith("ContractFactory: invalid owner");

      // Invalid treasury (zero address)
      await expect(
        contractFactory.connect(owner).deployBasicSystem(
          await owner.getAddress(),
          ethers.ZeroAddress,
          await operator.getAddress()
        )
      ).to.be.revertedWith("ContractFactory: invalid treasury");

      // Invalid operator (zero address)
      await expect(
        contractFactory.connect(owner).deployBasicSystem(
          await owner.getAddress(),
          await treasury.getAddress(),
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("ContractFactory: invalid operator");
    });
  });

  describe("Complete System Deployment", function () {
    let deploymentConfig;

    beforeEach(async function () {
      deploymentConfig = {
        owner: await owner.getAddress(),
        treasury: await treasury.getAddress(),
        operator: await operator.getAddress(),
        basketTokenName: "Test Basket Token",
        basketTokenSymbol: "TBASKET",
        testTokenName: "Test Bitcoin",
        testTokenSymbol: "TBTC"
      };
    });

    it("Should deploy complete system with custom config", async function () {
      const tx = await contractFactory.connect(owner).deployCompleteSystem(deploymentConfig);
      
      await expect(tx).to.emit(contractFactory, "SystemDeployed");

      expect(await contractFactory.isDeployed()).to.be.true;

      const contracts = await contractFactory.deployedContracts();
      expect(contracts.stakeBasketToken).to.not.equal(ethers.ZeroAddress);
      expect(contracts.coreLiquidStakingManager).to.not.equal(ethers.ZeroAddress);
    });

    it("Should emit ContractDeployed events for each contract", async function () {
      const tx = contractFactory.connect(owner).deployCompleteSystem(deploymentConfig);
      
      await expect(tx).to.emit(contractFactory, "ContractDeployed").withArgs("PriceFeed", ethers.isAddress);
      await expect(tx).to.emit(contractFactory, "ContractDeployed").withArgs("AccessControlManager", ethers.isAddress);
      await expect(tx).to.emit(contractFactory, "ContractDeployed").withArgs("StakeBasketToken", ethers.isAddress);
    });

    it("Should configure deployed contracts correctly", async function () {
      await contractFactory.connect(owner).deployCompleteSystem(deploymentConfig);
      
      const contracts = await contractFactory.deployedContracts();
      
      // Check StakeBasketToken configuration
      const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", contracts.stakeBasketToken);
      expect(await stakeBasketToken.name()).to.equal("Test Basket Token");
      expect(await stakeBasketToken.symbol()).to.equal("TBASKET");
      expect(await stakeBasketToken.owner()).to.equal(await owner.getAddress());

      // Check SimpleToken configuration
      const simpleToken = await ethers.getContractAt("SimpleToken", contracts.simpleToken);
      expect(await simpleToken.name()).to.equal("Test Bitcoin");
      expect(await simpleToken.symbol()).to.equal("TBTC");
      expect(await simpleToken.authorizedMinter()).to.equal(await owner.getAddress());

      // Check PriceFeed configuration
      const priceFeed = await ethers.getContractAt("PriceFeed", contracts.priceFeed);
      expect(await priceFeed.getPrice("CORE")).to.equal(ethers.parseEther("1"));
      expect(await priceFeed.getPrice("BTC")).to.equal(ethers.parseEther("50000"));

      // Check CoreLiquidStakingManager configuration
      const liquidStakingManager = await ethers.getContractAt("CoreLiquidStakingManager", contracts.coreLiquidStakingManager);
      expect(await liquidStakingManager.treasury()).to.equal(await treasury.getAddress());
      expect(await liquidStakingManager.operator()).to.equal(await operator.getAddress());
    });
  });

  describe("Contract Relationships", function () {
    let contracts;

    beforeEach(async function () {
      await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );
      
      const deployedContracts = await contractFactory.deployedContracts();
      contracts = deployedContracts;
    });

    it("Should establish correct contract relationships", async function () {
      // CoreLiquidStakingManager should have correct references
      const liquidStakingManager = await ethers.getContractAt("CoreLiquidStakingManager", contracts.coreLiquidStakingManager);
      
      expect(await liquidStakingManager.treasury()).to.equal(await treasury.getAddress());
      expect(await liquidStakingManager.operator()).to.equal(await operator.getAddress());
      expect(await liquidStakingManager.owner()).to.equal(await owner.getAddress());
      
      // stCoreToken should be deployed and accessible
      const stCoreTokenAddress = await liquidStakingManager.stCoreToken();
      expect(stCoreTokenAddress).to.not.equal(ethers.ZeroAddress);
      expect(stCoreTokenAddress).to.equal(contracts.stCoreToken);
    });

    it("Should verify contract ownership", async function () {
      const ownedContracts = [
        { address: contracts.stakeBasketToken, name: "StakeBasketToken" },
        { address: contracts.simpleToken, name: "SimpleToken" },
        { address: contracts.priceFeed, name: "PriceFeed" },
        { address: contracts.accessControlManager, name: "AccessControlManager" },
        { address: contracts.unbondingQueue, name: "UnbondingQueue" },
        { address: contracts.coreLiquidStakingManager, name: "CoreLiquidStakingManager" }
      ];

      for (const contract of ownedContracts) {
        const contractInstance = await ethers.getContractAt("Ownable", contract.address);
        expect(await contractInstance.owner()).to.equal(await owner.getAddress());
      }
    });
  });

  describe("Deployment Info and Management", function () {
    beforeEach(async function () {
      await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );
    });

    it("Should return correct deployment info", async function () {
      const [deployed, stakeBasketToken, coreLiquidStakingManager, priceFeed] = 
        await contractFactory.getDeploymentInfo();
      
      expect(deployed).to.be.true;
      expect(stakeBasketToken).to.not.equal(ethers.ZeroAddress);
      expect(coreLiquidStakingManager).to.not.equal(ethers.ZeroAddress);
      expect(priceFeed).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return all contract addresses", async function () {
      const allContracts = await contractFactory.getAllContracts();
      
      expect(allContracts).to.have.length(9);
      for (const address of allContracts) {
        expect(address).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("Should allow factory reset by owner", async function () {
      expect(await contractFactory.isDeployed()).to.be.true;
      
      await contractFactory.connect(owner).resetFactory();
      
      expect(await contractFactory.isDeployed()).to.be.false;
      
      const contracts = await contractFactory.deployedContracts();
      expect(contracts.stakeBasketToken).to.equal(ethers.ZeroAddress);
    });

    it("Should reject factory reset from non-owner", async function () {
      await expect(
        contractFactory.connect(user1).resetFactory()
      ).to.be.revertedWithCustomError(contractFactory, "OwnableUnauthorizedAccount");
    });

    it("Should reject getAllContracts when not deployed", async function () {
      await contractFactory.connect(owner).resetFactory();
      
      await expect(
        contractFactory.getAllContracts()
      ).to.be.revertedWith("ContractFactory: system not deployed");
    });
  });

  describe("Gas Usage and Efficiency", function () {
    it("Should deploy system within reasonable gas limits", async function () {
      const tx = await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );
      
      const receipt = await tx.wait();
      
      // This is a rough estimate - adjust based on actual requirements
      expect(receipt.gasUsed).to.be.lt(15000000); // Less than 15M gas
      
      console.log(`Total gas used for system deployment: ${receipt.gasUsed}`);
    });

    it("Should generate unique salts for CREATE2", async function () {
      // This tests the salt generation function indirectly
      // by verifying that multiple deployments after reset work correctly
      
      await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );
      
      const firstDeployment = await contractFactory.getAllContracts();
      
      await contractFactory.connect(owner).resetFactory();
      
      await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );
      
      const secondDeployment = await contractFactory.getAllContracts();
      
      // Addresses should be different due to different salts
      // (Though this depends on the CREATE2 implementation)
      expect(firstDeployment).to.not.deep.equal(secondDeployment);
    });
  });

  describe("Error Scenarios", function () {
    it("Should handle deployment failures gracefully", async function () {
      // This test would require more complex setup to actually trigger failures
      // For now, we test parameter validation
      
      const invalidConfig = {
        owner: ethers.ZeroAddress, // Invalid
        treasury: await treasury.getAddress(),
        operator: await operator.getAddress(),
        basketTokenName: "Test",
        basketTokenSymbol: "TEST",
        testTokenName: "Test BTC",
        testTokenSymbol: "TBTC"
      };
      
      await expect(
        contractFactory.connect(owner).deployCompleteSystem(invalidConfig)
      ).to.be.revertedWith("ContractFactory: invalid owner");
    });

    it("Should handle insufficient balance for deployment", async function () {
      // In a real scenario, this would test deployment with insufficient ETH
      // For unit tests, we just verify the contracts deploy successfully with sufficient balance
      
      const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
      expect(initialBalance).to.be.gt(ethers.parseEther("1")); // Should have enough for deployment
      
      await expect(
        contractFactory.connect(owner).deployBasicSystem(
          await owner.getAddress(),
          await treasury.getAddress(),
          await operator.getAddress()
        )
      ).to.not.be.reverted;
    });
  });

  describe("Integration with Deployed Contracts", function () {
    let deployedSystem;

    beforeEach(async function () {
      await contractFactory.connect(owner).deployBasicSystem(
        await owner.getAddress(),
        await treasury.getAddress(),
        await operator.getAddress()
      );
      
      deployedSystem = await contractFactory.deployedContracts();
    });

    it("Should allow interaction with deployed contracts", async function () {
      // Test PriceFeed
      const priceFeed = await ethers.getContractAt("PriceFeed", deployedSystem.priceFeed);
      await priceFeed.connect(owner).setPrice("TEST", ethers.parseEther("100"));
      expect(await priceFeed.getPrice("TEST")).to.equal(ethers.parseEther("100"));

      // Test SimpleToken minting
      const simpleToken = await ethers.getContractAt("SimpleToken", deployedSystem.simpleToken);
      await simpleToken.connect(owner).mint(await user1.getAddress(), ethers.parseUnits("10", 8));
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseUnits("10", 8));

      // Test access control
      const acm = await ethers.getContractAt("AccessControlManager", deployedSystem.accessControlManager);
      const adminRole = await acm.ADMIN_ROLE();
      expect(await acm.hasRole(adminRole, await owner.getAddress())).to.be.true;
    });

    it("Should support complex workflows", async function () {
      // Test a complete workflow involving multiple contracts
      const priceFeed = await ethers.getContractAt("PriceFeed", deployedSystem.priceFeed);
      const simpleToken = await ethers.getContractAt("SimpleToken", deployedSystem.simpleToken);
      const liquidStakingManager = await ethers.getContractAt("CoreLiquidStakingManager", deployedSystem.coreLiquidStakingManager);
      
      // Set up prices
      await priceFeed.connect(owner).setPrice("CORE", ethers.parseEther("2"));
      
      // Mint test tokens
      await simpleToken.connect(owner).mint(await user1.getAddress(), ethers.parseUnits("1", 8));
      
      // Verify system state
      expect(await priceFeed.getPrice("CORE")).to.equal(ethers.parseEther("2"));
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseUnits("1", 8));
      expect(await liquidStakingManager.treasury()).to.equal(await treasury.getAddress());
    });
  });
});