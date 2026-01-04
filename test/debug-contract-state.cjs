const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 DEBUG CONTRACT STATE");
    console.log("=======================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    // Load deployment data
    let deploymentData;
    try {
        deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
        console.log("✅ Deployment data loaded");
    } catch (error) {
        console.log("❌ No deployment data found");
        return;
    }
    
    console.log("\n📋 TESTING EACH CONTRACT:");
    console.log("=========================");
    
    // Test each contract individually
    for (const [contractName, address] of Object.entries(deploymentData.contracts)) {
        console.log(`\n${contractName}: ${address}`);
        
        try {
            // Basic contract existence check
            const code = await ethers.provider.getCode(address);
            if (code === "0x") {
                console.log(`  ❌ No code at address - contract not deployed`);
                continue;
            } else {
                console.log(`  ✅ Contract exists (${code.length} bytes)`);
            }
            
            // Try to attach and call basic functions
            if (contractName === "mockCORE") {
                console.log(`  Testing MockCORE functions:`);
                try {
                    const mockCORE = await ethers.getContractAt("MockCORE", address);
                    const name = await mockCORE.name();
                    const symbol = await mockCORE.symbol();
                    const totalSupply = await mockCORE.totalSupply();
                    console.log(`    Name: ${name}, Symbol: ${symbol}`);
                    console.log(`    Total Supply: ${ethers.formatEther(totalSupply)}`);
                    
                    // Try balance check for deployer
                    const balance = await mockCORE.balanceOf(deployer.address);
                    console.log(`    Deployer balance: ${ethers.formatEther(balance)}`);
                    
                } catch (error) {
                    console.log(`    ❌ MockCORE error: ${error.message}`);
                }
            }
            
            if (contractName === "btcToken") {
                console.log(`  Testing BTC Token functions:`);
                try {
                    const btcToken = await ethers.getContractAt("MockERC20", address);
                    const name = await btcToken.name();
                    const symbol = await btcToken.symbol();
                    const decimals = await btcToken.decimals();
                    console.log(`    Name: ${name}, Symbol: ${symbol}, Decimals: ${decimals}`);
                    
                    const balance = await btcToken.balanceOf(deployer.address);
                    console.log(`    Deployer balance: ${ethers.formatUnits(balance, decimals)}`);
                    
                } catch (error) {
                    console.log(`    ❌ BTC Token error: ${error.message}`);
                }
            }
            
            if (contractName === "mockDualStaking") {
                console.log(`  Testing Mock Dual Staking functions:`);
                try {
                    const mockDualStaking = await ethers.getContractAt("MockDualStaking", address);
                    const stakeInfo = await mockDualStaking.getUserStakeInfo(deployer.address);
                    console.log(`    Deployer stake - CORE: ${ethers.formatEther(stakeInfo[0])}, BTC: ${ethers.formatUnits(stakeInfo[1], 8)}`);
                    
                } catch (error) {
                    console.log(`    ❌ Mock Dual Staking error: ${error.message}`);
                }
            }
            
            if (contractName === "stakeBasketToken") {
                console.log(`  Testing Stake Basket Token functions:`);
                try {
                    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", address);
                    const name = await stakeBasketToken.name();
                    const symbol = await stakeBasketToken.symbol();
                    const totalSupply = await stakeBasketToken.totalSupply();
                    console.log(`    Name: ${name}, Symbol: ${symbol}`);
                    console.log(`    Total Supply: ${ethers.formatEther(totalSupply)}`);
                    
                } catch (error) {
                    console.log(`    ❌ Stake Basket Token error: ${error.message}`);
                }
            }
            
            if (contractName === "priceFeed") {
                console.log(`  Testing Price Feed functions:`);
                try {
                    const priceFeed = await ethers.getContractAt("PriceFeed", address);
                    const corePrice = await priceFeed.getCorePrice();
                    const btcPrice = await priceFeed.getSolvBTCPrice();
                    console.log(`    CORE Price: $${ethers.formatEther(corePrice)}`);
                    console.log(`    BTC Price: $${ethers.formatEther(btcPrice)}`);
                    
                } catch (error) {
                    console.log(`    ❌ Price Feed error: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.log(`  ❌ General error: ${error.message}`);
        }
    }
    
    console.log("\n🧪 TESTING TOKEN MINTING");
    console.log("========================");
    
    // Let's try to mint tokens to see if that works
    const signers = await ethers.getSigners();
    const alice = signers[1];
    
    console.log(`Alice address: ${alice.address}`);
    
    // Try MockCORE
    try {
        const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
        
        console.log("Testing MockCORE mint...");
        await mockCORE.mint(alice.address, ethers.parseEther("1000"));
        console.log("✅ MockCORE mint successful");
        
        const balance = await mockCORE.balanceOf(alice.address);
        console.log(`Alice CORE balance: ${ethers.formatEther(balance)}`);
        
    } catch (error) {
        console.log(`❌ MockCORE mint failed: ${error.message}`);
    }
    
    // Try BTC Token
    try {
        const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
        
        console.log("Testing BTC Token mint...");
        await btcToken.mint(alice.address, ethers.parseUnits("1", 8));
        console.log("✅ BTC Token mint successful");
        
        const balance = await btcToken.balanceOf(alice.address);
        console.log(`Alice BTC balance: ${ethers.formatUnits(balance, 8)}`);
        
    } catch (error) {
        console.log(`❌ BTC Token mint failed: ${error.message}`);
    }
    
    console.log("\n🎯 SUMMARY");
    console.log("==========");
    console.log("This diagnostic will show us exactly which contracts have issues");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ CRITICAL ERROR:", error.message);
        console.error(error);
        process.exit(1);
    });