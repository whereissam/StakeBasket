const { ethers } = require("hardhat");

async function main() {
    console.log("Decoding error 0xfb8f41b2...");
    
    // This error signature corresponds to a specific error in the contract
    // Let's check the DualStakingBasket contract for custom errors
    
    // Common custom errors:
    const errorSignatures = {
        "0xfb8f41b2": "Potential custom error - need to check contract source",
        "0xa9059cbb": "transfer(address,uint256)", 
        "0x23b872dd": "transferFrom(address,address,uint256)"
    };
    
    console.log("Error 0xfb8f41b2 suggests a custom error in DualStakingBasket contract");
    console.log("This usually means:");
    console.log("1. Insufficient allowance for token transfers");
    console.log("2. Invalid amounts or parameters");
    console.log("3. Contract-specific validation failed");
    
    // Let's check if we can call the contract directly
    const deploymentData = require('./deployment-data/local-deployment.json');
    
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const dualBasket = DualStakingBasket.attach(deploymentData.contracts.dualStakingBasket);
    
    console.log("\nChecking contract state...");
    
    try {
        // Check if contract is paused
        const isPaused = await dualBasket.paused().catch(() => "No paused function");
        console.log("Contract paused:", isPaused);
    } catch (e) {
        console.log("Could not check paused state");
    }
    
    // Check allowances
    const [deployer] = await ethers.getSigners();
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const mockCORE = MockCORE.attach(deploymentData.contracts.mockCORE);
    
    const MockCoreBTC = await ethers.getContractFactory("MockCoreBTC");
    const mockCoreBTC = MockCoreBTC.attach(deploymentData.contracts.mockCoreBTC);
    
    const coreAllowance = await mockCORE.allowance(deployer.address, deploymentData.contracts.dualStakingBasket);
    const btcAllowance = await mockCoreBTC.allowance(deployer.address, deploymentData.contracts.dualStakingBasket);
    
    console.log("CORE allowance:", ethers.formatUnits(coreAllowance, 8));
    console.log("BTC allowance:", ethers.formatUnits(btcAllowance, 8));
    console.log("Required CORE:", ethers.formatUnits("200000000", 8)); // 2 CORE
    console.log("Required BTC:", ethers.formatUnits("100000", 8));     // 0.001 BTC
    
    if (coreAllowance < BigInt("200000000")) {
        console.log("❌ CORE allowance insufficient\!");
    }
    if (btcAllowance < BigInt("100000")) {
        console.log("❌ BTC allowance insufficient\!");
    }
}

main().catch(console.error);
