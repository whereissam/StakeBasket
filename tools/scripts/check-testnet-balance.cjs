const hre = require("hardhat");

async function main() {
    console.log("🔍 Checking Core Testnet2 Balance");
    console.log("================================\n");

    try {
        // Get signer
        const [deployer] = await hre.ethers.getSigners();
        console.log(`👤 Address: ${deployer.address}`);
        console.log(`📡 Network: ${hre.network.name}`);
        console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
        console.log(`🌐 RPC URL: ${hre.network.config.url}\n`);

        // Check balance
        const balance = await deployer.provider.getBalance(deployer.address);
        const balanceInCORE = hre.ethers.formatEther(balance);
        
        console.log(`💰 Balance: ${balanceInCORE} CORE`);
        
        if (balance === 0n) {
            console.log("\n❌ No CORE tokens found!");
            console.log("📝 To get testnet CORE tokens:");
            console.log("   1. Visit: https://scan.test2.btcs.network/faucet");
            console.log(`   2. Enter address: ${deployer.address}`);
            console.log("   3. Complete verification and request tokens");
            console.log("   4. Wait 1-2 minutes and run this script again");
            
            console.log("\n🔗 Block Explorer:");
            console.log(`   https://scan.test2.btcs.network/address/${deployer.address}`);
        } else if (balance < hre.ethers.parseEther("0.1")) {
            console.log("\n⚠️  Low balance detected!");
            console.log("💡 You may need more CORE tokens for contract deployment");
            console.log("   Recommended: At least 0.5 CORE for deployment");
        } else {
            console.log("\n✅ Balance looks good for deployment!");
            console.log("🚀 Ready to deploy contracts");
            
            // Estimate deployment cost
            const gasPrice = await deployer.provider.getFeeData();
            const estimatedCost = gasPrice.gasPrice * BigInt(8000000); // Rough estimate
            
            console.log(`⛽ Estimated deployment cost: ~${hre.ethers.formatEther(estimatedCost)} CORE`);
            
            if (balance > estimatedCost * BigInt(2)) {
                console.log("✅ Sufficient balance for deployment");
            } else {
                console.log("⚠️  Balance may be tight. Consider getting more tokens");
            }
        }

        // Check network connectivity
        console.log("\n🌐 Network Status:");
        try {
            const blockNumber = await deployer.provider.getBlockNumber();
            console.log(`✅ Connected to network (latest block: ${blockNumber})`);
        } catch (error) {
            console.log(`❌ Network connection issue: ${error.message}`);
        }

    } catch (error) {
        console.error("\n❌ Error checking balance:");
        console.error(`   ${error.message}`);
        
        if (error.message.includes("could not detect network")) {
            console.log("\n🔧 Possible solutions:");
            console.log("   1. Check your internet connection");
            console.log("   2. Verify RPC URL in hardhat.config.cjs");
            console.log("   3. Try again in a few minutes");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });