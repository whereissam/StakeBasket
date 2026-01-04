const { ethers } = require("hardhat");

async function testDEXSimple() {
    const [owner] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const coreToken = await MockERC20.deploy("CORE", "CORE", 18);
    const btcToken = await MockERC20.deploy("BTC", "BTC", 18);
    await coreToken.waitForDeployment();
    await btcToken.waitForDeployment();
    
    // Deploy MockDEXRouter
    const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
    const dexRouter = await MockDEXRouter.deploy();
    await dexRouter.waitForDeployment();
    
    // Set exchange rate: 1 CORE = 0.000023 BTC (roughly $1.5 vs $65k)
    const btcPerCore = (ethers.parseEther("1.5") * ethers.parseEther("1")) / ethers.parseEther("65000");
    console.log(`Setting rate: 1 CORE = ${ethers.formatEther(btcPerCore)} BTC`);
    
    await dexRouter.setExchangeRate(
        await coreToken.getAddress(),
        await btcToken.getAddress(),
        btcPerCore
    );
    
    // Check if rate was set
    const rate = await dexRouter.exchangeRates(await coreToken.getAddress(), await btcToken.getAddress());
    console.log(`Stored rate: ${ethers.formatEther(rate)} BTC per CORE`);
    
    // Fund DEX with tokens
    await coreToken.mint(await dexRouter.getAddress(), ethers.parseEther("1000000"));
    await btcToken.mint(await dexRouter.getAddress(), ethers.parseEther("100"));
    
    console.log(`DEX CORE balance: ${ethers.formatEther(await coreToken.balanceOf(await dexRouter.getAddress()))}`);
    console.log(`DEX BTC balance: ${ethers.formatEther(await btcToken.balanceOf(await dexRouter.getAddress()))}`);
    
    // Test getAmountOut
    const coreInput = ethers.parseEther("1000"); // 1000 CORE
    const expectedOut = await dexRouter.getAmountOut(coreInput, await coreToken.getAddress(), await btcToken.getAddress());
    console.log(`1000 CORE should get: ${ethers.formatEther(expectedOut)} BTC`);
    
    // Try actual swap
    await coreToken.mint(owner.address, ethers.parseEther("10000"));
    await coreToken.approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
    
    const path = [await coreToken.getAddress(), await btcToken.getAddress()];
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    console.log("Attempting swap...");
    try {
        const tx = await dexRouter.swapExactTokensForTokens(
            coreInput,
            0, // Accept any amount
            path,
            owner.address,
            deadline
        );
        
        const receipt = await tx.wait();
        console.log("✅ Swap successful!");
        
        // Check final balances
        const ownerBtcBalance = await btcToken.balanceOf(owner.address);
        console.log(`Owner received: ${ethers.formatEther(ownerBtcBalance)} BTC`);
        
    } catch (error) {
        console.log("❌ Swap failed:", error.reason || error.message);
    }
}

testDEXSimple().catch(console.error);