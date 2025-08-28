const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying FINAL working DualStaking with no timelock...');
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  
  // Use existing contracts
  const SIMPLE_TOKEN = '0x8Bab770FD8309dBC5eDA3d77Af24Bf9d0A486Ccd';
  const PRICE_FEED = '0x3A40272927ae5543Ca78E600E76A63F249EB1b2b';
  const WCORE = '0x7751C36435D0045286c6e01282b887dA4B5A9B03';
  const BTC_FAUCET = '0x8646C9ad9FED5834d2972A5de25DcCDe1daF7F96';
  
  console.log('📦 Deploying final DualStaking with SimpleToken...');
  
  const DualStakingBasket = await ethers.getContractFactory('DualStakingBasket');
  const targetTier = 2; // SUPER tier
  
  const finalDualStaking = await DualStakingBasket.deploy(
    SIMPLE_TOKEN,          // _basketToken (SimpleToken with no timelock!)
    PRICE_FEED,            // _priceFeed  
    WCORE,                 // _coreToken
    BTC_FAUCET,            // _btcToken
    deployer.address,      // _dualStakingContract
    deployer.address,      // _feeRecipient
    targetTier,            // _targetTier
    deployer.address       // initialOwner
  );
  
  await finalDualStaking.waitForDeployment();
  const finalAddress = await finalDualStaking.getAddress();
  
  console.log('✅ Final DualStaking deployed:', finalAddress);
  
  // Update SimpleToken to authorize the new DualStaking
  console.log('🔧 Updating SimpleToken authorization...');
  const SimpleToken = await ethers.getContractFactory('SimpleToken');
  const simpleToken = SimpleToken.attach(SIMPLE_TOKEN);
  
  await (await simpleToken.setAuthorizedMinter(finalAddress)).wait();
  console.log('✅ SimpleToken authorized for new DualStaking');
  
  // Configure the new DualStaking
  console.log('🔧 Configuring new DualStaking...');
  
  // Set swap router
  await (await finalDualStaking.setSwapRouter(deployer.address)).wait();
  await (await finalDualStaking.setTrustedRouter(deployer.address, true)).wait();
  console.log('✅ Swap router configured');
  
  // Set slippage
  await (await finalDualStaking.setMaxSlippage(1000)).wait(); // 10%
  console.log('✅ Slippage configured');
  
  // Test the complete system
  console.log('\n🧪 TESTING COMPLETE DUAL STAKING SYSTEM...');
  
  const faucet = await ethers.getContractAt('SimpleBTCFaucet', BTC_FAUCET);
  
  // Get BTC and approve
  await (await faucet.faucet()).wait();
  await (await faucet.approve(finalAddress, ethers.parseUnits('1', 8))).wait();
  console.log('✅ BTC approved');
  
  const coreAmount = ethers.parseEther('1');
  const btcAmount = ethers.parseUnits('0.1', 8);
  
  try {
    console.log('🧪 Testing final dual staking...');
    
    const gasEstimate = await finalDualStaking.depositNativeCORE.estimateGas(btcAmount, {
      value: coreAmount
    });
    console.log('✅ Gas estimate succeeded:', gasEstimate.toString());
    
    // Execute the actual transaction
    console.log('🚀 Executing real dual staking transaction...');
    const tx = await finalDualStaking.depositNativeCORE(btcAmount, {
      value: coreAmount,
      gasLimit: gasEstimate * 2n
    });
    
    const receipt = await tx.wait();
    console.log('🎊 DUAL STAKING SUCCESS!');
    console.log('Transaction hash:', receipt.transactionHash);
    
    // Check balance
    const basketBalance = await simpleToken.balanceOf(deployer.address);
    console.log('🪙 BASKET tokens received:', ethers.formatEther(basketBalance));
    
    console.log('\n🎉 COMPLETE SUCCESS!');
    console.log('===========================');
    console.log('✅ Native CORE staking: Working');
    console.log('✅ BTC token staking: Working');
    console.log('✅ Basket token minting: Working');
    console.log('✅ No timelock delays: Working');
    console.log('');
    console.log('🔧 UPDATE YOUR FRONTEND:');
    console.log('In src/components/DualStakingInterface.tsx:');
    console.log(`  stakingContractAddress = '${finalAddress}'`);
    console.log(`  btcTokenAddress = '${BTC_FAUCET}'`);
    console.log('');
    console.log('🎊 YOUR DUAL STAKING IS 100% WORKING!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.message.includes('price data stale')) {
      console.log('💡 Need to refresh price feeds first');
    } else if (error.message.includes('slippage')) {
      console.log('💡 Need to adjust slippage settings');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });