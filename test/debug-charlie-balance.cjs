const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DEBUGGING CHARLIE'S BALANCE ISSUE");
    console.log("====================================");
    
    // Get Charlie's signer
    const charlie = await ethers.getSigner("0x90F79bf6EB2c4f870365E785982E1f101E93b906");
    console.log(`Charlie's address: ${charlie.address}`);
    
    // Check Charlie's ETH balance
    const ethBalance = await charlie.provider.getBalance(charlie.address);
    console.log(`Charlie's ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Charlie wants to send 2000 ETH (CORE) + gas
    const coreAmount = ethers.parseEther("2000");
    console.log(`Charlie wants to send: ${ethers.formatEther(coreAmount)} ETH as CORE`);
    
    // Estimate gas for the transaction
    const deploymentData = JSON.parse(require("fs").readFileSync("deployment-data/local-deployment.json", "utf8"));
    const mockDualStaking = await ethers.getContractAt("MockDualStaking", deploymentData.contracts.mockDualStaking);
    const btcAmount = ethers.parseUnits("0.02", 8);
    
    try {
        const gasEstimate = await mockDualStaking.connect(charlie).stakeDual.estimateGas(btcAmount, {
            value: coreAmount
        });
        console.log(`Estimated gas: ${gasEstimate}`);
        
        const gasPrice = await charlie.provider.getFeeData();
        console.log(`Gas price: ${ethers.formatUnits(gasPrice.gasPrice, "gwei")} gwei`);
        
        const gasCost = gasEstimate * gasPrice.gasPrice;
        console.log(`Estimated gas cost: ${ethers.formatEther(gasCost)} ETH`);
        
        const totalNeeded = coreAmount + gasCost;
        console.log(`Total needed: ${ethers.formatEther(totalNeeded)} ETH`);
        
        const shortfall = totalNeeded - ethBalance;
        if (shortfall > 0) {
            console.log(`❌ Charlie is short: ${ethers.formatEther(shortfall)} ETH`);
        } else {
            console.log(`✅ Charlie has enough funds`);
        }
        
    } catch (error) {
        console.log(`❌ Error estimating gas: ${error.message}`);
    }
    
    console.log("\n💡 THE ISSUE:");
    console.log("=============");
    console.log("Charlie is trying to send 2000 ETH as 'CORE tokens' but in our test environment,");
    console.log("he's using native ETH to represent CORE tokens. Each test account starts with");
    console.log("~10,000 ETH, but Charlie is trying to send 2000 ETH + gas costs.");
    console.log("");
    console.log("This is normal - in a real environment, Charlie would:");
    console.log("1. Have separate CORE ERC20 tokens (not native ETH)");
    console.log("2. Only pay small gas fees in native ETH");
    console.log("3. Send CORE tokens via contract call, not as msg.value");
    
    console.log("\n🧪 Let's test with a smaller amount:");
    console.log("===================================");
    
    // Try with a smaller amount
    const smallerAmount = ethers.parseEther("1000"); // 1000 instead of 2000
    const smallerBtc = ethers.parseUnits("0.01", 8); // 0.01 instead of 0.02
    
    try {
        const btcToken = await ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken);
        
        // Make sure Charlie has BTC tokens
        const btcBalance = await btcToken.balanceOf(charlie.address);
        if (btcBalance < smallerBtc) {
            await btcToken.mint(charlie.address, smallerBtc);
        }
        
        // Approve BTC
        await btcToken.connect(charlie).approve(deploymentData.contracts.mockDualStaking, smallerBtc);
        
        console.log(`Trying with ${ethers.formatEther(smallerAmount)} CORE + ${ethers.formatUnits(smallerBtc, 8)} BTC`);
        
        const tx = await mockDualStaking.connect(charlie).stakeDual(smallerBtc, {
            value: smallerAmount
        });
        const receipt = await tx.wait();
        
        console.log(`✅ Success with smaller amount! Gas used: ${receipt.gasUsed}`);
        
        // Check results
        const stakeInfo = await mockDualStaking.getUserStakeInfo(charlie.address);
        console.log(`Charlie now has staked:`);
        console.log(`- CORE: ${ethers.formatEther(stakeInfo[0])}`);
        console.log(`- BTC: ${ethers.formatUnits(stakeInfo[1], 8)}`);
        
        const usdValue = (parseFloat(ethers.formatEther(smallerAmount)) * 0.70) + 
                        (parseFloat(ethers.formatUnits(smallerBtc, 8)) * 110000);
        console.log(`- USD Value: $${usdValue.toFixed(2)}`);
        
    } catch (error) {
        console.log(`❌ Still failed: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });