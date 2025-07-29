const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🚀 Starting Interactive Rebalancing Test");
  console.log("Account:", deployer.address);

  // Use the deployed contracts from debug-deploy
  const mockCOREAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const mockCoreStakingAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const stakingManagerAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  console.log("\n📋 Contract Addresses:");
  console.log("MockCORE:", mockCOREAddress);
  console.log("MockCoreStaking:", mockCoreStakingAddress);
  console.log("StakingManager:", stakingManagerAddress);

  // Get contract instances
  const mockCORE = await hre.ethers.getContractAt("MockCORE", mockCOREAddress);
  const mockCoreStaking = await hre.ethers.getContractAt("MockCoreStaking", mockCoreStakingAddress);
  const stakingManager = await hre.ethers.getContractAt("StakingManager", stakingManagerAddress);

  // Step 1: Fund accounts and get initial state
  console.log("\n📊 Step 1: Initial Setup");
  
  // Mint some CORE tokens
  await mockCORE.mint(deployer.address, hre.ethers.parseEther("10000"));
  const balance = await mockCORE.balanceOf(deployer.address);
  console.log("CORE balance:", hre.ethers.formatEther(balance));

  // Get validators
  const validators = await mockCoreStaking.getAllValidatorAddresses();
  console.log("Available validators:", validators);

  // Check initial validator info
  for (let i = 0; i < validators.length; i++) {
    const info = await mockCoreStaking.getValidatorInfo(validators[i]);
    const apy = await mockCoreStaking.getValidatorEffectiveAPY(validators[i]);
    const risk = await mockCoreStaking.getValidatorRiskScore(validators[i]);
    
    console.log(`Validator ${i + 1}: ${validators[i].slice(0, 8)}...`);
    console.log(`  Commission: ${Number(info[1]) / 100}%`);
    console.log(`  Hybrid Score: ${Number(info[2]) / 10}%`);
    console.log(`  Active: ${info[3]}`);
    console.log(`  Effective APY: ${Number(apy) / 100}%`);
    console.log(`  Risk Score: ${Number(risk) / 10}`);
  }

  // Step 2: Make initial delegation
  console.log("\n📊 Step 2: Initial Delegation");
  const delegationAmount = hre.ethers.parseEther("1000");
  const validator1 = validators[0]; // Use first validator

  // Approve CORE for MockCoreStaking
  await mockCORE.approve(mockCoreStakingAddress, delegationAmount);
  console.log("✅ Approved CORE for MockCoreStaking");

  // Delegate to validator
  await mockCoreStaking.delegate(validator1, delegationAmount);
  console.log(`✅ Delegated ${hre.ethers.formatEther(delegationAmount)} CORE to validator:`, validator1.slice(0, 8) + "...");

  // Update StakingManager tracking (approve first)
  await mockCORE.approve(stakingManagerAddress, delegationAmount);
  await stakingManager.delegateCore(validator1, delegationAmount);
  
  const delegated = await stakingManager.delegatedCoreByValidator(validator1);
  console.log("StakingManager tracking:", hre.ethers.formatEther(delegated), "CORE");

  // Step 3: Check initial rebalancing status
  console.log("\n📊 Step 3: Initial Rebalancing Check");
  const [needsRebalance1, reason1] = await stakingManager.shouldRebalance();
  console.log("Needs rebalance:", needsRebalance1);
  console.log("Reason:", reason1);

  // Step 4: Simulate validator performance degradation
  console.log("\n📊 Step 4: Simulating Validator Performance Issues");
  
  // Make validator inactive
  console.log("Making validator inactive...");
  await mockCoreStaking.setValidatorStatus(validator1, false);
  
  // Check rebalancing status
  const [needsRebalance2, reason2] = await stakingManager.shouldRebalance();
  console.log("After deactivation - Needs rebalance:", needsRebalance2);
  console.log("Reason:", reason2);

  if (needsRebalance2) {
    console.log("\n📊 Step 5: Executing Rebalancing");
    
    // Get optimal distribution
    const [optimalValidators, allocations] = await stakingManager.getOptimalValidatorDistribution();
    console.log("Optimal validators:", optimalValidators.length);
    
    if (optimalValidators.length > 0) {
      const toValidator = optimalValidators[0];
      console.log(`Moving delegation from ${validator1.slice(0, 8)}... to ${toValidator.slice(0, 8)}...`);
      
      try {
        const tx = await stakingManager.rebalanceCoreStaking(
          [validator1],
          [delegationAmount],
          [toValidator],
          [delegationAmount]
        );
        
        const receipt = await tx.wait();
        console.log("✅ Rebalancing successful! TX:", receipt.hash);
        
        // Verify results
        const newDelegation1 = await stakingManager.delegatedCoreByValidator(validator1);
        const newDelegation2 = await stakingManager.delegatedCoreByValidator(toValidator);
        
        console.log("Final delegations:");
        console.log(`  ${validator1.slice(0, 8)}...:`, hre.ethers.formatEther(newDelegation1), "CORE");
        console.log(`  ${toValidator.slice(0, 8)}...:`, hre.ethers.formatEther(newDelegation2), "CORE");
        
      } catch (error) {
        console.error("❌ Rebalancing failed:", error.message);
      }
    } else {
      console.log("⚠️  No optimal validators found for rebalancing");
    }
  } else {
    console.log("⚠️  Rebalancing not needed or not detected");
    
    // Let's try a different approach - check individual validator risk
    const validator1Info = await mockCoreStaking.getValidatorInfo(validator1);
    const validator1Risk = await mockCoreStaking.getValidatorRiskScore(validator1);
    
    console.log("\nValidator details after status change:");
    console.log("  Active:", validator1Info[3]);
    console.log("  Risk Score:", Number(validator1Risk) / 10);
    
    // Try setting very high risk
    await mockCoreStaking.setValidatorHybridScore(validator1, 100); // 10% score = very high risk
    
    const [needsRebalance3, reason3] = await stakingManager.shouldRebalance();
    console.log("\nAfter setting very low hybrid score:");
    console.log("Needs rebalance:", needsRebalance3);
    console.log("Reason:", reason3);
  }

  console.log("\n🏁 Interactive Rebalancing Test Completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });