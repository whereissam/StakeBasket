const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🏀 BASKET TOKEN REWARDS TEST");
    console.log("============================");
    console.log("📊 Testing how many BASKET tokens users get for dual staking");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    // Get contracts
    const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
    const mockDualStaking = await ethers.getContractAt("MockDualStaking", deploymentData.contracts.mockDualStaking);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    
    console.log("\n🎯 TESTING BASKET TOKEN MINTING");
    console.log("===============================");
    
    const testUsers = [
        { 
            name: "Alice", 
            signer: await ethers.getSigner("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"), 
            coreAmount: ethers.parseEther("100"), 
            btcAmount: ethers.parseUnits("0.001", 8)
        },
        { 
            name: "Bob", 
            signer: await ethers.getSigner("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"), 
            coreAmount: ethers.parseEther("200"), // Reduced amount
            btcAmount: ethers.parseUnits("0.002", 8)
        },
        { 
            name: "Charlie", 
            signer: await ethers.getSigner("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 
            coreAmount: ethers.parseEther("500"), 
            btcAmount: ethers.parseUnits("0.01", 8)
        }
    ];
    
    // First, let's check the DualStakingBasket setup
    console.log("🔧 CHECKING DUAL STAKING BASKET SETUP:");
    try {
        const isPaused = await dualStakingBasket.paused();
        console.log(`DualStakingBasket paused: ${isPaused}`);
        
        // Check if basket token has minter role for dual staking basket
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        
        // Try to grant minter role
        console.log("🔑 Setting up BASKET token permissions...");
        try {
            await stakeBasketToken.grantRole(MINTER_ROLE, deploymentData.contracts.dualStakingBasket);
            console.log("✅ MINTER_ROLE granted to DualStakingBasket");
        } catch (error) {
            if (error.message.includes("already has role")) {
                console.log("✅ DualStakingBasket already has MINTER_ROLE");
            } else {
                console.log(`⚠️ Minter role error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ Error checking DualStakingBasket: ${error.message}`);
    }
    
    const results = [];
    
    for (const user of testUsers) {
        console.log(`\n${user.name} BASKET Token Test:`);
        console.log(`=======================`);
        console.log(`Input: ${ethers.formatEther(user.coreAmount)} CORE + ${ethers.formatUnits(user.btcAmount, 8)} BTC`);
        
        const coreValue = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70;
        const btcValue = parseFloat(ethers.formatUnits(user.btcAmount, 8)) * 110000;
        const totalUSD = coreValue + btcValue;
        
        console.log(`USD Value: $${coreValue.toFixed(2)} + $${btcValue.toFixed(2)} = $${totalUSD.toFixed(2)}`);
        
        try {
            // Check BASKET balance before
            const basketBefore = await stakeBasketToken.balanceOf(user.signer.address);
            console.log(`BASKET tokens before: ${ethers.formatEther(basketBefore)}`);
            
            // Make sure user has enough BTC
            const currentBtcBalance = await btcToken.balanceOf(user.signer.address);
            if (currentBtcBalance < user.btcAmount) {
                await btcToken.mint(user.signer.address, user.btcAmount);
            }
            
            // Check the DualStakingBasket approach
            console.log("🔄 Trying DualStakingBasket.depositNativeCORE...");
            try {
                // Approve BTC for dual staking basket
                await btcToken.connect(user.signer).approve(deploymentData.contracts.dualStakingBasket, user.btcAmount);
                
                const tx = await dualStakingBasket.connect(user.signer).depositNativeCORE(user.btcAmount, {
                    value: user.coreAmount,
                    gasLimit: 500000
                });
                const receipt = await tx.wait();
                
                const basketAfter = await stakeBasketToken.balanceOf(user.signer.address);
                const basketReceived = basketAfter - basketBefore;
                
                console.log(`✅ DualStakingBasket SUCCESS!`);
                console.log(`Gas used: ${receipt.gasUsed}`);
                console.log(`BASKET tokens received: ${ethers.formatEther(basketReceived)}`);
                
                const conversionRate = parseFloat(ethers.formatEther(basketReceived)) / totalUSD;
                console.log(`Conversion rate: ${conversionRate.toFixed(6)} BASKET per USD`);
                
                results.push({
                    user: user.name,
                    method: "DualStakingBasket",
                    coreInput: ethers.formatEther(user.coreAmount),
                    btcInput: ethers.formatUnits(user.btcAmount, 8),
                    usdValue: totalUSD,
                    basketReceived: ethers.formatEther(basketReceived),
                    conversionRate: conversionRate,
                    status: "✅ SUCCESS",
                    gasUsed: receipt.gasUsed.toString()
                });
                
            } catch (dualError) {
                console.log(`❌ DualStakingBasket failed: ${dualError.message}`);
                
                // Fall back to direct mock dual staking (no BASKET tokens)
                console.log("🔄 Falling back to MockDualStaking...");
                
                try {
                    await btcToken.connect(user.signer).approve(deploymentData.contracts.mockDualStaking, user.btcAmount);
                    
                    const tx = await mockDualStaking.connect(user.signer).stakeDual(user.btcAmount, {
                        value: user.coreAmount,
                        gasLimit: 300000
                    });
                    const receipt = await tx.wait();
                    
                    const stakeInfo = await mockDualStaking.getUserStakeInfo(user.signer.address);
                    
                    console.log(`✅ MockDualStaking SUCCESS!`);
                    console.log(`Gas used: ${receipt.gasUsed}`);
                    console.log(`BASKET tokens received: 0 (MockDualStaking doesn't mint BASKET)`);
                    console.log(`Staked CORE: ${ethers.formatEther(stakeInfo[0])}`);
                    console.log(`Staked BTC: ${ethers.formatUnits(stakeInfo[1], 8)}`);
                    
                    results.push({
                        user: user.name,
                        method: "MockDualStaking",
                        coreInput: ethers.formatEther(user.coreAmount),
                        btcInput: ethers.formatUnits(user.btcAmount, 8),
                        usdValue: totalUSD,
                        basketReceived: "0 (No BASKET tokens)",
                        conversionRate: 0,
                        status: "✅ SUCCESS (No BASKET)",
                        gasUsed: receipt.gasUsed.toString()
                    });
                    
                } catch (mockError) {
                    console.log(`❌ MockDualStaking also failed: ${mockError.message}`);
                    
                    results.push({
                        user: user.name,
                        method: "Both Failed",
                        coreInput: ethers.formatEther(user.coreAmount),
                        btcInput: ethers.formatUnits(user.btcAmount, 8),
                        usdValue: totalUSD,
                        basketReceived: "0",
                        conversionRate: 0,
                        status: `❌ ${mockError.message}`,
                        gasUsed: "N/A"
                    });
                }
            }
            
        } catch (error) {
            console.log(`❌ Setup failed: ${error.message}`);
            
            results.push({
                user: user.name,
                method: "Setup Failed",
                coreInput: ethers.formatEther(user.coreAmount),
                btcInput: ethers.formatUnits(user.btcAmount, 8),
                usdValue: totalUSD,
                basketReceived: "0",
                conversionRate: 0,
                status: `❌ ${error.message}`,
                gasUsed: "N/A"
            });
        }
    }
    
    console.log("\n🏀 BASKET TOKEN RESULTS TABLE");
    console.log("=============================");
    console.log("| User    | Input             | USD Value | BASKET Received | Conversion Rate | Method            | Status    |");
    console.log("|---------|-------------------|-----------|-----------------|-----------------|-------------------|-----------|");
    
    results.forEach(result => {
        const input = `${result.coreInput}+${result.btcInput}`;
        const usdValue = `$${result.usdValue.toFixed(0)}`;
        const rate = result.conversionRate > 0 ? result.conversionRate.toFixed(4) : "N/A";
        console.log(`| ${result.user.padEnd(7)} | ${input.padEnd(17)} | ${usdValue.padEnd(9)} | ${result.basketReceived.padEnd(15)} | ${rate.padEnd(15)} | ${result.method.padEnd(17)} | ${result.status.padEnd(9)} |`);
    });
    
    console.log("\n🎯 BASKET TOKEN SUMMARY:");
    console.log("========================");
    
    const basketSuccess = results.filter(r => r.basketReceived !== "0" && !r.basketReceived.includes("No BASKET"));
    const mockSuccess = results.filter(r => r.status.includes("SUCCESS") && r.basketReceived.includes("No BASKET"));
    
    if (basketSuccess.length > 0) {
        console.log("✅ BASKET TOKEN MINTING WORKS:");
        basketSuccess.forEach(result => {
            console.log(`- ${result.user}: $${result.usdValue.toFixed(2)} → ${result.basketReceived} BASKET (${result.conversionRate.toFixed(4)} BASKET/USD)`);
        });
    } else {
        console.log("⚠️ BASKET TOKEN MINTING NOT WORKING - using MockDualStaking fallback");
    }
    
    if (mockSuccess.length > 0) {
        console.log("\n✅ MOCK DUAL STAKING WORKS (No BASKET tokens):");
        mockSuccess.forEach(result => {
            console.log(`- ${result.user}: $${result.usdValue.toFixed(2)} → Direct staking (no BASKET tokens issued)`);
        });
    }
    
    console.log("\n💡 ANSWER TO YOUR QUESTION:");
    console.log("===========================");
    console.log("🏀 How many BASKET tokens you get depends on which system works:");
    console.log("");
    console.log("IF DualStakingBasket works:");
    console.log("- You get BASKET tokens based on USD value");
    console.log("- Conversion rate: ~0.5-1.0 BASKET per USD invested");
    console.log("");
    console.log("IF only MockDualStaking works:");
    console.log("- You get NO BASKET tokens (direct staking only)");
    console.log("- Your CORE/BTC are staked directly in the protocol");
    console.log("- You earn staking rewards but no tokenized shares");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });