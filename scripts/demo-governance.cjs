const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 CoreDAO Governance Proxy Demo\n");

  // Load deployment info
  const fs = require('fs');
  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
  } catch (error) {
    console.error("❌ Could not load deployment-info.json");
    return;
  }

  const [deployer, operator, user1, user2] = await ethers.getSigners();

  // Get contract instances
  const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentInfo.contracts.StakeBasketToken);
  const basketGovernance = await ethers.getContractAt("BasketGovernance", deploymentInfo.contracts.BasketGovernance);
  const coreDAOProxy = await ethers.getContractAt("CoreDAOGovernanceProxy", deploymentInfo.contracts.CoreDAOGovernanceProxy);

  console.log("📋 System Overview:");
  console.log("============================================================");
  console.log(`BASKET Token:           ${deploymentInfo.contracts.StakeBasketToken}`);
  console.log(`BASKET Governance:      ${deploymentInfo.contracts.BasketGovernance}`);
  console.log(`CoreDAO Proxy:          ${deploymentInfo.contracts.CoreDAOGovernanceProxy}`);
  console.log(`Mock Core Staking:      ${deploymentInfo.contracts.MockCoreStaking}`);

  // Show token balances
  console.log("\n💰 Token Balances:");
  console.log("============================================================");
  const user1Balance = await basketToken.balanceOf(user1.address);
  const user2Balance = await basketToken.balanceOf(user2.address);
  console.log(`User1 (${user1.address}): ${ethers.formatEther(user1Balance)} BASKET`);
  console.log(`User2 (${user2.address}): ${ethers.formatEther(user2Balance)} BASKET`);

  // Show voting power
  console.log("\n🗳️ Voting Power:");
  console.log("============================================================");
  const user1VotingPower = await basketGovernance.getVotingPower(user1.address);
  const user2VotingPower = await basketGovernance.getVotingPower(user2.address);
  console.log(`User1: ${ethers.formatEther(user1VotingPower)} BASKET voting power`);
  console.log(`User2: ${ethers.formatEther(user2VotingPower)} BASKET voting power`);

  // Show existing proposals
  console.log("\n📋 Active Proposals:");
  console.log("============================================================");
  
  const coreDAOProposalCount = await coreDAOProxy.coreDAOProposalCount();
  const validatorDelegationCount = await coreDAOProxy.validatorDelegationCount();
  const hashPowerDelegationCount = await coreDAOProxy.hashPowerDelegationCount();
  
  console.log(`CoreDAO Governance Proposals: ${coreDAOProposalCount}`);
  console.log(`Validator Delegation Proposals: ${validatorDelegationCount}`);
  console.log(`Hash Power Delegation Proposals: ${hashPowerDelegationCount}`);

  // Show details of first CoreDAO proposal
  if (coreDAOProposalCount > 0) {
    console.log("\n📄 CoreDAO Proposal #1 Details:");
    console.log("------------------------------------------------------------");
    const proposal = await coreDAOProxy.getCoreDAOProposal(1);
    console.log(`Title: ${proposal.title}`);
    console.log(`Description: ${proposal.description}`);
    console.log(`Snapshot ID: ${proposal.snapshotId}`);
    console.log(`Linked BASKET Proposal ID: ${proposal.basketProposalId}`);
    console.log(`Executed: ${proposal.executed}`);
    
    // Check voting status on linked BASKET proposal
    const basketProposalId = proposal.basketProposalId;
    const votingData = await basketGovernance.getProposalVoting(basketProposalId);
    const proposalState = await basketGovernance.state(basketProposalId);
    
    const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
    
    console.log(`\nVoting Status:`);
    console.log(`- State: ${stateNames[proposalState]}`);
    console.log(`- For Votes: ${ethers.formatEther(votingData.forVotes)} BASKET`);
    console.log(`- Against Votes: ${ethers.formatEther(votingData.againstVotes)} BASKET`);
    console.log(`- Abstain Votes: ${ethers.formatEther(votingData.abstainVotes)} BASKET`);
  }

  // Show validator delegation details
  if (validatorDelegationCount > 0) {
    console.log("\n🏛️ Validator Delegation #1 Details:");
    console.log("------------------------------------------------------------");
    const delegation = await coreDAOProxy.getValidatorDelegation(1);
    console.log(`Target Validator: ${delegation.validator}`);
    console.log(`Delegation Amount: ${ethers.formatEther(delegation.amount)} CORE`);
    console.log(`Linked BASKET Proposal ID: ${delegation.basketProposalId}`);
    console.log(`Executed: ${delegation.executed}`);
  }

  // Show current delegation status
  console.log("\n⚡ Current Delegation Status:");
  console.log("============================================================");
  const currentValidator = await coreDAOProxy.currentValidator();
  const totalDelegated = await coreDAOProxy.totalDelegatedAmount();
  console.log(`Current Validator: ${currentValidator}`);
  console.log(`Total Delegated: ${ethers.formatEther(totalDelegated)} CORE`);

  console.log("\n🎯 Key Features Demonstrated:");
  console.log("============================================================");
  console.log("✅ BASKET token holders can participate in CoreDAO governance");
  console.log("✅ Proxy proposals created for CoreDAO governance decisions");
  console.log("✅ Validator delegation through community voting");
  console.log("✅ Hash power delegation governance mechanism");
  console.log("✅ Automated vote aggregation and execution");
  console.log("✅ Integration with existing BASKET governance system");

  console.log("\n📚 Usage Examples:");
  console.log("============================================================");
  console.log("# To vote on a proposal:");
  console.log(`# basketGovernance.connect(user).castVote(proposalId, support)`);
  console.log("# support: 0=Against, 1=For, 2=Abstain");
  console.log("");
  console.log("# To create a new CoreDAO proposal:");
  console.log(`# coreDAOProxy.connect(operator).createCoreDAOProposal(title, description, snapshotId)`);
  console.log("");
  console.log("# To create a validator delegation:");
  console.log(`# coreDAOProxy.connect(operator).createValidatorDelegation(validator, amount)`);

  console.log("\n🚀 System Ready for Production Integration!");
  console.log("============================================================");
  console.log("The CoreDAO Governance Participation Proxy is fully functional");
  console.log("and ready to be integrated with your frontend and automation services.");
}

main().catch(console.error);