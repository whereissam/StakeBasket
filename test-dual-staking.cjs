const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Testing Dual Staking with account:", deployer.address);
  
  // Contract addresses from deployment
  const dualStakingBasketAddress = "0x6A59CC73e334b018C9922793d96Df84B538E6fD5";
  const mockCOREAddress = "0x8e264821AFa98DD104eEcfcfa7FD9f8D8B320adA";
  const mockBTCAddress = "0x0aec7c174554AF8aEc3680BB58431F6618311510";
  const stakeBasketTokenAddress = "0x114e375B6FCC6d6fCb68c7A1d407E652C54F25FB";
  
  // Get contract instances
  const DualStakingBasket = await hre.ethers.getContractFactory("DualStakingBasket");
  const dualStakingBasket = DualStakingBasket.attach(dualStakingBasketAddress);
  
  const MockCORE = await hre.ethers.getContractFactory("MockCORE");
  const mockCORE = MockCORE.attach(mockCOREAddress);
  
  const MockCoreBTC = await hre.ethers.getContractFactory("MockCoreBTC");
  const mockBTC = MockCoreBTC.attach(mockBTCAddress);
  
  const StakeBasketToken = await hre.ethers.getContractFactory("StakeBasketToken");
  const basketToken = StakeBasketToken.attach(stakeBasketTokenAddress);
  
  console.log("\n=== Pre-deposit State ===");
  
  // Check initial balances
  const initialEthBalance = await hre.ethers.provider.getBalance(deployer.address);
  const initialCoreBalance = await mockCORE.balanceOf(deployer.address);
  const initialBtcBalance = await mockBTC.balanceOf(deployer.address);
  const initialBasketBalance = await basketToken.balanceOf(deployer.address);
  
  console.log("Initial ETH balance:", hre.ethers.formatEther(initialEthBalance));
  console.log("Initial CORE balance:", hre.ethers.formatEther(initialCoreBalance));
  console.log("Initial BTC balance:", hre.ethers.formatEther(initialBtcBalance));
  console.log("Initial BASKET balance:", hre.ethers.formatEther(initialBasketBalance));
  
  console.log("\n=== Testing Dual Staking Deposit ===");
  
  const coreAmount = hre.ethers.parseEther("1000"); // 1000 CORE
  const btcAmount = hre.ethers.parseEther("0.1");   // 0.1 BTC
  
  try {
    // Approve tokens first
    console.log("Approving CORE tokens...");
    await mockCORE.approve(dualStakingBasketAddress, coreAmount);
    
    console.log("Approving BTC tokens...");
    await mockBTC.approve(dualStakingBasketAddress, btcAmount);
    
    console.log("Depositing:", hre.ethers.formatEther(coreAmount), "CORE and", hre.ethers.formatEther(btcAmount), "BTC");
    
    // Call deposit function
    const tx = await dualStakingBasket.deposit(coreAmount, btcAmount, {
      gasLimit: 1000000
    });
    
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    console.log("\n=== Post-deposit State ===");
    
    // Check balances after deposit
    const finalEthBalance = await hre.ethers.provider.getBalance(deployer.address);
    const finalCoreBalance = await mockCORE.balanceOf(deployer.address);
    const finalBtcBalance = await mockBTC.balanceOf(deployer.address);
    const finalBasketBalance = await basketToken.balanceOf(deployer.address);
    
    console.log("Final ETH balance:", hre.ethers.formatEther(finalEthBalance));
    console.log("Final CORE balance:", hre.ethers.formatEther(finalCoreBalance));
    console.log("Final BTC balance:", hre.ethers.formatEther(finalBtcBalance));
    console.log("Final BASKET balance:", hre.ethers.formatEther(finalBasketBalance));
    
    console.log("\n=== Success! ===");
    console.log("Dual staking deposit completed successfully");
    
    // Test native CORE deposit
    console.log("\n=== Testing Native CORE Deposit ===");
    const nativeAmount = hre.ethers.parseEther("1.0"); // 1 ETH
    const btcAmount2 = hre.ethers.parseEther("0.01");  // 0.01 BTC
    
    await mockBTC.approve(dualStakingBasketAddress, btcAmount2);
    
    const tx2 = await dualStakingBasket.depositNativeCORE(btcAmount2, {
      value: nativeAmount,
      gasLimit: 1000000
    });
    
    await tx2.wait();
    console.log("Native CORE deposit successful!");
    
    const finalBasketBalance2 = await basketToken.balanceOf(deployer.address);
    console.log("Final BASKET balance after native deposit:", hre.ethers.formatEther(finalBasketBalance2));
    
  } catch (error) {
    console.error("\n❌ Dual staking failed:");
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
