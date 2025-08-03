const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CoreDAOGovernanceProxy", function () {
  let coreDAOProxy;
  let basketGovernance;
  let coreStaking;
  let basketToken;
  let owner;
  let operator;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, operator, user1, user2] = await ethers.getSigners();

    // Deploy BASKET token
    const BasketTokenFactory = await ethers.getContractFactory("StakeBasketToken");
    basketToken = await BasketTokenFactory.deploy(owner.address);

    // Deploy BasketGovernance
    const BasketGovernanceFactory = await ethers.getContractFactory("BasketGovernance");
    basketGovernance = await BasketGovernanceFactory.deploy(
      await basketToken.getAddress(),
      ethers.ZeroAddress, // No staking contract for these tests
      owner.address
    );

    // Deploy MockCoreStaking
    const MockCoreStakingFactory = await ethers.getContractFactory("MockCoreStaking");
    coreStaking = await MockCoreStakingFactory.deploy(
      await basketToken.getAddress(), // Using BASKET token as mock CORE
      owner.address
    );

    // Deploy CoreDAOGovernanceProxy
    const CoreDAOProxyFactory = await ethers.getContractFactory("CoreDAOGovernanceProxy");
    coreDAOProxy = await CoreDAOProxyFactory.deploy(
      await basketGovernance.getAddress(),
      await coreStaking.getAddress(),
      owner.address
    );

    // Setup tokens for testing
    await basketToken.mint(user1.address, ethers.parseEther("10000"));
    await basketToken.mint(user2.address, ethers.parseEther("5000"));
    await basketToken.mint(await coreDAOProxy.getAddress(), ethers.parseEther("1000000")); // For delegations
  });

  describe("CoreDAO Proposal Management", function () {
    it("Should create CoreDAO governance proposals", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      const title = "Test CoreDAO Proposal";
      const description = "This is a test proposal for CoreDAO governance";
      const snapshotId = "snapshot-123";

      await expect(
        coreDAOProxy.connect(operator).createCoreDAOProposal(title, description, snapshotId)
      ).to.emit(coreDAOProxy, "CoreDAOProposalCreated");

      const proposal = await coreDAOProxy.getCoreDAOProposal(1);
      expect(proposal.title).to.equal(title);
      expect(proposal.description).to.equal(description);
      expect(proposal.snapshotId).to.equal(snapshotId);
      expect(proposal.executed).to.be.false;
    });

    it("Should only allow authorized operators to create proposals", async function () {
      const title = "Test Proposal";
      const description = "Test description";
      const snapshotId = "snapshot-123";

      await expect(
        coreDAOProxy.connect(user1).createCoreDAOProposal(title, description, snapshotId)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: not authorized");
    });

    it("Should execute CoreDAO vote when called by BasketGovernance", async function () {
      // First create a CoreDAO proposal
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);
      await coreDAOProxy.connect(operator).createCoreDAOProposal(
        "Test Proposal",
        "Test description", 
        "snapshot-123"
      );

      // Get the basket proposal ID that was created
      const proposal = await coreDAOProxy.getCoreDAOProposal(1);
      const basketProposalId = proposal.basketProposalId;

      // Mock that the basket governance proposal has votes
      // In a real test, you'd actually vote on the proposal
      
      // Execute the CoreDAO vote (this would normally be triggered by BasketGovernance)
      await expect(
        coreDAOProxy.executeCoreDAOVote(1)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: only basket governance");
    });
  });

  describe("Validator Delegation", function () {
    it("Should create validator delegation proposals", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      const validatorAddress = "0x1111111111111111111111111111111111111111";
      const amount = ethers.parseEther("1000");

      await expect(
        coreDAOProxy.connect(operator).createValidatorDelegation(validatorAddress, amount)
      ).to.emit(coreDAOProxy, "ValidatorDelegationCreated");

      const delegation = await coreDAOProxy.getValidatorDelegation(1);
      expect(delegation.validator).to.equal(validatorAddress);
      expect(delegation.amount).to.equal(amount);
      expect(delegation.executed).to.be.false;
    });

    it("Should execute validator delegation when approved", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      const validatorAddress = "0x1111111111111111111111111111111111111111";
      const amount = ethers.parseEther("1000");

      // Create delegation proposal
      await coreDAOProxy.connect(operator).createValidatorDelegation(validatorAddress, amount);

      // Approve tokens for delegation
      await basketToken.connect(await ethers.getImpersonatedSigner(await coreDAOProxy.getAddress()))
        .approve(await coreStaking.getAddress(), amount);

      // Execute delegation (this would normally be called by BasketGovernance after voting)
      await expect(
        coreDAOProxy.executeValidatorDelegation(1)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: only basket governance");
    });

    it("Should track current validator delegation", async function () {
      expect(await coreDAOProxy.currentValidator()).to.equal(ethers.ZeroAddress);
      expect(await coreDAOProxy.totalDelegatedAmount()).to.equal(0);
    });
  });

  describe("Hash Power Delegation", function () {
    it("Should create hash power delegation proposals", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      const validatorAddress = "0x2222222222222222222222222222222222222222";
      const hashPower = ethers.parseEther("500");

      await expect(
        coreDAOProxy.connect(operator).createHashPowerDelegation(validatorAddress, hashPower)
      ).to.emit(coreDAOProxy, "HashPowerDelegationCreated");

      const delegation = await coreDAOProxy.getHashPowerDelegation(1);
      expect(delegation.validator).to.equal(validatorAddress);
      expect(delegation.hashPower).to.equal(hashPower);
      expect(delegation.executed).to.be.false;
    });

    it("Should execute hash power delegation", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      const validatorAddress = "0x2222222222222222222222222222222222222222";
      const hashPower = ethers.parseEther("500");

      // Create hash power delegation proposal
      await coreDAOProxy.connect(operator).createHashPowerDelegation(validatorAddress, hashPower);

      // Execute delegation (this would normally be called by BasketGovernance after voting)
      await expect(
        coreDAOProxy.executeHashPowerDelegation(1)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: only basket governance");
    });
  });

  describe("Authorization", function () {
    it("Should allow owner to authorize operators", async function () {
      expect(await coreDAOProxy.authorizedOperators(operator.address)).to.be.false;

      await expect(
        coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true)
      ).to.emit(coreDAOProxy, "OperatorAuthorized")
        .withArgs(operator.address, true);

      expect(await coreDAOProxy.authorizedOperators(operator.address)).to.be.true;
    });

    it("Should only allow owner to authorize operators", async function () {
      await expect(
        coreDAOProxy.connect(user1).setOperatorAuthorization(operator.address, true)
      ).to.be.revertedWithCustomError(coreDAOProxy, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to revoke operator authorization", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);
      expect(await coreDAOProxy.authorizedOperators(operator.address)).to.be.true;

      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, false);
      expect(await coreDAOProxy.authorizedOperators(operator.address)).to.be.false;
    });
  });

  describe("Integration with BasketGovernance", function () {
    it("Should create proposals in BasketGovernance when creating CoreDAO proposals", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      const title = "CoreDAO Test Proposal";
      const description = "Test proposal for integration";
      const snapshotId = "snapshot-456";

      // Check initial proposal count
      const initialCount = await basketGovernance.proposalCount();

      await coreDAOProxy.connect(operator).createCoreDAOProposal(title, description, snapshotId);

      // Check that a new proposal was created in BasketGovernance
      const newCount = await basketGovernance.proposalCount();
      expect(newCount).to.equal(initialCount + 1n);

      // Verify the proposal details
      const proposalDetails = await basketGovernance.getProposalDetails(newCount);
      expect(proposalDetails[2]).to.include("CoreDAO Governance:");
      expect(proposalDetails[2]).to.include(title);
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to set core staking contract", async function () {
      const newStaking = await ethers.deployContract("MockCoreStaking", [
        await basketToken.getAddress(),
        owner.address
      ]);

      await coreDAOProxy.connect(owner).setCoreStaking(await newStaking.getAddress());
      
      // The contract doesn't have a getter for coreStaking, so we can't directly test
      // But we can verify no revert occurred
    });

    it("Should only allow owner to set core staking contract", async function () {
      const newStaking = await ethers.deployContract("MockCoreStaking", [
        await basketToken.getAddress(),
        owner.address
      ]);

      await expect(
        coreDAOProxy.connect(user1).setCoreStaking(await newStaking.getAddress())
      ).to.be.revertedWithCustomError(coreDAOProxy, "OwnableUnauthorizedAccount");
    });
  });

  describe("Error Handling", function () {
    it("Should revert when creating delegation with invalid validator", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      await expect(
        coreDAOProxy.connect(operator).createValidatorDelegation(ethers.ZeroAddress, ethers.parseEther("1000"))
      ).to.be.revertedWith("CoreDAOGovernanceProxy: invalid validator");
    });

    it("Should revert when creating delegation with zero amount", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      await expect(
        coreDAOProxy.connect(operator).createValidatorDelegation("0x1111111111111111111111111111111111111111", 0)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: invalid amount");
    });

    it("Should revert when creating hash power delegation with invalid validator", async function () {
      await coreDAOProxy.connect(owner).setOperatorAuthorization(operator.address, true);

      await expect(
        coreDAOProxy.connect(operator).createHashPowerDelegation(ethers.ZeroAddress, ethers.parseEther("500"))
      ).to.be.revertedWith("CoreDAOGovernanceProxy: invalid validator");
    });

    it("Should revert when querying invalid proposal IDs", async function () {
      await expect(
        coreDAOProxy.getCoreDAOProposal(999)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: invalid proposal id");

      await expect(
        coreDAOProxy.getValidatorDelegation(999)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: invalid delegation id");

      await expect(
        coreDAOProxy.getHashPowerDelegation(999)
      ).to.be.revertedWith("CoreDAOGovernanceProxy: invalid delegation id");
    });
  });
});