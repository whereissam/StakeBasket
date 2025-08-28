const { ethers } = require('hardhat');

async function main() {
    console.log('Testing StakeBasket contract...');
    
    const contractAddress = '0xB16DD7cAAE9Ed2f498F68EE3EAdbC6c8289EB4b4';
    
    try {
        // Try to get the contract
        const contract = await ethers.getContractAt('StakeBasket', contractAddress);
        console.log('✅ Contract found at:', contractAddress);
        
        // Try to call a view function
        const totalPooledCore = await contract.totalPooledCore();
        console.log('✅ Total pooled CORE:', ethers.formatEther(totalPooledCore));
        
        // Check ETF token address
        const etfTokenAddress = await contract.etfToken();
        console.log('✅ ETF Token address:', etfTokenAddress);
        
        // Check if we can get the function selector for deposit
        const fragment = contract.interface.getFunction('deposit');
        console.log('✅ Deposit function selector:', fragment.selector);
        
    } catch (error) {
        console.error('❌ Error testing contract:', error.message);
    }
}

main().catch(console.error);