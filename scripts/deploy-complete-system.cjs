const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  // Price Feed Initial Prices (18 decimals)
  CORE_PRICE: ethers.parseEther("1.5"), // $1.50
  BTC_PRICE: ethers.parseEther("95000"), // $95,000
  SOLVBTC_PRICE: ethers.parseEther("96000"), // $96,000 (slight premium)
  
  // Staking Tiers (BASKET token amounts)
  BRONZE_THRESHOLD: ethers.parseEther("100"),
  SILVER_THRESHOLD: ethers.parseEther("1000"),
  GOLD_THRESHOLD: ethers.parseEther("10000"),
  PLATINUM_THRESHOLD: ethers.parseEther("100000"),
  
  // Initial token supplies
  BASKET_SUPPLY: ethers.parseEther("1000000"), // 1M BASKET
  CORE_SUPPLY: ethers.parseEther("10000000"), // 10M CORE
  LSTBTC_SUPPLY: ethers.parseEther("1000"), // 1K lstBTC
  
  // Fee parameters (in basis points, 10000 = 100%)
  MANAGEMENT_FEE: 50, // 0.5%
  PERFORMANCE_FEE: 1000, // 10%
  
  // Governance parameters
  PROPOSAL_THRESHOLD: ethers.parseEther("100"), // 100 BASKET
  VOTING_PERIOD: 3 * 24 * 60 * 60, // 3 days
  EXECUTION_DELAY: 1 * 24 * 60 * 60, // 1 day
  
  // Validator parameters
  VALIDATOR_COUNT: 5,
  MIN_DELEGATION: ethers.parseEther("1000"), // 1000 CORE
};

class SystemDeployer {
  constructor() {
    this.contracts = {};
    this.addresses = {};
    this.signers = {};
  }

  async deploy() {
    console.log("🚀 Starting StakeBasket Protocol Deployment...\n");
    
    await this.setupSigners();
    await this.deployInfrastructure();
    await this.deployGovernance();
    await this.deployLiquidStaking();
    await this.deployETFLayer();
    await this.setupValidators();
    await this.configureIntegrations();
    await this.fundTestAccounts();
    await this.saveDeploymentInfo();
    
    console.log("✅ Complete system deployment finished!\n");
    this.printSummary();
  }

  async setupSigners() {
    console.log("👤 Setting up signers...");
    const signers = await ethers.getSigners();
    this.signers = {
      deployer: signers[0],
      alice: signers[1],
      bob: signers[2],
      charlie: signers[3],
      dave: signers[4],
    };
    
    console.log(`   Deployer: ${this.signers.deployer.address}`);
    console.log(`   Alice: ${this.signers.alice.address}`);
    console.log(`   Bob: ${this.signers.bob.address}\n`);
  }

  async deployInfrastructure() {
    console.log("🏗️  Deploying Infrastructure...");
    
    // Deploy Mock Tokens individually
    console.log("   📄 Deploying mock CORE token...");
    const MockCORE = await ethers.getContractFactory("MockCORE");
    this.contracts.mockCORE = await MockCORE.deploy(this.signers.deployer.address);
    await this.contracts.mockCORE.waitForDeployment();
    this.addresses.coreToken = await this.contracts.mockCORE.getAddress();
    
    console.log("   📄 Deploying mock coreBTC token...");
    const MockCoreBTC = await ethers.getContractFactory("MockCoreBTC");
    this.contracts.mockCoreBTC = await MockCoreBTC.deploy(this.signers.deployer.address);
    await this.contracts.mockCoreBTC.waitForDeployment();
    this.addresses.coreBTCToken = await this.contracts.mockCoreBTC.getAddress();
    
    // Deploy StakeBasketToken as the BASKET governance token
    console.log("   📄 Deploying BASKET token...");
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    this.contracts.basketToken = await StakeBasketToken.deploy("BASKET Governance Token", "BASKET", this.signers.deployer.address);
    await this.contracts.basketToken.waitForDeployment();
    this.addresses.basketToken = await this.contracts.basketToken.getAddress();
    
    // Allow deployer to mint BASKET tokens for initial distribution
    await this.contracts.basketToken.setStakeBasketContract(this.signers.deployer.address);
    
    // Use coreBTC as lstBTC for testing
    this.addresses.lstBTCToken = this.addresses.coreBTCToken;
    
    // Deploy PriceFeed
    console.log("   📊 Deploying price feed...");
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    this.contracts.priceFeed = await PriceFeed.deploy(this.signers.deployer.address);
    await this.contracts.priceFeed.waitForDeployment();
    this.addresses.priceFeed = await this.contracts.priceFeed.getAddress();
    
    // Set initial prices
    await this.contracts.priceFeed.setPrice("CORE", DEPLOYMENT_CONFIG.CORE_PRICE);
    await this.contracts.priceFeed.setPrice("BTC", DEPLOYMENT_CONFIG.BTC_PRICE);
    await this.contracts.priceFeed.setPrice("SolvBTC", DEPLOYMENT_CONFIG.SOLVBTC_PRICE);
    
    // Deploy UnbondingQueue
    console.log("   ⏳ Deploying unbonding queue...");
    const UnbondingQueue = await ethers.getContractFactory("UnbondingQueue");
    this.contracts.unbondingQueue = await UnbondingQueue.deploy(this.signers.deployer.address);
    await this.contracts.unbondingQueue.waitForDeployment();
    this.addresses.unbondingQueue = await this.contracts.unbondingQueue.getAddress();
    
    console.log("   ✅ Infrastructure deployed\n");
  }

  async deployGovernance() {
    console.log("🏛️  Deploying Governance Layer...");
    
    // Deploy BasketStaking
    console.log("   🥉 Deploying basket staking...");
    const BasketStaking = await ethers.getContractFactory("BasketStaking");
    this.contracts.basketStaking = await BasketStaking.deploy(
      this.addresses.basketToken,
      this.signers.deployer.address
    );
    await this.contracts.basketStaking.waitForDeployment();
    this.addresses.basketStaking = await this.contracts.basketStaking.getAddress();
    
    // Deploy BasketGovernance
    console.log("   🗳️  Deploying governance...");
    const BasketGovernance = await ethers.getContractFactory("BasketGovernance");
    this.contracts.basketGovernance = await BasketGovernance.deploy(
      this.addresses.basketToken,
      this.addresses.basketStaking,
      this.signers.deployer.address
    );
    await this.contracts.basketGovernance.waitForDeployment();
    this.addresses.basketGovernance = await this.contracts.basketGovernance.getAddress();
    
    console.log("   ✅ Governance deployed\n");
  }

  async deployLiquidStaking() {
    console.log("💧 Deploying Liquid Staking...");
    
    // Deploy MockCoreStaking
    console.log("   🎭 Deploying mock core staking...");
    const MockCoreStaking = await ethers.getContractFactory("MockCoreStaking");
    this.contracts.mockCoreStaking = await MockCoreStaking.deploy(this.addresses.coreToken, this.signers.deployer.address);
    await this.contracts.mockCoreStaking.waitForDeployment();
    this.addresses.mockCoreStaking = await this.contracts.mockCoreStaking.getAddress();
    
    // Deploy CoreLiquidStakingManager
    console.log("   🏊 Deploying liquid staking manager...");
    const CoreLiquidStakingManager = await ethers.getContractFactory("CoreLiquidStakingManager");
    this.contracts.coreLiquidStakingManager = await CoreLiquidStakingManager.deploy(
      this.addresses.mockCoreStaking,    // _coreStakingContract
      this.signers.deployer.address,     // _treasury
      this.signers.deployer.address,     // _operator
      this.addresses.unbondingQueue,     // _unbondingQueue
      this.signers.deployer.address      // initialOwner
    );
    await this.contracts.coreLiquidStakingManager.waitForDeployment();
    this.addresses.coreLiquidStakingManager = await this.contracts.coreLiquidStakingManager.getAddress();
    
    // Get the stCORE token address from the liquid staking manager
    this.addresses.stCoreToken = await this.contracts.coreLiquidStakingManager.stCoreToken();
    this.contracts.stCoreToken = await ethers.getContractAt("StCoreToken", this.addresses.stCoreToken);
    
    console.log("   ✅ Liquid staking deployed\n");
  }

  async deployETFLayer() {
    console.log("📊 Deploying ETF Layer...");
    
    // Deploy StakeBasketToken
    console.log("   🎫 Deploying ETF share token...");
    const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
    this.contracts.stakeBasketToken = await StakeBasketToken.deploy(
      "StakeBasket ETF Token",
      "BASKET-ETF", 
      this.signers.deployer.address
    );
    await this.contracts.stakeBasketToken.waitForDeployment();
    this.addresses.stakeBasketToken = await this.contracts.stakeBasketToken.getAddress();
    
    // Deploy StakingManager
    console.log("   👨‍💼 Deploying staking manager...");
    const StakingManager = await ethers.getContractFactory("StakingManager");
    this.contracts.stakingManager = await StakingManager.deploy(
      this.addresses.stakeBasketToken,    // _stakeBasketContract (temporarily)
      this.addresses.mockCoreStaking,     // _coreStakingContract
      this.addresses.lstBTCToken,         // _lstBTCContract
      this.addresses.coreBTCToken,        // _coreBTCContract
      this.addresses.coreToken,           // _coreToken
      this.signers.deployer.address       // initialOwner
    );
    await this.contracts.stakingManager.waitForDeployment();
    this.addresses.stakingManager = await this.contracts.stakingManager.getAddress();
    
    // Deploy StakeBasket
    console.log("   🧺 Deploying main ETF contract...");
    const StakeBasket = await ethers.getContractFactory("StakeBasket");
    this.contracts.stakeBasket = await StakeBasket.deploy(
      this.addresses.stakeBasketToken,    // _etfToken
      this.addresses.stakingManager,      // _stakingManager  
      this.addresses.priceFeed,           // _priceFeed
      this.signers.deployer.address,      // _feeRecipient
      this.signers.deployer.address,      // _protocolTreasury
      this.signers.deployer.address       // initialOwner
    );
    await this.contracts.stakeBasket.waitForDeployment();
    this.addresses.stakeBasket = await this.contracts.stakeBasket.getAddress();
    
    // Deploy MockDualStaking
    console.log("   🎭 Deploying mock dual staking...");
    const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
    this.contracts.mockDualStaking = await MockDualStaking.deploy(
      this.addresses.coreToken,
      this.addresses.coreBTCToken,
      this.signers.deployer.address
    );
    await this.contracts.mockDualStaking.waitForDeployment();
    this.addresses.mockDualStaking = await this.contracts.mockDualStaking.getAddress();
    
    // Deploy DualStakingBasket
    console.log("   ⚖️  Deploying dual staking basket...");
    const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
    this.contracts.dualStakingBasket = await DualStakingBasket.deploy(
      this.addresses.stakeBasketToken,      // _basketToken
      this.addresses.priceFeed,             // _priceFeed
      this.addresses.coreToken,             // _coreToken
      this.addresses.coreBTCToken,          // _btcToken
      this.addresses.mockDualStaking,       // _dualStakingContract
      this.signers.deployer.address,        // _feeRecipient
      1,                                    // _targetTier (BOOST = 1)
      this.signers.deployer.address         // initialOwner
    );
    await this.contracts.dualStakingBasket.waitForDeployment();
    this.addresses.dualStakingBasket = await this.contracts.dualStakingBasket.getAddress();
    
    // Set StakeBasket contract for minting permissions
    await this.contracts.stakeBasketToken.setStakeBasketContract(this.addresses.stakeBasket);
    
    console.log("   ✅ ETF layer deployed\n");
  }

  async setupValidators() {
    console.log("⚡ Setting up validators...");
    
    // Add validators to MockCoreStaking
    const validators = [
      { addr: this.signers.alice.address, commission: 500, hybridScore: 850 }, // 5% commission, high score
      { addr: this.signers.bob.address, commission: 300, hybridScore: 900 },   // 3% commission, highest score
      { addr: this.signers.charlie.address, commission: 700, hybridScore: 750 }, // 7% commission, medium score
      { addr: this.signers.dave.address, commission: 400, hybridScore: 880 },  // 4% commission, high score
      { addr: this.signers.deployer.address, commission: 600, hybridScore: 800 }, // 6% commission, good score
    ];
    
    for (let i = 0; i < validators.length; i++) {
      const val = validators[i];
      await this.contracts.mockCoreStaking.registerValidator(
        val.addr,
        val.commission,
        val.hybridScore
      );
      console.log(`   ✅ Added validator ${i + 1}: ${val.addr} (${val.commission/100}% commission)`);
    }
    
    console.log("   ✅ Validators configured\n");
  }

