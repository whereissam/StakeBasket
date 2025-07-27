const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔧 Updating Frontend Configuration with Testnet Addresses");
  
  // Load deployment info
  const deploymentFile = './docs/testnet-deployment.json';
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run testnet deployment first.");
    console.log("Run: npx hardhat run scripts/deploy-testnet.cjs --network coreTestnet");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  if (deployment.network !== 'coreTestnet') {
    console.error("❌ Deployment file is not for Core Testnet");
    process.exit(1);
  }
  
  console.log("📋 Loading contract addresses from:", deployment.timestamp);
  
  const contracts = deployment.contracts;
  
  // Read current contracts config
  const contractsConfigPath = './src/config/contracts.ts';
  let contractsConfig = fs.readFileSync(contractsConfigPath, 'utf8');
  
  console.log("🔄 Updating testnet contract addresses...");
  
  // Update coreTestnet section
  const testnetSection = `  coreTestnet: {
    // Deployed ${deployment.timestamp}
    PriceFeed: '${contracts.PriceFeed}',
    StakingManager: '${contracts.StakingManager}',
    StakeBasketToken: '${contracts.StakeBasketToken}',
    StakeBasket: '${contracts.StakeBasket}',
    MockCORE: '${contracts.MockCORE}',
    MockCoreBTC: '${contracts.MockCoreBTC}',
    MockCoreStaking: '${contracts.MockCoreStaking}',
    MockLstBTC: '${contracts.MockLstBTC}',
  },`;
  
  // Replace the coreTestnet section
  const regex = /coreTestnet:\s*{[^}]*},/s;
  contractsConfig = contractsConfig.replace(regex, testnetSection);
  
  // Write updated config
  fs.writeFileSync(contractsConfigPath, contractsConfig);
  
  console.log("✅ Frontend configuration updated!");
  
  console.log("\n📋 Updated Contract Addresses:");
  console.log("- PriceFeed:", contracts.PriceFeed);
  console.log("- StakingManager:", contracts.StakingManager);
  console.log("- StakeBasketToken:", contracts.StakeBasketToken);
  console.log("- StakeBasket:", contracts.StakeBasket);
  console.log("- MockCORE:", contracts.MockCORE);
  console.log("- MockCoreBTC:", contracts.MockCoreBTC);
  console.log("- MockCoreStaking:", contracts.MockCoreStaking);
  console.log("- MockLstBTC:", contracts.MockLstBTC);
  
  console.log("\n🎯 Next Steps:");
  console.log("1. Start the frontend: npm run dev");
  console.log("2. Connect wallet to Core Testnet (Chain ID: 1115)");
  console.log("3. Test ETF functionality");
  console.log("4. Verify transactions on Core Testnet explorer");
  
  console.log("\n🔗 Useful Links:");
  console.log("- Core Testnet Explorer:", "https://scan.test.btcs.network/");
  console.log("- Core Testnet Faucet:", "https://scan.test.btcs.network/faucet");
  console.log("- StakeBasket dApp:", "http://localhost:5173 (after npm run dev)");
  
  console.log("\n✅ Frontend ready for testnet testing!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });