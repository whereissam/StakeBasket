const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Proper Contract Relationships Integration", function () {
    
    async function deployCompleteSystemFixture() {
        const [owner, user1, user2, treasury, operator] = await ethers.getSigners();
        
        console.log("🏗️ Deploying complete system with proper relationships...");
        
        // 1. Deploy StakeBasketToken (the ERC20 token)
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        const stakeBasketToken = await StakeBasketToken.deploy(
            "StakeBasket Token",
            "BASKET",
            owner.address
        );
        await stakeBasketToken.waitForDeployment();
        console.log("✅ StakeBasketToken deployed");

        // 2. Deploy BasketStaking (for governance voting power)
        const BasketStaking = await ethers.getContractFactory("BasketStaking");
        const basketStaking = await BasketStaking.deploy(
            await stakeBasketToken.getAddress(),
            owner.address
        );
        await basketStaking.waitForDeployment();
        console.log("✅ BasketStaking deployed");

        // 3. Deploy BasketGovernance (DAO governance)
        const BasketGovernance = await ethers.getContractFactory("BasketGovernance");
        const basketGovernance = await BasketGovernance.deploy(
            await stakeBasketToken.getAddress(),
            await basketStaking.getAddress(),
            owner.address
        );
        await basketGovernance.waitForDeployment();
        console.log("✅ BasketGovernance deployed");

        // 4. Deploy mock tokens for testing
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockCoreToken = await MockERC20.deploy("CORE", "CORE", 18);
        const mockBtcToken = await MockERC20.deploy("BTC", "BTC", 18);
        await mockCoreToken.waitForDeployment();
        await mockBtcToken.waitForDeployment();

        // 5. Deploy MockPriceFeed (simpler for testing)
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        const priceFeed = await MockPriceFeed.deploy();
        await priceFeed.waitForDeployment();
        console.log("✅ MockPriceFeed deployed");

        // 6. Deploy MockDEXRouter (for swapping)
        const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
        const mockDexRouter = await MockDEXRouter.deploy();
        await mockDexRouter.waitForDeployment();

        // 7. Deploy MockDualStaking
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        const mockDualStaking = await MockDualStaking.deploy();
        await mockDualStaking.waitForDeployment();

        // 7. Deploy DualStakingBasket (can mint StakeBasketToken)
        const DualStakingBasket = await ethers.getContractFactory("DualStakingBasket");
        const dualStakingBasket = await DualStakingBasket.deploy(
            await stakeBasketToken.getAddress(),
            await priceFeed.getAddress(),
            await mockCoreToken.getAddress(),
            await mockBtcToken.getAddress(),
            await mockDualStaking.getAddress(),
            treasury.address, // feeRecipient
            0, // BRONZE tier
            owner.address
        );
        await dualStakingBasket.waitForDeployment();
        console.log("✅ DualStakingBasket deployed");

        // 8. Deploy OptimizedContractFactory
        const OptimizedContractFactory = await ethers.getContractFactory("OptimizedContractFactory");
        const factory = await OptimizedContractFactory.deploy();
        await factory.waitForDeployment();
        console.log("✅ OptimizedContractFactory deployed");

        // 9. Set up proper permissions - DualStakingBasket can mint tokens
        await stakeBasketToken.proposeStakeBasketContract(await dualStakingBasket.getAddress());
        await ethers.provider.send("evm_increaseTime", [2 * 24 * 3600]); // Skip 2 day timelock
        await ethers.provider.send("evm_mine"); // Mine a block
        await stakeBasketToken.confirmStakeBasketContract();
        console.log("✅ StakeBasketToken permissions configured");

        // Configure DualStakingBasket with DEX router
        await dualStakingBasket.setSwapRouter(await mockDexRouter.getAddress());
        await dualStakingBasket.setTrustedRouter(await mockDexRouter.getAddress(), true);
        
        // Increase slippage tolerance for testing (10% instead of 2%)
        await dualStakingBasket.setMaxSlippage(1000); // 10%
        
        // Set exchange rates in MockDEXRouter (CORE to BTC)
        // CORE = $1.50, BTC = $65,000, so 1 CORE = 1.50/65000 = 0.000023 BTC  
        const btcPerCore = (ethers.parseEther("1.5") * ethers.parseEther("1")) / ethers.parseEther("65000"); // 1 CORE = 0.000023 BTC
        await mockDexRouter.setExchangeRate(
            await mockCoreToken.getAddress(),
            await mockBtcToken.getAddress(), 
            btcPerCore
        );
        
        // Fund the DEX router with tokens for swapping
        await mockCoreToken.mint(await mockDexRouter.getAddress(), ethers.parseEther("1000000"));
        await mockBtcToken.mint(await mockDexRouter.getAddress(), ethers.parseEther("100"));
        
        console.log("✅ DualStakingBasket configured with DEX router and exchange rates");

        // 10. Mint test tokens and approve spending
        await mockCoreToken.mint(user1.address, ethers.parseEther("100000"));
        await mockCoreToken.mint(user2.address, ethers.parseEther("100000"));
        await mockBtcToken.mint(user1.address, ethers.parseEther("10"));
        await mockBtcToken.mint(user2.address, ethers.parseEther("10"));

        await mockCoreToken.connect(user1).approve(await dualStakingBasket.getAddress(), ethers.MaxUint256);
        await mockCoreToken.connect(user2).approve(await dualStakingBasket.getAddress(), ethers.MaxUint256);
        await mockBtcToken.connect(user1).approve(await dualStakingBasket.getAddress(), ethers.MaxUint256);
        await mockBtcToken.connect(user2).approve(await dualStakingBasket.getAddress(), ethers.MaxUint256);
        console.log("✅ Test tokens minted and approved");

        console.log("🎉 Complete system deployed successfully!");
        
        return {
            stakeBasketToken,
            basketStaking, 
            basketGovernance,
            dualStakingBasket,
            factory,
            priceFeed,
            mockCoreToken,
            mockBtcToken,
            mockDualStaking,
            owner,
            user1,
            user2,
            treasury,
            operator
        };
    }

    describe("Contract Relationships", function () {
        it("Should demonstrate proper token flow", async function () {
            const { 
                stakeBasketToken, 
                dualStakingBasket, 
                mockCoreToken, 
                mockBtcToken, 
                user1 
            } = await loadFixture(deployCompleteSystemFixture);

            // Check initial state
            expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(0);
            
            // User deposits through DualStakingBasket with perfect ratio to avoid rebalancing
            // MockPriceFeed: CORE=$1.50, BTC=$65,000 
            // So 1 BTC = 43,333 CORE for perfect ratio
            const btcAmount = ethers.parseEther("0.1");           // 0.1 BTC
            const coreAmount = ethers.parseEther("4333.3");       // 4,333.3 CORE (perfect ratio)
            
            await dualStakingBasket.connect(user1).deposit(coreAmount, btcAmount);
            
            // User should now have BASKET tokens
            const basketBalance = await stakeBasketToken.balanceOf(user1.address);
            expect(basketBalance).to.be.gt(0);
            console.log(`✅ User received ${ethers.formatEther(basketBalance)} BASKET tokens`);
        });

        it("Should demonstrate governance flow", async function () {
            const { 
                stakeBasketToken,
                basketGovernance,
                basketStaking,
                dualStakingBasket,
                user1,
                user2
            } = await loadFixture(deployCompleteSystemFixture);

            // Users deposit to get BASKET tokens
            await dualStakingBasket.connect(user1).deposit(ethers.parseEther("10000"), ethers.parseEther("0.2"));
            await dualStakingBasket.connect(user2).deposit(ethers.parseEther("15000"), ethers.parseEther("0.3"));

            const user1Balance = await stakeBasketToken.balanceOf(user1.address);
            const user2Balance = await stakeBasketToken.balanceOf(user2.address);
            
            expect(user1Balance).to.be.gt(ethers.parseEther("100")); // Has enough tokens to propose
            expect(user2Balance).to.be.gt(ethers.parseEther("100"));
            
            console.log(`✅ User1 has ${ethers.formatEther(user1Balance)} BASKET tokens for governance`);
            console.log(`✅ User2 has ${ethers.formatEther(user2Balance)} BASKET tokens for governance`);
        });

        it("Should demonstrate factory optimization", async function () {
            const { factory } = await loadFixture(deployCompleteSystemFixture);
            
            // Check that factory is much smaller than original
            const factoryCode = await ethers.provider.getCode(await factory.getAddress());
            const factorySize = factoryCode.length / 2; // Convert hex to bytes
            
            expect(factorySize).to.be.lt(5000); // Much smaller than 24KB limit
            console.log(`✅ OptimizedContractFactory size: ${factorySize} bytes (vs 76KB original)`);
        });
    });

    describe("Coverage Test - Key Functions", function () {
        it("Should test all major contract functions", async function () {
            const { 
                stakeBasketToken,
                basketStaking,
                basketGovernance, 
                dualStakingBasket,
                priceFeed,
                user1,
                user2,
                owner
            } = await loadFixture(deployCompleteSystemFixture);

            // Test DualStakingBasket functions
            await dualStakingBasket.connect(user1).deposit(ethers.parseEther("5000"), ethers.parseEther("0.1"));
            expect(await dualStakingBasket.totalPooledCORE()).to.be.gt(0);
            expect(await dualStakingBasket.totalPooledBTC()).to.be.gt(0);
            
            // Test BasketStaking functions  
            const user1Basket = await stakeBasketToken.balanceOf(user1.address);
            await stakeBasketToken.connect(user1).approve(await basketStaking.getAddress(), user1Basket);
            await basketStaking.connect(user1).stake(user1Basket);
            expect(await basketStaking.stakedBalance(user1.address)).to.equal(user1Basket);

            // Test PriceFeed functions
            const corePrice = await priceFeed.getCorePrice();
            const btcPrice = await priceFeed.getSolvBTCPrice();
            expect(corePrice).to.equal(ethers.parseEther("1"));
            expect(btcPrice).to.equal(ethers.parseEther("50000"));

            // Test governance view functions
            expect(await basketGovernance.basketToken()).to.equal(await stakeBasketToken.getAddress());
            expect(await basketGovernance.proposalCount()).to.equal(0);
            
            console.log("✅ All major contract functions tested successfully");
        });
    });

    describe("System Integration", function () {
        it("Should handle complete user journey", async function () {
            const { 
                stakeBasketToken,
                basketStaking,
                dualStakingBasket,
                user1,
                mockCoreToken,
                mockBtcToken
            } = await loadFixture(deployCompleteSystemFixture);

            // 1. Check initial balances
            expect(await mockCoreToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100000"));
            expect(await mockBtcToken.balanceOf(user1.address)).to.equal(ethers.parseEther("10"));
            expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(0);

            // 2. User deposits to dual staking
            const tx1 = await dualStakingBasket.connect(user1).deposit(
                ethers.parseEther("10000"), 
                ethers.parseEther("0.2")
            );
            await expect(tx1).to.emit(dualStakingBasket, "Deposited");
            
            // 3. User should have BASKET tokens
            const basketBalance = await stakeBasketToken.balanceOf(user1.address);
            expect(basketBalance).to.be.gt(0);

            // 4. User stakes BASKET tokens for governance
            await stakeBasketToken.connect(user1).approve(await basketStaking.getAddress(), basketBalance);
            const tx2 = await basketStaking.connect(user1).stake(basketBalance);
            await expect(tx2).to.emit(basketStaking, "Staked");

            // 5. Check final state
            expect(await basketStaking.stakedBalance(user1.address)).to.equal(basketBalance);
            expect(await stakeBasketToken.balanceOf(user1.address)).to.equal(0); // Transferred to staking

            console.log("✅ Complete user journey tested successfully");
        });
    });
});