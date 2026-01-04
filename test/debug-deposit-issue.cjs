const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DEBUGGING DEPOSIT ISSUE");
    console.log("==========================");
    
    const contracts = {
        stakeBasketToken: "0xa62835D1A6bf5f521C4e2746E1F51c923b8f3483",
        stakeBasket: "0xC32609C91d6B6b51D48f2611308FEf121B02041f",
        mockCORE: "0xa4E00CB342B36eC9fDc4B50b3d527c3643D4C49e"
    };
    
    const [deployer, user1, user2] = await ethers.getSigners();
    
    const stakeBasket = await ethers.getContractAt("StakeBasket", contracts.stakeBasket);
    const mockCORE = await ethers.getContractAt("MockERC20", contracts.mockCORE);
    
    // Check contract state
    console.log("📊 Checking StakeBasket state...");
    const isPaused = await stakeBasket.paused();
    const owner = await stakeBasket.owner();
    
    console.log("📊 Contract paused:", isPaused);
    console.log("📊 Contract owner:", owner);
    
    // Check user2 state
    const user2CoreBalance = await mockCORE.balanceOf(user2.address);
    const user2EthBalance = await ethers.provider.getBalance(user2.address);
    const user2Allowance = await mockCORE.allowance(user2.address, contracts.stakeBasket);
    
    console.log("📊 User2 CORE balance:", ethers.formatEther(user2CoreBalance));
    console.log("📊 User2 ETH balance:", ethers.formatEther(user2EthBalance));
    console.log("📊 User2 CORE allowance:", ethers.formatEther(user2Allowance));
    
    // Fix 1: Unpause contract if paused
    if (isPaused) {
        console.log("🔧 Unpausing contract...");
        await stakeBasket.unpause();
        console.log("✅ Contract unpaused");
    }
    
    // Fix 2: Test the correct deposit logic
    console.log("\n🧪 Testing deposit with correct parameters...");
    
    try {
        // The issue: StakeBasket expects msg.value == amount
        // But amount is in CORE tokens, msg.value is in ETH
        // This is a contract design issue - it should use ERC20 transfers, not ETH
        
        const depositAmount = ethers.parseEther("10"); // 10 CORE tokens
        const requiredEthValue = depositAmount; // Contract expects equal ETH value
        
        console.log("📊 Deposit amount (CORE):", ethers.formatEther(depositAmount));
        console.log("📊 Required ETH value:", ethers.formatEther(requiredEthValue));
        
        const tx = await stakeBasket.connect(user2).deposit(depositAmount, { 
            value: requiredEthValue,
            gasLimit: 1000000
        });
        
        await tx.wait();
        console.log("✅ Deposit successful with correct ETH value!");
        
    } catch (error) {
        console.log("❌ Deposit still failing:", error.reason || error.message);
        
        // Try to decode the revert reason
        if (error.data) {
            try {
                const decoded = stakeBasket.interface.parseError(error.data);
                console.log("🔍 Decoded error:", decoded);
            } catch (e) {
                console.log("🔍 Cannot decode error data");
            }
        }
    }
}

main().catch(console.error);