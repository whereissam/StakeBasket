const { ethers } = require("hardhat");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

class InteractiveTester {
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
    console.log("🧪 StakeBasket Interactive Testing Suite");
    console.log("========================================\n");
    
    await this.loadDeploymentInfo();
    await this.setupContracts();
    await this.setupSigners();
    await this.showWelcome();
    await this.mainMenu();
  }

  async loadDeploymentInfo() {
    console.log("📁 Loading deployment information...");
    const deploymentPath = path.join(__dirname, "../deployment-info.json");
    
    if (!fs.existsSync(deploymentPath)) {
      throw new Error("Deployment info not found. Please run deploy-complete-system.js first!");
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    this.addresses = deploymentInfo.contracts;
    this.testAccounts = deploymentInfo.testAccounts;
    
    console.log("✅ Deployment info loaded\n");
  }

  async setupContracts() {
    console.log("🔗 Connecting to deployed contracts...");
    
    this.contracts = {
      basketGovernance: await ethers.getContractAt("BasketGovernance", this.addresses.basketGovernance),
      basketStaking: await ethers.getContractAt("BasketStaking", this.addresses.basketStaking),
      coreLiquidStakingManager: await ethers.getContractAt("CoreLiquidStakingManager", this.addresses.coreLiquidStakingManager),
      stCoreToken: await ethers.getContractAt("StCoreToken", this.addresses.stCoreToken),
      stakeBasket: await ethers.getContractAt("StakeBasket", this.addresses.stakeBasket),
      dualStakingBasket: await ethers.getContractAt("DualStakingBasket", this.addresses.dualStakingBasket),
      priceFeed: await ethers.getContractAt("PriceFeed", this.addresses.priceFeed),
      unbondingQueue: await ethers.getContractAt("UnbondingQueue", this.addresses.unbondingQueue),
      mockCoreStaking: await ethers.getContractAt("MockCoreStaking", this.addresses.mockCoreStaking),
      basketToken: await ethers.getContractAt("IERC20", this.addresses.basketToken),
      coreToken: await ethers.getContractAt("IERC20", this.addresses.coreToken),
      lstBTCToken: await ethers.getContractAt("IERC20", this.addresses.lstBTCToken),
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

  async showWelcome() {
    console.log("🎯 Test Environment Ready!");
    console.log(`📡 Network: ${(await ethers.provider.getNetwork()).name}`);
    console.log(`👤 Current User: Alice (${this.signers.alice.address})`);
    console.log(`💰 Contract Addresses Loaded: ${Object.keys(this.addresses).length}\n`);
  }

  async mainMenu() {
    while (true) {
      console.log("\n🏠 MAIN MENU");
      console.log("=============");
      console.log("1. 👤 Switch User");
      console.log("2. 💰 Check Balances");
      console.log("3. 🏛️  Governance Testing");
      console.log("4. 💧 Liquid Staking Testing");
      console.log("5. 🧺 ETF Testing");
      console.log("6. ⚖️  Dual Staking Testing");
      console.log("7. 📊 Price Feed Testing");
      console.log("8. 🔄 Complete User Workflow");
      console.log("9. 📋 System Status");
      console.log("0. 🚪 Exit");
      
      const choice = await this.question("\nEnter your choice: ");
      
      switch (choice) {
        case "1": await this.switchUser(); break;
        case "2": await this.checkBalances(); break;
        case "3": await this.governanceTesting(); break;
        case "4": await this.liquidStakingTesting(); break;
        case "5": await this.etfTesting(); break;
        case "6": await this.dualStakingTesting(); break;
        case "7": await this.priceFeedTesting(); break;
        case "8": await this.completeWorkflow(); break;
        case "9": await this.systemStatus(); break;
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
      const basketBalance = await this.contracts.basketToken.balanceOf(this.currentUser.address);
      const coreBalance = await this.contracts.coreToken.balanceOf(this.currentUser.address);
      const lstBTCBalance = await this.contracts.lstBTCToken.balanceOf(this.currentUser.address);
      const stCoreBalance = await this.contracts.stCoreToken.balanceOf(this.currentUser.address);
      const ethBalance = await ethers.provider.getBalance(this.currentUser.address);
      
      console.log(`🪙 BASKET: ${ethers.formatEther(basketBalance)}`);
      console.log(`⭐ CORE: ${ethers.formatEther(coreBalance)}`);
      console.log(`₿ lstBTC: ${ethers.formatEther(lstBTCBalance)}`);
      console.log(`💧 stCORE: ${ethers.formatEther(stCoreBalance)}`);
      console.log(`💎 ETH: ${ethers.formatEther(ethBalance)}`);
      
      // Check staking status
      const stakingInfo = await this.contracts.basketStaking.getStakerInfo(this.currentUser.address);
      console.log(`\n🥉 Staking Tier: ${this.getTierName(stakingInfo.tier)}`);
      console.log(`📊 Staked BASKET: ${ethers.formatEther(stakingInfo.stakedAmount)}`);
      
    } catch (error) {
      console.log(`❌ Error checking balances: ${error.message}`);
    }
  }

  getTierName(tier) {
    const tiers = ["None", "Bronze", "Silver", "Gold", "Platinum"];
    return tiers[tier] || "Unknown";
  }

  async governanceTesting() {
    while (true) {
      console.log("\n🏛️  GOVERNANCE TESTING");
      console.log("=====================");
      console.log("1. 🥉 Stake BASKET Tokens");
      console.log("2. 🔓 Unstake BASKET Tokens");
      console.log("3. 📝 Create Proposal");
      console.log("4. 🗳️  Vote on Proposal");
      console.log("5. ⚡ Execute Proposal");
      console.log("6. 📋 View Proposals");
      console.log("7. 🔍 Check Voting Power");
      console.log("0. 🔙 Back to Main Menu");
      
      const choice = await this.question("Enter your choice: ");
      
      switch (choice) {
        case "1": await this.stakeBasketTokens(); break;
        case "2": await this.unstakeBasketTokens(); break;
        case "3": await this.createProposal(); break;
        case "4": await this.voteOnProposal(); break;
        case "5": await this.executeProposal(); break;
        case "6": await this.viewProposals(); break;
        case "7": await this.checkVotingPower(); break;
        case "0": return;
        default: console.log("❌ Invalid choice!");
      }
    }
  }

  async stakeBasketTokens() {
    console.log("\n🥉 STAKE BASKET TOKENS");
    
    const amount = await this.question("Enter amount to stake: ");
    try {
      const amountWei = ethers.parseEther(amount);
      
      // Check balance
      const balance = await this.contracts.basketToken.balanceOf(this.currentUser.address);
      if (balance < amountWei) {
        console.log("❌ Insufficient BASKET balance!");
        return;
      }
      
      // Approve
      console.log("🔄 Approving tokens...");
      const approveTx = await this.contracts.basketToken
        .connect(this.currentUser)
        .approve(this.addresses.basketStaking, amountWei);
      await approveTx.wait();
      
      // Stake
      console.log("🔄 Staking tokens...");
      const stakeTx = await this.contracts.basketStaking
        .connect(this.currentUser)
        .stake(amountWei);
      await stakeTx.wait();
      
      // Check new tier
      const stakingInfo = await this.contracts.basketStaking.getStakerInfo(this.currentUser.address);
      console.log(`✅ Staked ${amount} BASKET!`);
      console.log(`🥉 New Tier: ${this.getTierName(stakingInfo.tier)}`);
      console.log(`📊 Total Staked: ${ethers.formatEther(stakingInfo.stakedAmount)}`);
      
    } catch (error) {
      console.log(`❌ Error staking: ${error.message}`);
    }
  }

  async unstakeBasketTokens() {
    console.log("\n🔓 UNSTAKE BASKET TOKENS");
    
    const amount = await this.question("Enter amount to unstake: ");
    try {
      const amountWei = ethers.parseEther(amount);
      
      const unstakeTx = await this.contracts.basketStaking
        .connect(this.currentUser)
        .unstake(amountWei);
      await unstakeTx.wait();
      
      console.log(`✅ Unstaked ${amount} BASKET!`);
      
    } catch (error) {
      console.log(`❌ Error unstaking: ${error.message}`);
    }
  }

  async createProposal() {
    console.log("\n📝 CREATE PROPOSAL");
    
    const description = await this.question("Enter proposal description: ");
    const target = await this.question("Enter target contract address (or press enter for test): ");
    
    try {
      const targetAddress = target || this.addresses.priceFeed;
      const calldata = "0x"; // Empty calldata for test proposal
      
      const proposalTx = await this.contracts.basketGovernance
        .connect(this.currentUser)
        .propose(targetAddress, 0, calldata, description);
      const receipt = await proposalTx.wait();
      
      // Get proposal ID from event
      const proposalEvent = receipt.logs.find(log => 
        log.topics[0] === ethers.id("ProposalCreated(uint256,address,address,uint256,bytes,string)")
      );
      
      if (proposalEvent) {
        const proposalId = ethers.toBigInt(proposalEvent.topics[1]);
        console.log(`✅ Proposal created with ID: ${proposalId}`);
      } else {
        console.log(`✅ Proposal created successfully!`);
      }
      
    } catch (error) {
      console.log(`❌ Error creating proposal: ${error.message}`);
    }
  }

  async voteOnProposal() {
    console.log("\n🗳️  VOTE ON PROPOSAL");
    
    const proposalId = await this.question("Enter proposal ID: ");
    const support = await this.question("Vote (1=For, 0=Against): ");
    
    try {
      const voteTx = await this.contracts.basketGovernance
        .connect(this.currentUser)
        .vote(proposalId, support === "1");
      await voteTx.wait();
      
      console.log(`✅ Vote cast ${support === "1" ? "FOR" : "AGAINST"} proposal ${proposalId}!`);
      
    } catch (error) {
      console.log(`❌ Error voting: ${error.message}`);
    }
  }

  async executeProposal() {
    console.log("\n⚡ EXECUTE PROPOSAL");
    
    const proposalId = await this.question("Enter proposal ID: ");
    
    try {
      const executeTx = await this.contracts.basketGovernance
        .connect(this.currentUser)
        .execute(proposalId);
      await executeTx.wait();
      
      console.log(`✅ Proposal ${proposalId} executed!`);
      
    } catch (error) {
      console.log(`❌ Error executing proposal: ${error.message}`);
    }
  }

  async viewProposals() {
    console.log("\n📋 VIEW PROPOSALS");
    console.log("(Note: This would show all proposals in a real implementation)");
    // In a real implementation, you'd iterate through proposal IDs and show details
  }

  async checkVotingPower() {
    console.log("\n🔍 CHECK VOTING POWER");
    
    try {
      const stakingInfo = await this.contracts.basketStaking.getStakerInfo(this.currentUser.address);
      const multiplier = await this.contracts.basketStaking.getVotingMultiplier(this.currentUser.address);
      
      console.log(`📊 Staked Amount: ${ethers.formatEther(stakingInfo.stakedAmount)} BASKET`);
      console.log(`🥉 Tier: ${this.getTierName(stakingInfo.tier)}`);
      console.log(`⚡ Voting Multiplier: ${multiplier}x (${Number(multiplier) / 10}x actual)`);
      
    } catch (error) {
      console.log(`❌ Error checking voting power: ${error.message}`);
    }
  }

  async liquidStakingTesting() {
    while (true) {
      console.log("\n💧 LIQUID STAKING TESTING");
      console.log("=========================");
      console.log("1. 💰 Stake CORE (get stCORE)");
      console.log("2. 🔄 Request Unstaking");
      console.log("3. 💸 Claim Unstaked CORE");
      console.log("4. 📊 Check Conversion Rate");
      console.log("5. 🏆 Claim Rewards");
      console.log("6. 🔍 Check Unbonding Queue");
      console.log("0. 🔙 Back to Main Menu");
      
      const choice = await this.question("Enter your choice: ");
      
      switch (choice) {
        case "1": await this.stakeCORE(); break;
        case "2": await this.requestUnstaking(); break;
        case "3": await this.claimUnstaked(); break;
        case "4": await this.checkConversionRate(); break;
        case "5": await this.claimRewards(); break;
        case "6": await this.checkUnbondingQueue(); break;
        case "0": return;
        default: console.log("❌ Invalid choice!");
      }
    }
  }

  async stakeCORE() {
    console.log("\n💰 STAKE CORE TOKENS");
    
    const amount = await this.question("Enter CORE amount to stake: ");
    try {
      const amountWei = ethers.parseEther(amount);
      
      // Approve
      console.log("🔄 Approving CORE tokens...");
      const approveTx = await this.contracts.coreToken
        .connect(this.currentUser)
        .approve(this.addresses.coreLiquidStakingManager, amountWei);
      await approveTx.wait();
      
      // Stake
      console.log("🔄 Staking CORE...");
      const stakeTx = await this.contracts.coreLiquidStakingManager
        .connect(this.currentUser)
        .stake(amountWei);
      await stakeTx.wait();
      
      const stCoreBalance = await this.contracts.stCoreToken.balanceOf(this.currentUser.address);
      console.log(`✅ Staked ${amount} CORE!`);
      console.log(`💧 Received stCORE: ${ethers.formatEther(stCoreBalance)}`);
      
    } catch (error) {
      console.log(`❌ Error staking CORE: ${error.message}`);
    }
  }

  async requestUnstaking() {
    console.log("\n🔄 REQUEST UNSTAKING");
    
    const amount = await this.question("Enter stCORE amount to unstake: ");
    try {
      const amountWei = ethers.parseEther(amount);
      
      const unstakeTx = await this.contracts.coreLiquidStakingManager
        .connect(this.currentUser)
        .requestUnstake(amountWei);
      await unstakeTx.wait();
      
      console.log(`✅ Unstaking requested for ${amount} stCORE!`);
      console.log("⏳ Unstaking will be available after 7 days");
      
    } catch (error) {
      console.log(`❌ Error requesting unstaking: ${error.message}`);
    }
  }

  async claimUnstaked() {
    console.log("\n💸 CLAIM UNSTAKED CORE");
    
    try {
      const claimTx = await this.contracts.coreLiquidStakingManager
        .connect(this.currentUser)
        .claimUnstaked();
      await claimTx.wait();
      
      console.log(`✅ Unstaked CORE claimed!`);
      
    } catch (error) {
      console.log(`❌ Error claiming unstaked: ${error.message}`);
    }
  }

  async checkConversionRate() {
    console.log("\n📊 CHECK CONVERSION RATE");
    
    try {
      const rate = await this.contracts.coreLiquidStakingManager.getConversionRate();
      console.log(`💱 1 CORE = ${ethers.formatEther(rate)} stCORE`);
      
    } catch (error) {
      console.log(`❌ Error checking rate: ${error.message}`);
    }
  }

  async claimRewards() {
    console.log("\n🏆 CLAIM REWARDS");
    
    try {
      const claimTx = await this.contracts.coreLiquidStakingManager
        .connect(this.currentUser)
        .claimRewards();
      await claimTx.wait();
      
      console.log(`✅ Rewards claimed!`);
      
    } catch (error) {
      console.log(`❌ Error claiming rewards: ${error.message}`);
    }
  }

  async checkUnbondingQueue() {
    console.log("\n🔍 CHECK UNBONDING QUEUE");
    
    try {
      // This would show unbonding queue status in a real implementation
      console.log("📋 Unbonding queue status would be displayed here");
      
    } catch (error) {
      console.log(`❌ Error checking queue: ${error.message}`);
    }
  }

  async etfTesting() {
    while (true) {
      console.log("\n🧺 ETF TESTING");
      console.log("===============");
      console.log("1. 💰 Deposit Assets (CORE + lstBTC)");
      console.log("2. 🔄 Withdraw from ETF");
      console.log("3. 📊 Check NAV");
      console.log("4. 💼 Check Holdings");
      console.log("5. 🔄 Trigger Rebalancing");
      console.log("0. 🔙 Back to Main Menu");
      
      const choice = await this.question("Enter your choice: ");
      
      switch (choice) {
        case "1": await this.depositToETF(); break;
        case "2": await this.withdrawFromETF(); break;
        case "3": await this.checkNAV(); break;
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
    const lstBTCAmount = await this.question("Enter lstBTC amount: ");
    
    try {
      const coreWei = ethers.parseEther(coreAmount);
      const lstBTCWei = ethers.parseEther(lstBTCAmount);
      
      // Approve tokens
      console.log("🔄 Approving tokens...");
      await this.contracts.coreToken
        .connect(this.currentUser)
        .approve(this.addresses.stakeBasket, coreWei);
      await this.contracts.lstBTCToken
        .connect(this.currentUser)
        .approve(this.addresses.stakeBasket, lstBTCWei);
      
      // Deposit
      console.log("🔄 Depositing to ETF...");
      const depositTx = await this.contracts.stakeBasket
        .connect(this.currentUser)
        .deposit(coreWei, lstBTCWei);
      await depositTx.wait();
      
      console.log(`✅ Deposited ${coreAmount} CORE + ${lstBTCAmount} lstBTC to ETF!`);
      
    } catch (error) {
      console.log(`❌ Error depositing to ETF: ${error.message}`);
    }
  }

  async withdrawFromETF() {
    console.log("\n🔄 WITHDRAW FROM ETF");
    
    const shares = await this.question("Enter shares to withdraw: ");
    
    try {
      const sharesWei = ethers.parseEther(shares);
      
      const withdrawTx = await this.contracts.stakeBasket
        .connect(this.currentUser)
        .withdraw(sharesWei);
      await withdrawTx.wait();
      
      console.log(`✅ Withdrew ${shares} ETF shares!`);
      
    } catch (error) {
      console.log(`❌ Error withdrawing from ETF: ${error.message}`);
    }
  }

  async checkNAV() {
    console.log("\n📊 CHECK ETF NAV");
    
    try {
      const nav = await this.contracts.stakeBasket.calculateNAV();
      console.log(`💰 Current NAV: ${ethers.formatEther(nav)}`);
      
    } catch (error) {
      console.log(`❌ Error checking NAV: ${error.message}`);
    }
  }

  async checkETFHoldings() {
    console.log("\n💼 CHECK ETF HOLDINGS");
    
    try {
      const coreBalance = await this.contracts.coreToken.balanceOf(this.addresses.stakeBasket);
      const lstBTCBalance = await this.contracts.lstBTCToken.balanceOf(this.addresses.stakeBasket);
      
      console.log(`⭐ CORE Holdings: ${ethers.formatEther(coreBalance)}`);
      console.log(`₿ lstBTC Holdings: ${ethers.formatEther(lstBTCBalance)}`);
      
    } catch (error) {
      console.log(`❌ Error checking holdings: ${error.message}`);
    }
  }

  async triggerRebalancing() {
    console.log("\n🔄 TRIGGER REBALANCING");
    
    try {
      const rebalanceTx = await this.contracts.stakeBasket
        .connect(this.currentUser)
        .rebalance();
      await rebalanceTx.wait();
      
      console.log(`✅ Rebalancing triggered!`);
      
    } catch (error) {
      console.log(`❌ Error triggering rebalancing: ${error.message}`);
    }
  }

  async dualStakingTesting() {
    console.log("\n⚖️  DUAL STAKING TESTING");
    console.log("Currently available for testing dual staking optimization");
    console.log("Press Enter to continue...");
    await this.question("");
  }

  async priceFeedTesting() {
    while (true) {
      console.log("\n📊 PRICE FEED TESTING");
      console.log("=====================");
      console.log("1. 📈 View Current Prices");
      console.log("2. 🔄 Update CORE Price");
      console.log("3. 🔄 Update BTC Price");
      console.log("4. 🔄 Update SolvBTC Price");
      console.log("0. 🔙 Back to Main Menu");
      
      const choice = await this.question("Enter your choice: ");
      
      switch (choice) {
        case "1": await this.viewCurrentPrices(); break;
        case "2": await this.updateCorePrice(); break;
        case "3": await this.updateBTCPrice(); break;
        case "4": await this.updateSolvBTCPrice(); break;
        case "0": return;
        default: console.log("❌ Invalid choice!");
      }
    }
  }

  async viewCurrentPrices() {
    console.log("\n📈 CURRENT PRICES");
    
    try {
      const corePrice = await this.contracts.priceFeed.getCorePrice();
      const btcPrice = await this.contracts.priceFeed.getBTCPrice();
      const solvBTCPrice = await this.contracts.priceFeed.getSolvBTCPrice();
      
      console.log(`⭐ CORE: $${ethers.formatEther(corePrice)}`);
      console.log(`₿ BTC: $${ethers.formatEther(btcPrice)}`);
      console.log(`🪙 SolvBTC: $${ethers.formatEther(solvBTCPrice)}`);
      
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
        .updateCorePrice(priceWei);
      await updateTx.wait();
      
      console.log(`✅ CORE price updated to $${price}!`);
      
    } catch (error) {
      console.log(`❌ Error updating price: ${error.message}`);
    }
  }

  async updateBTCPrice() {
    console.log("\n🔄 UPDATE BTC PRICE");
    
    const price = await this.question("Enter new BTC price: ");
    try {
      const priceWei = ethers.parseEther(price);
      
      const updateTx = await this.contracts.priceFeed
        .connect(this.currentUser)
        .updateBTCPrice(priceWei);
      await updateTx.wait();
      
      console.log(`✅ BTC price updated to $${price}!`);
      
    } catch (error) {
      console.log(`❌ Error updating price: ${error.message}`);
    }
  }

  async updateSolvBTCPrice() {
    console.log("\n🔄 UPDATE SOLVBTC PRICE");
    
    const price = await this.question("Enter new SolvBTC price: ");
    try {
      const priceWei = ethers.parseEther(price);
      
      const updateTx = await this.contracts.priceFeed
        .connect(this.currentUser)
        .updateSolvBTCPrice(priceWei);
      await updateTx.wait();
      
      console.log(`✅ SolvBTC price updated to $${price}!`);
      
    } catch (error) {
      console.log(`❌ Error updating price: ${error.message}`);
    }
  }

  async completeWorkflow() {
    console.log("\n🔄 COMPLETE USER WORKFLOW");
    console.log("==========================");
    console.log("This will demonstrate a complete user journey:");
    console.log("1. Stake BASKET → Get tier benefits");
    console.log("2. Stake CORE → Get stCORE");
    console.log("3. Deposit to ETF → Get ETF shares");
    console.log("4. Create & vote on governance proposal");
    
    const confirm = await this.question("Continue? (y/n): ");
    if (confirm.toLowerCase() !== 'y') return;
    
    try {
      console.log("🔄 Starting complete workflow...");
      
      // Step 1: Stake BASKET for tier benefits
      console.log("\n📍 Step 1: Staking BASKET tokens for tier benefits...");
      const basketAmount = ethers.parseEther("10000"); // Gold tier
      await this.contracts.basketToken.connect(this.currentUser).approve(this.addresses.basketStaking, basketAmount);
      await this.contracts.basketStaking.connect(this.currentUser).stake(basketAmount);
      console.log("✅ Staked 10,000 BASKET → Gold Tier achieved!");
      
      // Step 2: Stake CORE for stCORE
      console.log("\n📍 Step 2: Staking CORE for liquid staking...");
      const coreAmount = ethers.parseEther("5000");
      await this.contracts.coreToken.connect(this.currentUser).approve(this.addresses.coreLiquidStakingManager, coreAmount);
      await this.contracts.coreLiquidStakingManager.connect(this.currentUser).stake(coreAmount);
      console.log("✅ Staked 5,000 CORE → Received stCORE!");
      
      // Step 3: Deposit to ETF
      console.log("\n📍 Step 3: Depositing to ETF...");
      const etfCoreAmount = ethers.parseEther("2000");
      const etfLstBTCAmount = ethers.parseEther("2");
      await this.contracts.coreToken.connect(this.currentUser).approve(this.addresses.stakeBasket, etfCoreAmount);
      await this.contracts.lstBTCToken.connect(this.currentUser).approve(this.addresses.stakeBasket, etfLstBTCAmount);
      await this.contracts.stakeBasket.connect(this.currentUser).deposit(etfCoreAmount, etfLstBTCAmount);
      console.log("✅ Deposited to ETF → Received ETF shares!");
      
      // Step 4: Create governance proposal
      console.log("\n📍 Step 4: Creating governance proposal...");
      const description = "Test proposal from complete workflow";
      await this.contracts.basketGovernance.connect(this.currentUser)
        .propose(this.addresses.priceFeed, 0, "0x", description);
      console.log("✅ Created governance proposal!");
      
      console.log("\n🎉 Complete workflow finished successfully!");
      console.log("User now has:");
      console.log("- Gold tier benefits (25% fee reduction, 1.25x voting)");
      console.log("- Liquid staking position (stCORE earning rewards)");
      console.log("- ETF shares (diversified CORE + lstBTC exposure)");
      console.log("- Active governance participation");
      
    } catch (error) {
      console.log(`❌ Error in workflow: ${error.message}`);
    }
  }

  async systemStatus() {
    console.log("\n📋 SYSTEM STATUS");
    console.log("================");
    
    try {
      // Price feed status
      const corePrice = await this.contracts.priceFeed.getCorePrice();
      const btcPrice = await this.contracts.priceFeed.getBTCPrice();
      console.log(`📊 CORE Price: $${ethers.formatEther(corePrice)}`);
      console.log(`📊 BTC Price: $${ethers.formatEther(btcPrice)}`);
      
      // Contract balances
      const etfCoreBalance = await this.contracts.coreToken.balanceOf(this.addresses.stakeBasket);
      const etfLstBTCBalance = await this.contracts.lstBTCToken.balanceOf(this.addresses.stakeBasket);
      console.log(`🧺 ETF CORE Holdings: ${ethers.formatEther(etfCoreBalance)}`);
      console.log(`🧺 ETF lstBTC Holdings: ${ethers.formatEther(etfLstBTCBalance)}`);
      
      // Liquid staking stats
      const totalStaked = await this.contracts.stCoreToken.totalSupply();
      console.log(`💧 Total stCORE Supply: ${ethers.formatEther(totalStaked)}`);
      
      console.log("\n✅ All systems operational!");
      
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
  const tester = new InteractiveTester();
  await tester.init();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { InteractiveTester };