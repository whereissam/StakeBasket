const { ethers } = require("hardhat");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

class SimpleETFTester {
  constructor() {
    this.contracts = {};
    this.addresses = {};
    this.signers = {};
    this.currentUser = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async init() {
    console.log("🧪 StakeBasket ETF Interactive Testing");
    console.log("====================================\n");
    
    await this.loadDeploymentInfo();
    await this.setupContracts();
    await this.setupSigners();
    await this.fundTestAccounts();
    await this.showWelcome();
    await this.mainMenu();
  }

  async loadDeploymentInfo() {
    console.log("📁 Loading deployment information...");
    const deploymentPath = path.join(__dirname, "../deployment-info.json");
    
    if (!fs.existsSync(deploymentPath)) {
      throw new Error("Deployment info not found. Please run deployment script first!");
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    this.addresses = deploymentInfo.contracts;
    
    console.log("✅ Deployment info loaded\n");
  }

  async setupContracts() {
    console.log("🔗 Connecting to deployed contracts...");
    
    this.contracts = {
      stakeBasket: await ethers.getContractAt("StakeBasket", this.addresses.stakeBasket),
      stakeBasketToken: await ethers.getContractAt("StakeBasketToken", this.addresses.stakeBasketToken),
      stakingManager: await ethers.getContractAt("StakingManager", this.addresses.stakingManager),
      priceFeed: await ethers.getContractAt("PriceFeed", this.addresses.priceFeed),
      mockCoreStaking: await ethers.getContractAt("MockCoreStaking", this.addresses.mockCoreStaking),
      mockCORE: await ethers.getContractAt("MockCORE", this.addresses.mockCORE),
      mockCoreBTC: await ethers.getContractAt("MockCoreBTC", this.addresses.mockCoreBTC),
      mockLstBTC: await ethers.getContractAt("MockLstBTC", this.addresses.mockLstBTC),
    };
    
    console.log("✅ Contracts connected\n");
  }

  async setupSigners() {
    const signers = await ethers.getSigners();
    this.signers = {
      deployer: signers[0],
      alice: signers[1],
      bob: signers[2],
      charlie: signers[3],
      dave: signers[4],
    };
    
    this.currentUser = this.signers.alice; // Default user
  }

  async fundTestAccounts() {
    console.log("💰 Funding test accounts with tokens...");
    
    const accounts = [this.signers.alice, this.signers.bob, this.signers.charlie, this.signers.dave];
    
    for (const account of accounts) {
      // Get some test tokens from faucets
      await this.contracts.mockCORE.connect(account).faucet();
      await this.contracts.mockCoreBTC.connect(account).faucet();
      
      console.log(`   💳 Funded ${account.address} from faucets`);
    }
    
    console.log("   ✅ Test accounts funded\n");
  }

  async showWelcome() {
    console.log("🎯 Test Environment Ready!");
    console.log(`📡 Network: localhost`);
    console.log(`👤 Current User: Alice (${this.signers.alice.address})`);
    console.log(`🧺 StakeBasket ETF: ${this.addresses.stakeBasket}\n`);
  }

  async mainMenu() {
    while (true) {
      console.log("\n🏠 MAIN MENU");
      console.log("=============");
      console.log("1. 👤 Switch User");
      console.log("2. 💰 Check Balances");
      console.log("3. 💧 Get Test Tokens (Faucet)");
      console.log("4. 🧺 ETF Operations");
      console.log("5. 📊 Price Feed Testing");
      console.log("6. ⚡ Validator Management");
      console.log("7. 🔄 Complete ETF Demo");
      console.log("8. 📋 System Status");
      console.log("0. 🚪 Exit");
      
      const choice = await this.question("\nEnter your choice: ");
      
      switch (choice) {
        case "1": await this.switchUser(); break;
        case "2": await this.checkBalances(); break;
        case "3": await this.getFaucetTokens(); break;
        case "4": await this.etfOperations(); break;
        case "5": await this.priceFeedTesting(); break;
        case "6": await this.validatorManagement(); break;
        case "7": await this.completeETFDemo(); break;
        case "8": await this.systemStatus(); break;
        case "0": 
          console.log("👋 Goodbye!");
          this.rl.close();
          return;
        default:
          console.log("❌ Invalid choice!");
      }
    }
  }

  async switchUser() {
    console.log("\n👤 SWITCH USER");
    console.log("===============");
    console.log("1. Alice (Test User 1)");
    console.log("2. Bob (Test User 2)");
    console.log("3. Charlie (Test User 3)");
    console.log("4. Dave (Test User 4)");
    console.log("5. Deployer (Contract Owner)");
    
    const choice = await this.question("Select user: ");
    
    switch (choice) {
      case "1": this.currentUser = this.signers.alice; console.log("✅ Switched to Alice"); break;
      case "2": this.currentUser = this.signers.bob; console.log("✅ Switched to Bob"); break;
      case "3": this.currentUser = this.signers.charlie; console.log("✅ Switched to Charlie"); break;
      case "4": this.currentUser = this.signers.dave; console.log("✅ Switched to Dave"); break;
      case "5": this.currentUser = this.signers.deployer; console.log("✅ Switched to Deployer"); break;
      default: console.log("❌ Invalid choice!");
    }
  }

  async checkBalances() {
    console.log(`\n💰 BALANCES FOR ${this.currentUser.address}`);
    console.log("===============================================");
    
    try {
      const coreBalance = await this.contracts.mockCORE.balanceOf(this.currentUser.address);
      const coreBTCBalance = await this.contracts.mockCoreBTC.balanceOf(this.currentUser.address);
      const lstBTCBalance = await this.contracts.mockLstBTC.balanceOf(this.currentUser.address);
      const basketShares = await this.contracts.stakeBasketToken.balanceOf(this.currentUser.address);
      const ethBalance = await ethers.provider.getBalance(this.currentUser.address);
      
      console.log(`⭐ CORE: ${ethers.formatEther(coreBalance)}`);
      console.log(`₿ coreBTC: ${ethers.formatUnits(coreBTCBalance, 8)}`); // coreBTC has 8 decimals
      console.log(`🪙 lstBTC: ${ethers.formatEther(lstBTCBalance)}`);
      console.log(`🧺 ETF Shares: ${ethers.formatEther(basketShares)}`);
      console.log(`💎 ETH: ${ethers.formatEther(ethBalance)}`);
      
    } catch (error) {
      console.log(`❌ Error checking balances: ${error.message}`);
    }
  }

  async getFaucetTokens() {
    console.log("\n💧 GET TEST TOKENS");
    console.log("===================");
    
    try {
      console.log("🔄 Getting CORE tokens from faucet...");
      await this.contracts.mockCORE.connect(this.currentUser).faucet();
      
      console.log("🔄 Getting coreBTC tokens from faucet...");
      await this.contracts.mockCoreBTC.connect(this.currentUser).faucet();
      
      console.log("✅ Test tokens obtained!");
      
    } catch (error) {
      console.log(`❌ Error getting faucet tokens: ${error.message}`);
    }
  }

  async etfOperations() {
    while (true) {
      console.log("\n🧺 ETF OPERATIONS");
      console.log("=================");
      console.log("1. 💰 Deposit Assets (CORE + coreBTC)");
      console.log("2. 🔄 Withdraw ETF Shares");
      console.log("3. 📊 Check ETF NAV");
      console.log("4. 💼 Check ETF Holdings");
      console.log("5. ⚖️  Trigger Rebalancing");
      console.log("0. 🔙 Back to Main Menu");
      
      const choice = await this.question("Enter your choice: ");
      
      switch (choice) {
        case "1": await this.depositToETF(); break;
        case "2": await this.withdrawFromETF(); break;
        case "3": await this.checkETFNAV(); break;
        case "4": await this.checkETFHoldings(); break;
        case "5": await this.triggerRebalancing(); break;
        case "0": return;
        default: console.log("❌ Invalid choice!");
      }
    }
  }

  async depositToETF() {
    console.log("\n💰 DEPOSIT TO ETF");
    
    const coreAmount = await this.question("Enter CORE amount: ");
    
    try {
      const coreWei = ethers.parseEther(coreAmount);
      
      // Check ETH balance
      const ethBalance = await ethers.provider.getBalance(this.currentUser.address);
      
      if (ethBalance < coreWei) {
        console.log("❌ Insufficient ETH balance!");
        return;
      }
      
      // Deposit CORE as ETH (the StakeBasket contract is payable)
      console.log("🔄 Depositing CORE to ETF...");
      const depositTx = await this.contracts.stakeBasket
        .connect(this.currentUser)
        .deposit(coreWei, { value: coreWei });
      await depositTx.wait();
      
      const shares = await this.contracts.stakeBasketToken.balanceOf(this.currentUser.address);
      console.log(`✅ Deposited ${coreAmount} CORE to ETF!`);
      console.log(`🧺 ETF Shares: ${ethers.formatEther(shares)}`);
      
    } catch (error) {
      console.log(`❌ Error depositing to ETF: ${error.message}`);
    }
  }

  async withdrawFromETF() {
    console.log("\n🔄 WITHDRAW FROM ETF");
    
    const shares = await this.question("Enter shares to redeem: ");
    
    try {
      const sharesWei = ethers.parseEther(shares);
      
      const redeemTx = await this.contracts.stakeBasket
        .connect(this.currentUser)
        .redeem(sharesWei);
      await redeemTx.wait();
      
      console.log(`✅ Redeemed ${shares} ETF shares!`);
      
    } catch (error) {
      console.log(`❌ Error redeeming from ETF: ${error.message}`);
    }
  }

  async checkETFNAV() {
    console.log("\n📊 CHECK ETF NAV");
    
    try {
      const aum = await this.contracts.stakeBasket.getTotalAUM();
      const totalShares = await this.contracts.stakeBasketToken.totalSupply();
      const sharePrice = await this.contracts.stakeBasket.getNAVPerShare();
      
      console.log(`💰 Total AUM: ${ethers.formatEther(aum)} USD`);
      console.log(`🧺 Total Shares: ${ethers.formatEther(totalShares)}`);
      console.log(`💎 Price per Share: ${ethers.formatEther(sharePrice)} USD`);
      
    } catch (error) {
      console.log(`❌ Error checking NAV: ${error.message}`);
    }
  }

  async checkETFHoldings() {
    console.log("\n💼 CHECK ETF HOLDINGS");
    
    try {
      const ethBalance = await ethers.provider.getBalance(this.addresses.stakeBasket);
      
      console.log(`⭐ CORE Holdings: ${ethers.formatEther(ethBalance)}`);
      
    } catch (error) {
      console.log(`❌ Error checking holdings: ${error.message}`);
    }
  }

  async triggerRebalancing() {
    console.log("\n⚖️  TRIGGER REBALANCING");
    
    try {
      const rebalanceTx = await this.contracts.stakingManager
        .connect(this.currentUser)
        .rebalanceCoreStaking();
      await rebalanceTx.wait();
      
      console.log(`✅ Rebalancing triggered!`);
      
    } catch (error) {
      console.log(`❌ Error triggering rebalancing: ${error.message}`);
    }
  }

  async priceFeedTesting() {
    while (true) {
      console.log("\n📊 PRICE FEED TESTING");
      console.log("=====================");
      console.log("1. 📈 View Current Prices");
      console.log("2. 🔄 Update CORE Price");
      console.log("3. 🔄 Update coreBTC Price");
      console.log("0. 🔙 Back to Main Menu");
      
      const choice = await this.question("Enter your choice: ");
      
      switch (choice) {
        case "1": await this.viewCurrentPrices(); break;
        case "2": await this.updateCorePrice(); break;
        case "3": await this.updateCoreBTCPrice(); break;
        case "0": return;
        default: console.log("❌ Invalid choice!");
      }
    }
  }

  async viewCurrentPrices() {
    console.log("\n📈 CURRENT PRICES");
    
    try {
      const corePrice = await this.contracts.priceFeed.getCorePrice();
      const coreBTCPrice = await this.contracts.priceFeed.getCoreBTCPrice();
      
      console.log(`⭐ CORE: $${ethers.formatEther(corePrice)}`);
      console.log(`₿ coreBTC: $${ethers.formatEther(coreBTCPrice)}`);
      
    } catch (error) {
      console.log(`❌ Error viewing prices: ${error.message}`);
    }
  }

  async updateCorePrice() {
    console.log("\n🔄 UPDATE CORE PRICE");
    
    const price = await this.question("Enter new CORE price: ");
    try {
      const priceWei = ethers.parseEther(price);
      
      const updateTx = await this.contracts.priceFeed
        .connect(this.currentUser)
        .setPrice("CORE", priceWei);
      await updateTx.wait();
      
      console.log(`✅ CORE price updated to $${price}!`);
      
    } catch (error) {
      console.log(`❌ Error updating price: ${error.message}`);
    }
  }

  async updateCoreBTCPrice() {
    console.log("\n🔄 UPDATE COREBTC PRICE");
    
    const price = await this.question("Enter new coreBTC price: ");
    try {
      const priceWei = ethers.parseEther(price);
      
      const updateTx = await this.contracts.priceFeed
        .connect(this.currentUser)
        .setPrice("coreBTC", priceWei);
      await updateTx.wait();
      
      console.log(`✅ coreBTC price updated to $${price}!`);
      
    } catch (error) {
      console.log(`❌ Error updating price: ${error.message}`);
    }
  }

  async validatorManagement() {
    console.log("\n⚡ VALIDATOR MANAGEMENT");
    console.log("======================");
    console.log("1. 📋 View Active Validators");
    console.log("2. ❌ Deactivate Validator");
    console.log("3. ✅ Activate Validator");
    console.log("4. 🔍 Check Rebalancing Status");
    console.log("0. 🔙 Back to Main Menu");
    
    const choice = await this.question("Enter your choice: ");
    
    switch (choice) {
      case "1": await this.viewValidators(); break;
      case "2": await this.deactivateValidator(); break;
      case "3": await this.activateValidator(); break;
      case "4": await this.checkRebalancingStatus(); break;
      case "0": return;
      default: console.log("❌ Invalid choice!");
    }
  }

  async viewValidators() {
    console.log("\n📋 ACTIVE VALIDATORS");
    
    try {
      const validators = await this.contracts.mockCoreStaking.getActiveValidators();
      console.log(`Total Active Validators: ${validators.length}`);
      
      for (let i = 0; i < validators.length; i++) {
        const validator = validators[i];
        const info = await this.contracts.mockCoreStaking.validators(validator);
        console.log(`${i + 1}. ${validator} (Commission: ${info.commissionRate / 100}%, Score: ${info.hybridScore})`);
      }
      
    } catch (error) {
      console.log(`❌ Error viewing validators: ${error.message}`);
    }
  }

  async deactivateValidator() {
    const validator = await this.question("Enter validator address to deactivate: ");
    
    try {
      await this.contracts.mockCoreStaking
        .connect(this.currentUser)
        .setValidatorStatus(validator, false);
      
      console.log(`✅ Validator ${validator} deactivated!`);
      
    } catch (error) {
      console.log(`❌ Error deactivating validator: ${error.message}`);
    }
  }

  async activateValidator() {
    const validator = await this.question("Enter validator address to activate: ");
    
    try {
      await this.contracts.mockCoreStaking
        .connect(this.currentUser)
        .setValidatorStatus(validator, true);
      
      console.log(`✅ Validator ${validator} activated!`);
      
    } catch (error) {
      console.log(`❌ Error activating validator: ${error.message}`);
    }
  }

  async checkRebalancingStatus() {
    console.log("\n🔍 REBALANCING STATUS");
    
    try {
      const shouldRebalance = await this.contracts.stakingManager.shouldRebalance();
      console.log(`Needs Rebalancing: ${shouldRebalance ? 'YES' : 'NO'}`);
      
      if (shouldRebalance) {
        console.log("🔄 You can trigger rebalancing from the ETF Operations menu");
      }
      
    } catch (error) {
      console.log(`❌ Error checking rebalancing status: ${error.message}`);
    }
  }

  async completeETFDemo() {
    console.log("\n🔄 COMPLETE ETF DEMO");
    console.log("====================");
    console.log("This will demonstrate a complete ETF user journey:");
    console.log("1. Get test tokens from faucet");
    console.log("2. Deposit CORE + coreBTC to ETF");
    console.log("3. Check NAV and holdings");
    console.log("4. Update prices to see NAV changes");
    console.log("5. Withdraw portion of shares");
    
    const confirm = await this.question("Continue? (y/n): ");
    if (confirm.toLowerCase() !== 'y') return;
    
    try {
      console.log("🔄 Starting complete ETF demo...");
      
      // Step 1: Get test tokens
      console.log("\n📍 Step 1: Getting test tokens...");
      await this.contracts.mockCORE.connect(this.currentUser).faucet();
      await this.contracts.mockCoreBTC.connect(this.currentUser).faucet();
      console.log("✅ Got test tokens from faucets!");
      
      // Step 2: Deposit to ETF
      console.log("\n📍 Step 2: Depositing CORE to ETF...");
      const coreAmount = ethers.parseEther("50"); // 50 CORE
      
      await this.contracts.stakeBasket.connect(this.currentUser).deposit(coreAmount, { value: coreAmount });
      console.log("✅ Deposited 50 CORE to ETF!");
      
      // Step 3: Check NAV
      console.log("\n📍 Step 3: Checking ETF status...");
      const aum = await this.contracts.stakeBasket.getTotalAUM();
      const shares = await this.contracts.stakeBasketToken.balanceOf(this.currentUser.address);
      console.log(`✅ Current AUM: ${ethers.formatEther(aum)} USD`);
      console.log(`✅ Your ETF Shares: ${ethers.formatEther(shares)}`);
      
      // Step 4: Update price and check AUM change
      console.log("\n📍 Step 4: Simulating price change...");
      const newCorePrice = ethers.parseEther("2.0"); // Increase CORE price to $2
      await this.contracts.priceFeed.connect(this.currentUser).setPrice("CORE", newCorePrice);
      const newAUM = await this.contracts.stakeBasket.getTotalAUM();
      console.log(`✅ After price increase, AUM: ${ethers.formatEther(newAUM)} USD`);
      
      // Step 5: Partial withdrawal
      console.log("\n📍 Step 5: Withdrawing 25% of shares...");
      const withdrawAmount = shares / 4n; // 25% of shares
      await this.contracts.stakeBasket.connect(this.currentUser).redeem(withdrawAmount);
      
      const remainingShares = await this.contracts.stakeBasketToken.balanceOf(this.currentUser.address);
      console.log(`✅ Withdrew ${ethers.formatEther(withdrawAmount)} shares`);
      console.log(`✅ Remaining shares: ${ethers.formatEther(remainingShares)}`);
      
      console.log("\n🎉 Complete ETF demo finished successfully!");
      console.log("You have successfully:");
      console.log("- Obtained test tokens");
      console.log("- Deposited assets to the ETF");
      console.log("- Monitored NAV changes with price updates");
      console.log("- Performed partial withdrawal");
      
    } catch (error) {
      console.log(`❌ Error in demo: ${error.message}`);
    }
  }

  async systemStatus() {
    console.log("\n📋 SYSTEM STATUS");
    console.log("================");
    
    try {
      // ETF Status
      const aum = await this.contracts.stakeBasket.getTotalAUM();
      const totalShares = await this.contracts.stakeBasketToken.totalSupply();
      console.log(`🧺 ETF Total AUM: ${ethers.formatEther(aum)} USD`);
      console.log(`🧺 Total ETF Shares: ${ethers.formatEther(totalShares)}`);
      
      // Holdings
      const ethHoldings = await ethers.provider.getBalance(this.addresses.stakeBasket);
      console.log(`⭐ ETF CORE Holdings: ${ethers.formatEther(ethHoldings)}`);
      
      // Prices
      const corePrice = await this.contracts.priceFeed.getCorePrice();
      const coreBTCPrice = await this.contracts.priceFeed.getCoreBTCPrice();
      console.log(`📊 CORE Price: $${ethers.formatEther(corePrice)}`);
      console.log(`📊 coreBTC Price: $${ethers.formatEther(coreBTCPrice)}`);
      
      // Validators
      const validators = await this.contracts.mockCoreStaking.getActiveValidators();
      console.log(`⚡ Active Validators: ${validators.length}`);
      
      console.log("\n✅ System is operational!");
      
    } catch (error) {
      console.log(`❌ Error checking system status: ${error.message}`);
    }
  }

  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Run interactive testing
async function main() {
  const tester = new SimpleETFTester();
  await tester.init();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SimpleETFTester };