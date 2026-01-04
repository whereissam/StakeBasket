const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Simplified Staking System...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "CORE\n");
    
    // Configuration
    const SWITCHBOARD_ADDRESS = process.env.SWITCHBOARD_ADDRESS || "0x0000000000000000000000000000000000000000";
    const BTC_TOKEN_ADDRESS = process.env.BTC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
    const DEX_ROUTER_ADDRESS = process.env.DEX_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    console.log("Configuration:");
    console.log("- Switchboard:", SWITCHBOARD_ADDRESS);
    console.log("- BTC Token:", BTC_TOKEN_ADDRESS);
    console.log("- DEX Router:", DEX_ROUTER_ADDRESS);
    console.log();
    
    try {
        // 1. Deploy SimplePriceFeed
        console.log("📊 Deploying SimplePriceFeed...");
        const SimplePriceFeed = await ethers.getContractFactory("SimplePriceFeed");
        const priceFeed = await SimplePriceFeed.deploy(SWITCHBOARD_ADDRESS, deployer.address);
        await priceFeed.waitForDeployment();
        const priceFeedAddress = await priceFeed.getAddress();
        console.log("✅ SimplePriceFeed deployed at:", priceFeedAddress);
        
        // 2. Deploy SimpleBasketToken
        console.log("\n🪙 Deploying SimpleBasketToken...");
        const SimpleBasketToken = await ethers.getContractFactory("SimpleBasketToken");
        const basketToken = await SimpleBasketToken.deploy(
            "Simple Basket Token",
            "SBT",
            deployer.address
        );
        await basketToken.waitForDeployment();
        const basketTokenAddress = await basketToken.getAddress();
        console.log("✅ SimpleBasketToken deployed at:", basketTokenAddress);
        
        // 3. Deploy SimpleStaking
        console.log("\n🏦 Deploying SimpleStaking...");
        const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
        const staking = await SimpleStaking.deploy(
            basketTokenAddress,
            priceFeedAddress,
            BTC_TOKEN_ADDRESS,
            DEX_ROUTER_ADDRESS,
            deployer.address
        );
        await staking.waitForDeployment();
        const stakingAddress = await staking.getAddress();
        console.log("✅ SimpleStaking deployed at:", stakingAddress);
        
        // 4. Set basket token minter
        console.log("\n🔧 Setting up permissions...");
        await basketToken.setMinter(stakingAddress);
        console.log("✅ Basket token minter set to staking contract");
        
        // 5. Configure price feeds (if available)
        if (SWITCHBOARD_ADDRESS !== "0x0000000000000000000000000000000000000000") {
            console.log("\n💰 Configuring price feeds...");
            
            // Set feed IDs for CORE and BTC (these would be real Switchboard feed IDs)
            const CORE_FEED_ID = "0x1234567890123456789012345678901234567890123456789012345678901234"; // Example
            const BTC_FEED_ID = "0x2345678901234567890123456789012345678901234567890123456789012345";  // Example
            
            await priceFeed.setFeedId(ethers.keccak256(ethers.toUtf8Bytes("CORE")), CORE_FEED_ID);
            await priceFeed.setFeedId(ethers.keccak256(ethers.toUtf8Bytes("BTC")), BTC_FEED_ID);
            console.log("✅ Price feed IDs configured");
        }
        
        // 6. Save deployment data
        const deploymentData = {
            network: "localhost", // or process.env.HARDHAT_NETWORK
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                SimplePriceFeed: priceFeedAddress,
                SimpleBasketToken: basketTokenAddress,
                SimpleStaking: stakingAddress
            },
            configuration: {
                switchboard: SWITCHBOARD_ADDRESS,
                btcToken: BTC_TOKEN_ADDRESS,
                dexRouter: DEX_ROUTER_ADDRESS
            }
        };
        
        // Write to file
        const fs = require('fs');
        const path = require('path');
        
        const deploymentDir = path.join(__dirname, '../deployment-data');
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(deploymentDir, 'simple-deployment.json'),
            JSON.stringify(deploymentData, null, 2)
        );
        
        console.log("\n🎉 Deployment Summary:");
        console.log("=====================");
        console.log("SimplePriceFeed:    ", priceFeedAddress);
        console.log("SimpleBasketToken:  ", basketTokenAddress);
        console.log("SimpleStaking:      ", stakingAddress);
        console.log("\n📄 Deployment data saved to: deployment-data/simple-deployment.json");
        
        console.log("\n🔍 Next Steps:");
        console.log("1. Configure real Switchboard feed IDs");
        console.log("2. Set up price updates");  
        console.log("3. Test with small deposits");
        console.log("4. Update frontend to use new contracts");
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;