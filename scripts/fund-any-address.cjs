const { ethers } = require("hardhat");

async function main() {
  console.log("💡 To fund any address, run:");
  console.log("TARGET_ADDRESS=0xYourWalletAddress npx hardhat run scripts/fund-wallet.cjs --network localhost");
  console.log("");
  console.log("📋 Example:");
  console.log("TARGET_ADDRESS=0x742d35Cc6634C0532925a3b8D1959da2A3bb4fb8 npx hardhat run scripts/fund-wallet.cjs --network localhost");
  console.log("");
  console.log("🔍 Check what address your frontend is using in the wallet connection area");
}

main();