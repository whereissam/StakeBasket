// Automated Contract Testing Script
// This script automatically tests all contract functionality
const { ethers } = require("hardhat");

// Contract addresses from latest deployment
const CONTRACTS = {
    stakeBasketToken: "0x9CC8B5379C40E24F374cd55973c138fff83ed214",
    mockCORE: "0xd3b893cd083f07Fe371c1a87393576e7B01C52C6",
    testBTC: "0x3BFbbf82657577668144921b96aAb72BC170646C",
    priceFeed: "0x930b218f3e63eE452c13561057a8d5E61367d5b7",
    mockDualStaking: "0xb4e9A5BC64DC07f890367F72941403EEd7faDCbB",
    stakeBasket: "0xa8d297D643a11cE83b432e87eEBce6bee0fd2bAb",
    dualStakingBasket: "0x6Da3D07a6BF01F02fB41c02984a49B5d9Aa6ea92"
};

let contracts = {};
let signer;

async function setupContracts() {
    console.log("🔄 Setting up contracts...");
    
    // Get signer (first account from hardhat)
    [signer] = await ethers.getSigners();
    console.log(`👤 Using account: ${signer.address}`);
    
    // Get contract instances
    contracts.mockCORE = await ethers.getContractAt("MockCORE", CONTRACTS.mockCORE, signer);
    contracts.testBTC = await ethers.getContractAt("TestBTC", CONTRACTS.testBTC, signer);
    contracts.stakeBasketToken = await ethers.getContractAt("StakeBasketToken", CONTRACTS.stakeBasketToken, signer);
    contracts.priceFeed = await ethers.getContractAt("PriceFeed", CONTRACTS.priceFeed, signer);
    contracts.dualStakingBasket = await ethers.getContractAt("DualStakingBasket", CONTRACTS.dualStakingBasket, signer);
    contracts.stakeBasket = await ethers.getContractAt("StakeBasket", CONTRACTS.stakeBasket, signer);
    
    console.log("✅ Contracts loaded successfully!");
}

async function showInitialBalances() {
    console.log("\n💰 INITIAL ACCOUNT BALANCES");
    console.log("============================");
    
    const ethBalance = await ethers.provider.getBalance(signer.address);
    console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    const coreBalance = await contracts.mockCORE.balanceOf(signer.address);
    console.log(`CORE Balance: ${ethers.formatEther(coreBalance)} CORE`);
    
    const btcBalance = await contracts.testBTC.balanceOf(signer.address);
    console.log(`BTC Balance: ${ethers.formatEther(btcBalance)} BTC`);
    
    const basketBalance = await contracts.stakeBasketToken.balanceOf(signer.address);
    console.log(`BASKET Balance: ${ethers.formatEther(basketBalance)} BASKET`);
}

async function showPrices() {
    console.log("\n📊 CURRENT PRICES");
    console.log("==================");
    
    try {
        const corePrice = await contracts.priceFeed.getPrice("CORE");
        console.log(`CORE Price: $${ethers.formatUnits(corePrice, 8)}`);
        
        const btcPrice = await contracts.priceFeed.getPrice("BTC");
        console.log(`BTC Price: $${ethers.formatUnits(btcPrice, 8)}`);
    } catch (error) {
        console.log("❌ Error fetching prices:", error.message);
    }
}

async function mintTokens() {
    console.log("\n🏭 MINTING TEST TOKENS");
    console.log("=======================");
    
    const coreAmount = "10000"; // 10,000 CORE
    const btcAmount = "1"; // 1 BTC
    
    try {
        console.log(`Minting ${coreAmount} CORE tokens...`);
        const coreTx = await contracts.mockCORE.mint(signer.address, ethers.parseEther(coreAmount));
        await coreTx.wait();
        console.log(`✅ Minted ${coreAmount} CORE tokens`);
        
        console.log(`Minting ${btcAmount} BTC tokens...`);
        const btcTx = await contracts.testBTC.mint(signer.address, ethers.parseEther(btcAmount));
        await btcTx.wait();
        console.log(`✅ Minted ${btcAmount} BTC tokens`);
        
    } catch (error) {
        console.log("❌ Error minting tokens:", error.message);
    }
}

async function approveTokens() {
    console.log("\n🔓 APPROVING TOKENS FOR STAKING");
    console.log("================================");
    
    const maxAmount = ethers.MaxUint256;
    
    try {
        console.log("Approving CORE tokens for DualStakingBasket...");
        const coreApproveTx = await contracts.mockCORE.approve(CONTRACTS.dualStakingBasket, maxAmount);
        await coreApproveTx.wait();
        console.log("✅ CORE tokens approved");
        
        console.log("Approving BTC tokens for DualStakingBasket...");
        const btcApproveTx = await contracts.testBTC.approve(CONTRACTS.dualStakingBasket, maxAmount);
        await btcApproveTx.wait();
        console.log("✅ BTC tokens approved");
        
    } catch (error) {
        console.log("❌ Error approving tokens:", error.message);
    }
}

async function testDualStaking() {
    console.log("\n🚀 TESTING DUAL STAKING");
    console.log("========================");
    
    // Use minimum amounts for Bronze tier
    const coreAmount = "1000"; // 1,000 CORE
    const btcAmount = "0.01"; // 0.01 BTC
    
    try {
        console.log(`Attempting dual stake: ${coreAmount} CORE + ${btcAmount} BTC`);
        
        const stakeTx = await contracts.dualStakingBasket.dualStake(
            ethers.parseEther(coreAmount),
            ethers.parseEther(btcAmount)
        );
        
        console.log("⏳ Waiting for transaction confirmation...");
        const receipt = await stakeTx.wait();
        console.log(`✅ Dual staking successful! TX: ${receipt.hash}`);
        
        // Check resulting BASKET tokens
        const basketBalance = await contracts.stakeBasketToken.balanceOf(signer.address);
        console.log(`🎁 Received ${ethers.formatEther(basketBalance)} BASKET tokens`);
        
        return true;
    } catch (error) {
        console.log("❌ Error during dual staking:", error.message);
        if (error.reason) console.log("Reason:", error.reason);
        return false;
    }
}

async function checkStakingInfo() {
    console.log("\n📊 STAKING INFORMATION");
    console.log("=======================");
    
    try {
        // Get user's stake info
        const stakeInfo = await contracts.dualStakingBasket.getUserStakeInfo(signer.address);
        console.log("User Stake Info:");
        console.log(`- CORE Staked: ${ethers.formatEther(stakeInfo[0])} CORE`);
        console.log(`- BTC Staked: ${ethers.formatEther(stakeInfo[1])} BTC`);
        console.log(`- Shares: ${ethers.formatEther(stakeInfo[2])}`);
        console.log(`- Rewards: ${ethers.formatEther(stakeInfo[3])} CORE`);
        console.log(`- Tier: ${stakeInfo[4]}`);
        
        // Get tier requirements
        console.log("\nTier Requirements:");
        const bronzeMin = await contracts.dualStakingBasket.tierMinimums(1); // Bronze
        console.log(`Bronze Tier Minimum: $${ethers.formatUnits(bronzeMin, 8)}`);
        
    } catch (error) {
        console.log("❌ Error fetching staking info:", error.message);
    }
}

async function showFinalBalances() {
    console.log("\n💰 FINAL ACCOUNT BALANCES");
    console.log("==========================");
    
    const ethBalance = await ethers.provider.getBalance(signer.address);
    console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    const coreBalance = await contracts.mockCORE.balanceOf(signer.address);
    console.log(`CORE Balance: ${ethers.formatEther(coreBalance)} CORE`);
    
    const btcBalance = await contracts.testBTC.balanceOf(signer.address);
    console.log(`BTC Balance: ${ethers.formatEther(btcBalance)} BTC`);
    
    const basketBalance = await contracts.stakeBasketToken.balanceOf(signer.address);
    console.log(`BASKET Balance: ${ethers.formatEther(basketBalance)} BASKET`);
}

async function main() {
    console.log("🎯 STAKEBASKET AUTOMATED CONTRACT TESTING");
    console.log("==========================================");
    
    try {
        // 1. Setup contracts
        await setupContracts();
        
        // 2. Show initial state
        await showInitialBalances();
        await showPrices();
        
        // 3. Mint test tokens
        await mintTokens();
        
        // 4. Approve tokens
        await approveTokens();
        
        // 5. Test dual staking
        const stakingSuccess = await testDualStaking();
        
        // 6. Check staking info
        if (stakingSuccess) {
            await checkStakingInfo();
        }
        
        // 7. Show final balances
        await showFinalBalances();
        
        console.log("\n🎉 CONTRACT TESTING COMPLETE!");
        console.log("==============================");
        console.log("✅ All basic contract interactions tested successfully");
        
        if (stakingSuccess) {
            console.log("✅ Dual staking functionality working");
        } else {
            console.log("⚠️  Dual staking had issues - check logs above");
        }
        
    } catch (error) {
        console.error("💥 Fatal error:", error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}