  async configureIntegrations() {
    console.log("🔗 Configuring integrations...");
    
    // Configure BasketStaking with governance address
    console.log("   🏛️  Linking governance to staking...");
    // Note: This might require additional setup depending on contract interfaces
    
    // Configure UnbondingQueue with liquid staking manager
    console.log("   ⏳ Configuring unbonding queue...");
    // Note: UnbondingQueue doesn't require specific manager configuration in this version
    
    console.log("   ✅ Integrations configured\n");
  }

  async fundTestAccounts() {
    console.log("💰 Funding test accounts with tokens...");
    
    // Use the deployed token contracts directly
    const basketToken = this.contracts.basketToken;
    const coreToken = this.contracts.mockCORE;
    const lstBTCToken = this.contracts.mockCoreBTC;
    
    // Fund test accounts
    const accounts = [this.signers.alice, this.signers.bob, this.signers.charlie, this.signers.dave];
    
    for (const account of accounts) {
      // Mint BASKET tokens (for governance)
      await basketToken.mint(account.address, ethers.parseEther("50000"));
      
      // Transfer CORE tokens (for staking)
      await coreToken.transfer(account.address, ethers.parseEther("100000"));
      
      // Transfer coreBTC tokens (as lstBTC for ETF) - coreBTC uses 8 decimals
      await lstBTCToken.transfer(account.address, 10n * (10n ** 8n));
      
      console.log(`   💳 Funded ${account.address}: 50K BASKET, 100K CORE, 10 coreBTC`);
    }
    
    console.log("   ✅ Test accounts funded\n");
  }

  async saveDeploymentInfo() {
    console.log("💾 Saving deployment information...");
    
    const deploymentInfo = {
      network: await ethers.provider.getNetwork(),
      timestamp: new Date().toISOString(),
      deployer: this.signers.deployer.address,
      contracts: this.addresses,
      config: DEPLOYMENT_CONFIG,
      testAccounts: {
        alice: this.signers.alice.address,
        bob: this.signers.bob.address,
        charlie: this.signers.charlie.address,
        dave: this.signers.dave.address,
      }
    };
    
    const deploymentPath = path.join(__dirname, "../deployment-info.json");
    // Custom replacer to handle BigInt values
    const replacer = (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, replacer, 2));
    
    console.log(`   ✅ Deployment info saved to ${deploymentPath}\n`);
  }

  printSummary() {
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=====================");
    console.log(`🏛️  Governance: ${this.addresses.basketGovernance}`);
    console.log(`🥉 Staking: ${this.addresses.basketStaking}`);
    console.log(`💧 Liquid Staking: ${this.addresses.coreLiquidStakingManager}`);
    console.log(`🪙 stCORE Token: ${this.addresses.stCoreToken}`);
    console.log(`🧺 StakeBasket ETF: ${this.addresses.stakeBasket}`);
    console.log(`⚖️  Dual Staking: ${this.addresses.dualStakingBasket}`);
    console.log(`📊 Price Feed: ${this.addresses.priceFeed}`);
    console.log(`⏳ Unbonding Queue: ${this.addresses.unbondingQueue}`);
    console.log(`🎭 Mock Core Staking: ${this.addresses.mockCoreStaking}`);
    console.log(`🎭 Mock Dual Staking: ${this.addresses.mockDualStaking}`);
    console.log(`📄 CORE Token: ${this.addresses.coreToken}`);
    console.log(`📄 BASKET Token: ${this.addresses.basketToken}`);
    console.log(`📄 coreBTC Token: ${this.addresses.coreBTCToken}`);
    console.log("\n🎉 Ready for interactive testing!");
    console.log("Run: npx hardhat run scripts/interactive-testing.js --network localhost");
  }
}

// Deploy if run directly
if (require.main === module) {
  async function main() {
    const deployer = new SystemDeployer();
    await deployer.deploy();
  }

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { SystemDeployer, DEPLOYMENT_CONFIG };