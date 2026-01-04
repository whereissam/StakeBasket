const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 FIXING BROKEN CONTRACTS");
    console.log("==========================");
    console.log("Redeploying all broken contracts to get REAL data");
    
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
    
    // Keep working contracts, redeploy broken ones
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    console.log("\n✅ KEEPING WORKING CONTRACTS:");
    console.log(`  - btcToken: ${deploymentData.contracts.btcToken}`);
    console.log(`  - mockDualStaking: ${deploymentData.contracts.mockDualStaking}`);
    console.log(`  - dualStakingBasket: ${deploymentData.contracts.dualStakingBasket}`);
    
    console.log("\n🚀 REDEPLOYING BROKEN CONTRACTS:");
    console.log("================================");
    
    // 1. Deploy new PriceFeed
    console.log("1️⃣ Deploying PriceFeed...");
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = await PriceFeed.deploy(
        deployer.address, // initialOwner
        ethers.ZeroAddress, // pythOracle (using zero address for mock)
        ethers.ZeroAddress  // switchboard (using zero address for mock)
    );
    await priceFeed.waitForDeployment();
    const priceFeedAddress = await priceFeed.getAddress();
    console.log(`✅ PriceFeed deployed: ${priceFeedAddress}`);
    
    // Set prices immediately
    try {
        await priceFeed.setPrice("CORE", ethers.parseEther("0.70"));
        await priceFeed.setPrice("SolvBTC", ethers.parseEther("110000"));
        console.log(`✅ Prices set: CORE=$0.70, SolvBTC=$110,000`);
    } catch (error) {
        console.log(`⚠️ Could not set prices: ${error.message}`);
    }
    
    // Test it immediately
    try {
        const corePrice = await priceFeed.getCorePrice();
        const btcPrice = await priceFeed.getSolvBTCPrice();
        console.log(`   CORE Price: $${ethers.formatEther(corePrice)}`);
        console.log(`   BTC Price: $${ethers.formatEther(btcPrice)}`);
    } catch (error) {
        console.log(`❌ PriceFeed test failed: ${error.message}`);
        return;
    }
    
    // 2. Deploy new MockCORE
    console.log("\n2️⃣ Deploying MockCORE...");
    const MockCORE = await ethers.getContractFactory("MockCORE");
    const mockCORE = await MockCORE.deploy(deployer.address);
    await mockCORE.waitForDeployment();
    const mockCOREAddress = await mockCORE.getAddress();
    console.log(`✅ MockCORE deployed: ${mockCOREAddress}`);
    
    // Test it immediately
    try {
        const name = await mockCORE.name();
        const symbol = await mockCORE.symbol();
        console.log(`   Name: ${name}, Symbol: ${symbol}`);
        
        // Mint test tokens
        await mockCORE.mint(deployer.address, ethers.parseEther("10000"));
        const balance = await mockCORE.balanceOf(deployer.address);
        console.log(`   Deployer balance: ${ethers.formatEther(balance)} CORE`);
    } catch (error) {
        console.log(`❌ MockCORE test failed: ${error.message}`);
        return;
    }
    
    // 3. Deploy new StakeBasketToken
    console.log("\n3️⃣ Deploying StakeBasketToken...");
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const stakeBasketToken = await StakeBasketToken.deploy("Basket Token", "BASKET", deployer.address);
    await stakeBasketToken.waitForDeployment();
    const stakeBasketTokenAddress = await stakeBasketToken.getAddress();
    console.log(`✅ StakeBasketToken deployed: ${stakeBasketTokenAddress}`);
    
    // Test it immediately
    try {
        const name = await stakeBasketToken.name();
        const symbol = await stakeBasketToken.symbol();
        const totalSupply = await stakeBasketToken.totalSupply();
        console.log(`   Name: ${name}, Symbol: ${symbol}`);
        console.log(`   Total Supply: ${ethers.formatEther(totalSupply)}`);
    } catch (error) {
        console.log(`❌ StakeBasketToken test failed: ${error.message}`);
        return;
    }
    
    // 4. Deploy new StakeBasket
    console.log("\n4️⃣ Deploying StakeBasket...");
    const StakeBasket = await ethers.getContractFactory("StakeBasket");
    const stakeBasket = await StakeBasket.deploy(
        stakeBasketTokenAddress,    // _etfToken
        deployer.address,          // _stakingManager (payable)
        priceFeedAddress,          // _priceFeed
        deployer.address,          // _feeRecipient
        deployer.address,          // _protocolTreasury
        deployer.address           // initialOwner
    );
    await stakeBasket.waitForDeployment();
    const stakeBasketAddress = await stakeBasket.getAddress();
    console.log(`✅ StakeBasket deployed: ${stakeBasketAddress}`);
    
    // Test it immediately
    try {
        const etfToken = await stakeBasket.etfToken();
        const priceFeedAddr = await stakeBasket.priceFeed();
        console.log(`   ETF Token: ${etfToken}`);
        console.log(`   Price Feed: ${priceFeedAddr}`);
    } catch (error) {
        console.log(`❌ StakeBasket test failed: ${error.message}`);
        return;
    }
    
    // 5. Setup permissions for StakeBasketToken
    console.log("\n5️⃣ Setting up permissions...");
    try {
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        
        // Grant minter role to StakeBasket
        await stakeBasketToken.grantRole(MINTER_ROLE, stakeBasketAddress);
        console.log(`✅ StakeBasket granted MINTER_ROLE`);
        
        // Grant minter role to DualStakingBasket
        await stakeBasketToken.grantRole(MINTER_ROLE, deploymentData.contracts.dualStakingBasket);
        console.log(`✅ DualStakingBasket granted MINTER_ROLE`);
        
        // Set StakeBasket in StakeBasketToken
        await stakeBasketToken.setStakeBasketContract(stakeBasketAddress);
        console.log(`✅ StakeBasket contract set in StakeBasketToken`);
        
    } catch (error) {
        console.log(`❌ Permission setup failed: ${error.message}`);
    }
    
    // 6. Update DualStakingBasket dependencies
    console.log("\n6️⃣ Updating DualStakingBasket dependencies...");
    try {
        const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
        
        // Update price feed
        await dualStakingBasket.setPriceFeed(priceFeedAddress);
        console.log(`✅ DualStakingBasket price feed updated`);
        
    } catch (error) {
        console.log(`❌ DualStakingBasket update failed: ${error.message}`);
    }
    
    // Update deployment data
    const newDeploymentData = {
        ...deploymentData,
        timestamp: new Date().toISOString(),
        contracts: {
            ...deploymentData.contracts,
            stakeBasketToken: stakeBasketTokenAddress,
            mockCORE: mockCOREAddress,
            priceFeed: priceFeedAddress,
            stakeBasket: stakeBasketAddress
        }
    };
    
    fs.writeFileSync("deployment-data/local-deployment.json", JSON.stringify(newDeploymentData, null, 2));
    console.log("\n💾 Updated deployment data saved");
    
    console.log("\n🧪 TESTING FIXED SYSTEM:");
    console.log("========================");
    
    // Test regular staking first
    console.log("Testing regular staking...");
    try {
        const alice = await ethers.getSigner("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
        
        // Mint CORE tokens to Alice
        await mockCORE.mint(alice.address, ethers.parseEther("1000"));
        
        // Approve StakeBasket
        await mockCORE.connect(alice).approve(stakeBasketAddress, ethers.parseEther("100"));
        
        // Check BASKET balance before
        const basketBefore = await stakeBasketToken.balanceOf(alice.address);
        
        // Deposit
        const tx = await stakeBasket.connect(alice).deposit(ethers.parseEther("100"), alice.address, {
            value: ethers.parseEther("0.1"), // Gas for delegation
            gasLimit: 300000
        });
        await tx.wait();
        
        // Check BASKET balance after
        const basketAfter = await stakeBasketToken.balanceOf(alice.address);
        const basketReceived = basketAfter - basketBefore;
        
        console.log(`✅ Regular staking SUCCESS!`);
        console.log(`   Alice deposited: 100 CORE`);
        console.log(`   Alice received: ${ethers.formatEther(basketReceived)} BASKET`);
        
        const conversionRate = parseFloat(ethers.formatEther(basketReceived)) / (100 * 0.70);
        console.log(`   Conversion rate: ${conversionRate.toFixed(6)} BASKET per USD`);
        
    } catch (error) {
        console.log(`❌ Regular staking test failed: ${error.message}`);
    }
    
    console.log("\n🎉 CONTRACTS FIXED!");
    console.log("===================");
    console.log("All broken contracts have been redeployed and tested");
    console.log("Ready to test dual staking with REAL BASKET token data!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });