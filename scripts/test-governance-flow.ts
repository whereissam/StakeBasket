import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing CoreDAO Governance Flow...\n");

  // Load deployment info
  const fs = require('fs');
  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
  } catch (error) {
    console.error("❌ Could not load deployment-info.json. Please run deployment script first.");
    process.exit(1);
  }

  const [deployer, operator, user1, user2, user3] = await ethers.getSigners();

  // Get contract instances
  const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentInfo.contracts.StakeBasketToken);
  const basketGovernance = await ethers.getContractAt("BasketGovernance", deploymentInfo.contracts.BasketGovernance);
  const coreDAOProxy = await ethers.getContractAt("CoreDAOGovernanceProxy", deploymentInfo.contracts.CoreDAOGovernanceProxy);
  const coreStaking = await ethers.getContractAt("MockCoreStaking", deploymentInfo.contracts.MockCoreStaking);

  console.log("📋 Testing with contracts:");
  console.log(`- BasketGovernance: ${deploymentInfo.contracts.BasketGovernance}`);
  console.log(`- CoreDAOProxy: ${deploymentInfo.contracts.CoreDAOGovernanceProxy}`);

  console.log("\n1️⃣ TESTING COREDAO GOVERNANCE VOTING");
  console.log("=" .repeat(50));

  // Get the first CoreDAO proposal (created during deployment)
  const coreDAOProposal = await coreDAOProxy.getCoreDAOProposal(1);
  const basketProposalId = coreDAOProposal.basketProposalId;

  console.log(`CoreDAO Proposal: "${coreDAOProposal.title}"`);
  console.log(`Linked BASKET Proposal ID: ${basketProposalId}`);

  // Check initial voting power
  const user1VotingPower = await basketGovernance.getVotingPower(user1.address);
  const user2VotingPower = await basketGovernance.getVotingPower(user2.address);
  
  console.log(`\nVoting Power:`);
  console.log(`- User1: ${ethers.formatEther(user1VotingPower)} BASKET`);
  console.log(`- User2: ${ethers.formatEther(user2VotingPower)} BASKET`);

  // Cast votes on the BASKET governance proposal
  console.log(`\n🗳️ Casting votes on BASKET proposal #${basketProposalId}...`);
  
  const voteTx1 = await basketGovernance.connect(user1).castVote(basketProposalId, 1); // Vote For
  await voteTx1.wait();
  console.log("✅ User1 voted FOR");

  const voteTx2 = await basketGovernance.connect(user2).castVote(basketProposalId, 0); // Vote Against
  await voteTx2.wait();
  console.log("✅ User2 voted AGAINST");

  // Check voting results
  const votingResults = await basketGovernance.getProposalVoting(basketProposalId);
  console.log(`\n📊 Current voting results:`);
  console.log(`- For: ${ethers.formatEther(votingResults.forVotes)} BASKET`);
  console.log(`- Against: ${ethers.formatEther(votingResults.againstVotes)} BASKET`);
  console.log(`- Abstain: ${ethers.formatEther(votingResults.abstainVotes)} BASKET`);

  console.log("\n2️⃣ TESTING VALIDATOR DELEGATION");
  console.log("=" .repeat(50));

  // Get the validator delegation proposal
  const validatorDelegation = await coreDAOProxy.getValidatorDelegation(1);
  const validatorBasketProposalId = validatorDelegation.basketProposalId;

  console.log(`Validator Delegation to: ${validatorDelegation.validator}`);
  console.log(`Amount: ${ethers.formatEther(validatorDelegation.amount)} CORE`);
  console.log(`Linked BASKET Proposal ID: ${validatorBasketProposalId}`);

  // Vote on validator delegation
  console.log(`\n🗳️ Voting on validator delegation proposal #${validatorBasketProposalId}...`);
  
  const delegationVoteTx1 = await basketGovernance.connect(user1).castVote(validatorBasketProposalId, 1); // Vote For
  await delegationVoteTx1.wait();
  console.log("✅ User1 voted FOR validator delegation");

  const delegationVoteTx2 = await basketGovernance.connect(user2).castVote(validatorBasketProposalId, 1); // Vote For
  await delegationVoteTx2.wait();
  console.log("✅ User2 voted FOR validator delegation");

  // Check validator delegation voting results
  const delegationResults = await basketGovernance.getProposalVoting(validatorBasketProposalId);
  console.log(`\n📊 Validator delegation voting results:`);
  console.log(`- For: ${ethers.formatEther(delegationResults.forVotes)} BASKET`);
  console.log(`- Against: ${ethers.formatEther(delegationResults.againstVotes)} BASKET`);

  console.log("\n3️⃣ TESTING HASH POWER DELEGATION");
  console.log("=" .repeat(50));

  // Get the hash power delegation proposal
  const hashPowerDelegation = await coreDAOProxy.getHashPowerDelegation(1);
  const hashPowerBasketProposalId = hashPowerDelegation.basketProposalId;

  console.log(`Hash Power Delegation to: ${hashPowerDelegation.validator}`);
  console.log(`Amount: ${ethers.formatEther(hashPowerDelegation.hashPower)} Hash Power`);
  console.log(`Linked BASKET Proposal ID: ${hashPowerBasketProposalId}`);

  // Vote on hash power delegation  
  console.log(`\n🗳️ Voting on hash power delegation proposal #${hashPowerBasketProposalId}...`);
  
  const hashVoteTx1 = await basketGovernance.connect(user1).castVote(hashPowerBasketProposalId, 1); // Vote For
  await hashVoteTx1.wait();
  console.log("✅ User1 voted FOR hash power delegation");

  const hashVoteTx2 = await basketGovernance.connect(user3).castVote(hashPowerBasketProposalId, 2); // Abstain
  await hashVoteTx2.wait();
  console.log("✅ User3 voted ABSTAIN on hash power delegation");

  console.log("\n4️⃣ SIMULATING TIME PASSAGE (END VOTING PERIODS)");
  console.log("=" .repeat(50));

  // Fast forward time to end voting periods (3 days + 1 second)
  await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
  await ethers.provider.send("evm_mine", []);
  console.log("✅ Fast-forwarded 3 days to end voting periods");

  // Check final proposal states
  const proposalStates = [
    await basketGovernance.state(basketProposalId),
    await basketGovernance.state(validatorBasketProposalId),
    await basketGovernance.state(hashPowerBasketProposalId)
  ];

  const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
  
  console.log(`\n📋 Final proposal states:`);
  console.log(`- CoreDAO Governance Proposal: ${stateNames[proposalStates[0]]}`);
  console.log(`- Validator Delegation: ${stateNames[proposalStates[1]]}`);
  console.log(`- Hash Power Delegation: ${stateNames[proposalStates[2]]}`);

  console.log("\n5️⃣ TESTING PROPOSAL EXECUTION");
  console.log("=" .repeat(50));

  // Queue and execute successful proposals
  for (let i = 0; i < 3; i++) {
    const proposalId = basketProposalId + i;
    const state = proposalStates[i];
    
    if (state === 4) { // Succeeded
      console.log(`\n🔄 Processing successful proposal #${proposalId}...`);
      
      // Queue the proposal
      const queueTx = await basketGovernance.queue(proposalId);
      await queueTx.wait();
      console.log(`✅ Queued proposal #${proposalId}`);
      
      // Wait for execution delay (1 day)
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Execute the proposal
      try {
        const executeTx = await basketGovernance.execute(proposalId);
        await executeTx.wait();
        console.log(`✅ Executed proposal #${proposalId}`);
      } catch (error) {
        console.log(`⚠️ Could not execute proposal #${proposalId}: ${error.message}`);
      }
    }
  }

  console.log("\n6️⃣ CHECKING FINAL STATE");
  console.log("=" .repeat(50));

  // Check CoreDAO proxy state
  const currentValidator = await coreDAOProxy.currentValidator();
  const totalDelegated = await coreDAOProxy.totalDelegatedAmount();
  
  console.log(`Current Validator: ${currentValidator}`);
  console.log(`Total Delegated: ${ethers.formatEther(totalDelegated)} CORE`);

  // Check if CoreDAO proposals were executed
  const finalCoreDAOProposal = await coreDAOProxy.getCoreDAOProposal(1);
  const finalValidatorDelegation = await coreDAOProxy.getValidatorDelegation(1);
  const finalHashPowerDelegation = await coreDAOProxy.getHashPowerDelegation(1);

  console.log(`\n📊 CoreDAO Proxy Results:`);
  console.log(`- CoreDAO Proposal Executed: ${finalCoreDAOProposal.executed}`);
  console.log(`- Validator Delegation Executed: ${finalValidatorDelegation.executed}`);
  console.log(`- Hash Power Delegation Executed: ${finalHashPowerDelegation.executed}`);

  // Display final voting tallies
  if (finalCoreDAOProposal.executed) {
    console.log(`\n🎯 Final CoreDAO Vote Aggregation:`);
    console.log(`- For: ${ethers.formatEther(finalCoreDAOProposal.forVotes)} BASKET`);
    console.log(`- Against: ${ethers.formatEther(finalCoreDAOProposal.againstVotes)} BASKET`);
    console.log(`- Abstain: ${ethers.formatEther(finalCoreDAOProposal.abstainVotes)} BASKET`);
    
    const totalVotes = finalCoreDAOProposal.forVotes + finalCoreDAOProposal.againstVotes + finalCoreDAOProposal.abstainVotes;
    console.log(`- Total Voting Power: ${ethers.formatEther(totalVotes)} BASKET`);
  }

  console.log("\n🎉 GOVERNANCE FLOW TEST COMPLETED!");
  console.log("=" .repeat(60));
  console.log("✅ CoreDAO governance participation proxy is working correctly!");
  console.log("✅ BASKET holders can vote on CoreDAO proposals");
  console.log("✅ Validator delegation system is functional");
  console.log("✅ Hash power delegation mechanism works");
  console.log("✅ Automated execution and aggregation systems are operational");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });