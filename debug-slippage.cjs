const { ethers } = require("hardhat");

async function debugSlippage() {
    console.log("🔍 Debugging slippage calculation...");
    
    // CORE = $1.50, BTC = $65,000 from MockPriceFeed
    const corePrice = ethers.parseEther("1.5");    // $1.50
    const btcPrice = ethers.parseEther("65000");    // $65,000
    
    console.log(`📊 Prices: CORE = $${ethers.formatEther(corePrice)}, BTC = $${ethers.formatEther(btcPrice)}`);
    
    // Test with 5000 CORE swap
    const coreAmount = ethers.parseEther("5000");
    console.log(`💰 Swapping: ${ethers.formatEther(coreAmount)} CORE`);
    
    // DualStakingBasket calculation: expectedBTC = (coreAmount * priceFeed.getCorePrice()) / priceFeed.getSolvBTCPrice()
    const expectedBTC = (coreAmount * corePrice) / btcPrice;
    console.log(`🎯 Expected BTC: ${ethers.formatEther(expectedBTC)} BTC`);
    
    // maxSlippage = 200 (2%)
    const maxSlippage = 200;
    const minBTCOut = expectedBTC * (10000n - BigInt(maxSlippage)) / 10000n;
    console.log(`📉 Min BTC out (2% slippage): ${ethers.formatEther(minBTCOut)} BTC`);
    
    // MockDEXRouter calculation
    const btcPerCore = (ethers.parseEther("1.5") * ethers.parseEther("1")) / ethers.parseEther("65000");
    console.log(`⚡ DEX rate: 1 CORE = ${ethers.formatEther(btcPerCore)} BTC`);
    
    // DEX output calculation
    const baseOutput = (coreAmount * btcPerCore) / ethers.parseEther("1");
    console.log(`🔄 DEX base output: ${ethers.formatEther(baseOutput)} BTC`);
    
    // DEX slippage (0.5%)
    const SLIPPAGE_FACTOR = 9950; // 0.5% slippage  
    const actualBTC = (baseOutput * BigInt(SLIPPAGE_FACTOR)) / 10000n;
    console.log(`📦 DEX actual output (0.5% slippage): ${ethers.formatEther(actualBTC)} BTC`);
    
    // Check slippage test
    const passed = actualBTC >= minBTCOut;
    console.log(`\n✅ Slippage check: ${passed ? 'PASS' : 'FAIL'}`);
    console.log(`   Required: ${ethers.formatEther(minBTCOut)} BTC`);
    console.log(`   Received: ${ethers.formatEther(actualBTC)} BTC`);
    console.log(`   Difference: ${ethers.formatEther(actualBTC - minBTCOut)} BTC`);
}

debugSlippage().catch(console.error);