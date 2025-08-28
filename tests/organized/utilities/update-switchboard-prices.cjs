const hre = require("hardhat");
const fs = require('fs');
const CrossbarClient = require("@switchboard-xyz/on-demand").CrossbarClient;

async function main() {
    console.log("🚀 Updating prices using Switchboard On-Demand...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Load deployment addresses
    let deploymentInfo = {};
    try {
        const data = fs.readFileSync('./deployment-info.json', 'utf8');
        deploymentInfo = JSON.parse(data);
    } catch (error) {
        console.log("❌ No deployment info found. Deploy contracts first.");
        return;
    }
    
    const priceFeedAddress = deploymentInfo.contracts?.PriceFeed;
    if (!priceFeedAddress) {
        console.log("❌ PriceFeed contract address not found in deployment info");
        return;
    }
    
    // Connect to PriceFeed contract
    const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
    const priceFeed = await PriceFeed.attach(priceFeedAddress);
    
    console.log("📡 Connected to PriceFeed at:", priceFeedAddress);
    
    // Initialize Switchboard Crossbar client
    const crossbar = new CrossbarClient("https://crossbar.switchboard.xyz");
    
    // Feed IDs for BTC and CORE
    const feedIds = [
        "0xf01cc150052ba08171863e5920bdce7433e200eb31a8558521b0015a09867630", // BTC
        "0x3c13edb911c227918215ff5005b6f27abc9c5de9a1e822eb4ec5519dd3de0b2d"  // CORE
    ];
    
    console.log("🔍 Fetching encoded updates from Crossbar...");
    
    try {
        // Get the network configuration
        const network = hre.network.name;
        let chainId;
        
        // Map network names to chain IDs
        switch (network) {
            case 'coreTestnet':
            case 'coreTestnet2':
                chainId = 1115; // Core Testnet chain ID
                break;
            case 'core':
            case 'coreMainnet':
                chainId = 1116; // Core Mainnet chain ID
                break;
            default:
                console.log(`⚠️  Unknown network: ${network}, assuming Core Testnet`);
                chainId = 1115;
        }
        
        console.log(`🌐 Using Chain ID: ${chainId} (${network})`);
        
        // Fetch encoded updates from Crossbar
        const { encoded } = await crossbar.fetchEVMResults({
            chainId: chainId,
            aggregatorIds: feedIds
        });
        
        if (!encoded || encoded.length === 0) {
            console.log("❌ No encoded updates received from Crossbar");
            return;
        }
        
        console.log(`✅ Received ${encoded.length} encoded updates from Crossbar`);
        
        // Assets to update
        const assetsToUpdate = ["BTC", "CORE"];
        
        for (const asset of assetsToUpdate) {
            try {
                console.log(`\\n🔄 Updating ${asset} price via Switchboard...`);
                
                // Get the estimated fee for this update
                const switchboardAddress = "0x2f833D73bA1086F3E5CDE9e9a695783984636A76"; // Core Testnet
                const Switchboard = await hre.ethers.getContractAt("ISwitchboard", switchboardAddress);
                
                let fee;
                try {
                    fee = await Switchboard.getFee(encoded);
                    console.log(`💰 Update fee: ${hre.ethers.formatEther(fee)} CORE`);
                } catch (error) {
                    console.log("⚠️  Could not get fee, using default 0.001 CORE");
                    fee = hre.ethers.parseEther("0.001");
                }
                
                // Update price from Switchboard
                const tx = await priceFeed.updatePriceFromSwitchboard(asset, encoded, {
                    value: fee,
                    gasLimit: 500000 // Set higher gas limit for complex oracle operations
                });
                
                console.log(`📡 Transaction sent: ${tx.hash}`);
                const receipt = await tx.wait();
                console.log(`✅ ${asset} price updated successfully! (Gas used: ${receipt.gasUsed})`);
                
                // Verify the new price
                try {
                    const newPrice = await priceFeed.getPrice(asset);
                    const priceInUSD = parseFloat(hre.ethers.formatEther(newPrice)).toFixed(6);
                    console.log(`💰 New ${asset} price: $${priceInUSD}`);
                } catch (error) {
                    console.log(`⚠️  Could not read new ${asset} price:`, error.message);
                }
                
            } catch (error) {
                console.log(`❌ Error updating ${asset}:`, error.message);
                
                // Log more details if it's a contract error
                if (error.reason) {
                    console.log(`   Reason: ${error.reason}`);
                }
                if (error.code === 'INSUFFICIENT_FUNDS') {
                    console.log(`   💡 Try increasing the fee or check your CORE balance`);
                }
            }
        }
        
        console.log("\\n🎯 Switchboard Update Summary:");
        console.log("=====================================");
        console.log(`📡 Network: ${network} (Chain ID: ${chainId})`);
        console.log(`🏭 Crossbar Client: https://crossbar.switchboard.xyz`);
        console.log(`🔢 Feed IDs used: ${feedIds.length}`);
        console.log(`💎 Assets updated: ${assetsToUpdate.join(", ")}`);
        console.log("\\n✨ No more stale prices! ✨");
        
    } catch (error) {
        console.log("❌ Error fetching from Crossbar:", error.message);
        
        if (error.message.includes('fetch')) {
            console.log("💡 Tip: Check your internet connection and Crossbar service status");
        }
        if (error.message.includes('chainId')) {
            console.log("💡 Tip: Verify the chain ID is correct for your network");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Update failed:", error);
        process.exit(1);
    });