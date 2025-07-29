const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Enhanced BASKET Token Governance System...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  try {
    // Get existing contract addresses
    const contractsPath = path.join(__dirname, "../docs/testnet-deployment.json");
    let existingContracts = {};
    
    if (fs.existsSync(contractsPath)) {
      existingContracts = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
      console.log("📋 Found existing contracts:", existingContracts);
    }

    const contracts = { ...existingContracts };

    // Deploy BasketStaking contract
    console.log("📦 Deploying BasketStaking contract...");
    const BasketStaking = await ethers.getContractFactory("BasketStaking");
    const basketStaking = await BasketStaking.deploy(
      contracts.StakeBasketToken || "0x0000000000000000000000000000000000000000", // BASKET token address
      deployer.address // Initial owner
    );
    await basketStaking.deployed();
    contracts.BasketStaking = basketStaking.address;
    console.log("✅ BasketStaking deployed to:", basketStaking.address);

    // Deploy BasketGovernance contract
    console.log("📦 Deploying BasketGovernance contract...");
    const BasketGovernance = await ethers.getContractFactory("BasketGovernance");
    const basketGovernance = await BasketGovernance.deploy(
      contracts.StakeBasketToken || "0x0000000000000000000000000000000000000000", // BASKET token address
      basketStaking.address, // BasketStaking contract address
      deployer.address // Initial owner
    );
    await basketGovernance.deployed();
    contracts.BasketGovernance = basketGovernance.address;
    console.log("✅ BasketGovernance deployed to:", basketGovernance.address);

    // Configure contracts if StakeBasket exists
    if (contracts.StakeBasket) {
      console.log("\n🔧 Configuring existing contracts...");
      
      const stakeBasket = await ethers.getContractAt("StakeBasket", contracts.StakeBasket);
      
      // Set BasketStaking contract in StakeBasket
      console.log("Setting BasketStaking contract in StakeBasket...");
      await stakeBasket.setBasketStaking(basketStaking.address);
      console.log("✅ BasketStaking contract set in StakeBasket");

      // Set protocol treasury (can be governance contract for community control)
      console.log("Setting protocol treasury to governance contract...");
      await stakeBasket.setProtocolTreasury(basketGovernance.address);
      console.log("✅ Protocol treasury set to governance contract");
    }

    // Set BasketStaking contract in Governance
    console.log("Setting BasketStaking contract in Governance...");
    await basketGovernance.setBasketStaking(basketStaking.address);
    console.log("✅ BasketStaking contract set in Governance");

    // Save deployment information
    const deploymentInfo = {
      ...contracts,
      network: "testnet",
      deployer: deployer.address,
      deploymentDate: new Date().toISOString(),
      governanceFeatures: {
        proposalThreshold: "1000000000000000000000", // 1000 BASKET tokens
        votingPeriod: "259200", // 3 days in seconds
        executionDelay: "86400", // 1 day in seconds
        quorumPercentage: "10", // 10%
        majorityPercentage: "51" // 51%
      },
      stakingTiers: {
        bronze: {
          threshold: "100000000000000000000", // 100 BASKET
          multiplier: "10000", // 1x
          feeReduction: "500" // 5%
        },
        silver: {
          threshold: "1000000000000000000000", // 1,000 BASKET
          multiplier: "11000", // 1.1x
          feeReduction: "1000" // 10%
        },
        gold: {
          threshold: "10000000000000000000000", // 10,000 BASKET
          multiplier: "12500", // 1.25x
          feeReduction: "2500" // 25%
        },
        platinum: {
          threshold: "100000000000000000000000", // 100,000 BASKET
          multiplier: "15000", // 1.5x
          feeReduction: "5000" // 50%
        }
      }
    };

    fs.writeFileSync(contractsPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎉 Enhanced Governance System Deployment Complete!");
    console.log("\n📊 Contract Summary:");
    console.log("BasketStaking:", basketStaking.address);
    console.log("BasketGovernance:", basketGovernance.address);
    console.log("\n💡 Next Steps:");
    console.log("1. Update frontend configuration with new contract addresses");
    console.log("2. Verify contracts on block explorer");
    console.log("3. Test governance proposal creation and voting");
    console.log("4. Test staking functionality and tier benefits");
    console.log("5. Configure protocol fee distribution");

    // Generate frontend config update
    const frontendConfig = {
      contracts: {
        BasketStaking: basketStaking.address,
        BasketGovernance: basketGovernance.address
      },
      abi: {
        // Note: In production, you'd want to include the actual ABIs here
        BasketStaking: "// ABI for BasketStaking contract",
        BasketGovernance: "// ABI for BasketGovernance contract"
      }
    };

    fs.writeFileSync(
      path.join(__dirname, "../src/config/governance-contracts.json"),
      JSON.stringify(frontendConfig, null, 2)
    );

    console.log("\n✅ Frontend configuration updated!");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });