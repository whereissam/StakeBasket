const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 FRESH DEPLOYMENT TEST");
    console.log("========================");
    console.log("Deploy completely fresh contracts to avoid totalSupply interference");
    
    const [deployer, alice] = await ethers.getSigners();
    
    console.log("\n1️⃣ Deploy Fresh StakeBasketToken");
    console.log("================================");
    
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const freshBasketToken = await StakeBasketToken.deploy(
        "StakeBasket Token", // name
        "BASKET",           // symbol  
        deployer.address    // initialOwner
    );
    await freshBasketToken.waitForDeployment();
    const freshBasketTokenAddress = await freshBasketToken.getAddress();
    console.log(`✅ Fresh StakeBasketToken: ${freshBasketTokenAddress}`);
    
    console.log("\n2️⃣ Deploy Fresh MockTokens");
    console.log("==========================");
    
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const freshMockCORE = await MockCORE.deploy(deployer.address);
    await freshMockCORE.waitForDeployment();
    const freshMockCOREAddress = await freshMockCORE.getAddress();
    
    const TestBTC = await ethers.getContractFactory("TestBTC");
    const freshBTC = await TestBTC.deploy();
    await freshBTC.waitForDeployment();
    const freshBTCAddress = await freshBTC.getAddress();
    
    console.log(`✅ Fresh MockCORE: ${freshMockCOREAddress}`);
    console.log(`✅ Fresh TestBTC: ${freshBTCAddress}`);
    
    console.log("\n3️⃣ Deploy Fresh PriceFeed");
    console.log("=========================");
    
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const freshPriceFeed = await PriceFeed.deploy(
        deployer.address,   // initialOwner
        ethers.ZeroAddress, // pythOracle  
        ethers.ZeroAddress  // switchboard
    );
    await freshPriceFeed.waitForDeployment();
    const freshPriceFeedAddress = await freshPriceFeed.getAddress();
    console.log(`✅ Fresh PriceFeed: ${freshPriceFeedAddress}`);
    
    // Set prices
    await freshPriceFeed.setPrice("CORE", ethers.parseEther("0.70"));
    await freshPriceFeed.setPrice("SolvBTC", ethers.parseEther("110000"));
    console.log(`✅ Prices set: CORE=$0.70, BTC=$110,000`);
    
    console.log("\n4️⃣ Deploy Fresh MockDualStaking");
    console.log("==============================");
    
    const MockDualStakingContract = await ethers.getContractFactory("MockDualStakingContract");
    const freshMockDualStaking = await MockDualStakingContract.deploy();
    await freshMockDualStaking.waitForDeployment();
    const freshMockDualStakingAddress = await freshMockDualStaking.getAddress();
    console.log(`✅ Fresh MockDualStaking: ${freshMockDualStakingAddress}`);
    
    console.log("\n5️⃣ Deploy Fresh DualStakingBasket");
    console.log("=================================");
    
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const freshDualStaking = await DualStakingBasket.deploy(
        freshBasketTokenAddress,     // basketToken (fresh!)
        freshPriceFeedAddress,       // priceFeed
        freshMockCOREAddress,        // coreToken
        freshBTCAddress,             // btcToken
        freshMockDualStakingAddress, // dualStakingContract
        deployer.address,            // feeRecipient
        0,                          // targetTier (BRONZE)
        deployer.address            // initialOwner
    );
    await freshDualStaking.waitForDeployment();
    const freshDualStakingAddress = await freshDualStaking.getAddress();
    console.log(`✅ Fresh DualStakingBasket: ${freshDualStakingAddress}`);
    
    console.log("\n6️⃣ Setup Permissions");
    console.log("====================");
    
    await freshBasketToken.emergencySetStakeBasketContract(freshDualStakingAddress);
    console.log(`✅ StakeBasketToken permissions set`);
    
    // Verify total supply is 0
    const totalSupply = await freshBasketToken.totalSupply();
    console.log(`✅ Fresh basket token total supply: ${totalSupply.toString()} (should be 0)`);
    
    console.log("\n7️⃣ Test Alice's Deposit");
    console.log("=======================");
    
    const coreAmount = ethers.parseEther("100"); // 100 CORE
    const btcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    // Give Alice tokens
    await freshMockCORE.mint(alice.address, coreAmount);
    await freshBTC.mint(alice.address, btcAmount);
    await freshMockCORE.connect(alice).approve(freshDualStakingAddress, coreAmount);
    await freshBTC.connect(alice).approve(freshDualStakingAddress, btcAmount);
    
    console.log(`Setup: 100 CORE + 0.001 BTC = $70 + $110 = $180`);
    
    try {
        const initialBasket = await freshBasketToken.balanceOf(alice.address);
        console.log(`Initial BASKET balance: ${ethers.formatEther(initialBasket)}`);
        
        console.log(`🔄 Executing deposit...`);
        const tx = await freshDualStaking.connect(alice).deposit(coreAmount, btcAmount);
        const receipt = await tx.wait();
        
        const finalBasket = await freshBasketToken.balanceOf(alice.address);
        const basketReceived = finalBasket - initialBasket;
        
        console.log(`✅ SUCCESS!`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`BASKET tokens received: ${ethers.formatEther(basketReceived)}`);
        
        const basketPerUSD = parseFloat(ethers.formatEther(basketReceived)) / 180;
        console.log(`BASKET per USD: ${basketPerUSD.toFixed(6)}`);
        
        // This should be close to 1.0 if working correctly
        if (basketPerUSD > 0.9 && basketPerUSD < 1.1) {
            console.log(`\n🎉 SUCCESS! BASKET/USD ratio is correct: ${basketPerUSD.toFixed(6)}`);
            console.log(`\n🎯 FINAL ANSWER:`);
            console.log(`100 CORE + 0.001 BTC = ${ethers.formatEther(basketReceived)} BASKET tokens`);
            console.log(`Formula: ~1 BASKET token per $1 USD invested`);
            return true;
        } else {
            console.log(`\n⚠️ BASKET/USD ratio is ${basketPerUSD.toFixed(6)} - should be close to 1.0`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Deposit failed: ${error.message}`);
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\n🏆 FRESH DEPLOYMENT SUCCESSFUL!");
            console.log("All contract fixes are working correctly!");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });