const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 DEPLOYING DUAL STAKING SYSTEM");
    console.log("================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

    // Load existing deployment data
    let deploymentData;
    try {
        deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
        console.log("✅ Loaded existing deployment data");
    } catch (error) {
        console.log("❌ No existing deployment data found, creating new");
        deploymentData = {
            network: { name: "hardhat", chainId: "31337" },
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {},
            config: {
                CORE_PRICE: "1500000000000000000", // $1.50
                BTC_PRICE: "95000000000000000000000", // $95,000
                MANAGEMENT_FEE: 500,
                PROTOCOL_FEE: 1000
            }
        };
    }

    console.log("\n📋 EXISTING CONTRACTS:");
    Object.entries(deploymentData.contracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });

    // Deploy missing BTC token if needed
    if (!deploymentData.contracts.btcToken) {
        console.log("\n🪙 DEPLOYING BTC TOKEN");
        const MockBTC = await ethers.getContractFactory("MockERC20");
        const btcToken = await MockBTC.deploy("Core Bitcoin", "BTC", 8);
        await btcToken.waitForDeployment();
        deploymentData.contracts.btcToken = await btcToken.getAddress();
        console.log(`✅ BTC Token: ${deploymentData.contracts.btcToken}`);
    }

    // Deploy Mock Dual Staking Contract
    if (!deploymentData.contracts.mockDualStaking) {
        console.log("\n⚡ DEPLOYING MOCK DUAL STAKING");
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        const mockDualStaking = await MockDualStaking.deploy();
        await mockDualStaking.waitForDeployment();
        deploymentData.contracts.mockDualStaking = await mockDualStaking.getAddress();
        console.log(`✅ Mock Dual Staking: ${deploymentData.contracts.mockDualStaking}`);
    }

    // Deploy Dual Staking Basket
    if (!deploymentData.contracts.dualStakingBasket) {
        console.log("\n🏀 DEPLOYING DUAL STAKING BASKET");
        const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
        const dualStakingBasket = await DualStakingBasket.deploy(
            deploymentData.contracts.stakeBasketToken,
            deploymentData.contracts.priceFeed, 
            deploymentData.contracts.mockCORE, // ERC20 CORE token
            deploymentData.contracts.btcToken,
            deploymentData.contracts.mockDualStaking,
            deployer.address, // fee recipient
            0, // Bronze tier (StakingTier.BRONZE)
            deployer.address // initial owner
        );
        await dualStakingBasket.waitForDeployment();
        deploymentData.contracts.dualStakingBasket = await dualStakingBasket.getAddress();
        console.log(`✅ Dual Staking Basket: ${deploymentData.contracts.dualStakingBasket}`);
    }

    // Save deployment data
    fs.writeFileSync("deployment-data/local-deployment.json", JSON.stringify(deploymentData, null, 2));
    console.log("\n💾 Deployment data saved");

    // Setup tokens and test the system
    console.log("\n🔧 SETTING UP TEST ENVIRONMENT");
    console.log("==============================");

    const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);

    // Mint test tokens
    const signers = await ethers.getSigners();
    for (let i = 1; i < 7; i++) { // Skip deployer (index 0)
        const user = signers[i];
        
        // Mint CORE tokens
        await mockCORE.mint(user.address, ethers.parseEther("10000"));
        
        // Mint BTC tokens  
        await btcToken.mint(user.address, ethers.parseUnits("1", 8)); // 1 BTC
        
        console.log(`✅ Tokens minted for ${user.address}`);
    }

    // Test the dual staking basket
    console.log("\n🧪 TESTING DUAL STAKING BASKET");
    console.log("==============================");

    const alice = signers[1];
    const coreAmount = ethers.parseEther("100"); // 100 CORE
    const btcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC

    try {
        // Approve tokens
        await mockCORE.connect(alice).approve(deploymentData.contracts.dualStakingBasket, coreAmount);
        await btcToken.connect(alice).approve(deploymentData.contracts.dualStakingBasket, btcAmount);

        // Test deposit
        console.log(`Testing deposit: ${ethers.formatEther(coreAmount)} CORE + ${ethers.formatUnits(btcAmount, 8)} BTC`);
        
        const tx = await dualStakingBasket.connect(alice).deposit(coreAmount, btcAmount);
        const receipt = await tx.wait();
        
        console.log(`✅ Deposit successful! Gas used: ${receipt.gasUsed}`);

        // Check balance
        const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
        const basketBalance = await stakeBasketToken.balanceOf(alice.address);
        console.log(`Alice BASKET tokens: ${ethers.formatEther(basketBalance)}`);

    } catch (error) {
        console.log(`❌ Test deposit failed: ${error.message}`);
        console.log(error);
    }

    console.log("\n🎉 DUAL STAKING DEPLOYMENT COMPLETE!");
    console.log("====================================");
    console.log("\n📊 ALL DEPLOYED CONTRACTS:");
    Object.entries(deploymentData.contracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });