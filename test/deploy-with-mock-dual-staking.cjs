const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 DEPLOY WITH MOCK DUAL STAKING CONTRACT");
    console.log("==========================================");
    
    const [deployer] = await ethers.getSigners();
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    console.log("\\n🔧 Step 1: Deploy MockDualStakingContract");
    console.log("==========================================");
    
    const MockDualStakingContract = await ethers.getContractFactory("MockDualStakingContract");
    const mockDualStakingContract = await MockDualStakingContract.deploy();
    await mockDualStakingContract.waitForDeployment();
    const mockDualStakingAddress = await mockDualStakingContract.getAddress();
    
    console.log(`✅ MockDualStakingContract deployed: ${mockDualStakingAddress}`);
    
    console.log("\\n🔧 Step 2: Deploy DualStakingBasket with Mock");
    console.log("===========================================");
    
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    const finalDualStaking = await DualStakingBasket.deploy(
        deploymentData.contracts.stakeBasketToken,    // _basketToken  
        deploymentData.contracts.priceFeed,           // _priceFeed
        deploymentData.contracts.mockCORE,            // _coreToken
        deploymentData.contracts.btcToken,            // _btcToken  
        mockDualStakingAddress,                       // _dualStakingContract (real mock!)
        deployer.address,                             // _feeRecipient
        0,                                           // _targetTier (BRONZE = 0)
        deployer.address                              // initialOwner
    );
    
    await finalDualStaking.waitForDeployment();
    const finalAddress = await finalDualStaking.getAddress();
    console.log(`✅ DualStakingBasket with mock deployed: ${finalAddress}`);
    
    console.log("\\n🔧 Step 3: Update Permissions");
    console.log("===============================");
    
    // Update StakeBasketToken permissions
    const basketToken = await ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken);
    await basketToken.emergencySetStakeBasketContract(finalAddress);
    console.log(`✅ Updated StakeBasketToken permissions`);
    
    // Update Bronze tier threshold
    await finalDualStaking.setTierThresholds(0, 100, 10000); // BRONZE = 0, $100 min
    console.log(`✅ Set Bronze tier threshold to $100`);
    
    // Update deployment data
    deploymentData.contracts.dualStakingBasket = finalAddress;
    deploymentData.contracts.dualStakingBasketWithMock = finalAddress;
    deploymentData.contracts.mockDualStakingContract = mockDualStakingAddress;
    fs.writeFileSync("deployment-data/local-deployment.json", JSON.stringify(deploymentData, null, 2));
    
    console.log("\\n🧪 Step 4: Quick Test");
    console.log("======================");
    
    const [, alice] = await ethers.getSigners();
    
    const mockCORE = await ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE);
    const btcToken = await ethers.getContractAt("TestBTC", deploymentData.contracts.btcToken);
    
    const coreAmount = ethers.parseEther("10"); // 10 CORE
    const btcAmount = ethers.parseUnits("0.0001", 8); // 0.0001 BTC
    
    // Setup Alice
    await mockCORE.mint(alice.address, coreAmount);
    await btcToken.mint(alice.address, btcAmount);
    await mockCORE.connect(alice).approve(finalAddress, coreAmount);
    await btcToken.connect(alice).approve(finalAddress, btcAmount);
    
    console.log("🧪 Test: 10 CORE + 0.0001 BTC = $18");
    
    try {
        const tx = await finalDualStaking.connect(alice).deposit(coreAmount, btcAmount);
        const receipt = await tx.wait();
        
        console.log("🎉 SUCCESS! Deposit worked with mock dual staking!");
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
        const basketBalance = await basketToken.balanceOf(alice.address);
        const basketAmount = ethers.formatEther(basketBalance);
        console.log(`Alice received: ${basketAmount} BASKET tokens`);
        
        const basketPerUSD = parseFloat(basketAmount) / 18; // $18 total
        console.log(`BASKET/USD rate: ${basketPerUSD.toFixed(6)}`);
        
        console.log("\\n🎯 READY FOR FULL TESTING WITH ALL USERS!");
        return true;
        
    } catch (error) {
        console.log(`❌ Still failed: ${error.message}`);
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\\n🏆 MOCK DUAL STAKING SETUP SUCCESSFUL!");
            console.log("Now we can get the REAL BASKET token amounts!");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });