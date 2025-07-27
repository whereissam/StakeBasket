const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🚀 Deploying CoreOracle to Core Testnet2");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("Deploying with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "CORE");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.warn("⚠️  Low balance. You may need testnet CORE tokens from the faucet");
    console.log("Core Testnet2 Faucet: https://scan.test2.btcs.network/faucet");
  }

  console.log("\n📋 Deployment Plan:");
  console.log("1. Deploy CoreOracle contract");
  console.log("2. Configure price feeds");
  console.log("3. Set initial prices from Core API");

  // Deploy CoreOracle
  console.log("\n🔮 Step 1: Deploying CoreOracle...");
  
  const CoreOracle = await hre.ethers.getContractFactory("CoreOracle");
  const coreOracle = await CoreOracle.deploy(deployer.address);
  await coreOracle.waitForDeployment();
  const coreOracleAddress = await coreOracle.getAddress();
  console.log("CoreOracle deployed to:", coreOracleAddress);

  // Configure price feeds (already done in constructor)
  console.log("\n⚙️  Step 2: Price feeds configured in constructor");

  // Set initial prices
  console.log("\n💰 Step 3: Setting initial prices...");
  
  // Set realistic initial prices (8 decimal places)
  await coreOracle.updatePrice("CORE", hre.ethers.parseUnits("1.2", 8)); // $1.20
  await coreOracle.updatePrice("BTC", hre.ethers.parseUnits("65000", 8)); // $65,000
  await coreOracle.updatePrice("lstBTC", hre.ethers.parseUnits("65000", 8)); // $65,000
  await coreOracle.updatePrice("coreBTC", hre.ethers.parseUnits("65000", 8)); // $65,000

  console.log("✅ Initial prices set successfully");

  // Verification
  console.log("\n✅ Step 4: Verifying deployment...");
  
  const corePrice = await coreOracle.getPrice("CORE");
  const btcPrice = await coreOracle.getPrice("BTC");
  console.log("CORE price:", hre.ethers.formatUnits(corePrice, 8), "USD");
  console.log("BTC price:", hre.ethers.formatUnits(btcPrice, 8), "USD");

  // Check supported assets
  const supportedAssets = await coreOracle.getSupportedAssets();
  console.log("Supported assets:", supportedAssets);

  console.log("\n🎉 === ORACLE DEPLOYMENT COMPLETE ===");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("Deployer:", deployer.address);
  console.log("CoreOracle:", coreOracleAddress);
  
  console.log("\n📝 Next Steps:");
  console.log("1. Start the Oracle Updater service in your backend");
  console.log("2. Test real-time price updates from Core API");
  console.log("3. Integrate with your ETF contracts");
  console.log("4. Monitor price feed freshness");
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    contracts: {
      CoreOracle: coreOracleAddress,
    },
    timestamp: new Date().toISOString(),
    apiEndpoints: {
      startUpdater: `POST /api/oracle/start-updater`,
      getPrice: `GET /api/oracle/price`,
      getValidators: `GET /api/oracle/validators`,
      getNetworkStats: `GET /api/oracle/network-stats`
    }
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './docs/oracle-deployment.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n💾 Oracle deployment info saved to docs/oracle-deployment.json");
  console.log("\n🌐 Core API Integration Ready!");
  console.log("Use the Oracle Updater service to start real-time price feeds.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Oracle deployment failed:", error);
    process.exit(1);
  });