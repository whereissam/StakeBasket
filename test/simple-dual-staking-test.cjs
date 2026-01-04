const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("💰 SIMPLE DUAL STAKING TEST");
    console.log("===========================");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    // Get contracts
    const mockDualStaking = await ethers.getContractAt("MockDualStaking", deploymentData.contracts.mockDualStaking);
    const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    
    // Test users
    const signers = await ethers.getSigners();
    const testUsers = [
        { name: "Alice", signer: signers[1], coreAmount: ethers.parseEther("100"), btcAmount: ethers.parseUnits("0.001", 8) },
        { name: "Bob", signer: signers[2], coreAmount: ethers.parseEther("500"), btcAmount: ethers.parseUnits("0.005", 8) },
        { name: "Charlie", signer: signers[3], coreAmount: ethers.parseEther("2000"), btcAmount: ethers.parseUnits("0.02", 8) }
    ];
    
    console.log("\n🔧 SETUP MOCK DUAL STAKING");
    console.log("==========================");
    
    // Configure mock dual staking
    await mockDualStaking.setBtcToken(deploymentData.contracts.btcToken);
    console.log("✅ BTC token configured in MockDualStaking");
    
    console.log("\n💵 USER BALANCES & APPROVALS");
    console.log("============================");
    
    // Check balances and approve tokens
    for (const user of testUsers) {
        const coreBalance = await mockCORE.balanceOf(user.signer.address);
        const btcBalance = await btcToken.balanceOf(user.signer.address);
        
        console.log(`${user.name} (${user.signer.address}):`);
        console.log(`  CORE: ${ethers.formatEther(coreBalance)}`);
        console.log(`  BTC: ${ethers.formatUnits(btcBalance, 8)}`);
        
        // Approve tokens for mock dual staking
        await btcToken.connect(user.signer).approve(deploymentData.contracts.mockDualStaking, user.btcAmount);
        console.log(`  ✅ Approved ${ethers.formatUnits(user.btcAmount, 8)} BTC`);
    }
    
    console.log("\n⚡ DUAL STAKING TESTS");
    console.log("====================");
    
    const results = [];
    
    for (const user of testUsers) {
        console.log(`\nTesting ${user.name}:`);
        console.log(`Input: ${ethers.formatEther(user.coreAmount)} CORE + ${ethers.formatUnits(user.btcAmount, 8)} BTC`);
        
        try {
            // Calculate USD values
            const coreValue = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70; // $0.70 per CORE
            const btcValue = parseFloat(ethers.formatUnits(user.btcAmount, 8)) * 110000; // $110,000 per BTC
            const totalUSD = coreValue + btcValue;
            
            console.log(`USD Value: $${coreValue.toFixed(2)} CORE + $${btcValue.toFixed(2)} BTC = $${totalUSD.toFixed(2)} total`);
            
            // Determine tier
            let tier = "Bronze";
            if (totalUSD >= 500000) tier = "Satoshi";
            else if (totalUSD >= 100000) tier = "Gold";  
            else if (totalUSD >= 10000) tier = "Silver";
            
            console.log(`Expected Tier: ${tier}`);
            
            // Perform dual staking
            const tx = await mockDualStaking.connect(user.signer).stakeDual(user.btcAmount, {
                value: user.coreAmount
            });
            const receipt = await tx.wait();
            
            console.log(`✅ Dual staking successful! Gas used: ${receipt.gasUsed}`);
            
            // Check staking results
            const stakeInfo = await mockDualStaking.getUserStakeInfo(user.signer.address);
            console.log(`Staked CORE: ${ethers.formatEther(stakeInfo[0])}`);
            console.log(`Staked BTC: ${ethers.formatUnits(stakeInfo[1], 8)}`);
            
            results.push({
                user: user.name,
                address: user.signer.address,
                coreInput: ethers.formatEther(user.coreAmount),
                btcInput: ethers.formatUnits(user.btcAmount, 8),
                coreValue: coreValue,
                btcValue: btcValue,
                totalUSD: totalUSD,
                tier: tier,
                status: "✅ SUCCESS",
                gasUsed: receipt.gasUsed.toString(),
                stakedCore: ethers.formatEther(stakeInfo[0]),
                stakedBtc: ethers.formatUnits(stakeInfo[1], 8)
            });
            
        } catch (error) {
            console.log(`❌ Dual staking failed: ${error.message}`);
            
            const coreValue = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70;
            const btcValue = parseFloat(ethers.formatUnits(user.btcAmount, 8)) * 110000;
            const totalUSD = coreValue + btcValue;
            
            results.push({
                user: user.name,
                address: user.signer.address,
                coreInput: ethers.formatEther(user.coreAmount),
                btcInput: ethers.formatUnits(user.btcAmount, 8),
                coreValue: coreValue,
                btcValue: btcValue,
                totalUSD: totalUSD,
                tier: "N/A",
                status: `❌ ${error.message.split("(")[0].trim()}`,
                gasUsed: "N/A",
                stakedCore: "0",
                stakedBtc: "0"
            });
        }
    }
    
    // Print detailed results
    console.log("\n📊 DUAL STAKING RESULTS TABLE");
    console.log("=============================");
    console.log("| User    | CORE Input | BTC Input | USD Value   | Tier    | Status     | Gas Used |");
    console.log("|---------|------------|-----------|-------------|---------|------------|----------|");
    
    results.forEach(result => {
        const usdValue = `$${result.totalUSD.toFixed(2)}`;
        console.log(`| ${result.user.padEnd(7)} | ${result.coreInput.padEnd(10)} | ${result.btcInput.padEnd(9)} | ${usdValue.padEnd(11)} | ${result.tier.padEnd(7)} | ${result.status.padEnd(10)} | ${result.gasUsed.padEnd(8)} |`);
    });
    
    console.log("\n🎯 KEY FINDINGS:");
    console.log("================");
    
    const successful = results.filter(r => r.status.includes("SUCCESS"));
    const failed = results.filter(r => !r.status.includes("SUCCESS"));
    
    console.log(`✅ Successful dual stakings: ${successful.length}/${results.length}`);
    console.log(`❌ Failed dual stakings: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
        console.log("\n✅ DUAL STAKING WORKS! Here's what we learned:");
        successful.forEach(result => {
            const ratio = (parseFloat(result.coreInput) / parseFloat(result.btcInput)).toFixed(0);
            console.log(`- ${result.user}: ${result.coreInput} CORE + ${result.btcInput} BTC → ${result.tier} tier (${ratio}:1 ratio)`);
        });
    }
    
    if (failed.length > 0) {
        console.log("\n❌ Issues found:");
        failed.forEach(result => {
            console.log(`- ${result.user}: ${result.status}`);
        });
    }
    
    // Test claiming rewards
    if (successful.length > 0) {
        console.log("\n🎁 TESTING REWARD CLAIMING");
        console.log("==========================");
        
        // Wait a moment for rewards to accrue
        console.log("Waiting 1 second for rewards to accrue...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const testUser = successful[0];
        const userSigner = signers.find(s => s.address === testUser.address);
        
        try {
            const balanceBefore = await userSigner.provider.getBalance(userSigner.address);
            
            const claimTx = await mockDualStaking.connect(userSigner).claimRewards();
            const claimReceipt = await claimTx.wait();
            
            const balanceAfter = await userSigner.provider.getBalance(userSigner.address);
            const netReward = balanceAfter - balanceBefore + claimReceipt.gasUsed * claimReceipt.gasPrice;
            
            console.log(`✅ ${testUser.user} claimed rewards: ${ethers.formatEther(netReward)} ETH`);
            
        } catch (error) {
            console.log(`❌ Reward claiming failed: ${error.message}`);
        }
    }
    
    console.log("\n🎉 DUAL STAKING SYSTEM TEST COMPLETE!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });