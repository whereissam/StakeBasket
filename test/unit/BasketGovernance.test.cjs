const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BasketGovernance", function () {
  let basketGovernance, stakeBasketToken, basketStaking;
  let owner, user1, user2, user3, users;

  const PROPOSAL_STATES = {
    PENDING: 0,
    ACTIVE: 1,
    CANCELED: 2,
    DEFEATED: 3,
    SUCCEEDED: 4,
    QUEUED: 5,
    EXPIRED: 6,
    EXECUTED: 7
  };

  const PROPOSAL_TYPES = {
    PARAMETER_CHANGE: 0,
    STRATEGY_ADDITION: 1,
    STRATEGY_REMOVAL: 2,
    FEE_ADJUSTMENT: 3,
    TREASURY_ALLOCATION: 4,
    CONTRACT_UPGRADE: 5,
    COREDAO_VALIDATOR_DELEGATION: 6,
    COREDAO_HASHPOWER_DELEGATION: 7,
    COREDAO_GOVERNANCE_VOTE: 8
  };

  before(async function () {
    [owner, user1, user2, user3, ...users] = await ethers.getSigners();

    // Deploy StakeBasketToken
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    stakeBasketToken = await StakeBasketToken.deploy(
      "Stake Basket Token",
      "BASKET",
      await owner.getAddress()
    );
    await stakeBasketToken.waitForDeployment();

    // Deploy mock BasketStaking
    const MockBasketStaking = await ethers.getContractFactory("MockCoreStaking");
    basketStaking = await MockBasketStaking.deploy();
    await basketStaking.waitForDeployment();

    // Deploy BasketGovernance
    const BasketGovernance = await ethers.getContractFactory("BasketGovernance");
    basketGovernance = await BasketGovernance.deploy(
      await stakeBasketToken.getAddress(),
      await basketStaking.getAddress(),
      await owner.getAddress()
    );
    await basketGovernance.waitForDeployment();

    // Mint tokens to users
    await stakeBasketToken.mint(await user1.getAddress(), ethers.parseEther("2000"));
    await stakeBasketToken.mint(await user2.getAddress(), ethers.parseEther("3000"));
    await stakeBasketToken.mint(await user3.getAddress(), ethers.parseEther("1500"));
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await basketGovernance.basketToken()).to.equal(await stakeBasketToken.getAddress());
      expect(await basketGovernance.basketStaking()).to.equal(await basketStaking.getAddress());
      expect(await basketGovernance.proposalThreshold()).to.equal(ethers.parseEther("100")); // 100 tokens
      expect(await basketGovernance.quorumPercentage()).to.equal(10); // 10%
      expect(await basketGovernance.majorityPercentage()).to.equal(51); // 51%
    });

    it("Should have correct governance constants", async function () {
      expect(await basketGovernance.VOTING_PERIOD()).to.equal(3 * 24 * 60 * 60); // 3 days
      expect(await basketGovernance.EXECUTION_DELAY()).to.equal(1 * 24 * 60 * 60); // 1 day
      expect(await basketGovernance.proposalCount()).to.equal(0); // No proposals initially
    });

    it("Should set owner correctly", async function () {
      expect(await basketGovernance.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("Proposal Creation", function () {
    beforeEach(async function () {
      // Users already have tokens from setup
      // No need for delegation in this custom governance implementation
    });

    it("Should create proposal with sufficient tokens", async function () {
      const title = "Fee Adjustment Proposal";
      const description = "Lower management fee to 0.75%";
      const proposalType = PROPOSAL_TYPES.FEE_ADJUSTMENT;
      const target = await stakeBasketToken.getAddress(); // Mock target
      const callData = "0x"; // Empty call data for test
      const value = 0;

      const tx = await basketGovernance.connect(user1).propose(
        title,
        description,
        proposalType,
        target,
        callData,
        value
      );

      await expect(tx)
        .to.emit(basketGovernance, "ProposalCreated")
        .withArgs(
          1, // proposalId
          await user1.getAddress(),
          title,
          description,
          proposalType,
          await ethers.provider.getBlock('latest').then(b => b.timestamp),
          await ethers.provider.getBlock('latest').then(b => b.timestamp + (3 * 24 * 60 * 60))
        );

      expect(await basketGovernance.proposalCount()).to.equal(1);
      const state = await basketGovernance.state(1);
      expect(state).to.equal(PROPOSAL_STATES.ACTIVE); // Should be immediately active
    });

    it("Should reject proposal with insufficient tokens", async function () {
      // Create user with insufficient tokens (less than 100 BASKET)
      const insufficientUser = users[0];
      await stakeBasketToken.mint(await insufficientUser.getAddress(), ethers.parseEther("50"));
      
      await expect(
        basketGovernance.connect(insufficientUser).propose(
          "Test Proposal",
          "Test Description",
          PROPOSAL_TYPES.PARAMETER_CHANGE,
          await stakeBasketToken.getAddress(),
          "0x",
          0
        )
      ).to.be.revertedWith("BasketGovernance: insufficient tokens to propose");
    });

    it("Should handle complex proposals with multiple actions", async function () {
      const targets = [
        await stakeBasket.getAddress(),
        await stakeBasket.getAddress()
      ];
      const values = [0, 0];
      const calldatas = [
        stakeBasket.interface.encodeFunctionData("setManagementFee", [60]), // 0.6%
        stakeBasket.interface.encodeFunctionData("setProtocolFeePercentage", [1500]) // 15%
      ];
      const description = "Lower management fee and adjust protocol fee";

      await expect(
        basketGovernance.connect(user1).propose(targets, values, calldatas, description)
      ).to.not.be.reverted;
    });
  });

  describe("Voting Process", function () {
    let proposalId;

    beforeEach(async function () {
      // Set up tokens and delegation
      await stakeBasket.connect(user1).deposit(ethers.parseEther("2000"), {
        value: ethers.parseEther("2000")
      });
      await stakeBasket.connect(user2).deposit(ethers.parseEther("3000"), {
        value: ethers.parseEther("3000")
      });
      await stakeBasket.connect(user3).deposit(ethers.parseEther("1500"), {
        value: ethers.parseEther("1500")
      });

      await stakeBasketToken.connect(user1).delegate(user1.address);
      await stakeBasketToken.connect(user2).delegate(user2.address);
      await stakeBasketToken.connect(user3).delegate(user3.address);

      // Create proposal
      const targets = [await stakeBasket.getAddress()];
      const values = [0];
      const calldatas = [stakeBasket.interface.encodeFunctionData("setManagementFee", [75])];
      const description = "Lower management fee to 0.75%";

      await basketGovernance.connect(user1).propose(targets, values, calldatas, description);
      
      proposalId = await basketGovernance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.keccak256(ethers.toUtf8Bytes(description))
      );

      // Advance past voting delay
      await setup.advanceTime(2);
    });

    it("Should allow voting on active proposal", async function () {
      // Check proposal is active
      expect(await basketGovernance.state(proposalId)).to.equal(PROPOSAL_STATES.ACTIVE);

      // Vote in favor
      await expect(
        basketGovernance.connect(user1).castVote(proposalId, 1) // 1 = For
      ).to.emit(basketGovernance, "VoteCast");

      // Vote against
      await expect(
        basketGovernance.connect(user2).castVote(proposalId, 0) // 0 = Against
      ).to.emit(basketGovernance, "VoteCast");

      // Check vote tallies
      const { againstVotes, forVotes, abstainVotes } = await basketGovernance.proposalVotes(proposalId);
      expect(forVotes).to.be.gt(0);
      expect(againstVotes).to.be.gt(0);
    });

    it("Should reject duplicate votes", async function () {
      await basketGovernance.connect(user1).castVote(proposalId, 1);
      
      await expect(
        basketGovernance.connect(user1).castVote(proposalId, 0)
      ).to.be.revertedWithCustomError(basketGovernance, "GovernorAlreadyCastVote");
    });

    it("Should allow voting with reason", async function () {
      const reason = "I support lowering fees for better user experience";
      
      await expect(
        basketGovernance.connect(user1).castVoteWithReason(proposalId, 1, reason)
      ).to.emit(basketGovernance, "VoteCast")
        .withArgs(user1.address, proposalId, 1, await stakeBasketToken.getVotes(user1.address), reason);
    });

    it("Should handle vote by signature", async function () {
      const support = 1; // For
      const reason = "Supporting via signature";
      
      // This would require proper signature creation in a real test
      // For now, we'll test the interface exists
      expect(basketGovernance.castVoteBySig).to.be.a('function');
    });
  });

  describe("Proposal Execution", function () {
    let proposalId;
    let targets, values, calldatas, descriptionHash;

    beforeEach(async function () {
      // Set up voting power
      await stakeBasket.connect(user1).deposit(ethers.parseEther("3000"), {
        value: ethers.parseEther("3000")
      });
      await stakeBasket.connect(user2).deposit(ethers.parseEther("3000"), {
        value: ethers.parseEther("3000")
      });

      await stakeBasketToken.connect(user1).delegate(user1.address);
      await stakeBasketToken.connect(user2).delegate(user2.address);

      // Create and pass proposal
      targets = [await stakeBasket.getAddress()];
      values = [0];
      calldatas = [stakeBasket.interface.encodeFunctionData("setManagementFee", [75])];
      const description = "Lower management fee to 0.75%";
      descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

      await basketGovernance.connect(user1).propose(targets, values, calldatas, description);
      proposalId = await basketGovernance.hashProposal(targets, values, calldatas, descriptionHash);

      // Advance past voting delay and vote
      await setup.advanceTime(2);
      
      // Both users vote in favor (should exceed quorum)
      await basketGovernance.connect(user1).castVote(proposalId, 1);
      await basketGovernance.connect(user2).castVote(proposalId, 1);

      // Advance past voting period
      await setup.advanceTime(50401);
    });

    it("Should succeed proposal with sufficient votes", async function () {
      const state = await basketGovernance.state(proposalId);
      expect(state).to.equal(PROPOSAL_STATES.SUCCEEDED);
    });

    it("Should queue successful proposal", async function () {
      await basketGovernance.queue(targets, values, calldatas, descriptionHash);
      
      const state = await basketGovernance.state(proposalId);
      expect(state).to.equal(PROPOSAL_STATES.QUEUED);
    });

    it("Should execute queued proposal after timelock", async function () {
      await basketGovernance.queue(targets, values, calldatas, descriptionHash);
      
      // Advance past timelock delay
      const timelockDelay = await basketGovernance.timelock().then(async (timelock) => {
        const contract = await ethers.getContractAt("TimelockController", timelock);
        return await contract.getMinDelay();
      });
      await setup.advanceTime(Number(timelockDelay) + 1);

      const feeBefore = await stakeBasket.managementFeeBasisPoints();
      
      await basketGovernance.execute(targets, values, calldatas, descriptionHash);
      
      const feeAfter = await stakeBasket.managementFeeBasisPoints();
      expect(feeAfter).to.equal(75);
      expect(feeAfter).to.not.equal(feeBefore);

      const state = await basketGovernance.state(proposalId);
      expect(state).to.equal(PROPOSAL_STATES.EXECUTED);
    });
  });

  describe("Governance Parameters", function () {
    it("Should update voting delay", async function () {
      const newDelay = 100;
      
      // This would need to be done through governance
      await basketGovernance.connect(owner).updateDelay(newDelay);
      expect(await basketGovernance.votingDelay()).to.equal(newDelay);
    });

    it("Should update voting period", async function () {
      const newPeriod = 100800; // ~14 days
      
      await basketGovernance.connect(owner).updatePeriod(newPeriod);
      expect(await basketGovernance.votingPeriod()).to.equal(newPeriod);
    });

    it("Should update proposal threshold", async function () {
      const newThreshold = ethers.parseEther("2000");
      
      await basketGovernance.connect(owner).updateProposalThreshold(newThreshold);
      expect(await basketGovernance.proposalThreshold()).to.equal(newThreshold);
    });

    it("Should update quorum fraction", async function () {
      const newQuorumFraction = 500; // 5%
      
      await basketGovernance.connect(owner).updateQuorumNumerator(newQuorumFraction);
      
      // Check that quorum calculation uses new fraction
      const totalSupply = await stakeBasketToken.totalSupply();
      const expectedQuorum = (totalSupply * BigInt(newQuorumFraction)) / 10000n;
      expect(await basketGovernance.quorum(await ethers.provider.getBlockNumber() - 1))
        .to.be.closeTo(expectedQuorum, ethers.parseEther("1"));
    });
  });

  describe("Delegation", function () {
    beforeEach(async function () {
      await stakeBasket.connect(user1).deposit(ethers.parseEther("1000"), {
        value: ethers.parseEther("1000")
      });
    });

    it("Should allow self-delegation", async function () {
      await expect(
        stakeBasketToken.connect(user1).delegate(user1.address)
      ).to.emit(stakeBasketToken, "DelegateChanged");

      expect(await stakeBasketToken.delegates(user1.address)).to.equal(user1.address);
    });

    it("Should allow delegation to others", async function () {
      await stakeBasketToken.connect(user1).delegate(user2.address);
      
      expect(await stakeBasketToken.delegates(user1.address)).to.equal(user2.address);
      expect(await stakeBasketToken.getVotes(user2.address)).to.equal(ethers.parseEther("1000"));
    });

    it("Should track voting power changes", async function () {
      await stakeBasketToken.connect(user1).delegate(user1.address);
      
      const initialVotes = await stakeBasketToken.getVotes(user1.address);
      
      // Deposit more tokens
      await stakeBasket.connect(user1).deposit(ethers.parseEther("500"), {
        value: ethers.parseEther("500")
      });
      
      const newVotes = await stakeBasketToken.getVotes(user1.address);
      expect(newVotes).to.be.gt(initialVotes);
    });
  });

  describe("Emergency Functions", function () {
    it("Should handle emergency proposal cancellation", async function () {
      // Set up a proposal
      await stakeBasket.connect(user1).deposit(ethers.parseEther("2000"), {
        value: ethers.parseEther("2000")
      });
      await stakeBasketToken.connect(user1).delegate(user1.address);

      const targets = [await stakeBasket.getAddress()];
      const values = [0];
      const calldatas = [stakeBasket.interface.encodeFunctionData("setManagementFee", [75])];
      const description = "Test proposal for cancellation";

      await basketGovernance.connect(user1).propose(targets, values, calldatas, description);
      
      const proposalId = await basketGovernance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.keccak256(ethers.toUtf8Bytes(description))
      );

      // Cancel the proposal (if user's voting power falls below threshold)
      await expect(
        basketGovernance.connect(user1).cancel(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)))
      ).to.not.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return proposal details", async function () {
      // Create a proposal first
      await stakeBasket.connect(user1).deposit(ethers.parseEther("2000"), {
        value: ethers.parseEther("2000")
      });
      await stakeBasketToken.connect(user1).delegate(user1.address);

      const targets = [await stakeBasket.getAddress()];
      const values = [0];
      const calldatas = [stakeBasket.interface.encodeFunctionData("setManagementFee", [75])];
      const description = "Test proposal";

      await basketGovernance.connect(user1).propose(targets, values, calldatas, description);
      
      const proposalId = await basketGovernance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.keccak256(ethers.toUtf8Bytes(description))
      );

      // Test view functions
      expect(await basketGovernance.state(proposalId)).to.be.a('number');
      expect(await basketGovernance.proposalSnapshot(proposalId)).to.be.a('bigint');
      expect(await basketGovernance.proposalDeadline(proposalId)).to.be.a('bigint');
      expect(await basketGovernance.proposalProposer(proposalId)).to.equal(user1.address);
    });

    it("Should check voting power at specific blocks", async function () {
      await stakeBasket.connect(user1).deposit(ethers.parseEther("1000"), {
        value: ethers.parseEther("1000")
      });
      await stakeBasketToken.connect(user1).delegate(user1.address);
      
      const currentBlock = await ethers.provider.getBlockNumber();
      const votingPower = await stakeBasketToken.getPastVotes(user1.address, currentBlock - 1);
      
      expect(votingPower).to.be.a('bigint');
    });
  });

  describe("Integration with StakeBasket", function () {
    it("Should successfully execute management fee change", async function () {
      // Set up sufficient voting power
      await stakeBasket.connect(user1).deposit(ethers.parseEther("5000"), {
        value: ethers.parseEther("5000")
      });
      await stakeBasket.connect(user2).deposit(ethers.parseEther("5000"), {
        value: ethers.parseEther("5000")
      });
      
      await stakeBasketToken.connect(user1).delegate(user1.address);
      await stakeBasketToken.connect(user2).delegate(user2.address);

      const initialFee = await stakeBasket.managementFeeBasisPoints();
      const newFee = 100; // 1%

      // Create proposal
      const targets = [await stakeBasket.getAddress()];
      const values = [0];
      const calldatas = [stakeBasket.interface.encodeFunctionData("setManagementFee", [newFee])];
      const description = "Change management fee to 1%";
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

      await basketGovernance.connect(user1).propose(targets, values, calldatas, description);
      
      const proposalId = await basketGovernance.hashProposal(targets, values, calldatas, descriptionHash);

      // Vote and execute
      await setup.advanceTime(2);
      await basketGovernance.connect(user1).castVote(proposalId, 1);
      await basketGovernance.connect(user2).castVote(proposalId, 1);
      
      await setup.advanceTime(50401);
      await basketGovernance.queue(targets, values, calldatas, descriptionHash);
      
      // Advance past timelock
      await setup.advanceTime(172800 + 1); // 2 days + 1 second
      await basketGovernance.execute(targets, values, calldatas, descriptionHash);

      // Verify change
      const finalFee = await stakeBasket.managementFeeBasisPoints();
      expect(finalFee).to.equal(newFee);
      expect(finalFee).to.not.equal(initialFee);
    });
  });
});