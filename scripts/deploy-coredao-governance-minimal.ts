import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying CoreDAO Governance Proxy System (Minimal) to Hardhat Local Testnet...\n");

  const [deployer, operator, user1, user2, user3] = await ethers.getSigners();
  
  console.log("📋 Deployment Configuration:");
  console.log("- Deployer:", deployer.address);
  console.log("- Operator:", operator.address);
  console.log("- Test Users:", [user1.address, user2.address, user3.address]);
  console.log("- Network:", "Hardhat Local Testnet (Chain ID: 31337)\n");

  // 1. Deploy StakeBasketToken
  console.log("1️⃣ Deploying StakeBasketToken...");
  const StakeBasketTokenFactory = await ethers.getContractFactory("StakeBasketToken");
  const basketToken = await StakeBasketTokenFactory.deploy(deployer.address);
  await basketToken.waitForDeployment();
  console.log("✅ StakeBasketToken deployed to:", await basketToken.getAddress());

  // 2. Deploy BasketGovernance (without staking contract)
  console.log("\n2️⃣ Deploying BasketGovernance...");
  const BasketGovernanceFactory = await ethers.getContractFactory("BasketGovernance");
  const basketGovernance = await BasketGovernanceFactory.deploy(
    await basketToken.getAddress(),
    ethers.ZeroAddress, // No staking contract
    deployer.address
  );
  await basketGovernance.waitForDeployment();
  console.log("✅ BasketGovernance deployed to:", await basketGovernance.getAddress());

  // 3. Deploy MockCoreStaking
  console.log("\n3️⃣ Deploying MockCoreStaking...");
  const MockCoreStakingFactory = await ethers.getContractFactory("MockCoreStaking");
  const coreStaking = await MockCoreStakingFactory.deploy(
    await basketToken.getAddress(), // Using BASKET as mock CORE token
    deployer.address
  );
  await coreStaking.waitForDeployment();
  console.log("✅ MockCoreStaking deployed to:", await coreStaking.getAddress());

  // 4. Deploy CoreDAOGovernanceProxy
  console.log("\n4️⃣ Deploying CoreDAOGovernanceProxy...");
  const CoreDAOGovernanceProxyFactory = await ethers.getContractFactory("CoreDAOGovernanceProxy");
  const coreDAOProxy = await CoreDAOGovernanceProxyFactory.deploy(
    await basketGovernance.getAddress(),
    await coreStaking.getAddress(),
    deployer.address
  );
  await coreDAOProxy.waitForDeployment();
  console.log("✅ CoreDAOGovernanceProxy deployed to:", await coreDAOProxy.getAddress());

  // 5. Setup initial configuration
  console.log("\n⚙️ Setting up initial configuration...");
  
  // Authorize operator for CoreDAO proxy
  await coreDAOProxy.setOperatorAuthorization(operator.address, true);
  console.log("✅ Authorized operator:", operator.address);

  // Mint initial BASKET tokens for testing
  const initialAmount = ethers.parseEther("10000");
  await basketToken.mint(user1.address, initialAmount);
  await basketToken.mint(user2.address, initialAmount);
  await basketToken.mint(user3.address, initialAmount);
  await basketToken.mint(deployer.address, initialAmount);
  await basketToken.mint(operator.address, initialAmount);
  
  // Mint tokens for the proxy contract (for delegation testing)
  await basketToken.mint(await coreDAOProxy.getAddress(), ethers.parseEther("1000000"));
  
  console.log("✅ Minted 10,000 BASKET tokens to each test account");
  console.log("✅ Minted 1,000,000 BASKET tokens to CoreDAO proxy for delegations");

  // Approve proxy to spend tokens for delegations
  const proxyContract = coreDAOProxy;
  await basketToken.connect(deployer).approve(await proxyContract.getAddress(), ethers.parseEther("1000000"));
  console.log("✅ Approved proxy to spend BASKET tokens");

  // 6. Create test proposals
  console.log("\n📝 Creating test proposals...");

  // Create a CoreDAO governance vote proposal
  const tx1 = await coreDAOProxy.connect(operator).createCoreDAOProposal(
    "CoreDAO Protocol Upgrade v2.1",
    "Proposal to upgrade CoreDAO protocol to version 2.1 with enhanced validator selection mechanisms and improved reward distribution.",
    "test-snapshot-123"
  );
  await tx1.wait();
  console.log("✅ Created CoreDAO governance proposal #1");

  // Create a validator delegation proposal
  const validatorAddress = "0x1111111111111111111111111111111111111111";
  const delegationAmount = ethers.parseEther("100000");
  const tx2 = await coreDAOProxy.connect(operator).createValidatorDelegation(
    validatorAddress,
    delegationAmount
  );
  await tx2.wait();
  console.log("✅ Created validator delegation proposal #1");

  // Create a hash power delegation proposal
  const hashPowerAmount = ethers.parseEther("50000");
  const tx3 = await coreDAOProxy.connect(operator).createHashPowerDelegation(
    validatorAddress,
    hashPowerAmount
  );
  await tx3.wait();
  console.log("✅ Created hash power delegation proposal #1");

  // 7. Display deployment summary
  console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=" .repeat(60));
  console.log("📋 CONTRACT ADDRESSES:");
  console.log("=" .repeat(60));
  console.log(`StakeBasketToken:       ${await basketToken.getAddress()}`);
  console.log(`BasketGovernance:       ${await basketGovernance.getAddress()}`);
  console.log(`MockCoreStaking:        ${await coreStaking.getAddress()}`);
  console.log(`CoreDAOGovernanceProxy: ${await coreDAOProxy.getAddress()}`);
  
  console.log("\n🔑 ACCOUNT DETAILS:");
  console.log("=" .repeat(60));
  console.log(`Deployer:  ${deployer.address} (Owner)`);
  console.log(`Operator:  ${operator.address} (Authorized for CoreDAO operations)`);
  console.log(`User1:     ${user1.address} (10,000 BASKET)`);
  console.log(`User2:     ${user2.address} (10,000 BASKET)`);
  console.log(`User3:     ${user3.address} (10,000 BASKET)`);

  console.log("\n📊 INITIAL STATE:");
  console.log("=" .repeat(60));
  console.log("- Total BASKET Supply:", ethers.formatEther(await basketToken.totalSupply()));
  console.log("- Active CoreDAO Proposals:", await coreDAOProxy.coreDAOProposalCount());
  console.log("- Active Validator Delegations:", await coreDAOProxy.validatorDelegationCount());
  console.log("- Active Hash Power Delegations:", await coreDAOProxy.hashPowerDelegationCount());
  console.log("- BASKET Governance Proposals:", await basketGovernance.proposalCount());

  // Save deployment addresses to a file for easy reference
  const deploymentInfo = {
    network: "hardhat-local",
    chainId: 31337,
    timestamp: new Date().toISOString(),
    contracts: {
      StakeBasketToken: await basketToken.getAddress(),
      BasketGovernance: await basketGovernance.getAddress(),
      MockCoreStaking: await coreStaking.getAddress(),
      CoreDAOGovernanceProxy: await coreDAOProxy.getAddress(),
    },
    accounts: {
      deployer: deployer.address,
      operator: operator.address,
      users: [user1.address, user2.address, user3.address],
    },
    initialProposals: {
      coreDAOProposals: 1,
      validatorDelegations: 1,
      hashPowerDelegations: 1,
      basketGovernanceProposals: Number(await basketGovernance.proposalCount()),
    }
  };

  console.log("\n💾 Saving deployment info to deployment-info.json...");
  const fs = require('fs');
  fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved!");

  console.log("\n🧪 QUICK TEST COMMANDS:");
  console.log("=" .repeat(60));
  console.log("# Run CoreDAO governance tests:");
  console.log("npx hardhat test test/CoreDAOGovernanceProxy.test.ts");
  console.log("npx hardhat test test/BasketGovernance.CoreDAO.test.ts");
  
  console.log("\n# Run the governance flow test:");
  console.log("npx hardhat run scripts/test-governance-flow.ts --network localhost");

  console.log("\n🎯 SYSTEM IS READY FOR TESTING!");
  console.log("All CoreDAO governance features are deployed and configured.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });