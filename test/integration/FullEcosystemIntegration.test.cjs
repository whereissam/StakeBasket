const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Full Ecosystem Integration Tests", function () {
  let contractFactory;
  let deployedContracts;
  let users;
  
  // Contract instances
  let stakeBasketToken, simpleToken, priceFeed, liquidStakingManager, stCoreToken, unbondingQueue;
  let accessControlManager, priceSecurityModule;
  
  // User roles
  let owner, treasury, operator, user1, user2, user3, validator1, validator2;

  before(async function () {
    // Get signers
    [owner, treasury, operator, user1, user2, user3, validator1, validator2, ...users] = await ethers.getSigners();
    
    // Deploy complete system using ContractFactory
    const ContractFactory = await ethers.getContractFactory("ContractFactory");
    contractFactory = await ContractFactory.deploy();
    await contractFactory.waitForDeployment();
    
    // Deploy the complete system
    await contractFactory.connect(owner).deployBasicSystem(
      await owner.getAddress(),
      await treasury.getAddress(),
      await operator.getAddress()
    );
    
    deployedContracts = await contractFactory.deployedContracts();
    
    // Get contract instances
    stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deployedContracts.stakeBasketToken);
    simpleToken = await ethers.getContractAt("SimpleToken", deployedContracts.simpleToken);
    priceFeed = await ethers.getContractAt("PriceFeed", deployedContracts.priceFeed);
    liquidStakingManager = await ethers.getContractAt("CoreLiquidStakingManager", deployedContracts.coreLiquidStakingManager);
    stCoreToken = await ethers.getContractAt("StCoreToken", deployedContracts.stCoreToken);
    unbondingQueue = await ethers.getContractAt("UnbondingQueue", deployedContracts.unbondingQueue);
    accessControlManager = await ethers.getContractAt("AccessControlManager", deployedContracts.accessControlManager);
    priceSecurityModule = await ethers.getContractAt("PriceSecurityModule", deployedContracts.priceSecurityModule);
  });

  describe("System Initialization and Setup", function () {
    it("Should have all contracts deployed correctly", async function () {
      // Verify all contracts are deployed
      expect(await stakeBasketToken.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await liquidStakingManager.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await priceFeed.getAddress()).to.not.equal(ethers.ZeroAddress);
      
      console.log("✅ All core contracts deployed");
    });

    it("Should have correct initial configurations", async function () {
      // Check price feed initial prices
      expect(await priceFeed.getPrice("CORE")).to.equal(ethers.parseEther("1"));
      expect(await priceFeed.getPrice("BTC")).to.equal(ethers.parseEther("50000"));
      
      // Check liquid staking manager configuration
      expect(await liquidStakingManager.treasury()).to.equal(await treasury.getAddress());
      expect(await liquidStakingManager.operator()).to.equal(await operator.getAddress());
      
      // Check token configuration
      expect(await simpleToken.authorizedMinter()).to.equal(await owner.getAddress());
      
      console.log("✅ Initial configurations verified");
    });

    it("Should setup validators and initial state", async function () {
      // Add validators to liquid staking manager
      await liquidStakingManager.connect(owner).addValidator(await validator1.getAddress());
      await liquidStakingManager.connect(owner).addValidator(await validator2.getAddress());
      
      expect(await liquidStakingManager.isActiveValidator(await validator1.getAddress())).to.be.true;
      expect(await liquidStakingManager.isActiveValidator(await validator2.getAddress())).to.be.true;
      
      console.log("✅ Validators setup complete");
    });
  });

  describe("Core Liquid Staking Workflow", function () {
    it("Should handle complete staking workflow", async function () {
      const stakeAmount = ethers.parseEther("10");
      
      // User stakes CORE tokens
      await expect(
        liquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: stakeAmount
        })
      ).to.emit(liquidStakingManager, "Staked")
        .withArgs(await user1.getAddress(), stakeAmount, stakeAmount);
      
      // Check stCORE balance
      expect(await stCoreToken.balanceOf(await user1.getAddress())).to.equal(stakeAmount);
      
      // Check total supply
      expect(await stCoreToken.totalSupply()).to.equal(stakeAmount);
      
      console.log(`✅ User1 staked ${ethers.formatEther(stakeAmount)} CORE`);
    });

    it("Should handle multiple users staking", async function () {
      const stakeAmount1 = ethers.parseEther("5");
      const stakeAmount2 = ethers.parseEther("15");
      
      // User2 stakes
      await liquidStakingManager.connect(user2).stake(await validator1.getAddress(), {
        value: stakeAmount1
      });
      
      // User3 stakes with different validator
      await liquidStakingManager.connect(user3).stake(await validator2.getAddress(), {
        value: stakeAmount2
      });
      
      // Verify balances
      expect(await stCoreToken.balanceOf(await user2.getAddress())).to.equal(stakeAmount1);
      expect(await stCoreToken.balanceOf(await user3.getAddress())).to.equal(stakeAmount2);
      
      // Verify validator delegations
      const validator1Delegation = await liquidStakingManager.delegatedAmountByValidator(await validator1.getAddress());
      const validator2Delegation = await liquidStakingManager.delegatedAmountByValidator(await validator2.getAddress());
      
      expect(validator1Delegation).to.be.gt(0);
      expect(validator2Delegation).to.equal(stakeAmount2);
      
      console.log("✅ Multiple users staking completed");
    });

    it("Should handle unstaking workflow", async function () {
      const unstakeAmount = ethers.parseEther("3");
      
      // Approve stCORE transfer for unstaking
      await stCoreToken.connect(user1).approve(await liquidStakingManager.getAddress(), unstakeAmount);
      
      // Request unstaking
      await expect(
        liquidStakingManager.connect(user1).requestUnstake(unstakeAmount)
      ).to.emit(liquidStakingManager, "UnstakeRequested");
      
      // Check updated balance
      const remainingBalance = await stCoreToken.balanceOf(await user1.getAddress());
      expect(remainingBalance).to.equal(ethers.parseEther("7")); // 10 - 3
      
      console.log("✅ Unstaking request completed");
    });
  });

  describe("Price Oracle Integration", function () {
    it("Should update prices and validate through security module", async function () {
      const newCorePrice = ethers.parseEther("1.2");
      
      // Add oracle sources to security module
      await priceSecurityModule.connect(owner).addOracleSource("CORE", await operator.getAddress());
      await priceSecurityModule.connect(owner).addOracleSource("CORE", await owner.getAddress());
      
      // Update TWAP data first
      await priceSecurityModule.connect(owner).updateTWAPData("CORE", ethers.parseEther("1"));
      
      // Wait for minimum interval
      await time.increase(301);
      
      // Validate price update through security module
      const sources = [await operator.getAddress(), await owner.getAddress()];
      const [isValid, twapPrice] = await priceSecurityModule.validatePriceUpdate("CORE", newCorePrice, sources);
      
      expect(isValid).to.be.true;
      expect(twapPrice).to.equal(ethers.parseEther("1"));
      
      // Update price in price feed
      await priceFeed.connect(owner).setPrice("CORE", newCorePrice);
      expect(await priceFeed.getPrice("CORE")).to.equal(newCorePrice);
      
      console.log("✅ Price oracle integration working");
    });

    it("Should handle price circuit breaker activation", async function () {
      const extremePrice = ethers.parseEther("2.5"); // 150% increase from 1.0
      
      const sources = [await operator.getAddress(), await owner.getAddress()];
      
      // This should trigger circuit breaker due to extreme deviation
      const [isValid] = await priceSecurityModule.validatePriceUpdate("CORE", extremePrice, sources);
      expect(isValid).to.be.false;
      
      console.log("✅ Circuit breaker protection working");
    });
  });

  describe("Token System Integration", function () {
    it("Should mint and manage test BTC tokens", async function () {
      const btcAmount = ethers.parseUnits("2", 8); // 2 BTC with 8 decimals
      
      // Mint BTC tokens to users
      await simpleToken.connect(owner).mint(await user1.getAddress(), btcAmount);
      await simpleToken.connect(owner).mint(await user2.getAddress(), btcAmount);
      
      expect(await simpleToken.balanceOf(await user1.getAddress())).to.equal(btcAmount);
      expect(await simpleToken.totalSupply()).to.equal(btcAmount * 2n);
      
      // Test transfers
      const transferAmount = ethers.parseUnits("0.5", 8);
      await simpleToken.connect(user1).transfer(await user3.getAddress(), transferAmount);
      
      expect(await simpleToken.balanceOf(await user3.getAddress())).to.equal(transferAmount);
      
      console.log("✅ BTC token management working");
    });

    it("Should integrate basket token with staking system", async function () {
      // Note: Since StakeBasketToken needs a StakeBasket contract to mint/burn,
      // we'll test the connection setup
      
      const mockStakeBasket = await ethers.getSigner(10); // Use as mock contract
      
      // Propose new stake basket contract
      await stakeBasketToken.connect(owner).proposeStakeBasketContract(await mockStakeBasket.getAddress());
      
      // Fast forward past timelock
      await time.increase(2 * 24 * 60 * 60 + 1); // 2 days + 1 second
      
      // Confirm the contract
      await stakeBasketToken.connect(owner).confirmStakeBasketContract();
      
      expect(await stakeBasketToken.stakeBasketContract()).to.equal(await mockStakeBasket.getAddress());
      
      console.log("✅ Basket token integration ready");
    });
  });

  describe("Access Control Integration", function () {
    it("Should manage roles across the ecosystem", async function () {
      // Grant operator role to user1
      const operatorRole = await accessControlManager.OPERATOR_ROLE();
      
      await expect(
        accessControlManager.connect(owner).grantRole(operatorRole, await user1.getAddress())
      ).to.emit(accessControlManager, "RoleGranted");
      
      expect(await accessControlManager.hasRole(operatorRole, await user1.getAddress())).to.be.true;
      
      // Test timelock proposal
      const target = await priceFeed.getAddress();
      const callData = priceFeed.interface.encodeFunctionData("setPrice", ["TEST", ethers.parseEther("99")]);
      
      const proposalId = await accessControlManager.connect(owner).createProposal.staticCall(
        target,
        callData,
        0,
        "Test price update"
      );
      
      await accessControlManager.connect(owner).createProposal(
        target,
        callData,
        0,
        "Test price update"
      );
      
      // Fast forward past timelock
      await time.increase(24 * 60 * 60 + 1); // 24 hours + 1 second
      
      // Execute proposal
      await accessControlManager.connect(owner).executeProposal(proposalId);
      
      expect(await priceFeed.getPrice("TEST")).to.equal(ethers.parseEther("99"));
      
      console.log("✅ Access control integration working");
    });
  });

  describe("Reward Distribution and Compounding", function () {
    it("Should handle reward collection and distribution", async function () {
      // Simulate rewards by sending CORE to liquid staking manager
      const rewardAmount = ethers.parseEther("1");
      
      await owner.sendTransaction({
        to: await liquidStakingManager.getAddress(),
        value: rewardAmount
      });
      
      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      
      // Trigger reward collection
      await liquidStakingManager.connect(operator).afterTurnRound();
      
      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      
      // Treasury should receive protocol fees
      expect(finalTreasuryBalance).to.be.gt(initialTreasuryBalance);
      
      console.log("✅ Reward distribution working");
    });

    it("Should handle stCORE token appreciation", async function () {
      const initialConversionRate = await stCoreToken.getConversionRate();
      
      // Simulate staking rewards by updating total staked CORE
      const currentTotalStaked = await stCoreToken.totalStakedCore();
      const rewardAmount = currentTotalStaked / 10n; // 10% rewards
      
      await stCoreToken.connect(liquidStakingManager.target).updateTotalStakedCore(currentTotalStaked + rewardAmount);
      
      const newConversionRate = await stCoreToken.getConversionRate();
      
      // Conversion rate should improve (more CORE per stCORE)
      expect(newConversionRate).to.be.gt(initialConversionRate);
      
      console.log(`✅ Token appreciation: ${ethers.formatEther(initialConversionRate)} -> ${ethers.formatEther(newConversionRate)}`);
    });
  });

  describe("Emergency Scenarios", function () {
    it("Should handle emergency pause across system", async function () {
      // Activate emergency mode in price security module
      await priceSecurityModule.connect(owner).activateEmergencyMode("Integration test emergency");
      
      expect(await priceSecurityModule.emergencyMode()).to.be.true;
      expect(await priceSecurityModule.paused()).to.be.true;
      
      // Pause liquid staking manager
      await liquidStakingManager.connect(owner).pause();
      
      expect(await liquidStakingManager.paused()).to.be.true;
      
      // Verify staking is disabled
      await expect(
        liquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWithCustomError(liquidStakingManager, "EnforcedPause");
      
      console.log("✅ Emergency pause working");
    });

    it("Should recover from emergency state", async function () {
      // Unpause liquid staking manager
      await liquidStakingManager.connect(owner).unpause();
      
      // Fast forward past emergency cooldown
      await time.increase(24 * 60 * 60 + 1); // 24 hours + 1 second
      
      // Deactivate emergency mode
      await priceSecurityModule.connect(owner).deactivateEmergencyMode();
      
      expect(await liquidStakingManager.paused()).to.be.false;
      expect(await priceSecurityModule.emergencyMode()).to.be.false;
      
      // Verify normal operations resume
      await expect(
        liquidStakingManager.connect(user1).stake(await validator1.getAddress(), {
          value: ethers.parseEther("1")
        })
      ).to.not.be.reverted;
      
      console.log("✅ Emergency recovery working");
    });
  });

  describe("Cross-Contract Data Flow", function () {
    it("Should maintain data consistency across contracts", async function () {
      // Get staking data from multiple sources
      const totalStaked = await liquidStakingManager.getTotalDelegated();
      const stCoreSupply = await stCoreToken.totalSupply();
      const totalStakedCore = await stCoreToken.totalStakedCore();
      
      // These should be consistent
      expect(totalStakedCore).to.be.gte(totalStaked);
      expect(stCoreSupply).to.be.gt(0);
      
      // Conversion rate calculation should work
      const conversionRate = await stCoreToken.getConversionRate();
      expect(conversionRate).to.be.gt(0);
      
      console.log(`✅ Data consistency: ${ethers.formatEther(totalStaked)} staked, ${ethers.formatEther(stCoreSupply)} stCORE supply`);
    });

    it("Should handle complex multi-contract transactions", async function () {
      // Complex workflow: stake -> approve -> unstake -> check unbonding queue
      const stakeAmount = ethers.parseEther("5");
      const unstakeAmount = ethers.parseEther("2");
      
      // Stake
      await liquidStakingManager.connect(user2).stake(await validator1.getAddress(), {
        value: stakeAmount
      });
      
      // Approve and unstake
      await stCoreToken.connect(user2).approve(await liquidStakingManager.getAddress(), unstakeAmount);
      await liquidStakingManager.connect(user2).requestUnstake(unstakeAmount);
      
      // Check if unbonding queue received the request
      const userRequests = await unbondingQueue.getUserPendingRequests(await user2.getAddress());
      expect(userRequests.length).to.be.gt(0);
      
      console.log("✅ Complex multi-contract transaction completed");
    });
  });

  describe("System Performance Under Load", function () {
    it("Should handle multiple concurrent operations", async function () {
      const operations = [];
      
      // Create multiple concurrent staking operations
      for (let i = 0; i < 5; i++) {
        const user = users[i];
        const amount = ethers.parseEther((i + 1).toString());
        
        operations.push(
          liquidStakingManager.connect(user).stake(await validator1.getAddress(), {
            value: amount
          })
        );
      }
      
      // Execute all operations
      await Promise.all(operations);
      
      // Verify all operations completed
      let totalNewStaked = 0n;
      for (let i = 0; i < 5; i++) {
        const user = users[i];
        const balance = await stCoreToken.balanceOf(await user.getAddress());
        totalNewStaked += balance;
      }
      
      expect(totalNewStaked).to.equal(ethers.parseEther("15")); // 1+2+3+4+5
      
      console.log(`✅ Concurrent operations completed: ${ethers.formatEther(totalNewStaked)} total staked`);
    });
  });

  describe("End-to-End User Journey", function () {
    it("Should complete full user journey", async function () {
      const newUser = users[5];
      const initialStake = ethers.parseEther("20");
      
      console.log("🚀 Starting end-to-end user journey...");
      
      // 1. User stakes CORE tokens
      await liquidStakingManager.connect(newUser).stake(await validator1.getAddress(), {
        value: initialStake
      });
      
      let stCoreBalance = await stCoreToken.balanceOf(await newUser.getAddress());
      expect(stCoreBalance).to.equal(initialStake);
      console.log(`✅ Step 1: Staked ${ethers.formatEther(initialStake)} CORE`);
      
      // 2. Simulate some time passing and rewards accruing
      await time.increase(7 * 24 * 60 * 60); // 1 week
      
      // Simulate rewards
      const totalStaked = await stCoreToken.totalStakedCore();
      const rewards = totalStaked / 20n; // 5% rewards
      await stCoreToken.connect(liquidStakingManager.target).updateTotalStakedCore(totalStaked + rewards);
      
      console.log("✅ Step 2: Time passed, rewards accrued");
      
      // 3. User transfers some stCORE to another user
      const transferAmount = stCoreBalance / 4n; // 25%
      await stCoreToken.connect(newUser).transfer(await user3.getAddress(), transferAmount);
      
      stCoreBalance = await stCoreToken.balanceOf(await newUser.getAddress());
      expect(stCoreBalance).to.equal(initialStake - transferAmount);
      console.log(`✅ Step 3: Transferred ${ethers.formatEther(transferAmount)} stCORE`);
      
      // 4. User unstakes some tokens
      const unstakeAmount = stCoreBalance / 2n; // 50% of remaining
      await stCoreToken.connect(newUser).approve(await liquidStakingManager.getAddress(), unstakeAmount);
      await liquidStakingManager.connect(newUser).requestUnstake(unstakeAmount);
      
      console.log(`✅ Step 4: Requested unstake of ${ethers.formatEther(unstakeAmount)} stCORE`);
      
      // 5. Check final state
      const finalStCoreBalance = await stCoreToken.balanceOf(await newUser.getAddress());
      const pendingUnstakes = await unbondingQueue.getUserPendingRequests(await newUser.getAddress());
      
      expect(finalStCoreBalance).to.be.lt(initialStake);
      expect(pendingUnstakes.length).to.be.gt(0);
      
      console.log(`✅ Step 5: Final balance: ${ethers.formatEther(finalStCoreBalance)} stCORE`);
      console.log(`✅ Pending unstakes: ${pendingUnstakes.length}`);
      
      console.log("🎉 End-to-end user journey completed successfully!");
    });
  });

  describe("System Health Monitoring", function () {
    it("Should provide comprehensive system status", async function () {
      // Collect system metrics
      const systemStatus = {
        totalStaked: await liquidStakingManager.getTotalDelegated(),
        stCoreSupply: await stCoreToken.totalSupply(),
        conversionRate: await stCoreToken.getConversionRate(),
        activeValidators: await liquidStakingManager.activeValidators(0), // Check if we have validators
        priceFeeds: {
          core: await priceFeed.getPrice("CORE"),
          btc: await priceFeed.getPrice("BTC")
        },
        emergencyStatus: {
          liquidStakingPaused: await liquidStakingManager.paused(),
          priceSecurityEmergency: await priceSecurityModule.emergencyMode()
        }
      };
      
      // Verify system is healthy
      expect(systemStatus.totalStaked).to.be.gt(0);
      expect(systemStatus.stCoreSupply).to.be.gt(0);
      expect(systemStatus.conversionRate).to.be.gt(0);
      expect(systemStatus.priceFeeds.core).to.be.gt(0);
      expect(systemStatus.emergencyStatus.liquidStakingPaused).to.be.false;
      expect(systemStatus.emergencyStatus.priceSecurityEmergency).to.be.false;
      
      console.log("📊 System Status:");
      console.log(`   Total Staked: ${ethers.formatEther(systemStatus.totalStaked)} CORE`);
      console.log(`   stCORE Supply: ${ethers.formatEther(systemStatus.stCoreSupply)}`);
      console.log(`   Conversion Rate: ${ethers.formatEther(systemStatus.conversionRate)}`);
      console.log(`   CORE Price: $${ethers.formatEther(systemStatus.priceFeeds.core)}`);
      console.log(`   BTC Price: $${ethers.formatEther(systemStatus.priceFeeds.btc)}`);
      console.log(`   System Healthy: ✅`);
    });
  });
});