const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 IDENTIFYING BROKEN CONTRACTS");
    console.log("===============================");
    
    const [deployer] = await ethers.getSigners();
    
    // Load deployment data
    const deploymentData = JSON.parse(fs.readFileSync("deployment-data/local-deployment.json", "utf8"));
    
    const contractTests = [
        {
            name: "stakeBasketToken",
            address: deploymentData.contracts.stakeBasketToken,
            contractName: "StakeBasketToken",
            tests: [
                () => ethers.getContractAt("StakeBasketToken", deploymentData.contracts.stakeBasketToken),
                async (contract) => contract.name(),
                async (contract) => contract.symbol(),
                async (contract) => contract.totalSupply(),
                async (contract) => contract.balanceOf(deployer.address)
            ]
        },
        {
            name: "mockCORE", 
            address: deploymentData.contracts.mockCORE,
            contractName: "MockCORE",
            tests: [
                () => ethers.getContractAt("MockCORE", deploymentData.contracts.mockCORE),
                async (contract) => contract.name(),
                async (contract) => contract.symbol(), 
                async (contract) => contract.balanceOf(deployer.address),
                async (contract) => contract.mint(deployer.address, ethers.parseEther("1"))
            ]
        },
        {
            name: "priceFeed",
            address: deploymentData.contracts.priceFeed,
            contractName: "PriceFeed", 
            tests: [
                () => ethers.getContractAt("PriceFeed", deploymentData.contracts.priceFeed),
                async (contract) => contract.getCorePrice(),
                async (contract) => contract.getSolvBTCPrice()
            ]
        },
        {
            name: "stakeBasket",
            address: deploymentData.contracts.stakeBasket,
            contractName: "StakeBasket",
            tests: [
                () => ethers.getContractAt("StakeBasket", deploymentData.contracts.stakeBasket),
                async (contract) => contract.etfToken(),
                async (contract) => contract.priceFeed()
            ]
        },
        {
            name: "btcToken",
            address: deploymentData.contracts.btcToken,
            contractName: "MockERC20",
            tests: [
                () => ethers.getContractAt("MockERC20", deploymentData.contracts.btcToken),
                async (contract) => contract.name(),
                async (contract) => contract.balanceOf(deployer.address)
            ]
        },
        {
            name: "dualStakingBasket",
            address: deploymentData.contracts.dualStakingBasket,
            contractName: "DualStakingBasket",
            tests: [
                () => ethers.getContractAt("DualStakingBasket", deploymentData.contracts.dualStakingBasket),
                async (contract) => contract.paused(),
                async (contract) => contract.targetTier()
            ]
        }
    ];
    
    const brokenContracts = [];
    const workingContracts = [];
    
    for (const contractTest of contractTests) {
        console.log(`\n🧪 Testing ${contractTest.name} (${contractTest.address})`);
        
        let contract;
        let allPassed = true;
        const failedTests = [];
        
        try {
            // Test contract attachment
            contract = await contractTest.tests[0]();
            console.log("  ✅ Contract attachment: SUCCESS");
            
            // Test each function
            for (let i = 1; i < contractTest.tests.length; i++) {
                try {
                    const result = await contractTest.tests[i](contract);
                    console.log(`  ✅ Test ${i}: SUCCESS (${result})`);
                } catch (error) {
                    console.log(`  ❌ Test ${i}: FAILED (${error.message})`);
                    failedTests.push(`Test ${i}: ${error.message}`);
                    allPassed = false;
                }
            }
            
        } catch (error) {
            console.log(`  ❌ Contract attachment: FAILED (${error.message})`);
            allPassed = false;
            failedTests.push(`Attachment: ${error.message}`);
        }
        
        if (allPassed) {
            workingContracts.push(contractTest.name);
            console.log(`  🎉 ${contractTest.name}: FULLY WORKING`);
        } else {
            brokenContracts.push({
                name: contractTest.name,
                address: contractTest.address,
                contractName: contractTest.contractName,
                failures: failedTests
            });
            console.log(`  💥 ${contractTest.name}: BROKEN`);
        }
    }
    
    console.log("\n📊 DIAGNOSIS SUMMARY:");
    console.log("====================");
    
    console.log(`✅ Working contracts (${workingContracts.length}):`);
    workingContracts.forEach(name => console.log(`  - ${name}`));
    
    console.log(`\n💥 Broken contracts (${brokenContracts.length}):`);
    brokenContracts.forEach(contract => {
        console.log(`  - ${contract.name}:`);
        contract.failures.forEach(failure => console.log(`    * ${failure}`));
    });
    
    // Save broken contracts info
    const repairData = {
        timestamp: new Date().toISOString(),
        workingContracts: workingContracts,
        brokenContracts: brokenContracts
    };
    
    fs.writeFileSync("test/repair-analysis.json", JSON.stringify(repairData, null, 2));
    console.log("\n💾 Repair analysis saved to test/repair-analysis.json");
    
    console.log("\n🔧 REPAIR STRATEGY:");
    console.log("===================");
    
    if (brokenContracts.length === 0) {
        console.log("🎉 All contracts working! Ready to test BASKET tokens!");
    } else {
        console.log("💥 Need to fix/redeploy broken contracts:");
        brokenContracts.forEach(contract => {
            console.log(`  - Redeploy ${contract.name} (${contract.contractName})`);
        });
        console.log("\nNext step: Fresh deployment of broken contracts");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });