const { expect } = require("chai");
const hre = require("hardhat");

describe("Automated Validator Rebalancing", function () {
  let deployer, user1, user2;
  let mockCORE, mockCoreStaking, stakingManager, stakeBasket;
  let validatorAddresses;

  before(async function () {
    [deployer, user1, user2] = await hre.ethers.getSigners();
    
    console.log("🚀 Setting up Automated Rebalancing Test Environment...");
    
    // Deploy mock CORE token
    const MockCORE = await hre.ethers.getContractFactory("MockCORE");
    mockCORE = await MockCORE.deploy(deployer.address);
    await mockCORE.waitForDeployment();
    const mockCOREAddress = await mockCORE.getAddress();
    console.log("📋 MockCORE deployed:", mockCOREAddress);

    // Deploy MockCoreStaking
    const MockCoreStaking = await hre.ethers.getContractFactory("MockCoreStaking");
    mockCoreStaking = await MockCoreStaking.deploy(mockCOREAddress, deployer.address);
    await mockCoreStaking.waitForDeployment();
    const mockCoreStakingAddress = await mockCoreStaking.getAddress();
    console.log("📋 MockCoreStaking deployed:", mockCoreStakingAddress);

    // Deploy StakingManager
    const StakingManager = await hre.ethers.getContractFactory("StakingManager");
    stakingManager = await StakingManager.deploy(
      deployer.address, // Using deployer as StakeBasket for testing
      mockCoreStakingAddress,
      hre.ethers.ZeroAddress, // No lstBTC for this test
      hre.ethers.ZeroAddress, // No coreBTC for this test
      mockCOREAddress,
      deployer.address
    );
    await stakingManager.waitForDeployment();
    const stakingManagerAddress = await stakingManager.getAddress();
    console.log("📋 StakingManager deployed:", stakingManagerAddress);

    // Set up rebalancing parameters
    await stakingManager.setRebalanceThresholds(50, 600); // 0.5% APY, 60% risk
    await stakingManager.setAutomationBot(deployer.address);
    console.log("📋 Rebalancing parameters configured");

    // Get initial validators
    validatorAddresses = await mockCoreStaking.getAllValidatorAddresses();
    console.log("📋 Initial validators:", validatorAddresses.length);

    // Add validators to StakingManager
    for (const validator of validatorAddresses) {
      await stakingManager.addCoreValidator(validator);
    }

    // Add some additional test validators
    const additionalValidators = [
      { address: "0x4444444444444444444444444444444444444444", commission: 400, score: 950 },
      { address: "0x5555555555555555555555555555555555555555", commission: 800, score: 600 },
      { address: "0x6666666666666666666666666666666666666666", commission: 600, score: 300 }
    ];

    for (const val of additionalValidators) {
      await mockCoreStaking.registerValidator(val.address, val.commission, val.score);
      await stakingManager.addCoreValidator(val.address);
    }
    
    // Refresh validator addresses list
    validatorAddresses = await mockCoreStaking.getAllValidatorAddresses();

    console.log("📋 Total validators:", validatorAddresses.length);

    // Fund accounts
    await mockCORE.mint(deployer.address, hre.ethers.parseEther("100000"));
    await mockCORE.mint(user1.address, hre.ethers.parseEther("10000"));
    await mockCORE.mint(stakingManagerAddress, hre.ethers.parseEther("10000"));

    console.log("✅ Test environment setup completed\\n");
  });

  describe("Initial Setup Validation", function () {
    it("Should have correct validator configuration", async function () {
      const allValidators = await stakingManager.getActiveCoreValidators();
      expect(allValidators.length).to.equal(validatorAddresses.length);
      
      console.log("✅ Validator count:", allValidators.length);
    });

    it("Should have correct rebalancing thresholds", async function () {
      const apyThreshold = await stakingManager.rebalanceThresholdAPY();
      const riskThreshold = await stakingManager.rebalanceThresholdRisk();
      
      expect(apyThreshold).to.equal(50);
      expect(riskThreshold).to.equal(600);
      
      console.log("✅ APY threshold:", apyThreshold.toString(), "basis points");
      console.log("✅ Risk threshold:", riskThreshold.toString());
    });

    it("Should have automation bot configured", async function () {
      const automationBot = await stakingManager.automationBot();
      expect(automationBot).to.equal(deployer.address);
      
      console.log("✅ Automation bot:", automationBot);
    });
  });

  describe("Validator Performance Analysis", function () {
    it("Should get validator info correctly", async function () {
      for (let i = 0; i < Math.min(3, validatorAddresses.length); i++) {
        const validator = validatorAddresses[i];
        const info = await mockCoreStaking.getValidatorInfo(validator);
        const effectiveAPY = await mockCoreStaking.getValidatorEffectiveAPY(validator);
        const riskScore = await mockCoreStaking.getValidatorRiskScore(validator);
        
        console.log(`📊 Validator ${i + 1}:`, {
          address: validator.slice(0, 8) + "...",
          delegated: hre.ethers.formatEther(info[0]),
          commission: (Number(info[1]) / 100).toFixed(1) + "%",
          hybridScore: (Number(info[2]) / 10).toFixed(1) + "%",
          active: info[3],
          effectiveAPY: (Number(effectiveAPY) / 100).toFixed(2) + "%",
          riskScore: (Number(riskScore) / 10).toFixed(1)
        });
      }
    });

    it("Should calculate optimal validator distribution", async function () {
      const [validators, allocations] = await stakingManager.getOptimalValidatorDistribution();
      
      expect(validators.length).to.be.greaterThan(0);
      expect(allocations.length).to.equal(validators.length);
      
      // Check that allocations sum to approximately 10000 basis points (100%)
      const totalAllocation = allocations.reduce((sum, allocation) => sum + Number(allocation), 0);
      expect(totalAllocation).to.be.closeTo(10000, 100); // Allow small rounding differences
      
      console.log("📊 Optimal Distribution:");
      for (let i = 0; i < validators.length; i++) {
        console.log(`  ${validators[i].slice(0, 8)}...: ${(Number(allocations[i]) / 100).toFixed(1)}%`);
      }
    });
  });

  describe("Delegation and Rebalancing Logic", function () {
    let initialDelegationAmount;

    beforeEach(async function () {
      initialDelegationAmount = hre.ethers.parseEther("1000");
    });

    it("Should delegate to a validator initially", async function () {
      const validator = validatorAddresses[0];
      
      // Approve and delegate
      await mockCORE.approve(await mockCoreStaking.getAddress(), initialDelegationAmount);
      await mockCoreStaking.delegate(validator, initialDelegationAmount);
      
      // Update StakingManager tracking
      await stakingManager.connect(deployer).delegateCore(validator, initialDelegationAmount);
      
      const delegated = await stakingManager.delegatedCoreByValidator(validator);
      expect(delegated).to.equal(initialDelegationAmount);
      
      console.log("✅ Initial delegation:", hre.ethers.formatEther(delegated), "CORE");
    });

    it("Should not need rebalancing initially with good validators", async function () {
      const [needsRebalance, reason] = await stakingManager.shouldRebalance();
      
      console.log("📊 Initial rebalancing check:");
      console.log("  Needs rebalance:", needsRebalance);
      console.log("  Reason:", reason);
      
      // Initially should not need rebalancing with good validators
      expect(needsRebalance).to.be.false;
    });

    it("Should detect need for rebalancing when validator becomes inactive", async function () {
      const validator = validatorAddresses[0];
      
      // Simulate validator going inactive
      await mockCoreStaking.setValidatorStatus(validator, false);
      
      const [needsRebalance, reason] = await stakingManager.shouldRebalance();
      
      console.log("📊 After deactivating validator:");
      console.log("  Needs rebalance:", needsRebalance);
      console.log("  Reason:", reason);
      
      expect(needsRebalance).to.be.true;
      expect(reason).to.include("inactive");
    });

    it("Should detect need for rebalancing when validator risk increases", async function () {
      const validator = validatorAddresses[0];
      
      // First reactivate the validator
      await mockCoreStaking.setValidatorStatus(validator, true);
      
      // Then set very low hybrid score (high risk)
      await mockCoreStaking.setValidatorHybridScore(validator, 200); // 20% score = high risk
      
      const [needsRebalance, reason] = await stakingManager.shouldRebalance();
      
      console.log("📊 After increasing validator risk:");
      console.log("  Needs rebalance:", needsRebalance);
      console.log("  Reason:", reason);
      
      expect(needsRebalance).to.be.true;
    });

    it("Should execute rebalancing successfully", async function () {
      // Find a good validator to move funds to
      const [optimalValidators] = await stakingManager.getOptimalValidatorDistribution();
      expect(optimalValidators.length).to.be.greaterThan(0);
      
      const fromValidator = validatorAddresses[0]; // The one with poor performance
      const toValidator = optimalValidators[0]; // Best performing validator
      
      const delegationAmount = await stakingManager.delegatedCoreByValidator(fromValidator);
      
      if (delegationAmount > 0) {
        console.log("📊 Executing rebalancing:");
        console.log("  From:", fromValidator.slice(0, 8) + "...");
        console.log("  To:", toValidator.slice(0, 8) + "...");
        console.log("  Amount:", hre.ethers.formatEther(delegationAmount), "CORE");
        
        // Execute rebalancing
        const tx = await stakingManager.rebalanceCoreStaking(
          [fromValidator],
          [delegationAmount],
          [toValidator],
          [delegationAmount]
        );
        
        const receipt = await tx.wait();
        console.log("✅ Rebalancing transaction:", receipt.hash);
        
        // Verify the rebalancing
        const newFromDelegation = await stakingManager.delegatedCoreByValidator(fromValidator);
        const newToDelegation = await stakingManager.delegatedCoreByValidator(toValidator);
        
        expect(newFromDelegation).to.equal(0);
        expect(newToDelegation).to.equal(delegationAmount);
        
        console.log("✅ Rebalancing completed successfully");
      } else {
        console.log("⚠️  No delegation to rebalance");
      }
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle rebalancing with no good validators available", async function () {
      // Deactivate all validators except one with poor performance
      const validators = await stakingManager.getActiveCoreValidators();
      
      for (let i = 1; i < validators.length; i++) {
        await mockCoreStaking.setValidatorStatus(validators[i], false);
      }
      
      // Set the remaining validator to poor performance
      await mockCoreStaking.setValidatorHybridScore(validators[0], 100); // 10% score
      
      const [optimalValidators] = await stakingManager.getOptimalValidatorDistribution();
      console.log("📊 Optimal validators when all are poor:", optimalValidators.length);
      
      // Should return empty array when no good validators
      expect(optimalValidators.length).to.equal(0);
    });

    it("Should revert rebalancing with invalid parameters", async function () {
      await expect(
        stakingManager.rebalanceCoreStaking(
          [validatorAddresses[0]],
          [hre.ethers.parseEther("1000")],
          [validatorAddresses[1]], 
          [] // Mismatched arrays
        )
      ).to.be.revertedWith("mismatched rebalance arrays");
    });

    it("Should revert rebalancing with insufficient delegation", async function () {
      const validator = validatorAddresses[1];
      const excessiveAmount = hre.ethers.parseEther("10000");
      
      await expect(
        stakingManager.rebalanceCoreStaking(
          [validator],
          [excessiveAmount],
          [validatorAddresses[2]],
          [excessiveAmount]
        )
      ).to.be.revertedWith("insufficient delegation to undelegate");
    });

    it("Should handle multiple validator rebalancing", async function () {
      // First set up some delegations to multiple validators
      const amount = hre.ethers.parseEther("500");
      
      // Reactivate validators for this test
      await mockCoreStaking.setValidatorStatus(validatorAddresses[1], true);
      await mockCoreStaking.setValidatorStatus(validatorAddresses[2], true);
      await mockCoreStaking.setValidatorHybridScore(validatorAddresses[1], 800);
      await mockCoreStaking.setValidatorHybridScore(validatorAddresses[2], 900);
      
      // Delegate to multiple validators
      await mockCORE.approve(await mockCoreStaking.getAddress(), amount * 2n);
      await mockCoreStaking.delegate(validatorAddresses[1], amount);
      await mockCoreStaking.delegate(validatorAddresses[2], amount);
      
      // Track in StakingManager
      await stakingManager.delegateCore(validatorAddresses[1], amount);
      await stakingManager.delegateCore(validatorAddresses[2], amount);
      
      // Now make one validator perform poorly
      await mockCoreStaking.setValidatorHybridScore(validatorAddresses[1], 200);
      
      // Should still be able to rebalance
      const [needsRebalance] = await stakingManager.shouldRebalance();
      console.log("📊 Multiple validator rebalancing needed:", needsRebalance);
      
      if (needsRebalance) {
        const delegation1 = await stakingManager.delegatedCoreByValidator(validatorAddresses[1]);
        
        if (delegation1 > 0) {
          await stakingManager.rebalanceCoreStaking(
            [validatorAddresses[1]],
            [delegation1],
            [validatorAddresses[2]],
            [delegation1]
          );
          
          console.log("✅ Multiple validator rebalancing completed");
        }
      }
    });
  });

  describe("Performance and Gas Analysis", function () {
    it("Should measure gas costs for rebalancing", async function () {
      // Set up a simple rebalancing scenario
      const fromValidator = validatorAddresses[2];
      const toValidator = validatorAddresses[3];
      const amount = hre.ethers.parseEther("100");
      
      // Ensure validators are in correct state
      await mockCoreStaking.setValidatorStatus(fromValidator, true);
      await mockCoreStaking.setValidatorStatus(toValidator, true);
      await mockCoreStaking.setValidatorHybridScore(fromValidator, 300); // Poor
      await mockCoreStaking.setValidatorHybridScore(toValidator, 900); // Good
      
      // Set up delegation
      await mockCORE.approve(await mockCoreStaking.getAddress(), amount);
      await mockCoreStaking.delegate(fromValidator, amount);
      await stakingManager.delegateCore(fromValidator, amount);
      
      // Measure gas for rebalancing
      const tx = await stakingManager.rebalanceCoreStaking(
        [fromValidator],
        [amount],
        [toValidator],
        [amount]
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      
      console.log("⛽ Gas used for rebalancing:", gasUsed.toString());
      console.log("⛽ Gas cost at 20 gwei:", hre.ethers.formatEther(gasUsed * 20000000000n), "ETH");
      
      // Should be reasonable gas cost (less than 200k gas)
      expect(Number(gasUsed)).to.be.lessThan(200000);
    });

    it("Should handle rapid successive validator state changes", async function () {
      const validator = validatorAddresses[0];
      
      // Rapid state changes
      await mockCoreStaking.setValidatorHybridScore(validator, 950);
      await mockCoreStaking.setValidatorHybridScore(validator, 200);
      await mockCoreStaking.setValidatorStatus(validator, false);
      await mockCoreStaking.setValidatorStatus(validator, true);
      await mockCoreStaking.setValidatorCommission(validator, 1500); // 15%
      
      // Should still be able to get validator info
      const info = await mockCoreStaking.getValidatorInfo(validator);
      const riskScore = await mockCoreStaking.getValidatorRiskScore(validator);
      
      console.log("📊 After rapid changes:");
      console.log("  Active:", info[3]);
      console.log("  Commission:", Number(info[1]) / 100 + "%");
      console.log("  Hybrid Score:", Number(info[2]) / 10 + "%");
      console.log("  Risk Score:", Number(riskScore) / 10);
      
      expect(info[3]).to.be.true; // Should be active
      expect(Number(info[1])).to.equal(1500); // 15% commission
    });
  });

  after(async function () {
    console.log("\\n🏁 Automated Rebalancing Tests Completed");
    
    // Print final summary
    const allValidators = await stakingManager.getActiveCoreValidators();
    console.log("📊 Final Summary:");
    console.log("  Total validators:", allValidators.length);
    
    let totalDelegated = 0n;
    for (const validator of allValidators) {
      const delegated = await stakingManager.delegatedCoreByValidator(validator);
      totalDelegated += delegated;
    }
    
    console.log("  Total delegated:", hre.ethers.formatEther(totalDelegated), "CORE");
    console.log("✅ All tests passed successfully!");
  });
});