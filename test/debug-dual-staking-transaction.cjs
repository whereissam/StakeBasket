const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 DEBUG DUAL STAKING TRANSACTION FAILURE");
    console.log("=========================================");
    
    const [deployer, alice] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("TestBTC", deploymentData.contracts.btcToken);
    const dualStaking = await ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket);
    const priceFeed = await ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed);
    
    console.log("🔧 Setting up Alice with tokens...");
    
    const coreAmount = ethers.parseEther("100"); // 100 CORE
    const btcAmount = ethers.parseUnits("0.001", 8); // 0.001 BTC
    
    // Give Alice tokens
    await mockCORE.mint(alice.address, coreAmount);
    await btcToken.mint(alice.address, btcAmount);
    
    // Approve tokens
    await mockCORE.connect(alice).approve(dualStaking.target, coreAmount);
    await btcToken.connect(alice).approve(dualStaking.target, btcAmount);
    
    console.log("✅ Alice set up with tokens and approvals");
    
    console.log("\\n🔍 CHECKING CONTRACT STATE BEFORE DEPOSIT");
    console.log("==========================================");
    
    // Check if DualStaking is paused
    try {
        const isPaused = await dualStaking.paused();
        console.log(`Contract paused: ${isPaused}`);
        if (isPaused) {
            console.log("❌ Contract is paused - this would cause revert");
            return;
        }
    } catch (error) {
        console.log(`Could not check paused state: ${error.message}`);
    }
    
    // Check price feed configuration
    const corePrice = await priceFeed.getCorePrice();
    const btcPrice = await priceFeed.getSolvBTCPrice();
    console.log(`CORE Price: $${ethers.formatEther(corePrice)}`);
    console.log(`BTC Price: $${ethers.formatUnits(btcPrice, 8)}`);
    
    // Check basket token configuration  
    const basketTokenAddress = await dualStaking.basketToken();
    console.log(`BasketToken in DualStaking: ${basketTokenAddress}`);
    console.log(`Expected BasketToken: ${deploymentData.contracts.stakeBasketToken}`);
    
    if (basketTokenAddress !== deploymentData.contracts.stakeBasketToken) {
        console.log("❌ BasketToken address mismatch!");
    }
    
    // Check if BasketToken can be minted by DualStaking
    const stakeBasketContract = await basketToken.stakeBasketContract();
    console.log(`Authorized minter in BasketToken: ${stakeBasketContract}`);
    console.log(`DualStaking address: ${deploymentData.contracts.dualStakingBasket}`);
    
    if (stakeBasketContract !== deploymentData.contracts.dualStakingBasket) {
        console.log("❌ DualStaking is NOT authorized to mint BasketTokens!");
        console.log("This is likely the cause of the revert");
        return;
    }
    
    // Check token addresses in DualStaking
    const coreTokenAddr = await dualStaking.coreToken();
    const btcTokenAddr = await dualStaking.btcToken();
    console.log(`CORE token in DualStaking: ${coreTokenAddr}`);
    console.log(`BTC token in DualStaking: ${btcTokenAddr}`);
    console.log(`Expected CORE: ${deploymentData.contracts.mockCORE}`);
    console.log(`Expected BTC: ${deploymentData.contracts.btcToken}`);
    
    if (coreTokenAddr !== deploymentData.contracts.mockCORE) {
        console.log("❌ CORE token address mismatch!");
    }
    if (btcTokenAddr !== deploymentData.contracts.btcToken) {
        console.log("❌ BTC token address mismatch!");
    }
    
    console.log("\\n🧮 TESTING MANUAL USD CALCULATION");
    console.log("==================================");
    
    // Test the _calculateUSDValue logic manually
    const coreValue = (coreAmount * corePrice) / ethers.parseEther("1");
    const btcValue = (btcAmount * btcPrice) / ethers.parseUnits("1", 8);
    const totalUSD = coreValue + btcValue;
    
    console.log(`CORE value: $${ethers.formatEther(coreValue)}`);
    console.log(`BTC value: $${ethers.formatUnits(btcValue, 8)}`);
    console.log(`Total USD: $${ethers.formatEther(totalUSD)}`);
    
    // Check minimum requirements
    const minCoreDeposit = await dualStaking.minCoreDeposit();
    const minBtcDeposit = await dualStaking.minBtcDeposit();
    const minUsdValue = await dualStaking.minUsdValue();
    
    console.log(`\\nMinimum requirements:`);
    console.log(`- Min CORE: ${ethers.formatEther(minCoreDeposit)} (we have: ${ethers.formatEther(coreAmount)})`);
    console.log(`- Min BTC: ${ethers.formatUnits(minBtcDeposit, 8)} (we have: ${ethers.formatUnits(btcAmount, 8)})`);
    console.log(`- Min USD: $${minUsdValue} (we have: $${ethers.formatEther(totalUSD)})`);
    
    const meetsRequirements = 
        coreAmount >= minCoreDeposit &&
        btcAmount >= minBtcDeposit &&
        totalUSD >= ethers.parseEther(minUsdValue.toString());
    
    console.log(`Meets all requirements: ${meetsRequirements}`);
    
    // Check tier thresholds
    const bronzeMin = await dualStaking.tierMinUSD(0);
    console.log(`Bronze tier minimum: $${bronzeMin} (we have: $${ethers.formatEther(totalUSD)})`);
    
    const qualifiesForBronze = totalUSD >= ethers.parseEther(bronzeMin.toString());
    console.log(`Qualifies for Bronze tier: ${qualifiesForBronze}`);
    
    if (!qualifiesForBronze) {
        console.log("❌ Does not qualify for any tier - this would cause revert in _calculateTier");
        return;
    }
    
    console.log("\\n🎯 ATTEMPTING DEPOSIT WITH DETAILED ERROR CATCHING");
    console.log("==================================================");
    
    try {
        // Use estimateGas to see if it would fail before actually sending
        const gasEstimate = await dualStaking.connect(alice).deposit.estimateGas(coreAmount, btcAmount);
        console.log(`✅ Gas estimate successful: ${gasEstimate.toString()}`);
        
        // If gas estimate works, try the actual transaction
        console.log("🚀 Executing actual deposit...");
        const tx = await dualStaking.connect(alice).deposit(coreAmount, btcAmount);
        const receipt = await tx.wait();
        
        console.log(`✅ SUCCESS! Transaction hash: ${receipt.hash}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check BASKET balance
        const basketBalance = await basketToken.balanceOf(alice.address);
        console.log(`🎯 Alice received: ${ethers.formatEther(basketBalance)} BASKET tokens`);
        
        const basketPerUSD = parseFloat(ethers.formatEther(basketBalance)) / parseFloat(ethers.formatEther(totalUSD));
        console.log(`📊 BASKET/USD rate: ${basketPerUSD.toFixed(6)}`);
        
    } catch (error) {
        console.log(`❌ Deposit failed: ${error.message}`);
        
        // Try to get more detailed error information
        if (error.data) {
            console.log(`Error data: ${error.data}`);
        }
        
        // If it's a revert, the reason might be encoded
        if (error.reason) {
            console.log(`Revert reason: ${error.reason}`);
        }
        
        console.log("\\n🔍 This suggests the issue is deep in the contract execution");
        console.log("The contract state looks correct but something is failing during the deposit logic");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });