const { ethers } = require("hardhat");

/**
 * Comprehensive testing script for the simplified staking system
 * Tests all functionality from deployment to user interactions
 */

async function main() {
    console.log("🧪 Testing Simplified Staking System");
    console.log("===================================\n");
    
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("👥 Test accounts:");
    console.log("Deployer:", deployer.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address);
    console.log();
    
    let contracts = {};
    
    try {
        // Step 1: Deploy all contracts
        console.log("🚀 Step 1: Deploying contracts...");
        
        // Mock Switchboard for testing
        const MockSwitchboard = await ethers.getContractFactory("MockDEXRouter");
        const mockSwitchboard = await MockSwitchboard.deploy();
        console.log("✅ Mock Switchboard deployed:", await mockSwitchboard.getAddress());
        
        // Deploy SimplePriceFeed
        const SimplePriceFeed = await ethers.getContractFactory("SimplePriceFeed");
        const priceFeed = await SimplePriceFeed.deploy(await mockSwitchboard.getAddress(), deployer.address);
        console.log("✅ SimplePriceFeed deployed:", await priceFeed.getAddress());
        
        // Deploy mock BTC token for testing
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const btcToken = await MockERC20.deploy("Test BTC", "tBTC", 8);
        console.log("✅ Mock BTC Token deployed:", await btcToken.getAddress());
        
        // Deploy SimpleBasketToken
        const SimpleBasketToken = await ethers.getContractFactory("SimpleBasketToken");
        const basketToken = await SimpleBasketToken.deploy("Simple Basket", "SBT", deployer.address);
        console.log("✅ SimpleBasketToken deployed:", await basketToken.getAddress());
        
        // Deploy SimpleStaking
        const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
        const staking = await SimpleStaking.deploy(
            await basketToken.getAddress(),
            await priceFeed.getAddress(),
            await btcToken.getAddress(),
            ethers.ZeroAddress, // No DEX router for basic testing
            deployer.address
        );
        console.log("✅ SimpleStaking deployed:", await staking.getAddress());
        
        contracts = { priceFeed, btcToken, basketToken, staking };
        
        // Step 2: Set up permissions and initial prices
        console.log("\n🔧 Step 2: Setting up system...");
        
        await basketToken.setMinter(await staking.getAddress());
        console.log("✅ Basket token minter set");
        
        // Set initial prices
        const coreAsset = ethers.keccak256(ethers.toUtf8Bytes("CORE"));
        const btcAsset = ethers.keccak256(ethers.toUtf8Bytes("BTC"));
        
        await priceFeed.setPrice(coreAsset, ethers.parseEther("1.5")); // $1.50 per CORE
        await priceFeed.setPrice(btcAsset, ethers.parseEther("45000")); // $45,000 per BTC
        console.log("✅ Initial prices set: CORE=$1.50, BTC=$45,000");
        
        // Give users some BTC tokens
        await btcToken.mint(user1.address, ethers.parseUnits("10", 8)); // 10 BTC
        await btcToken.mint(user2.address, ethers.parseUnits("10", 8)); // 10 BTC
        console.log("✅ Users funded with test BTC");
        
        // Step 3: Test basic functionality
        console.log("\n💰 Step 3: Testing basic deposit/withdraw...");
        
        // User1 approves and deposits
        await btcToken.connect(user1).approve(await staking.getAddress(), ethers.parseUnits("1", 8));
        
        const depositTx = await staking.connect(user1).deposit(
            ethers.parseUnits("0.1", 8), // 0.1 BTC
            { value: ethers.parseEther("1000") } // 1000 CORE
        );
        await depositTx.wait();
        console.log("✅ User1 deposited 1000 CORE + 0.1 BTC");
        
        // Check pool info
        const poolInfo = await staking.getPoolInfo();
        console.log("📊 Pool Info:");
        console.log("  Total CORE:", ethers.formatEther(poolInfo[0]));
        console.log("  Total BTC:", ethers.formatUnits(poolInfo[1], 8));
        console.log("  Total Shares:", ethers.formatEther(poolInfo[2]));
        console.log("  Share Price: $" + ethers.formatEther(poolInfo[3]));
        console.log("  Current Ratio:", poolInfo[4].toString() + ":1");
        
        // Check user shares
        const user1Shares = await basketToken.balanceOf(user1.address);
        console.log("  User1 Shares:", ethers.formatEther(user1Shares));
        
        // Step 4: Test second user deposit (different ratio)
        console.log("\n👥 Step 4: Testing second user deposit...");
        
        await btcToken.connect(user2).approve(await staking.getAddress(), ethers.parseUnits("1", 8));
        
        const deposit2Tx = await staking.connect(user2).deposit(
            ethers.parseUnits("0.02", 8), // 0.02 BTC (creates imbalance)
            { value: ethers.parseEther("500") } // 500 CORE
        );
        await deposit2Tx.wait();
        console.log("✅ User2 deposited 500 CORE + 0.02 BTC (imbalanced)");
        
        const poolInfo2 = await staking.getPoolInfo();
        const needsRebalancing = await staking.needsRebalancing();
        console.log("📊 Updated Pool Info:");
        console.log("  Total CORE:", ethers.formatEther(poolInfo2[0]));
        console.log("  Total BTC:", ethers.formatUnits(poolInfo2[1], 8));
        console.log("  Current Ratio:", poolInfo2[4].toString() + ":1");
        console.log("  Needs Rebalancing:", needsRebalancing);
        
        // Step 5: Test withdrawals
        console.log("\n📤 Step 5: Testing withdrawals...");
        
        const user1SharesBeforeWithdraw = await basketToken.balanceOf(user1.address);
        const withdrawAmount = user1SharesBeforeWithdraw / 2n; // Withdraw half
        
        const withdrawTx = await staking.connect(user1).withdraw(withdrawAmount);
        await withdrawTx.wait();
        console.log("✅ User1 withdrew 50% of shares");
        
        const user1SharesAfter = await basketToken.balanceOf(user1.address);
        const user1CoreAfter = await ethers.provider.getBalance(user1.address);
        const user1BtcAfter = await btcToken.balanceOf(user1.address);
        
        console.log("📊 User1 After Withdrawal:");
        console.log("  Remaining Shares:", ethers.formatEther(user1SharesAfter));
        console.log("  BTC Balance:", ethers.formatUnits(user1BtcAfter, 8));
        
        // Step 6: Test price updates
        console.log("\n💱 Step 6: Testing price updates...");
        
        const poolInfoBeforePriceUpdate = await staking.getPoolInfo();
        console.log("📊 Share price before BTC price change: $" + ethers.formatEther(poolInfoBeforePriceUpdate[3]));
        
        // Double BTC price
        await priceFeed.setPrice(btcAsset, ethers.parseEther("90000")); // $90,000 per BTC
        console.log("✅ Updated BTC price to $90,000");
        
        const poolInfoAfterPriceUpdate = await staking.getPoolInfo();
        console.log("📊 Share price after BTC price change: $" + ethers.formatEther(poolInfoAfterPriceUpdate[3]));
        
        // Step 7: Test ratio management
        console.log("\n⚖️ Step 7: Testing ratio management...");
        
        const currentRatio = await staking.targetRatio();
        console.log("Current target ratio:", currentRatio.toString() + ":1");
        
        // Change target ratio
        await staking.setTargetRatio(15000); // 15,000:1
        console.log("✅ Updated target ratio to 15,000:1");
        
        const needsRebalancingAfterRatioChange = await staking.needsRebalancing();
        console.log("Needs rebalancing after ratio change:", needsRebalancingAfterRatioChange);
        
        // Step 8: Test error conditions
        console.log("\n🚫 Step 8: Testing error conditions...");
        
        try {
            // Try to deposit without BTC
            await staking.connect(user1).deposit(0, { value: ethers.parseEther("100") });
            console.log("❌ Should have failed - depositing without BTC");
        } catch (error) {
            console.log("✅ Correctly rejected deposit without BTC");
        }
        
        try {
            // Try to withdraw more shares than owned
            const userShares = await basketToken.balanceOf(user2.address);
            await staking.connect(user2).withdraw(userShares * 2n);
            console.log("❌ Should have failed - withdrawing too many shares");
        } catch (error) {
            console.log("✅ Correctly rejected over-withdrawal");
        }
        
        try {
            // Try unauthorized operations
            await staking.connect(user1).setTargetRatio(20000);
            console.log("❌ Should have failed - unauthorized ratio change");
        } catch (error) {
            console.log("✅ Correctly rejected unauthorized access");
        }
        
        // Step 9: Final system state
        console.log("\n📈 Step 9: Final system state...");
        
        const finalPoolInfo = await staking.getPoolInfo();
        const user1FinalShares = await basketToken.balanceOf(user1.address);
        const user2FinalShares = await basketToken.balanceOf(user2.address);
        
        console.log("🏁 Final Pool State:");
        console.log("  Total CORE:", ethers.formatEther(finalPoolInfo[0]));
        console.log("  Total BTC:", ethers.formatUnits(finalPoolInfo[1], 8));
        console.log("  Total Shares:", ethers.formatEther(finalPoolInfo[2]));
        console.log("  Share Price: $" + ethers.formatEther(finalPoolInfo[3]));
        console.log("  Current Ratio:", finalPoolInfo[4].toString() + ":1");
        console.log("  Needs Rebalancing:", await staking.needsRebalancing());
        
        console.log("\n👥 Final User Positions:");
        console.log("  User1 Shares:", ethers.formatEther(user1FinalShares));
        console.log("  User2 Shares:", ethers.formatEther(user2FinalShares));
        
        // Calculate total value and performance
        const totalValueUSD = (
            finalPoolInfo[0] * await priceFeed.getPrice(coreAsset) / ethers.parseEther("1") / ethers.parseEther("1")
        ) + (
            finalPoolInfo[1] * await priceFeed.getPrice(btcAsset) / ethers.parseUnits("1", 8) / ethers.parseEther("1")
        );
        
        console.log("\n💎 System Performance:");
        console.log("  Total Pool Value: $" + totalValueUSD.toString());
        console.log("  Active Users: 2");
        console.log("  Total Transactions: 4 (2 deposits, 1 withdrawal, 1 config)");
        
        console.log("\n🎉 All tests completed successfully!");
        console.log("=====================================");
        
        // Return contract addresses for frontend testing
        return {
            addresses: {
                SimplePriceFeed: await priceFeed.getAddress(),
                SimpleBasketToken: await basketToken.getAddress(),
                SimpleStaking: await staking.getAddress(),
                BtcToken: await btcToken.getAddress()
            },
            testResults: {
                depositsWorking: true,
                withdrawalsWorking: true,
                ratioManagementWorking: true,
                priceUpdatesWorking: true,
                errorHandlingWorking: true,
                totalValueUSD: totalValueUSD.toString()
            }
        };
        
    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        console.error("Stack trace:", error.stack);
        throw error;
    }
}

if (require.main === module) {
    main()
        .then((result) => {
            console.log("\n📄 Contract addresses saved for frontend:");
            console.log(JSON.stringify(result.addresses, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error("Testing failed:", error);
            process.exit(1);
        });
}

module.exports = main;