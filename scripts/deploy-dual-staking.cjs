const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying CoreDAO Dual Staking BASKET Integration...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
    
    // Contract addresses (will be set after deployment)
    let contracts = {};
    
    try {
        // 1. Deploy Mock Tokens (for testing)
        console.log("📝 Deploying Mock Tokens...");
        
        const MockCORE = await ethers.getContractFactory("MockCORE");
        const coreToken = await MockCORE.deploy(deployer.address);
        await coreToken.waitForDeployment();
        console.log("✅ CORE Token deployed to:", await coreToken.getAddress());
        
        const MockBTC = await ethers.getContractFactory("MockCoreBTC");
        const btcToken = await MockBTC.deploy(deployer.address);
        await btcToken.waitForDeployment();
        console.log("✅ Core BTC deployed to:", btcToken.address);
        
        contracts.coreToken = await coreToken.getAddress();
        contracts.btcToken = await btcToken.getAddress();
        
        // 2. Deploy PriceFeed
        console.log("\n📊 Deploying PriceFeed...");
        const PriceFeed = await ethers.getContractFactory("PriceFeed");
        const priceFeed = await PriceFeed.deploy(deployer.address);
        await priceFeed.waitForDeployment();
        console.log("✅ PriceFeed deployed to:", priceFeed.address);
        
        // Set initial prices (CORE = $1, BTC = $95,000)
        await priceFeed.updateCorePrice(ethers.parseEther("1"));
        await priceFeed.updateLstBTCPrice(ethers.parseEther("95000"));
        console.log("📈 Initial prices set: CORE=$1, BTC=$95,000");
        
        contracts.priceFeed = priceFeed.address;
        
        // 3. Deploy MockDualStaking
        console.log("\n🎯 Deploying MockDualStaking...");
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        const mockDualStaking = await MockDualStaking.deploy(
            coreToken.address,
            btcToken.address,
            deployer.address
        );
        await mockDualStaking.waitForDeployment();
        console.log("✅ MockDualStaking deployed to:", mockDualStaking.address);
        
        // Fund the reward pool
        await coreToken.approve(mockDualStaking.address, ethers.parseEther("100000"));
        await mockDualStaking.fundRewardPool(ethers.parseEther("100000"));
        console.log("💰 Reward pool funded with 100,000 CORE");
        
        contracts.mockDualStaking = mockDualStaking.address;
        
        // 4. Deploy StakeBasketToken
        console.log("\n🪙 Deploying StakeBasketToken...");
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        const basketToken = await StakeBasketToken.deploy(
            "Dual Staking BASKET",
            "dsBASKET",
            deployer.address
        );
        await basketToken.waitForDeployment();
        console.log("✅ StakeBasketToken deployed to:", basketToken.address);
        
        contracts.basketToken = basketToken.address;
        
        // 5. Deploy DualStakingBasket (Generic)
        console.log("\n📦 Deploying DualStakingBasket...");
        const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
        const dualStakingBasket = await DualStakingBasket.deploy(
            basketToken.address,
            priceFeed.address,
            coreToken.address,
            btcToken.address,
            mockDualStaking.address,
            deployer.address, // fee recipient
            3, // StakingTier.SATOSHI
            deployer.address // owner
        );
        await dualStakingBasket.waitForDeployment();
        console.log("✅ DualStakingBasket deployed to:", dualStakingBasket.address);
        
        contracts.dualStakingBasket = dualStakingBasket.address;
        
        // 6. Deploy SatoshiTierBasket (Specialized)
        console.log("\n⚡ Deploying SatoshiTierBasket...");
        const SatoshiTierBasket = await ethers.getContractFactory("SatoshiTierBasket");
        const satoshiTierBasket = await SatoshiTierBasket.deploy(
            basketToken.address,
            priceFeed.address,
            coreToken.address,
            btcToken.address,
            mockDualStaking.address,
            deployer.address, // fee recipient
            deployer.address // owner
        );
        await satoshiTierBasket.waitForDeployment();
        console.log("✅ SatoshiTierBasket deployed to:", satoshiTierBasket.address);
        
        contracts.satoshiTierBasket = satoshiTierBasket.address;
        
        // 7. Grant minting permissions
        console.log("\n🔐 Setting up permissions...");
        const MINTER_ROLE = await basketToken.MINTER_ROLE();
        await basketToken.grantRole(MINTER_ROLE, dualStakingBasket.address);
        await basketToken.grantRole(MINTER_ROLE, satoshiTierBasket.address);
        console.log("✅ Minting permissions granted to BASKET contracts");
        
        // 8. Mint some tokens for testing
        console.log("\n💎 Minting test tokens...");
        const testAmount = ethers.parseEther("10000");
        await coreToken.mint(deployer.address, testAmount);
        await btcToken.mint(deployer.address, ethers.parseEther("10"));
        console.log("✅ Test tokens minted to deployer");
        
        // 9. Display tier information
        console.log("\n📊 CoreDAO Dual Staking Tier Information:");
        const tierInfo = await mockDualStaking.getTierInfo();
        const tierNames = ["Base", "Boost", "Super", "Satoshi"];
        
        for (let i = 0; i < 4; i++) {
            const ratio = ethers.formatEther(tierInfo.tierRatios[i]);
            const apy = tierInfo.tierAPYs[i];
            console.log(`   ${tierNames[i]} Tier: ${ratio}:1 CORE:BTC ratio, ${apy/100}% APY`);
        }
        
        // 10. Test Satoshi Tier deposit
        console.log("\n🧪 Testing Satoshi Tier Deposit...");
        const btcAmount = ethers.parseEther("0.1"); // 0.1 BTC
        const coreAmount = ethers.parseEther("1600"); // 16,000 * 0.1 = 1,600 CORE
        
        // Approve tokens
        await coreToken.approve(satoshiTierBasket.address, coreAmount);
        await btcToken.approve(satoshiTierBasket.address, btcAmount);
        
        // Make deposit
        const depositTx = await satoshiTierBasket.depositForSatoshiTier(coreAmount, btcAmount);
        await depositTx.wait();
        console.log("✅ Test deposit successful!");
        
        // Check tier status
        const tierStatus = await satoshiTierBasket.getSatoshiTierStatus();
        console.log(`   Current Tier: ${tierStatus.isSatoshiTier ? 'Satoshi' : 'Lower'}`);
        console.log(`   Current Ratio: ${ethers.formatEther(tierStatus.currentRatio)}:1`);
        console.log(`   Target Ratio: ${ethers.formatEther(tierStatus.targetRatio_)}:1`);
        
        // Check BASKET balance
        const basketBalance = await basketToken.balanceOf(deployer.address);
        console.log(`   BASKET Tokens Received: ${ethers.formatEther(basketBalance)}`);
        
        console.log("\n🎉 Deployment Complete!");
        console.log("\n📋 Contract Addresses Summary:");
        console.log("==================================");
        Object.entries(contracts).forEach(([name, address]) => {
            console.log(`${name}: ${address}`);
        });
        
        // Save deployment info
        const fs = require('fs');
        const deploymentInfo = {
            network: "localhost",
            chainId: 31337,
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: contracts,
            tierRatios: {
                base: "0:1",
                boost: "2000:1", 
                super: "6000:1",
                satoshi: "16000:1"
            }
        };
        
        fs.writeFileSync(
            './dual-staking-deployment.json', 
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("\n💾 Deployment info saved to dual-staking-deployment.json");
        
        console.log("\n🚀 Ready for Testing!");
        console.log("===============================");
        console.log("1. Run tests: npx hardhat test test/DualStakingBasket.test.cjs");
        console.log("2. Start frontend and connect to these contracts");
        console.log("3. Use these addresses in your frontend configuration");
        
        return {
            success: true,
            contracts,
            deployer: deployer.address
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Execute deployment
if (require.main === module) {
    main()
        .then((result) => {
            if (result.success) {
                console.log("\n✅ Script completed successfully");
                process.exit(0);
            } else {
                console.log("\n❌ Script failed");
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error("Fatal error:", error);
            process.exit(1);
        });
}

module.exports = { main };