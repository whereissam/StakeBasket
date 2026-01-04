const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 FIXING MINTING PERMISSIONS FOR REAL DATA");
    console.log("==========================================");
    console.log("🎯 Fix StakeBasketToken permissions so DualStakingBasket can mint");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    // Get contracts
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    
    console.log("\n🔑 STEP 1: FIX STAKEBASKETTOKEN MINTING PERMISSIONS");
    console.log("==================================================");
    
    try {
        // Check current authorized contract
        const currentStakeBasket = await stakeBasketToken.stakeBasketContract();
        console.log(`Current authorized contract: ${currentStakeBasket}`);
        console.log(`DualStakingBasket address: ${deploymentData.contracts.dualStakingBasket}`);
        console.log(`Regular StakeBasket address: ${deploymentData.contracts.stakeBasket}`);
        
        // Check if deployer is owner
        const owner = await stakeBasketToken.owner();
        console.log(`StakeBasketToken owner: ${owner}`);
        console.log(`Deployer address: ${deployer.address}`);
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✅ Deployer is owner, can set permissions");
            
            // Set DualStakingBasket as authorized minter
            console.log("Setting DualStakingBasket as authorized minter...");
            await stakeBasketToken.emergencySetStakeBasketContract(deploymentData.contracts.dualStakingBasket);
            console.log("✅ DualStakingBasket set as authorized minter");
            
            // Verify the change
            const newStakeBasket = await stakeBasketToken.stakeBasketContract();
            console.log(`New authorized contract: ${newStakeBasket}`);
            
            if (newStakeBasket.toLowerCase() === deploymentData.contracts.dualStakingBasket.toLowerCase()) {
                console.log("✅ Permission fix successful!");
            } else {
                console.log("❌ Permission fix failed!");
                return;
            }
            
        } else {
            console.log("❌ Deployer is not owner, cannot set permissions");
            return;
        }
        
    } catch (error) {
        console.log(`❌ Permission fix failed: ${error.message}`);
        return;
    }
    
    console.log("\n💰 STEP 2: TEST REAL DUALSTAKINGBASKET MINTING");
    console.log("==============================================");
    
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
            coreAmount: ethers.parseEther("120"), // Reduced for balance
            btcAmount: ethers.parseUnits("0.002", 8)
        }
    ];
    
    const realResults = [];
    
    for (const user of testUsers) {
        console.log(`\n${user.name} - FIXED DualStakingBasket Test:`);
        console.log("=========================================");
        console.log(`Input: ${ethers.formatEther(user.coreAmount)} CORE + ${ethers.formatUnits(user.btcAmount, 8)} BTC`);
        
        const coreValueUSD = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70;
        const btcValueUSD = parseFloat(ethers.formatUnits(user.btcAmount, 8)) * 110000;
        const totalUSD = coreValueUSD + btcValueUSD;
        
        console.log(`USD Value: $${coreValueUSD.toFixed(2)} + $${btcValueUSD.toFixed(2)} = $${totalUSD.toFixed(2)}`);
        
        try {
            // Setup tokens
            const coreBalance = await mockCORE.balanceOf(user.signer.address);
            if (coreBalance < user.coreAmount) {
                await mockCORE.mint(user.signer.address, user.coreAmount * 2n);
                console.log(`✅ Minted CORE tokens`);
            }
            
            const btcBalance = await btcToken.balanceOf(user.signer.address);
            if (btcBalance < user.btcAmount) {
                await btcToken.mint(user.signer.address, user.btcAmount * 2n);
                console.log(`✅ Minted BTC tokens`);
            }
            
            // Check BASKET balance before
            const basketBefore = await stakeBasketToken.balanceOf(user.signer.address);
            console.log(`BASKET before: ${ethers.formatEther(basketBefore)}`);
            
            // Try ERC20 deposit with fixed permissions
            console.log("🔄 Trying DualStakingBasket.deposit (Fixed Permissions)...");
            
            try {
                // Approve tokens
                await mockCORE.connect(user.signer).approve(deploymentData.contracts.dualStakingBasket, user.coreAmount);
                await btcToken.connect(user.signer).approve(deploymentData.contracts.dualStakingBasket, user.btcAmount);
                console.log("✅ Tokens approved");
                
                // Execute deposit with high gas limit
                const tx = await dualStakingBasket.connect(user.signer).deposit(user.coreAmount, user.btcAmount, {
                    gasLimit: 1000000
                });
                const receipt = await tx.wait();
                console.log(`✅ Transaction successful! Gas: ${receipt.gasUsed}`);
                
                // Check BASKET balance after
                const basketAfter = await stakeBasketToken.balanceOf(user.signer.address);
                const basketReceived = basketAfter - basketBefore;
                
                console.log(`🎉 SUCCESS! BASKET received: ${ethers.formatEther(basketReceived)}`);
                
                const conversionRate = parseFloat(ethers.formatEther(basketReceived)) / totalUSD;
                const basketPerCore = parseFloat(ethers.formatEther(basketReceived)) / parseFloat(ethers.formatEther(user.coreAmount));
                
                console.log(`Conversion rate: ${conversionRate.toFixed(6)} BASKET per USD`);
                console.log(`Core efficiency: ${basketPerCore.toFixed(6)} BASKET per CORE`);
                
                // Check pool state
                const poolInfo = await dualStakingBasket.getPoolInfo();
                console.log(`Pool state - Total USD: ${poolInfo[4]}, Share price: ${ethers.formatEther(poolInfo[5])}`);
                
                realResults.push({
                    user: user.name,
                    method: "Fixed DualStakingBasket",
                    coreInput: ethers.formatEther(user.coreAmount),
                    btcInput: ethers.formatUnits(user.btcAmount, 8),
                    usdValue: totalUSD,
                    basketReceived: ethers.formatEther(basketReceived),
                    conversionRate: conversionRate,
                    basketPerCore: basketPerCore,
                    sharePrice: ethers.formatEther(poolInfo[5]),
                    status: "✅ SUCCESS (REAL!)",
                    gasUsed: receipt.gasUsed.toString(),
                    txHash: receipt.hash
                });
                
            } catch (erc20Error) {
                console.log(`❌ ERC20 deposit failed: ${erc20Error.message}`);
                
                // Try native CORE as fallback
                console.log("🔄 Trying DualStakingBasket.depositNativeCORE...");
                
                try {
                    const ethBalance = await user.signer.provider.getBalance(user.signer.address);
                    console.log(`User ETH balance: ${ethers.formatEther(ethBalance)}`);
                    
                    if (ethBalance > user.coreAmount + ethers.parseEther("1")) {
                        await btcToken.connect(user.signer).approve(deploymentData.contracts.dualStakingBasket, user.btcAmount);
                        
                        const tx2 = await dualStakingBasket.connect(user.signer).depositNativeCORE(user.btcAmount, {
                            value: user.coreAmount,
                            gasLimit: 1000000
                        });
                        const receipt2 = await tx2.wait();
                        console.log(`✅ Native deposit successful! Gas: ${receipt2.gasUsed}`);
                        
                        const basketAfter2 = await stakeBasketToken.balanceOf(user.signer.address);
                        const basketReceived2 = basketAfter2 - basketBefore;
                        
                        console.log(`🎉 SUCCESS! BASKET received: ${ethers.formatEther(basketReceived2)}`);
                        
                        const conversionRate2 = parseFloat(ethers.formatEther(basketReceived2)) / totalUSD;
                        const basketPerCore2 = parseFloat(ethers.formatEther(basketReceived2)) / parseFloat(ethers.formatEther(user.coreAmount));
                        
                        const poolInfo2 = await dualStakingBasket.getPoolInfo();
                        
                        realResults.push({
                            user: user.name,
                            method: "Fixed Native DualStaking",
                            coreInput: ethers.formatEther(user.coreAmount),
                            btcInput: ethers.formatUnits(user.btcAmount, 8),
                            usdValue: totalUSD,
                            basketReceived: ethers.formatEther(basketReceived2),
                            conversionRate: conversionRate2,
                            basketPerCore: basketPerCore2,
                            sharePrice: ethers.formatEther(poolInfo2[5]),
                            status: "✅ SUCCESS (REAL!)",
                            gasUsed: receipt2.gasUsed.toString(),
                            txHash: receipt2.hash
                        });
                        
                    } else {
                        throw new Error(`Insufficient ETH: ${ethers.formatEther(ethBalance)}`);
                    }
                    
                } catch (nativeError) {
                    console.log(`❌ Native deposit failed: ${nativeError.message}`);
                    
                    realResults.push({
                        user: user.name,
                        method: "Both Failed After Fix",
                        coreInput: ethers.formatEther(user.coreAmount),
                        btcInput: ethers.formatUnits(user.btcAmount, 8),
                        usdValue: totalUSD,
                        basketReceived: "0",
                        conversionRate: 0,
                        basketPerCore: 0,
                        sharePrice: "0",
                        status: `❌ ${nativeError.message}`,
                        gasUsed: "N/A",
                        txHash: "N/A"
                    });
                }
            }
            
        } catch (error) {
            console.log(`❌ Setup failed: ${error.message}`);
            
            realResults.push({
                user: user.name,
                method: "Setup Failed",
                coreInput: ethers.formatEther(user.coreAmount),
                btcInput: ethers.formatUnits(user.btcAmount, 8),
                usdValue: totalUSD,
                basketReceived: "0",
                conversionRate: 0,
                basketPerCore: 0,
                sharePrice: "0",
                status: `❌ Setup: ${error.message}`,
                gasUsed: "N/A",
                txHash: "N/A"
            });
        }
    }
    
    console.log("\n🏀 REAL DUALSTAKINGBASKET RESULTS (FIXED!)");
    console.log("==========================================");
    console.log("| User    | Method               | USD Value | BASKET Received | BASKET/USD | Share Price | Status        |");
    console.log("|---------|----------------------|-----------|-----------------|------------|-------------|---------------|");
    
    realResults.forEach(result => {
        const usdValue = `$${result.usdValue.toFixed(0)}`;
        const convRate = result.conversionRate > 0 ? result.conversionRate.toFixed(4) : "N/A";
        const sharePrice = result.sharePrice !== "0" ? result.sharePrice : "N/A";
        const status = result.status.length > 13 ? result.status.substring(0, 13) : result.status;
        console.log(`| ${result.user.padEnd(7)} | ${result.method.padEnd(20)} | ${usdValue.padEnd(9)} | ${result.basketReceived.padEnd(15)} | ${convRate.padEnd(10)} | ${sharePrice.padEnd(11)} | ${status.padEnd(13)} |`);
    });
    
    const successful = realResults.filter(r => r.status.includes("SUCCESS (REAL!)"));
    
    if (successful.length > 0) {
        console.log("\n🎉 REAL DUALSTAKINGBASKET DATA ACHIEVED!");
        console.log("========================================");
        
        successful.forEach(result => {
            console.log(`\n✅ ${result.user} (${result.method}):`);
            console.log(`  💰 Input: ${result.coreInput} CORE + ${result.btcInput} BTC`);
            console.log(`  💵 USD Value: $${result.usdValue.toFixed(2)}`);
            console.log(`  🏀 BASKET Received: ${result.basketReceived} tokens`);
            console.log(`  📊 Conversion Rate: ${result.conversionRate.toFixed(6)} BASKET per USD`);
            console.log(`  🔗 BASKET per CORE: ${result.basketPerCore.toFixed(6)}`);
            console.log(`  💎 Share Price: ${result.sharePrice}`);
            console.log(`  ⛽ Gas Used: ${result.gasUsed}`);
            console.log(`  🔗 TX Hash: ${result.txHash}`);
        });
        
        const avgUSDRate = successful.reduce((sum, r) => sum + r.conversionRate, 0) / successful.length;
        const avgCoreRate = successful.reduce((sum, r) => sum + r.basketPerCore, 0) / successful.length;
        
        console.log("\n📊 REAL CONVERSION RATES FROM DUALSTAKINGBASKET:");
        console.log("================================================");
        console.log(`🎯 ${avgUSDRate.toFixed(6)} BASKET tokens per USD invested (REAL DATA)`);
        console.log(`🎯 ${avgCoreRate.toFixed(6)} BASKET tokens per CORE invested (REAL DATA)`);
        
        console.log("\n🏆 FINAL REAL FORMULA:");
        console.log("======================");
        console.log(`BASKET Tokens = USD Value × ${avgUSDRate.toFixed(6)}`);
        console.log(`BASKET Tokens = CORE Amount × ${avgCoreRate.toFixed(6)}`);
        
        console.log("\n✅ PERMISSION ISSUE FIXED!");
        console.log("The DualStakingBasket can now mint BASKET tokens properly!");
        
    } else {
        console.log("\n❌ STILL NO REAL DATA - More fixes needed");
    }
    
    console.log("\n🎉 PERMISSION FIX COMPLETE!");
    console.log("===========================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ ERROR:", error.message);
        console.error(error);
        process.exit(1);
    });