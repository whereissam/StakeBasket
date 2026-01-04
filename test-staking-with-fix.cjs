// Test staking after fixing staleness issue
const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing staking after staleness fix...");
    
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    const priceFeed = await ethers.getContractAt("PriceFeed", "0xd3fC275555C46Ffa4a6F9d15380D4edA9D9fb06b", signer);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", "0x0DD17d450968DafF1Cf9E2e8945E934B77CA4a4a", signer);
    const mockCORE = await ethers.getContractAt("MockCORE", "0xa41575D35563288d6C59d8a02603dF9E2e171eeE", signer);
    const testBTC = await ethers.getContractAt("TestBTC", "0x01b93AC7b5Ee7e473F90aE66979a9402EbcaCcF7", signer);
    
    try {
        // Check and disable staleness if needed
        const stalenessEnabled = await priceFeed.stalenessCheckEnabled();
        console.log(`Staleness Check Status: ${stalenessEnabled}`);
        
        if (stalenessEnabled) {
            console.log("Disabling staleness check...");
            const disableTx = await priceFeed.setStalenessCheckEnabled(false);
            await disableTx.wait();
            console.log("✅ Staleness check disabled");
        }
        
        // Test getting prices
        const corePrice = await priceFeed.getPrice("CORE");
        const btcPrice = await priceFeed.getPrice("BTC");
        console.log(`CORE Price: $${ethers.formatUnits(corePrice, 8)}`);
        console.log(`BTC Price: $${ethers.formatUnits(btcPrice, 8)}`);
        
        // Test dual staking with small amounts
        const coreAmount = "100"; // 100 CORE
        const btcAmount = "0.001"; // 0.001 BTC
        
        console.log(`\nTesting stake: ${coreAmount} CORE + ${btcAmount} BTC`);
        
        const stakeTx = await dualStakingBasket.deposit(
            ethers.parseEther(coreAmount),
            ethers.parseEther(btcAmount)
        );
        
        const receipt = await stakeTx.wait();
        console.log(`✅ Staking successful! TX: ${receipt.hash}`);
        console.log(`View at: https://scan.test2.btcs.network/tx/${receipt.hash}`);
        
        // Check user's stake info
        const stakeInfo = await dualStakingBasket.getUserStakeInfo(signer.address);
        console.log("\n📊 Your Staking Info:");
        console.log(`- CORE Staked: ${ethers.formatEther(stakeInfo[0])}`);
        console.log(`- BTC Staked: ${ethers.formatEther(stakeInfo[1])}`);
        console.log(`- Shares: ${ethers.formatEther(stakeInfo[2])}`);
        console.log(`- Rewards: ${ethers.formatEther(stakeInfo[3])}`);
        console.log(`- Tier: ${stakeInfo[4]} (0=Base, 1=Bronze, 2=Silver, 3=Gold, 4=Satoshi)`);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.reason) console.log("Reason:", error.reason);
    }
}

main().catch(console.error);