const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 FIXING PERMISSIONS AND GETTING REAL DATA");
    console.log("===========================================");
    console.log("🎯 Fix all permission issues and get ACTUAL BASKET tokens from DualStakingBasket");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    // Get contracts
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    
    console.log("\n🔑 STEP 1: FIX STAKEBASKETTOKEN PERMISSIONS");
    console.log("============================================");
    
    try {
        // Check if StakeBasketToken uses AccessControl or Ownable
        console.log("Checking StakeBasketToken permission system...");
        
        // Try AccessControl first
        try {
            const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
            const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
            
            const hasAdminRole = await stakeBasketToken.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
            console.log(`✅ Deployer has admin role: ${hasAdminRole}`);
            
            if (hasAdminRole) {
                // Grant minter role to DualStakingBasket
                const hasMinterRole = await stakeBasketToken.hasRole(MINTER_ROLE, deploymentData.contracts.dualStakingBasket);
                console.log(`Current minter role for DualStakingBasket: ${hasMinterRole}`);
                
                if (!hasMinterRole) {
                    await stakeBasketToken.grantRole(MINTER_ROLE, deploymentData.contracts.dualStakingBasket);
                    console.log("✅ Granted MINTER_ROLE to DualStakingBasket");
                }
                
                // Also grant to deployer for testing
                const deployerHasMinter = await stakeBasketToken.hasRole(MINTER_ROLE, deployer.address);
                if (!deployerHasMinter) {
                    await stakeBasketToken.grantRole(MINTER_ROLE, deployer.address);
                    console.log("✅ Granted MINTER_ROLE to deployer");
                }
                
            } else {
                console.log("❌ Deployer doesn't have admin role, checking owner...");
                
                // Try Ownable
                try {
                    const owner = await stakeBasketToken.owner();
                    console.log(`StakeBasketToken owner: ${owner}`);
                    
                    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                        console.log("✅ Deployer is owner, permissions should work");
                    } else {
                        console.log("❌ Deployer is not owner, need to transfer ownership");
                    }
                } catch (ownerError) {
                    console.log(`⚠️ No owner function: ${ownerError.message}`);
                }
            }
            
        } catch (accessError) {
            console.log(`⚠️ AccessControl not available: ${accessError.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Permission check failed: ${error.message}`);
    }
    
    console.log("\n🔧 STEP 2: FIX DUALSTAKINGBASKET REFERENCES");
    console.log("===========================================");
    
    try {
        // Update DualStakingBasket to use new contracts
        console.log("Updating DualStakingBasket contract references...");
        
        // Update price feed
        await dualStakingBasket.setPriceFeed(deploymentData.contracts.priceFeed);
        console.log("✅ Updated PriceFeed reference");
        
        // Check current state
        const isPaused = await dualStakingBasket.paused();
        console.log(`DualStakingBasket paused: ${isPaused}`);
        
        const targetTier = await dualStakingBasket.targetTier();
        console.log(`Target tier: ${targetTier}`);
        
        const poolInfo = await dualStakingBasket.getPoolInfo();
        console.log(`Pool info - CORE: ${ethers.formatEther(poolInfo[0])}, BTC: ${ethers.formatUnits(poolInfo[1], 8)}`);
        
    } catch (error) {
        console.log(`❌ DualStakingBasket setup failed: ${error.message}`);
    }
    
    console.log("\n💰 STEP 3: REAL DUAL STAKING BASKET TEST");
    console.log("========================================");
    
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
            coreAmount: ethers.parseEther("150"), // Reduced to fit balance
            btcAmount: ethers.parseUnits("0.002", 8)
        }
    ];
    
    const realResults = [];
    
    for (const user of testUsers) {
        console.log(`\n${user.name} REAL DualStakingBasket Test:`);
        console.log("=====================================");
        console.log(`Input: ${ethers.formatEther(user.coreAmount)} CORE + ${ethers.formatUnits(user.btcAmount, 8)} BTC`);
        
        const coreValueUSD = parseFloat(ethers.formatEther(user.coreAmount)) * 0.70;
        const btcValueUSD = parseFloat(ethers.formatUnits(user.btcAmount, 8)) * 110000;
        const totalUSD = coreValueUSD + btcValueUSD;
        
        console.log(`USD Value: $${coreValueUSD.toFixed(2)} + $${btcValueUSD.toFixed(2)} = $${totalUSD.toFixed(2)}`);
        
        try {
            // Setup: Make sure user has tokens
            const coreBalance = await mockCORE.balanceOf(user.signer.address);
            if (coreBalance < user.coreAmount) {
                await mockCORE.mint(user.signer.address, user.coreAmount * 2n); // Extra for safety
                console.log(`✅ Minted CORE tokens`);
            }
            
            const btcBalance = await btcToken.balanceOf(user.signer.address);
            if (btcBalance < user.btcAmount) {
                await btcToken.mint(user.signer.address, user.btcAmount * 2n); // Extra for safety
                console.log(`✅ Minted BTC tokens`);
            }
            
            // Check BASKET balance before
            const basketBefore = await stakeBasketToken.balanceOf(user.signer.address);
            console.log(`BASKET before: ${ethers.formatEther(basketBefore)}`);
            
            // Try the fixed DualStakingBasket with ERC20 CORE
            console.log("🔄 Trying DualStakingBasket.deposit (ERC20)...");
            
            try {
                // Approve tokens
                await mockCORE.connect(user.signer).approve(deploymentData.contracts.dualStakingBasket, user.coreAmount);
                await btcToken.connect(user.signer).approve(deploymentData.contracts.dualStakingBasket, user.btcAmount);
                console.log("✅ Tokens approved");
                
                // Execute deposit
                const tx = await dualStakingBasket.connect(user.signer).deposit(user.coreAmount, user.btcAmount, {
                    gasLimit: 1000000 // High gas limit
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
                console.log(`Core rate: ${basketPerCore.toFixed(6)} BASKET per CORE`);
                
                realResults.push({
                    user: user.name,
                    method: "DualStakingBasket ERC20",
                    coreInput: ethers.formatEther(user.coreAmount),
                    btcInput: ethers.formatUnits(user.btcAmount, 8),
                    usdValue: totalUSD,
                    basketReceived: ethers.formatEther(basketReceived),
                    conversionRate: conversionRate,
                    basketPerCore: basketPerCore,
                    status: "✅ SUCCESS (REAL)",
                    gasUsed: receipt.gasUsed.toString(),
                    txHash: receipt.hash
                });
                
                // Also check pool state after deposit
                const poolInfoAfter = await dualStakingBasket.getPoolInfo();
                console.log(`Pool after deposit - CORE: ${ethers.formatEther(poolInfoAfter[0])}, BTC: ${ethers.formatUnits(poolInfoAfter[1], 8)}, USD: ${poolInfoAfter[4]}`);
                
            } catch (erc20Error) {
                console.log(`❌ ERC20 deposit failed: ${erc20Error.message}`);
                
                // Try native CORE deposit
                console.log("🔄 Trying DualStakingBasket.depositNativeCORE...");
                
                try {
                    // Check user ETH balance
                    const ethBalance = await user.signer.provider.getBalance(user.signer.address);
                    console.log(`User ETH balance: ${ethers.formatEther(ethBalance)}`);
                    
                    if (ethBalance > user.coreAmount + ethers.parseEther("1")) { // Need extra for gas
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
                        
                        realResults.push({
                            user: user.name,
                            method: "DualStakingBasket Native",
                            coreInput: ethers.formatEther(user.coreAmount),
                            btcInput: ethers.formatUnits(user.btcAmount, 8),
                            usdValue: totalUSD,
                            basketReceived: ethers.formatEther(basketReceived2),
                            conversionRate: conversionRate2,
                            basketPerCore: basketPerCore2,
                            status: "✅ SUCCESS (REAL)",
                            gasUsed: receipt2.gasUsed.toString(),
                            txHash: receipt2.hash
                        });
                        
                    } else {
                        throw new Error(`Insufficient ETH balance: ${ethers.formatEther(ethBalance)}`);
                    }
                    
                } catch (nativeError) {
                    console.log(`❌ Native deposit failed: ${nativeError.message}`);
                    
                    realResults.push({
                        user: user.name,
                        method: "Both Failed",
                        coreInput: ethers.formatEther(user.coreAmount),
                        btcInput: ethers.formatUnits(user.btcAmount, 8),
                        usdValue: totalUSD,
                        basketReceived: "0",
                        conversionRate: 0,
                        basketPerCore: 0,
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
                status: `❌ Setup: ${error.message}`,
                gasUsed: "N/A",
                txHash: "N/A"
            });
        }
    }
    
    console.log("\n🏀 REAL DUALSTAKINGBASKET RESULTS");
    console.log("=================================");
    console.log("| User    | Method            | Input          | USD Value | BASKET Received | BASKET/USD | TX Hash  |");
    console.log("|---------|-------------------|----------------|-----------|-----------------|------------|----------|");
    
    realResults.forEach(result => {
        const input = `${result.coreInput}+${result.btcInput}`;
        const usdValue = `$${result.usdValue.toFixed(0)}`;
        const convRate = result.conversionRate > 0 ? result.conversionRate.toFixed(4) : "N/A";
        const txHash = result.txHash !== "N/A" ? result.txHash.substring(0, 8) + "..." : "N/A";
        console.log(`| ${result.user.padEnd(7)} | ${result.method.padEnd(17)} | ${input.padEnd(14)} | ${usdValue.padEnd(9)} | ${result.basketReceived.padEnd(15)} | ${convRate.padEnd(10)} | ${txHash.padEnd(8)} |`);
    });
    
    const successful = realResults.filter(r => r.status.includes("SUCCESS (REAL)"));
    
    if (successful.length > 0) {
        console.log("\n🎉 REAL DUALSTAKINGBASKET DATA:");
        console.log("===============================");
        
        successful.forEach(result => {
            console.log(`\n✅ ${result.user} (${result.method}):`);
            console.log(`  Input: ${result.coreInput} CORE + ${result.btcInput} BTC`);
            console.log(`  USD Value: $${result.usdValue.toFixed(2)}`);
            console.log(`  BASKET Received: ${result.basketReceived} tokens`);
            console.log(`  Rate: ${result.conversionRate.toFixed(6)} BASKET per USD`);
            console.log(`  Rate: ${result.basketPerCore.toFixed(6)} BASKET per CORE`);
            console.log(`  Gas Used: ${result.gasUsed}`);
            console.log(`  TX Hash: ${result.txHash}`);
        });
        
        const avgUSDRate = successful.reduce((sum, r) => sum + r.conversionRate, 0) / successful.length;
        const avgCoreRate = successful.reduce((sum, r) => sum + r.basketPerCore, 0) / successful.length;
        
        console.log("\n📊 REAL CONVERSION RATES FROM DUALSTAKINGBASKET:");
        console.log(`✅ ${avgUSDRate.toFixed(6)} BASKET tokens per USD (REAL)`);
        console.log(`✅ ${avgCoreRate.toFixed(6)} BASKET tokens per CORE (REAL)`);
        
        console.log("\n🎯 REAL FORMULA FROM WORKING CONTRACT:");
        console.log(`BASKET Tokens = USD Value × ${avgUSDRate.toFixed(6)}`);
        console.log(`BASKET Tokens = CORE Amount × ${avgCoreRate.toFixed(6)}`);
        
    } else {
        console.log("\n❌ NO REAL DUALSTAKINGBASKET DATA");
        console.log("All DualStakingBasket attempts failed - need more fixes");
    }
    
    console.log("\n🎉 PERMISSION FIX AND REAL DATA TEST COMPLETE!");
    console.log("==============================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ ERROR:", error.message);
        console.error(error);
        process.exit(1);
    });