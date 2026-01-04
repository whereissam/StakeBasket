const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🏀 EXACT BASKET TOKEN CALCULATION");
    console.log("=================================");
    console.log("📊 Testing the working StakeBasket to show exact BASKET token amounts");
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    // Test the WORKING StakeBasket system (not dual staking)
    const stakeBasket = await ethers.getContractAt("StakeBasket", deploymentData.contracts.stakeBasket);
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    
    console.log("\n💰 TESTING REGULAR STAKING (Working System)");
    console.log("==========================================");
    console.log("This will show you exactly how many BASKET tokens you get!");
    
    const testUsers = [
        { 
            name: "Alice", 
            signer: await ethers.getSigner("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"), 
            coreAmount: ethers.parseEther("100")
        },
        { 
            name: "Bob", 
            signer: await ethers.getSigner("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"), 
            coreAmount: ethers.parseEther("200")
        },
        { 
            name: "Charlie", 
            signer: await ethers.getSigner("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 
            coreAmount: ethers.parseEther("500")
        }
    ];
    
    const results = [];
    
    for (const user of testUsers) {
        console.log(`\n${user.name} Regular Staking Test:`);
        console.log(`========================`);
        console.log(`Input: ${ethers.formatEther(user.coreAmount)} CORE tokens`);
        
        try {
            // Check BASKET balance before
            const basketBefore = await stakeBasketToken.balanceOf(user.signer.address);
            console.log(`BASKET tokens before: ${ethers.formatEther(basketBefore)}`);
            
            // Make sure user has CORE tokens
            const coreBalance = await mockCORE.balanceOf(user.signer.address);
            if (coreBalance < user.coreAmount) {
                await mockCORE.mint(user.signer.address, user.coreAmount);
                console.log(`✅ Minted ${ethers.formatEther(user.coreAmount)} CORE tokens`);
            }
            
            // Approve CORE tokens
            await mockCORE.connect(user.signer).approve(deploymentData.contracts.stakeBasket, user.coreAmount);
            console.log(`✅ Approved ${ethers.formatEther(user.coreAmount)} CORE tokens`);
            
            // Perform deposit
            const tx = await stakeBasket.connect(user.signer).deposit(user.coreAmount, user.signer.address, {
                value: ethers.parseEther("0.1"), // Gas for delegation
                gasLimit: 300000
            });
            const receipt = await tx.wait();
            
            // Check BASKET balance after
            const basketAfter = await stakeBasketToken.balanceOf(user.signer.address);
            const basketReceived = basketAfter - basketBefore;
            
            console.log(`✅ Regular staking SUCCESS!`);
            console.log(`Gas used: ${receipt.gasUsed}`);
            console.log(`BASKET tokens received: ${ethers.formatEther(basketReceived)}`);
            
            // Calculate conversion metrics
            const coreValueUSD = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70; // $0.70 per CORE
            const basketAmount = parseFloat(ethers.formatEther(basketReceived));
            const conversionRate = basketAmount / coreValueUSD;
            
            console.log(`USD Value: $${coreValueUSD.toFixed(2)}`);
            console.log(`Conversion rate: ${conversionRate.toFixed(6)} BASKET per USD`);
            console.log(`BASKET per CORE: ${(basketAmount / parseFloat(ethers.formatEther(user.coreAmount))).toFixed(6)}`);
            
            results.push({
                user: user.name,
                coreInput: ethers.formatEther(user.coreAmount),
                usdValue: coreValueUSD,
                basketReceived: ethers.formatEther(basketReceived),
                conversionRate: conversionRate,
                basketPerCore: basketAmount / parseFloat(ethers.formatEther(user.coreAmount)),
                status: "✅ SUCCESS",
                gasUsed: receipt.gasUsed.toString()
            });
            
        } catch (error) {
            console.log(`❌ Regular staking failed: ${error.message}`);
            
            const coreValueUSD = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70;
            results.push({
                user: user.name,
                coreInput: ethers.formatEther(user.coreAmount),
                usdValue: coreValueUSD,
                basketReceived: "0",
                conversionRate: 0,
                basketPerCore: 0,
                status: `❌ ${error.message.split("(")[0].trim()}`,
                gasUsed: "N/A"
            });
        }
    }
    
    console.log("\n🏀 BASKET TOKEN RESULTS TABLE");
    console.log("=============================");
    console.log("| User    | CORE Input | USD Value | BASKET Received | Rate (BASKET/USD) | Rate (BASKET/CORE) | Status    |");
    console.log("|---------|------------|-----------|-----------------|-------------------|-------------------|-----------|");
    
    results.forEach(result => {
        const usdValue = `$${result.usdValue.toFixed(2)}`;
        const convRate = result.conversionRate > 0 ? result.conversionRate.toFixed(4) : "N/A";
        const coreRate = result.basketPerCore > 0 ? result.basketPerCore.toFixed(4) : "N/A";
        console.log(`| ${result.user.padEnd(7)} | ${result.coreInput.padEnd(10)} | ${usdValue.padEnd(9)} | ${result.basketReceived.padEnd(15)} | ${convRate.padEnd(17)} | ${coreRate.padEnd(17)} | ${result.status.padEnd(9)} |`);
    });
    
    console.log("\n💰 EXACT BASKET TOKEN CALCULATION:");
    console.log("==================================");
    
    const successful = results.filter(r => r.status.includes("SUCCESS"));
    if (successful.length > 0) {
        console.log("✅ BASKET TOKEN FORMULA DISCOVERED:");
        console.log("");
        
        successful.forEach(result => {
            console.log(`${result.user}: ${result.coreInput} CORE → ${result.basketReceived} BASKET`);
            console.log(`  USD Value: $${result.usdValue.toFixed(2)}`);
            console.log(`  Rate: ${result.conversionRate.toFixed(6)} BASKET per USD`);
            console.log(`  Rate: ${result.basketPerCore.toFixed(6)} BASKET per CORE`);
            console.log("");
        });
        
        const avgUSDRate = successful.reduce((sum, r) => sum + r.conversionRate, 0) / successful.length;
        const avgCoreRate = successful.reduce((sum, r) => sum + r.basketPerCore, 0) / successful.length;
        
        console.log("📈 AVERAGE CONVERSION RATES:");
        console.log(`- ${avgUSDRate.toFixed(6)} BASKET tokens per USD invested`);
        console.log(`- ${avgCoreRate.toFixed(6)} BASKET tokens per CORE invested`);
        console.log("");
        console.log("🎯 FORMULA:");
        console.log(`BASKET Tokens = CORE Amount × ${avgCoreRate.toFixed(6)}`);
        console.log(`BASKET Tokens = USD Value × ${avgUSDRate.toFixed(6)}`);
        
    } else {
        console.log("❌ No successful BASKET token minting found");
        console.log("The DualStakingBasket contract has deployment/permission issues");
        console.log("But MockDualStaking works for direct staking without BASKET tokens");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });