const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CoreLiquidStakingManager", function () {
  let coreLiquidStakingManager, stCoreToken, unbondingQueue, coreStakingContract;
  let owner, operator, treasury, user1, user2, validator1, validator2, validator3;

  const INITIAL_CONVERSION_RATE = ethers.parseEther("1"); // 1:1 ratio initially

  beforeEach(async function () {
    [owner, operator, treasury, user1, user2, validator1, validator2, validator3] = await ethers.getSigners();

    // Deploy mock CoreStaking contract
    const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
    coreStakingContract = await MockCoreStaking.deploy();
    await coreStakingContract.waitForDeployment();

    // Deploy UnbondingQueue
    const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
    unbondingQueue = await UnbondingQueue.deploy(
      await owner.getAddress(),
      7 * 24 * 60 * 60, // 7 days
      await treasury.getAddress()
    );
    await unbondingQueue.waitForDeployment();

    // Deploy CoreLiquidStakingManager
    const CoreLiquidStakingManager = await ethers.getContractFactory("CoreLiquidStakingManager");
    coreLiquidStakingManager = await CoreLiquidStakingManager.deploy(
      await coreStakingContract.getAddress(),
      await treasury.getAddress(),
      await operator.getAddress(),
      await unbondingQueue.getAddress(),
      await owner.getAddress()
    );
    await coreLiquidStakingManager.waitForDeployment();

    // Get the deployed stCoreToken address
    const stCoreTokenAddress = await coreLiquidStakingManager.stCoreToken();
    stCoreToken = await ethers.getContractAt("StCoreToken", stCoreTokenAddress);

    // Add validators
    await coreLiquidStakingManager.connect(owner).addValidator(await validator1.getAddress());
    await coreLiquidStakingManager.connect(owner).addValidator(await validator2.getAddress());
    await coreLiquidStakingManager.connect(owner).addValidator(await validator3.getAddress());

    // Set up mock validator data in CoreStaking contract
    await coreStakingContract.setValidatorInfo(await validator1.getAddress(), 100, 500, 10000, true);
    await coreStakingContract.setValidatorInfo(await validator2.getAddress(), 120, 400, 12000, true);
    await coreStakingContract.setValidatorInfo(await validator3.getAddress(), 80, 600, 8000, true);
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await coreLiquidStakingManager.coreStakingContract()).to.equal(await coreStakingContract.getAddress());
      expect(await coreLiquidStakingManager.treasury()).to.equal(await treasury.getAddress());
      expect(await coreLiquidStakingManager.operator()).to.equal(await operator.getAddress());
      expect(await coreLiquidStakingManager.owner()).to.equal(await owner.getAddress());
    });

    it("Should have correct initial parameters", async function () {
      expect(await coreLiquidStakingManager.rebalanceThreshold()).to.equal(500); // 5%
      expect(await coreLiquidStakingManager.maxValidatorRisk()).to.equal(600);
      expect(await coreLiquidStakingManager.minValidatorCount()).to.equal(3);
      expect(await coreLiquidStakingManager.unstakingPeriod()).to.equal(7 * 24 * 60 * 60);
      expect(await coreLiquidStakingManager.protocolFee()).to.equal(50); // 0.5%
      expect(await coreLiquidStakingManager.performanceFee()).to.equal(1000); // 10%
    });

    it("Should create stCoreToken contract", async function () {
      const stCoreTokenAddress = await coreLiquidStakingManager.stCoreToken();
      expect(stCoreTokenAddress).to.not.equal(ethers.ZeroAddress);
      
      const tokenName = await stCoreToken.name();
      expect(tokenName).to.equal("Staked CORE");
    });
  });

  describe("Validator Management", function () {
    it("Should add validators", async function () {
      const newValidator = await ethers.getSigner(10);
      
      await expect(
        coreLiquidStakingManager.connect(owner).addValidator(await newValidator.getAddress())
      ).to.emit(coreLiquidStakingManager, "ValidatorAdded");

      expect(await coreLiquidStakingManager.isActiveValidator(await newValidator.getAddress())).to.be.true;
      expect(await coreLiquidStakingManager.activeValidators(3)).to.equal(await newValidator.getAddress());
    });

    it("Should reject adding existing validator", async function () {
      await expect(
        coreLiquidStakingManager.connect(owner).addValidator(await validator1.getAddress())
      ).to.be.revertedWith("CoreLiquidStaking: validator already active");
    });

    it("Should remove validators", async function () {
      // Ensure validator has no delegations
      expect(await coreLiquidStakingManager.delegatedAmountByValidator(await validator1.getAddress())).to.equal(0);
      
      await expect(
        coreLiquidStakingManager.connect(owner).removeValidator(await validator1.getAddress())
      ).to.emit(coreLiquidStakingManager, "ValidatorRemoved");

      expect(await coreLiquidStakingManager.isActiveValidator(await validator1.getAddress())).to.be.false;
    });

    it("Should reject removing validator with delegations", async function () {
      // First stake to create delegations
      await coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
        value: ethers.parseEther("100")
      });

      await expect(
        coreLiquidStakingManager.connect(owner).removeValidator(await validator1.getAddress())
      ).to.be.revertedWith("CoreLiquidStaking: validator has delegations");
    });
  });

  describe("Staking", function () {
    it("Should stake CORE and mint stCORE", async function () {
      const stakeAmount = ethers.parseEther("100");
      
      await expect(
        coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: stakeAmount
        })
      ).to.emit(coreLiquidStakingManager, "Staked")
        .withArgs(await user1.getAddress(), stakeAmount, stakeAmount);

      // Check stCORE balance
      expect(await stCoreToken.balanceOf(await user1.getAddress())).to.equal(stakeAmount);
      
      // Check delegation tracking
      expect(await coreLiquidStakingManager.delegatedAmountByValidator(await validator1.getAddress()))
        .to.equal(stakeAmount);
    });

    it("Should select optimal validator when none specified", async function () {
      const stakeAmount = ethers.parseEther("100");
      
      await expect(
        coreLiquidStakingManager.connect(user1).stake(ethers.ZeroAddress, {
          value: stakeAmount
        })
      ).to.emit(coreLiquidStakingManager, "Staked");

      // Should have selected one of the active validators
      const totalDelegated = await coreLiquidStakingManager.getTotalDelegated();
      expect(totalDelegated).to.equal(stakeAmount);
    });

    it("Should reject zero stake amount", async function () {
      await expect(
        coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: 0
        })
      ).to.be.revertedWith("CoreLiquidStaking: stake amount must be positive");
    });

    it("Should reject staking when paused", async function () {
      await coreLiquidStakingManager.connect(owner).pause();
      
      await expect(
        coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: ethers.parseEther("100")
        })
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      // Stake some tokens first
      await coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
        value: ethers.parseEther("100")
      });
    });

    it("Should request unstaking", async function () {
      const unstakeAmount = ethers.parseEther("50");
      
      // Approve stCORE transfer
      await stCoreToken.connect(user1).approve(
        await coreLiquidStakingManager.getAddress(),
        unstakeAmount
      );

      await expect(
        coreLiquidStakingManager.connect(user1).requestUnstake(unstakeAmount)
      ).to.emit(coreLiquidStakingManager, "UnstakeRequested");

      // Check stCORE was transferred to contract
      expect(await stCoreToken.balanceOf(await coreLiquidStakingManager.getAddress()))
        .to.equal(unstakeAmount);
    });

    it("Should reject unstaking more than balance", async function () {
      const unstakeAmount = ethers.parseEther("200"); // More than staked
      
      await stCoreToken.connect(user1).approve(
        await coreLiquidStakingManager.getAddress(),
        unstakeAmount
      );

      await expect(
        coreLiquidStakingManager.connect(user1).requestUnstake(unstakeAmount)
      ).to.be.revertedWith("CoreLiquidStaking: insufficient stCORE balance");
    });

    it("Should reject zero unstake amount", async function () {
      await expect(
        coreLiquidStakingManager.connect(user1).requestUnstake(0)
      ).to.be.revertedWith("CoreLiquidStaking: unstake amount must be positive");
    });
  });

  describe("Validator Selection", function () {
    it("Should select optimal validator based on APY and risk", async function () {
      // Set different APYs and risk scores
      await coreStakingContract.setValidatorInfo(await validator1.getAddress(), 100, 500, 10000, true); // High APY, medium risk
      await coreStakingContract.setValidatorInfo(await validator2.getAddress(), 80, 300, 8000, true);   // Medium APY, low risk
      await coreStakingContract.setValidatorInfo(await validator3.getAddress(), 120, 800, 12000, true); // Highest APY, high risk

      const optimalValidator = await coreLiquidStakingManager.selectOptimalValidator();
      
      // Should select validator with best risk-adjusted score
      expect(optimalValidator).to.not.equal(ethers.ZeroAddress);
      expect(await coreLiquidStakingManager.isActiveValidator(optimalValidator)).to.be.true;
    });

    it("Should exclude validators with high risk scores", async function () {
      // Set all validators to have risk scores above threshold
      await coreStakingContract.setValidatorInfo(await validator1.getAddress(), 100, 700, 10000, true);
      await coreStakingContract.setValidatorInfo(await validator2.getAddress(), 80, 800, 8000, true);
      await coreStakingContract.setValidatorInfo(await validator3.getAddress(), 120, 900, 12000, true);

      const optimalValidator = await coreLiquidStakingManager.selectOptimalValidator();
      expect(optimalValidator).to.equal(ethers.ZeroAddress);
    });

    it("Should exclude inactive validators", async function () {
      // Make all validators inactive
      await coreStakingContract.setValidatorInfo(await validator1.getAddress(), 100, 500, 10000, false);
      await coreStakingContract.setValidatorInfo(await validator2.getAddress(), 80, 300, 8000, false);
      await coreStakingContract.setValidatorInfo(await validator3.getAddress(), 120, 400, 12000, false);

      const optimalValidator = await coreLiquidStakingManager.selectOptimalValidator();
      expect(optimalValidator).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Rebalancing", function () {
    beforeEach(async function () {
      // Stake some tokens to create imbalance
      await coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
        value: ethers.parseEther("1000")
      });
      await coreLiquidStakingManager.connect(user2).stake(await validator2.getAddress(), {
        value: ethers.parseEther("500")
      });
    });

    it("Should perform manual rebalancing", async function () {
      const rebalanceAmount = ethers.parseEther("200");
      
      await expect(
        coreLiquidStakingManager.connect(operator).manualRebalance(
          await validator1.getAddress(),
          await validator3.getAddress(),
          rebalanceAmount
        )
      ).to.emit(coreLiquidStakingManager, "Rebalanced");

      // Check updated delegations
      expect(await coreLiquidStakingManager.delegatedAmountByValidator(await validator1.getAddress()))
        .to.equal(ethers.parseEther("800"));
      expect(await coreLiquidStakingManager.delegatedAmountByValidator(await validator3.getAddress()))
        .to.equal(rebalanceAmount);
    });

    it("Should reject rebalancing from non-operator", async function () {
      await expect(
        coreLiquidStakingManager.connect(user1).manualRebalance(
          await validator1.getAddress(),
          await validator3.getAddress(),
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("CoreLiquidStaking: not operator");
    });

    it("Should perform automated rebalancing", async function () {
      await expect(
        coreLiquidStakingManager.connect(operator).rebalance()
      ).to.emit(coreLiquidStakingManager, "Rebalanced");
    });
  });

  describe("Reward Collection", function () {
    beforeEach(async function () {
      // Stake some tokens
      await coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
        value: ethers.parseEther("1000")
      });

      // Simulate rewards by sending CORE to the contract
      await owner.sendTransaction({
        to: await coreLiquidStakingManager.getAddress(),
        value: ethers.parseEther("100") // 100 CORE rewards
      });
    });

    it("Should collect and compound rewards", async function () {
      const initialBalance = await ethers.provider.getBalance(await treasury.getAddress());
      
      await expect(
        coreLiquidStakingManager.connect(operator).afterTurnRound()
      ).to.emit(coreLiquidStakingManager, "RewardsCollected");

      // Check that fees were sent to treasury
      const finalBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should handle reward collection from failed validators", async function () {
      // This should not revert even if some validators fail to claim
      await expect(
        coreLiquidStakingManager.connect(operator).afterTurnRound()
      ).to.not.be.reverted;
    });
  });

  describe("Parameter Updates", function () {
    it("Should update rebalance threshold", async function () {
      const newThreshold = 1000; // 10%
      
      await expect(
        coreLiquidStakingManager.connect(owner).setRebalanceThreshold(newThreshold)
      ).to.emit(coreLiquidStakingManager, "ParameterUpdated")
        .withArgs("rebalanceThreshold", 500, newThreshold);

      expect(await coreLiquidStakingManager.rebalanceThreshold()).to.equal(newThreshold);
    });

    it("Should update max validator risk", async function () {
      const newMaxRisk = 800;
      
      await expect(
        coreLiquidStakingManager.connect(owner).setMaxValidatorRisk(newMaxRisk)
      ).to.emit(coreLiquidStakingManager, "ParameterUpdated");

      expect(await coreLiquidStakingManager.maxValidatorRisk()).to.equal(newMaxRisk);
    });

    it("Should update protocol fee", async function () {
      const newFee = 100; // 1%
      
      await expect(
        coreLiquidStakingManager.connect(owner).setProtocolFee(newFee)
      ).to.emit(coreLiquidStakingManager, "ParameterUpdated");

      expect(await coreLiquidStakingManager.protocolFee()).to.equal(newFee);
    });

    it("Should reject protocol fee above maximum", async function () {
      await expect(
        coreLiquidStakingManager.connect(owner).setProtocolFee(1100) // 11%
      ).to.be.revertedWith("CoreLiquidStaking: fee too high");
    });

    it("Should update performance fee", async function () {
      const newFee = 1500; // 15%
      
      await expect(
        coreLiquidStakingManager.connect(owner).setPerformanceFee(newFee)
      ).to.emit(coreLiquidStakingManager, "ParameterUpdated");

      expect(await coreLiquidStakingManager.performanceFee()).to.equal(newFee);
    });

    it("Should reject performance fee above maximum", async function () {
      await expect(
        coreLiquidStakingManager.connect(owner).setPerformanceFee(2100) // 21%
      ).to.be.revertedWith("CoreLiquidStaking: fee too high");
    });
  });

  describe("Emergency Functions", function () {
    it("Should pause contract", async function () {
      await coreLiquidStakingManager.connect(owner).pause();
      
      await expect(
        coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: ethers.parseEther("100")
        })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should unpause contract", async function () {
      await coreLiquidStakingManager.connect(owner).pause();
      await coreLiquidStakingManager.connect(owner).unpause();
      
      await expect(
        coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: ethers.parseEther("100")
        })
      ).to.not.be.reverted;
    });
  });

  describe("Contract Info", function () {
    beforeEach(async function () {
      // Stake some tokens
      await coreLiquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
        value: ethers.parseEther("100")
      });
    });

    it("Should return correct contract information", async function () {
      const [
        stCoreTokenAddress,
        totalStaked,
        totalStCoreSupply,
        conversionRate,
        validatorCount,
        totalDelegated
      ] = await coreLiquidStakingManager.getContractInfo();

      expect(stCoreTokenAddress).to.equal(await stCoreToken.getAddress());
      expect(totalStaked).to.equal(ethers.parseEther("100"));
      expect(totalStCoreSupply).to.equal(ethers.parseEther("100"));
      expect(validatorCount).to.equal(3);
      expect(totalDelegated).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Access Control", function () {
    it("Should restrict owner functions", async function () {
      await expect(
        coreLiquidStakingManager.connect(user1).addValidator(await validator1.getAddress())
      ).to.be.revertedWithCustomError(coreLiquidStakingManager, "OwnableUnauthorizedAccount");
    });

    it("Should restrict operator functions", async function () {
      await expect(
        coreLiquidStakingManager.connect(user1).rebalance()
      ).to.be.revertedWith("CoreLiquidStaking: not operator");
    });

    it("Should allow owner to call operator functions", async function () {
      await expect(
        coreLiquidStakingManager.connect(owner).rebalance()
      ).to.not.be.revertedWith("CoreLiquidStaking: not operator");
    });
  });
});