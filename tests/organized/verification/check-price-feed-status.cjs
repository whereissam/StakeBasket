require('dotenv').config({ path: '.env' });
const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Checking price feed status with account:", signer.address);

  // Contract addresses
  const priceFeedAddress = "0xF2647beCCC5C7D179110A376E66ed9834304c67C";
  
  // Price feed ABI
  const priceFeedABI = [
    "function getCorePrice() view returns (uint256)",
    "function getSolvBTCPrice() view returns (uint256)",
    "function getLastUpdate() view returns (uint256)",
    "function owner() view returns (address)"
  ];

  const priceFeed = new hre.ethers.Contract(priceFeedAddress, priceFeedABI, signer);

  try {
    console.log("\n📊 Price Feed Status:");
    
    // Get prices
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    const lastUpdate = await priceFeed.getLastUpdate();
    const owner = await priceFeed.owner();
    
    console.log("CORE Price:", hre.ethers.formatEther(corePrice), "USD");
    console.log("BTC Price:", hre.ethers.formatEther(btcPrice), "USD");
    console.log("Last Update:", new Date(Number(lastUpdate) * 1000).toISOString());
    console.log("Owner:", owner);
    
    // Test USD value calculation
    const testCoreAmount = hre.ethers.parseEther("10"); // 10 CORE
    const testBtcAmount = hre.ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    console.log("\n🧮 Test USD Value Calculation:");
    console.log("CORE Amount:", hre.ethers.formatEther(testCoreAmount));
    console.log("BTC Amount:", hre.ethers.formatUnits(testBtcAmount, 8));
    
    const coreValue = (testCoreAmount * corePrice) / hre.ethers.parseEther("1");
    const btcValue = (testBtcAmount * btcPrice) / hre.ethers.parseUnits("1", 8);
    const totalValue = coreValue + btcValue;
    
    console.log("CORE Value USD:", hre.ethers.formatEther(coreValue));
    console.log("BTC Value USD:", hre.ethers.formatEther(btcValue));
    console.log("Total Value USD:", hre.ethers.formatEther(totalValue));
    console.log("Meets $50 minimum:", Number(hre.ethers.formatEther(totalValue)) >= 50);
    
  } catch (error) {
    console.error("❌ Error checking price feed:", error);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main().catch(console.error);