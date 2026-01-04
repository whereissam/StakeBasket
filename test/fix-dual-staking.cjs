const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 FIXING DUAL STAKING SYSTEM");
    console.log("=============================");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    console.log("📋 Contract addresses:");
    Object.entries(deploymentData.contracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });
    
    // Get contracts
    const mockDualStaking = await ethers.getContractAt("MockDualStaking", deploymentData.contracts.mockDualStaking);
    const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
    const dualStakingBasket = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    
    console.log("\n🛠️ CONFIGURING MOCK DUAL STAKING");
    console.log("=================================");
    
    // Set BTC token in mock dual staking
    try {
        await mockDualStaking.setBtcToken(deploymentData.contracts.btcToken);
        console.log("✅ BTC token set in MockDualStaking");
    } catch (error) {
        console.log(`❌ Error setting BTC token: ${error.message}`);
    }
    
    // Grant minting permission to dual staking basket
    try {
        const hasRole = await stakeBasketToken.hasRole(
            ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
            deploymentData.contracts.dualStakingBasket
        );
        
        if (!hasRole) {
            console.log("🔑 Granting MINTER_ROLE to DualStakingBasket...");
            await stakeBasketToken.grantRole(
                ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
                deploymentData.contracts.dualStakingBasket
            );
            console.log("✅ MINTER_ROLE granted to DualStakingBasket");
        } else {
            console.log("✅ DualStakingBasket already has MINTER_ROLE");
        }
    } catch (error) {
        console.log(`❌ Error with minter role: ${error.message}`);
    }
    
    console.log("\n🧪 TESTING DUAL STAKING SYSTEM");
    console.log("==============================");
    
    const signers = await ethers.getSigners();
    const alice = signers[1];
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    
    // Test amounts
    const coreAmount = ethers.parseEther("100");
    const btcAmount = ethers.parseUnits("0.001", 8);
    
    console.log(`Testing with Alice: ${alice.address}`);
    console.log(`CORE amount: ${ethers.formatEther(coreAmount)}`);
    console.log(`BTC amount: ${ethers.formatUnits(btcAmount, 8)}`);
    
    // Check balances
    const aliceCoreBalance = await mockCORE.balanceOf(alice.address);
    const aliceBtcBalance = await btcToken.balanceOf(alice.address);
    console.log(`Alice CORE balance: ${ethers.formatEther(aliceCoreBalance)}`);
    console.log(`Alice BTC balance: ${ethers.formatUnits(aliceBtcBalance, 8)}`);
    
    if (aliceCoreBalance < coreAmount) {
        console.log("❌ Insufficient CORE balance");
        return;
    }
    if (aliceBtcBalance < btcAmount) {
        console.log("❌ Insufficient BTC balance");
        return;
    }
    
    // Check contract state
    console.log("\n📊 CONTRACT STATE CHECK:");
    try {
        const isPaused = await dualStakingBasket.paused();
        console.log(`DualStakingBasket paused: ${isPaused}`);
        
        const targetTier = await dualStakingBasket.targetTier();
        console.log(`Target tier: ${targetTier}`);
        
        const poolInfo = await dualStakingBasket.getPoolInfo();
        console.log(`Pool CORE: ${ethers.formatEther(poolInfo[0])}`);
        console.log(`Pool BTC: ${ethers.formatUnits(poolInfo[1], 8)}`);
        console.log(`Total Value USD: ${poolInfo[4]}`);
        
    } catch (error) {
        console.log(`❌ Error reading contract state: ${error.message}`);
    }
    
    // Test the deposit step by step
    console.log("\n💰 STEP BY STEP DEPOSIT TEST:");
    console.log("============================");
    
    try {
        // Step 1: Approve tokens
        console.log("Step 1: Approving tokens...");
        await mockCORE.connect(alice).approve(deploymentData.contracts.dualStakingBasket, coreAmount);
        await btcToken.connect(alice).approve(deploymentData.contracts.dualStakingBasket, btcAmount);
        console.log("✅ Tokens approved");
        
        // Step 2: Check tier calculation
        console.log("\nStep 2: Checking tier calculation...");
        try {
            // This should work since we're just calculating tier
            const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
            const corePrice = await priceFeed.getCorePrice();
            const btcPrice = await priceFeed.getSolvBTCPrice();
            
            console.log(`CORE price: $${ethers.formatEther(corePrice)}`);
            console.log(`BTC price: $${ethers.formatEther(btcPrice)}`);
            
            const coreValue = (coreAmount * corePrice) / ethers.parseEther("1");
            const btcValue = (btcAmount * btcPrice) / ethers.parseUnits("1", 8);
            const totalValue = coreValue + btcValue;
            
            console.log(`CORE value: $${ethers.formatEther(coreValue)}`);
            console.log(`BTC value: $${ethers.formatEther(btcValue)}`);
            console.log(`Total value: $${ethers.formatEther(totalValue)}`);
            
        } catch (error) {
            console.log(`❌ Error in tier calculation: ${error.message}`);
        }
        
        // Step 3: Try deposit with more gas and specific error handling
        console.log("\nStep 3: Attempting deposit...");
        
        try {
            // Estimate gas first
            const gasEstimate = await dualStakingBasket.connect(alice).deposit.estimateGas(coreAmount, btcAmount);
            console.log(`Gas estimate: ${gasEstimate}`);
            
            const tx = await dualStakingBasket.connect(alice).deposit(coreAmount, btcAmount, {
                gasLimit: gasEstimate + 100000n // Add buffer
            });
            
            console.log(`✅ Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Deposit successful! Gas used: ${receipt.gasUsed}`);
            
            // Check results
            const basketBalance = await stakeBasketToken.balanceOf(alice.address);
            console.log(`Alice BASKET tokens: ${ethers.formatEther(basketBalance)}`);
            
        } catch (error) {
            console.log(`❌ Deposit failed: ${error.message}`);
            
            // Try to decode the error
            if (error.data) {
                try {
                    const decoded = dualStakingBasket.interface.parseError(error.data);
                    console.log(`Decoded error: ${decoded.name}`);
                    if (decoded.args.length > 0) {
                        console.log(`Error args:`, decoded.args);
                    }
                } catch (decodeErr) {
                    console.log(`Raw error data: ${error.data}`);
                }
            }
            
            // Let's try a simpler approach - direct mock dual staking test
            console.log("\n🔄 TESTING MOCK DUAL STAKING DIRECTLY:");
            try {
                // Approve BTC to mock dual staking
                await btcToken.connect(alice).approve(deploymentData.contracts.mockDualStaking, btcAmount);
                
                // Test direct dual staking
                const directTx = await mockDualStaking.connect(alice).stakeDual(btcAmount, {
                    value: coreAmount
                });
                const directReceipt = await directTx.wait();
                console.log(`✅ Direct dual staking successful! Gas: ${directReceipt.gasUsed}`);
                
                // Check stake
                const stakeInfo = await mockDualStaking.getUserStakeInfo(alice.address);
                console.log(`Alice staked CORE: ${ethers.formatEther(stakeInfo[0])}`);
                console.log(`Alice staked BTC: ${ethers.formatUnits(stakeInfo[1], 8)}`);
                
            } catch (directError) {
                console.log(`❌ Direct dual staking also failed: ${directError.message}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ Setup failed: ${error.message}`);
        console.error(error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });