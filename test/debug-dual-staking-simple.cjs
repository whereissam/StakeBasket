const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DEBUGGING DUAL STAKING ISSUES");
    console.log("=================================");
    
    // Get signers
    const [deployer, alice, bob, charlie, david, eve, frank] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    // Contract addresses from deployment
    const stakeBasketTokenAddress = "0xa62835D1A6bf5f521C4e2746E1F51c923b8f3483";
    const dualStakingBasketAddress = "0x70d6BCA9d845F2b2C0F0E60e53eb26bFA0ec5067";
    const priceFeedAddress = "0x325c8Df4CFb5B068675AFF8f62aA668D1dEc3C4B";
    const btcTokenAddress = "0x9DfFAbf71F1c1Dd26F8FCc5a9cfccE8C6eA6a82a";
    
    // Get contracts
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    const stakeBasketToken = StakeBasketToken.attach(stakeBasketTokenAddress);
    
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const dualStakingBasket = DualStakingBasket.attach(dualStakingBasketAddress);
    
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    const priceFeed = PriceFeed.attach(priceFeedAddress);
    
    const ERC20 = await ethers.getContractFactory("MockERC20");
    const btcToken = ERC20.attach(btcTokenAddress);
    
    console.log("\n📊 CONTRACT STATUS CHECK");
    console.log("========================");
    
    try {
        const isPaused = await dualStakingBasket.paused();
        console.log(`DualStakingBasket paused: ${isPaused}`);
        
        const targetTier = await dualStakingBasket.targetTier();
        console.log(`Target tier: ${targetTier}`);
        
        const poolInfo = await dualStakingBasket.getPoolInfo();
        console.log(`Pool CORE: ${ethers.formatEther(poolInfo[0])}`);
        console.log(`Pool BTC: ${ethers.formatUnits(poolInfo[1], 8)}`);
        
    } catch (error) {
        console.log(`❌ Error reading contract state: ${error.message}`);
    }
    
    console.log("\n🔧 TESTING DUAL STAKING DEPOSIT");
    console.log("===============================");
    
    // Test with Alice - small amounts
    try {
        const coreAmount = ethers.parseEther("100"); // 100 CORE
        const btcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
        
        console.log(`Testing deposit: ${ethers.formatEther(coreAmount)} CORE + ${ethers.formatUnits(btcAmount, 8)} BTC`);
        
        // Check Alice's balances
        const aliceBalance = await alice.provider.getBalance(alice.address);
        const aliceBtcBalance = await btcToken.balanceOf(alice.address);
        
        console.log(`Alice CORE balance: ${ethers.formatEther(aliceBalance)}`);
        console.log(`Alice BTC balance: ${ethers.formatUnits(aliceBtcBalance, 8)}`);
        
        if (aliceBalance < coreAmount) {
            console.log("❌ Insufficient CORE balance");
            return;
        }
        
        if (aliceBtcBalance < btcAmount) {
            console.log("❌ Insufficient BTC balance - minting tokens");
            await btcToken.connect(deployer).mint(alice.address, btcAmount);
        }
        
        // Approve BTC tokens
        await btcToken.connect(alice).approve(dualStakingBasketAddress, btcAmount);
        console.log("✅ BTC tokens approved");
        
        // Try deposit
        console.log("💰 Attempting deposit...");
        const tx = await dualStakingBasket.connect(alice).depositNativeCORE(btcAmount, {
            value: coreAmount,
            gasLimit: 500000
        });
        
        const receipt = await tx.wait();
        console.log(`✅ Deposit successful! Gas used: ${receipt.gasUsed}`);
        
        // Check new balances
        const newAliceBalance = await alice.provider.getBalance(alice.address);
        const newAliceBtcBalance = await btcToken.balanceOf(alice.address);
        const basketBalance = await stakeBasketToken.balanceOf(alice.address);
        
        console.log(`New Alice CORE balance: ${ethers.formatEther(newAliceBalance)}`);
        console.log(`New Alice BTC balance: ${ethers.formatUnits(newAliceBtcBalance, 8)}`);
        console.log(`Alice BASKET tokens: ${ethers.formatEther(basketBalance)}`);
        
    } catch (error) {
        console.log(`❌ Dual staking deposit failed: ${error.message}`);
        console.log(`Error details: ${error}`);
        
        // Try to get more specific error
        if (error.data) {
            try {
                const decoded = dualStakingBasket.interface.parseError(error.data);
                console.log(`Decoded error: ${decoded.name} - ${decoded.args}`);
            } catch (decodeError) {
                console.log(`Raw error data: ${error.data}`);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });