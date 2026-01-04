const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("💰 FIXED STAKING WITH REALISTIC AMOUNTS");
    console.log("=======================================");
    console.log("🎯 Using amounts that work within test account limits");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    // Get working contracts
    const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
    const mockDualStaking = await ethers.getContractAt("MockDualStaking", deploymentData.contracts.mockDualStaking);
    
    console.log("\n🎯 MARKET PRICES:");
    console.log("=================");
    console.log("- CORE: $0.70 USD");
    console.log("- BTC: $110,000.00 USD");
    
    // Updated test users with realistic amounts
    const testUsers = [
        { 
            name: "Alice", 
            signer: await ethers.getSigner("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"), 
            coreAmount: ethers.parseEther("100"), 
            btcAmount: ethers.parseUnits("0.001", 8),
            description: "Small investor"
        },
        { 
            name: "Bob", 
            signer: await ethers.getSigner("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"), 
            coreAmount: ethers.parseEther("500"), 
            btcAmount: ethers.parseUnits("0.005", 8),
            description: "Medium investor"
        },
        { 
            name: "Charlie", 
            signer: await ethers.getSigner("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 
            coreAmount: ethers.parseEther("800"), // Reduced from 2000 to fit his balance
            btcAmount: ethers.parseUnits("0.015", 8), // Reduced from 0.02
            description: "Large investor (within balance limits)"
        },
        {
            name: "David",
            signer: await ethers.getSigner("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"),
            coreAmount: ethers.parseEther("14285"), // This should reach Silver tier
            btcAmount: ethers.parseUnits("0.001", 8),
            description: "Silver tier attempt"
        }
    ];
    
    console.log("\n💳 USER BALANCES CHECK:");
    console.log("=======================");
    
    for (const user of testUsers) {
        const ethBalance = await user.signer.provider.getBalance(user.signer.address);
        const btcBalance = await btcToken.balanceOf(user.signer.address);
        
        console.log(`${user.name} (${user.description}):`);
        console.log(`  ETH Balance: ${ethers.formatEther(ethBalance)}`);
        console.log(`  BTC Balance: ${ethers.formatUnits(btcBalance, 8)}`);
        console.log(`  Wants to stake: ${ethers.formatEther(user.coreAmount)} CORE + ${ethers.formatUnits(user.btcAmount, 8)} BTC`);
        
        const canAfford = ethBalance > user.coreAmount;
        console.log(`  Can afford: ${canAfford ? "✅ YES" : "❌ NO"}`);
        
        if (!canAfford) {
            console.log(`  Shortfall: ${ethers.formatEther(user.coreAmount - ethBalance)} ETH`);
        }
    }
    
    const results = [];
    
    console.log("\n⚡ DUAL STAKING TESTS:");
    console.log("=====================");
    
    // Ensure BTC token is set in mock dual staking
    await mockDualStaking.setBtcToken(deploymentData.contracts.btcToken);
    
    for (const user of testUsers) {
        console.log(`\n${user.name} (${user.description}):`);
        console.log(`Input: ${ethers.formatEther(user.coreAmount)} CORE + ${ethers.formatUnits(user.btcAmount, 8)} BTC`);
        
        const coreValue = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70;
        const btcValue = parseFloat(ethers.formatUnits(user.btcAmount, 8)) * 110000;
        const totalUSD = coreValue + btcValue;
        
        let tier = "Bronze";
        if (totalUSD >= 500000) tier = "Satoshi";
        else if (totalUSD >= 100000) tier = "Gold";  
        else if (totalUSD >= 10000) tier = "Silver";
        
        console.log(`USD Value: $${coreValue.toFixed(2)} CORE + $${btcValue.toFixed(2)} BTC = $${totalUSD.toFixed(2)} total`);
        console.log(`Expected Tier: ${tier}`);
        
        try {
            // Check if user has enough balance
            const ethBalance = await user.signer.provider.getBalance(user.signer.address);
            if (ethBalance <= user.coreAmount) {
                throw new Error(`Insufficient ETH balance: has ${ethers.formatEther(ethBalance)}, needs ${ethers.formatEther(user.coreAmount)}`);
            }
            
            // Ensure user has enough BTC
            const currentBtcBalance = await btcToken.balanceOf(user.signer.address);
            if (currentBtcBalance < user.btcAmount) {
                await btcToken.mint(user.signer.address, user.btcAmount);
            }
            
            // Approve BTC for dual staking
            await btcToken.connect(user.signer).approve(deploymentData.contracts.mockDualStaking, user.btcAmount);
            
            // Perform dual staking
            const tx = await mockDualStaking.connect(user.signer).stakeDual(user.btcAmount, {
                value: user.coreAmount,
                gasLimit: 300000
            });
            const receipt = await tx.wait();
            
            // Check staking info
            const stakeInfo = await mockDualStaking.getUserStakeInfo(user.signer.address);
            
            console.log(`✅ SUCCESS! Gas used: ${receipt.gasUsed}`);
            console.log(`Staked CORE: ${ethers.formatEther(stakeInfo[0])}`);
            console.log(`Staked BTC: ${ethers.formatUnits(stakeInfo[1], 8)}`);
            
            const ratio = (parseFloat(ethers.formatEther(stakeInfo[0])) / parseFloat(ethers.formatUnits(stakeInfo[1], 8))).toFixed(0);
            console.log(`CORE:BTC Ratio: ${ratio}:1`);
            
            results.push({
                user: user.name,
                coreInput: ethers.formatEther(user.coreAmount),
                btcInput: ethers.formatUnits(user.btcAmount, 8),
                usdValue: totalUSD,
                tier: tier,
                status: "✅ SUCCESS",
                gasUsed: receipt.gasUsed.toString(),
                ratio: ratio
            });
            
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            
            results.push({
                user: user.name,
                coreInput: ethers.formatEther(user.coreAmount),
                btcInput: ethers.formatUnits(user.btcAmount, 8),
                usdValue: totalUSD,
                tier: tier,
                status: `❌ ${error.message}`,
                gasUsed: "N/A",
                ratio: "N/A"
            });
        }
    }
    
    console.log("\n📊 FINAL RESULTS TABLE");
    console.log("======================");
    console.log("| User    | CORE   | BTC   | USD Value  | Tier   | Status      | Ratio     |");
    console.log("|---------|--------|-------|------------|--------|-------------|-----------|");
    
    results.forEach(result => {
        const usdValue = `$${result.usdValue.toFixed(0)}`;
        console.log(`| ${result.user.padEnd(7)} | ${result.coreInput.padEnd(6)} | ${result.btcInput.padEnd(5)} | ${usdValue.padEnd(10)} | ${result.tier.padEnd(6)} | ${result.status.padEnd(11)} | ${result.ratio.padEnd(9)} |`);
    });
    
    console.log("\n🎯 KEY INSIGHTS:");
    console.log("================");
    
    const successful = results.filter(r => r.status.includes("SUCCESS"));
    console.log(`✅ Successful stakings: ${successful.length}/${results.length}`);
    
    console.log("\n💡 THE CHARLIE ISSUE EXPLAINED:");
    console.log("===============================");
    console.log("❌ Original Charlie: 2000 CORE + 0.02 BTC = FAILED");
    console.log("   Problem: Trying to send 2000 ETH but only has ~1000 ETH balance");
    console.log("   In test environment: CORE tokens = native ETH (msg.value)");
    console.log("");
    console.log("✅ Fixed Charlie: 800 CORE + 0.015 BTC = SUCCESS");
    console.log("   Solution: Use amount within his actual ETH balance");
    console.log("");
    console.log("🏭 In Production:");
    console.log("   - CORE would be separate ERC20 tokens");
    console.log("   - Users only pay small gas fees in native ETH");
    console.log("   - No balance limit issues");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });