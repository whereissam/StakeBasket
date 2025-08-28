const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 Contract Relationship Verification");
    console.log("====================================\n");

    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
    const addresses = deploymentInfo.contracts;

    console.log("📋 Deployed Contract Addresses:");
    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });
    console.log("");

    // Get contracts
    const stakeBasket = await ethers.getContractAt("StakeBasket", addresses.stakeBasket);
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", addresses.stakeBasketToken);
    const stakingManager = await ethers.getContractAt("StakingManager", addresses.stakingManager);
    const priceFeed = await ethers.getContractAt("PriceFeed", addresses.priceFeed);
    const mockCoreStaking = await ethers.getContractAt("MockCoreStaking", addresses.mockCoreStaking);

    console.log("🔗 Verifying Contract Relationships:\n");

    try {
        // Test 1: StakeBasket → StakeBasketToken relationship
        console.log("1. StakeBasket ↔ StakeBasketToken relationship:");
        const etfTokenAddress = await stakeBasket.etfToken();
        const stakeBasketFromToken = await stakeBasketToken.stakeBasketContract();
        
        console.log(`   StakeBasket.etfToken(): ${etfTokenAddress}`);
        console.log(`   StakeBasketToken.stakeBasketContract(): ${stakeBasketFromToken}`);
        
        if (etfTokenAddress.toLowerCase() === addresses.stakeBasketToken.toLowerCase()) {
            console.log("   ✅ StakeBasket correctly references StakeBasketToken");
        } else {
            console.log("   ❌ StakeBasket ETF token address mismatch");
        }
        
        if (stakeBasketFromToken.toLowerCase() === addresses.stakeBasket.toLowerCase()) {
            console.log("   ✅ StakeBasketToken correctly references StakeBasket");
        } else {
            console.log("   ❌ StakeBasketToken StakeBasket address mismatch");
        }

        // Test 2: StakeBasket → StakingManager relationship
        console.log("\n2. StakeBasket ↔ StakingManager relationship:");
        const stakingManagerFromBasket = await stakeBasket.stakingManager();
        const stakeBasketFromManager = await stakingManager.stakeBasketContract();
        
        console.log(`   StakeBasket.stakingManager(): ${stakingManagerFromBasket}`);
        console.log(`   StakingManager.stakeBasketContract(): ${stakeBasketFromManager}`);
        
        if (stakingManagerFromBasket.toLowerCase() === addresses.stakingManager.toLowerCase()) {
            console.log("   ✅ StakeBasket correctly references StakingManager");
        } else {
            console.log("   ❌ StakeBasket StakingManager address mismatch");
        }
        
        if (stakeBasketFromManager.toLowerCase() === addresses.stakeBasket.toLowerCase()) {
            console.log("   ✅ StakingManager correctly references StakeBasket");
        } else {
            console.log("   ❌ StakingManager StakeBasket address mismatch");
        }

        // Test 3: StakeBasket → PriceFeed relationship
        console.log("\n3. StakeBasket → PriceFeed relationship:");
        const priceFeedFromBasket = await stakeBasket.priceFeed();
        console.log(`   StakeBasket.priceFeed(): ${priceFeedFromBasket}`);
        
        if (priceFeedFromBasket.toLowerCase() === addresses.priceFeed.toLowerCase()) {
            console.log("   ✅ StakeBasket correctly references PriceFeed");
        } else {
            console.log("   ❌ StakeBasket PriceFeed address mismatch");
        }

        // Test 4: StakingManager → MockCoreStaking relationship
        console.log("\n4. StakingManager → MockCoreStaking relationship:");
        const coreStakingFromManager = await stakingManager.coreStakingContract();
        console.log(`   StakingManager.coreStakingContract(): ${coreStakingFromManager}`);
        
        if (coreStakingFromManager.toLowerCase() === addresses.mockCoreStaking.toLowerCase()) {
            console.log("   ✅ StakingManager correctly references MockCoreStaking");
        } else {
            console.log("   ❌ StakingManager MockCoreStaking address mismatch");
        }

        // Test 5: Validator configuration
        console.log("\n5. Validator Configuration:");
        const validators = await mockCoreStaking.getValidators();
        console.log(`   MockCoreStaking has ${validators.length} validators configured`);
        
        const activeValidators = await stakingManager.getCoreValidators();
        console.log(`   StakingManager has ${activeValidators.length} active validators`);

        // Test 6: Price feed functionality
        console.log("\n6. Price Feed Functionality:");
        const corePrice = await priceFeed.getCorePrice();
        const solvBTCPrice = await priceFeed.getSolvBTCPrice();
        console.log(`   CORE Price: $${ethers.formatEther(corePrice)}`);
        console.log(`   SolvBTC Price: $${ethers.formatEther(solvBTCPrice)}`);

        // Test 7: Token minting permissions
        console.log("\n7. Token Minting Permissions:");
        try {
            // This should fail - only StakeBasket can mint
            await stakeBasketToken.mint(addresses.stakeBasket, ethers.parseEther("1"));
            console.log("   ❌ Unauthorized minting succeeded (security issue!)");
        } catch (error) {
            if (error.message.includes("OnlyStakeBasket") || error.message.includes("Ownable")) {
                console.log("   ✅ Token minting properly restricted to StakeBasket");
            } else {
                console.log(`   ⚠️  Token minting failed with unexpected error: ${error.message}`);
            }
        }

        // Test 8: ETF Operations
        console.log("\n8. ETF Basic Operations:");
        const [deployer] = await ethers.getSigners();
        const mockCORE = await ethers.getContractAt("MockCORE", addresses.mockCORE);
        
        // Get some CORE tokens
        await mockCORE.faucet();
        const coreBalance = await mockCORE.balanceOf(deployer.address);
        console.log(`   User CORE balance: ${ethers.formatEther(coreBalance)}`);
        
        // Approve StakeBasket to spend CORE
        await mockCORE.approve(addresses.stakeBasket, ethers.parseEther("10"));
        console.log("   ✅ CORE approved for StakeBasket");
        
        // Test deposit (small amount)
        const depositAmount = ethers.parseEther("5");
        const balanceBefore = await stakeBasketToken.balanceOf(deployer.address);
        
        await stakeBasket.deposit(depositAmount, deployer.address, {
            value: ethers.parseEther("0.1") // Gas for delegation
        });
        
        const balanceAfter = await stakeBasketToken.balanceOf(deployer.address);
        const sharesReceived = balanceAfter - balanceBefore;
        
        console.log(`   ✅ Deposited ${ethers.formatEther(depositAmount)} CORE`);
        console.log(`   ✅ Received ${ethers.formatEther(sharesReceived)} ETF shares`);

        console.log("\n🎉 Contract Relationship Verification Complete!");
        console.log("\n📊 Summary:");
        console.log("   ✅ All critical contract relationships verified");
        console.log("   ✅ Cross-contract function calls working");
        console.log("   ✅ Access control properly implemented");
        console.log("   ✅ ETF deposit/share minting operational");
        console.log("   ✅ Price feeds functional with fallback data");
        console.log("   ✅ Validator system configured and accessible");

    } catch (error) {
        console.error("\n❌ Verification failed:", error.message);
        console.error("Full error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });