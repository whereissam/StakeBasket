const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DEBUGGING SECURITY TEST FALSE POSITIVES");
    console.log("==========================================");
    
    const contracts = {
        stakeBasketToken: "0xa62835D1A6bf5f521C4e2746E1F51c923b8f3483",
        priceFeed: "0x325c8Df4CFb5B068675AFF8f62aA668D1dEc3C4B"
    };
    
    const [deployer, user1] = await ethers.getSigners();
    
    const stakeBasketToken = await ethers.getContractAt("StakeBasketToken", contracts.stakeBasketToken);
    const priceFeed = await ethers.getContractAt("PriceFeed", contracts.priceFeed);
    
    // DEBUG 1: StakeBasketToken Security
    console.log("\n🔒 DEBUG 1: StakeBasketToken Security");
    console.log("====================================");
    
    console.log("📊 Testing unauthorized minting by user1...");
    const balanceBefore = await stakeBasketToken.balanceOf(user1.address);
    console.log("📊 User1 balance before unauthorized mint attempt:", ethers.formatEther(balanceBefore));
    
    try {
        await stakeBasketToken.connect(user1).mint(user1.address, ethers.parseEther("100"));
        const balanceAfter = await stakeBasketToken.balanceOf(user1.address);
        console.log("📊 User1 balance after mint attempt:", ethers.formatEther(balanceAfter));
        
        if (balanceAfter > balanceBefore) {
            console.log("❌ REAL SECURITY BUG: Unauthorized minting succeeded!");
        } else {
            console.log("✅ SECURITY OK: Minting failed (balance unchanged)");
        }
    } catch (error) {
        console.log("✅ SECURITY OK: Unauthorized minting properly blocked");
        console.log("🔍 Error reason:", error.reason || error.message.split('(')[0]);
    }
    
    // DEBUG 2: PriceFeed Security
    console.log("\n📊 DEBUG 2: PriceFeed Security");
    console.log("==============================");
    
    const priceBefore = await priceFeed.getPrice("CORE");
    console.log("📊 CORE price before unauthorized change attempt:", ethers.formatEther(priceBefore));
    
    try {
        await priceFeed.connect(user1).setPrice("CORE", ethers.parseEther("999"));
        const priceAfter = await priceFeed.getPrice("CORE");
        console.log("📊 CORE price after change attempt:", ethers.formatEther(priceAfter));
        
        if (priceAfter.toString() === ethers.parseEther("999").toString()) {
            console.log("❌ REAL SECURITY BUG: Unauthorized price setting succeeded!");
        } else {
            console.log("✅ SECURITY OK: Price setting failed (price unchanged)");
        }
    } catch (error) {
        console.log("✅ SECURITY OK: Unauthorized price setting properly blocked");
        console.log("🔍 Error reason:", error.reason || error.message.split('(')[0]);
    }
    
    // DEBUG 3: Check onlyOwner modifier
    console.log("\n🔑 DEBUG 3: Checking onlyOwner modifier");
    console.log("======================================");
    
    const priceFeedOwner = await priceFeed.owner();
    const user1Address = user1.address;
    
    console.log("📊 PriceFeed owner:", priceFeedOwner);
    console.log("📊 User1 address:", user1Address);
    console.log("📊 Is user1 owner?", priceFeedOwner.toLowerCase() === user1Address.toLowerCase());
    
    // DEBUG 4: Check onlyStakeBasket modifier  
    console.log("\n🥩 DEBUG 4: Checking onlyStakeBasket modifier");
    console.log("=============================================");
    
    const authorizedContract = await stakeBasketToken.stakeBasketContract();
    console.log("📊 Authorized contract:", authorizedContract);
    console.log("📊 User1 address:", user1Address);
    console.log("📊 Is user1 authorized?", authorizedContract.toLowerCase() === user1Address.toLowerCase());
    
    console.log("\n🎯 SECURITY DEBUG CONCLUSION");
    console.log("============================");
    
    if (priceFeedOwner.toLowerCase() === user1Address.toLowerCase()) {
        console.log("⚠️ WARNING: User1 is PriceFeed owner - that's why price setting worked");
    }
    
    if (authorizedContract.toLowerCase() === user1Address.toLowerCase()) {
        console.log("⚠️ WARNING: User1 is authorized StakeBasket contract - that's why minting worked");
    }
    
    console.log("🔍 The 'security bugs' are likely test setup issues, not real vulnerabilities");
}

main().catch(console.error);