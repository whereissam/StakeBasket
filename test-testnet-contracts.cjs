// Test Core Testnet2 Contracts
const { ethers } = require("hardhat");

// Core Testnet2 contract addresses (from config)
const TESTNET_CONTRACTS = {
    PriceFeed: '0xd3fC275555C46Ffa4a6F9d15380D4edA9D9fb06b',
    StakeBasketToken: '0xf98167f5f4BFC87eD67D8eAe3590B00630f864b6',
    StakeBasket: '0x958C634b197fE5F09ba3012D45B4281F0C278821',
    MockCORE: '0xa41575D35563288d6C59d8a02603dF9E2e171eeE',
    MockCoreBTC: '0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7',
    TestBTC: '0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7', // Same as MockCoreBTC
    DualStakingBasket: '0x0DD17d450968DafF1Cf9E2e8945E934B77CA4a4a',
    MockCoreStaking: '0xd7c4D6f6f0aFCABaAa3B2c514Fb1C2f62cf8326A'
};

let contracts = {};
let signer;

async function setupContracts() {
    console.log("🔄 Setting up Core Testnet2 contracts...");
    
    [signer] = await ethers.getSigners();
    console.log(`👤 Using account: ${signer.address}`);
    
    // Get contract instances
    contracts.mockCORE = await ethers.getContractAt("MockCORE", TESTNET_CONTRACTS.MockCORE, signer);
    contracts.testBTC = await ethers.getContractAt("TestBTC", TESTNET_CONTRACTS.TestBTC, signer);
    contracts.stakeBasketToken = await ethers.getContractAt("StakeBasketToken", TESTNET_CONTRACTS.StakeBasketToken, signer);
    contracts.priceFeed = await ethers.getContractAt("PriceFeed", TESTNET_CONTRACTS.PriceFeed, signer);
    contracts.dualStakingBasket = await ethers.getContractAt("DualStakingBasket", TESTNET_CONTRACTS.DualStakingBasket, signer);
    contracts.stakeBasket = await ethers.getContractAt("StakeBasket", TESTNET_CONTRACTS.StakeBasket, signer);
    
    console.log("✅ Testnet contracts loaded successfully!");
}

async function showAccountInfo() {
    console.log("\n👤 ACCOUNT INFORMATION");
    console.log("=======================");
    
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Account: ${signer.address}`);
    
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`tCORE Balance: ${ethers.formatEther(balance)} tCORE`);
}

async function showTokenBalances() {
    console.log("\n💰 TOKEN BALANCES");
    console.log("==================");
    
    try {
        const coreBalance = await contracts.mockCORE.balanceOf(signer.address);
        console.log(`CORE Tokens: ${ethers.formatEther(coreBalance)}`);
        
        const btcBalance = await contracts.testBTC.balanceOf(signer.address);
        console.log(`BTC Tokens: ${ethers.formatEther(btcBalance)}`);
        
        const basketBalance = await contracts.stakeBasketToken.balanceOf(signer.address);
        console.log(`BASKET Tokens: ${ethers.formatEther(basketBalance)}`);
    } catch (error) {
        console.log("❌ Error fetching token balances:", error.message);
    }
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

async function getTestTokens() {
    console.log("\n🚰 GETTING TEST TOKENS");
    console.log("=======================");
    
    try {
        // Try to get CORE tokens from faucet
        console.log("Requesting CORE tokens from faucet...");
        const coreTx = await contracts.mockCORE.faucet();
        await coreTx.wait();
        console.log("✅ Received CORE tokens from faucet");
        
        // Try to get BTC tokens from faucet
        console.log("Requesting BTC tokens from faucet...");
        const btcTx = await contracts.testBTC.faucet();
        await btcTx.wait();
        console.log("✅ Received BTC tokens from faucet");
        
    } catch (error) {
        console.log("❌ Error getting test tokens:", error.message);
        console.log("Note: You may need to manually mint tokens or the faucet might be rate-limited");
    }
}

async function approveTokensForStaking() {
    console.log("\n🔓 APPROVING TOKENS FOR DUAL STAKING");
    console.log("=====================================");
    
    const maxAmount = ethers.MaxUint256;
    
    try {
        console.log("Approving CORE tokens...");
        const coreApproveTx = await contracts.mockCORE.approve(TESTNET_CONTRACTS.DualStakingBasket, maxAmount);
        await coreApproveTx.wait();
        console.log("✅ CORE tokens approved");
        
        console.log("Approving BTC tokens...");
        const btcApproveTx = await contracts.testBTC.approve(TESTNET_CONTRACTS.DualStakingBasket, maxAmount);
        await btcApproveTx.wait();
        console.log("✅ BTC tokens approved");
        
    } catch (error) {
        console.log("❌ Error approving tokens:", error.message);
    }
}

async function testDualStaking() {
    console.log("\n🚀 TESTING DUAL STAKING");
    console.log("========================");
    
    // Test with minimum amounts for Bronze tier
    const coreAmount = "1000"; // 1,000 CORE (~$1,500 at $1.5/CORE)
    const btcAmount = "0.001"; // 0.001 BTC (~$65 at $65k/BTC)
    
    try {
        console.log(`Attempting to stake: ${coreAmount} CORE + ${btcAmount} BTC`);
        
        // Check balances first
        const coreBalance = await contracts.mockCORE.balanceOf(signer.address);
        const btcBalance = await contracts.testBTC.balanceOf(signer.address);
        
        if (ethers.parseEther(coreAmount) > coreBalance) {
            console.log(`❌ Insufficient CORE balance. Need: ${coreAmount}, Have: ${ethers.formatEther(coreBalance)}`);
            return false;
        }
        
        if (ethers.parseEther(btcAmount) > btcBalance) {
            console.log(`❌ Insufficient BTC balance. Need: ${btcAmount}, Have: ${ethers.formatEther(btcBalance)}`);
            return false;
        }
        
        // Attempt the deposit (using 'deposit' function, not 'dualStake')
        const stakeTx = await contracts.dualStakingBasket.deposit(
            ethers.parseEther(coreAmount),
            ethers.parseEther(btcAmount)
        );
        
        console.log("⏳ Waiting for transaction confirmation...");
        const receipt = await stakeTx.wait();
        console.log(`✅ Dual staking successful! TX: ${receipt.hash}`);
        console.log(`   View on explorer: https://scan.test2.btcs.network/tx/${receipt.hash}`);
        
        // Check resulting BASKET tokens
        const basketBalance = await contracts.stakeBasketToken.balanceOf(signer.address);
        console.log(`🎁 BASKET tokens received: ${ethers.formatEther(basketBalance)}`);
        
        return true;
        
    } catch (error) {
        console.log("❌ Error during dual staking:", error.message);
        if (error.reason) console.log("Reason:", error.reason);
        return false;
    }
}

async function checkStakingStatus() {
    console.log("\n📊 STAKING STATUS");
    console.log("==================");
    
    try {
        // Get user's stake information
        const stakeInfo = await contracts.dualStakingBasket.getUserStakeInfo(signer.address);
        
        console.log("Your Staking Position:");
        console.log(`- CORE Staked: ${ethers.formatEther(stakeInfo[0])}`);
        console.log(`- BTC Staked: ${ethers.formatEther(stakeInfo[1])}`);
        console.log(`- Shares: ${ethers.formatEther(stakeInfo[2])}`);
        console.log(`- Rewards: ${ethers.formatEther(stakeInfo[3])}`);
        console.log(`- Tier: ${stakeInfo[4]} (0=Base, 1=Bronze, 2=Silver, 3=Gold, 4=Satoshi)`);
        
        // Check tier requirements
        const bronzeMin = await contracts.dualStakingBasket.tierMinimums(1);
        console.log(`\nBronze Tier Minimum: $${ethers.formatUnits(bronzeMin, 8)}`);
        
    } catch (error) {
        console.log("❌ Error checking staking status:", error.message);
    }
}

async function main() {
    console.log("🌐 CORE TESTNET2 CONTRACT TESTING");
    console.log("==================================");
    
    try {
        await setupContracts();
        await showAccountInfo();
        await showTokenBalances();
        await showPrices();
        
        // Get test tokens if needed
        await getTestTokens();
        
        // Show updated balances
        await showTokenBalances();
        
        // Approve tokens for staking
        await approveTokensForStaking();
        
        // Test dual staking
        const stakingSuccess = await testDualStaking();
        
        // Check staking status
        if (stakingSuccess) {
            await checkStakingStatus();
        }
        
        // Final balances
        console.log("\n💰 FINAL BALANCES");
        console.log("==================");
        await showTokenBalances();
        
        console.log("\n🎉 TESTNET TESTING COMPLETE!");
        console.log("=============================");
        
        if (stakingSuccess) {
            console.log("✅ Dual staking worked successfully on Core Testnet2!");
            console.log("🌐 You can view your transactions at: https://scan.test2.btcs.network");
        } else {
            console.log("⚠️  Dual staking had issues - check the logs above");
            console.log("💡 Try getting more test tokens or check your balances");
        }
        
        console.log("\n📱 Next step: Test the frontend at http://localhost:3000");
        
    } catch (error) {
        console.error("💥 Error:", error.message);
    }
}

if (require.main === module) {
    main().catch(console.error);
}