const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying CoreDAO Dual Staking BASKET Integration...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    try {
        // 1. Deploy Mock Tokens
        console.log("📝 Deploying Mock Tokens...");
        
        const MockCORE = await ethers.getContractFactory("MockCORE");
        const coreToken = await MockCORE.deploy(deployer.address);
        await coreToken.waitForDeployment();
        const coreTokenAddr = await coreToken.getAddress();
        console.log("✅ CORE Token deployed to:", coreTokenAddr);
        
        const MockBTC = await ethers.getContractFactory("MockCoreBTC");
        const btcToken = await MockBTC.deploy(deployer.address);
        await btcToken.waitForDeployment();
        const btcTokenAddr = await btcToken.getAddress();
        console.log("✅ Core BTC deployed to:", btcTokenAddr);
        
        // 2. Deploy PriceFeed
        console.log("\n📊 Deploying PriceFeed...");
        const PriceFeed = await ethers.getContractFactory("PriceFeed");
        const priceFeed = await PriceFeed.deploy(deployer.address);
        await priceFeed.waitForDeployment();
        const priceFeedAddr = await priceFeed.getAddress();
        console.log("✅ PriceFeed deployed to:", priceFeedAddr);
        
        // Set initial prices (prices are already set in constructor, so this is optional)
        await priceFeed.setPrice("CORE", ethers.parseEther("1"));
        await priceFeed.setPrice("lstBTC", ethers.parseEther("95000"));
        console.log("📈 Initial prices set: CORE=$1, BTC=$95,000");
        
        // 3. Deploy MockDualStaking
        console.log("\n🎯 Deploying MockDualStaking...");
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        const mockDualStaking = await MockDualStaking.deploy(
            coreTokenAddr,
            btcTokenAddr,
            deployer.address
        );
        await mockDualStaking.waitForDeployment();
        const mockDualStakingAddr = await mockDualStaking.getAddress();
        console.log("✅ MockDualStaking deployed to:", mockDualStakingAddr);
        
        // Fund reward pool
        await coreToken.approve(mockDualStakingAddr, ethers.parseEther("100000"));
        await mockDualStaking.fundRewardPool(ethers.parseEther("100000"));
        console.log("💰 Reward pool funded with 100,000 CORE");
        
        // 4. Deploy StakeBasketToken
        console.log("\n🪙 Deploying StakeBasketToken...");
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        const basketToken = await StakeBasketToken.deploy(
            "Dual Staking BASKET",
            "dsBASKET",
            deployer.address
        );
        await basketToken.waitForDeployment();
        const basketTokenAddr = await basketToken.getAddress();
        console.log("✅ StakeBasketToken deployed to:", basketTokenAddr);
        
        // 5. Deploy SatoshiTierBasket
        console.log("\n⚡ Deploying SatoshiTierBasket...");
        const SatoshiTierBasket = await ethers.getContractFactory("SatoshiTierBasket");
        const satoshiTierBasket = await SatoshiTierBasket.deploy(
            basketTokenAddr,
            priceFeedAddr,
            coreTokenAddr,
            btcTokenAddr,
            mockDualStakingAddr,
            deployer.address, // fee recipient
            deployer.address  // owner
        );
        await satoshiTierBasket.waitForDeployment();
        const satoshiTierBasketAddr = await satoshiTierBasket.getAddress();
        console.log("✅ SatoshiTierBasket deployed to:", satoshiTierBasketAddr);
        
        // 6. Grant permissions
        console.log("\n🔐 Setting up permissions...");
        await basketToken.setStakeBasketContract(satoshiTierBasketAddr);
        console.log("✅ Minting permissions granted");
        
        // 7. Mint test tokens
        console.log("\n💎 Minting test tokens...");
        await coreToken.mint(deployer.address, ethers.parseEther("50000"));
        await btcToken.mint(deployer.address, ethers.parseEther("10"));
        console.log("✅ Test tokens minted");
        
        // 8. Display tier information
        console.log("\n📊 CoreDAO Dual Staking Tier Information:");
        const tierInfo = await mockDualStaking.getTierInfo();
        const tierNames = ["Base", "Boost", "Super", "Satoshi"];
        
        for (let i = 0; i < 4; i++) {
            const ratio = ethers.formatEther(tierInfo.tierRatios[i]);
            const apy = Number(tierInfo.tierAPYs[i]);
            console.log(`   ${tierNames[i]} Tier: ${ratio}:1 CORE:BTC ratio, ${apy/100}% APY`);
        }
        
        // 9. Test Satoshi Tier deposit
        console.log("\n🧪 Testing Satoshi Tier Deposit...");
        const btcAmount = ethers.parseEther("0.1"); // 0.1 BTC
        const coreAmount = ethers.parseEther("1600"); // 16,000 * 0.1 = 1,600 CORE
        
        // Approve tokens
        await coreToken.approve(satoshiTierBasketAddr, coreAmount);
        await btcToken.approve(satoshiTierBasketAddr, btcAmount);
        
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
        console.log("\n📋 Contract Addresses:");
        console.log("==================================");
        console.log(`coreToken: ${coreTokenAddr}`);
        console.log(`btcToken: ${btcTokenAddr}`);
        console.log(`priceFeed: ${priceFeedAddr}`);
        console.log(`mockDualStaking: ${mockDualStakingAddr}`);
        console.log(`basketToken: ${basketTokenAddr}`);
        console.log(`satoshiTierBasket: ${satoshiTierBasketAddr}`);
        
        // Save deployment info
        const fs = require('fs');
        const deploymentInfo = {
            network: "localhost",
            chainId: 31337,
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                coreToken: coreTokenAddr,
                btcToken: btcTokenAddr,
                priceFeed: priceFeedAddr,
                mockDualStaking: mockDualStakingAddr,
                basketToken: basketTokenAddr,
                satoshiTierBasket: satoshiTierBasketAddr
            },
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
        console.log("Run: npx hardhat test test/DualStakingBasket.test.cjs");
        
        return { success: true, contracts: deploymentInfo.contracts };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        return { success: false, error: error.message };
    }
}

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