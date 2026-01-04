const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SatoshiTierBasket", function () {
    async function deploySatoshiTierBasketFixture() {
        const [owner, treasury, operator, user] = await ethers.getSigners();
        
        // Deploy dependencies
        const StakeBasketToken = await ethers.getContractFactory("StakeBasketToken");
        const basketToken = await StakeBasketToken.deploy("Satoshi Basket", "SBASKET", owner.address);
        
        const PriceFeed = await ethers.getContractFactory("PriceFeed");
        const priceFeed = await PriceFeed.deploy(owner.address, ethers.ZeroAddress, ethers.ZeroAddress);
        
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const coreToken = await MockERC20.deploy("CORE", "CORE", 18);
        const btcToken = await MockERC20.deploy("BTC", "BTC", 18);
        
        const MockDualStaking = await ethers.getContractFactory("MockDualStaking");
        const dualStaking = await MockDualStaking.deploy();
        
        // Deploy SatoshiTierBasket
        const SatoshiTierBasket = await ethers.getContractFactory("SatoshiTierBasket");
        const satoshiBasket = await SatoshiTierBasket.deploy(
            await basketToken.getAddress(),
            await priceFeed.getAddress(),
            await coreToken.getAddress(),
            await btcToken.getAddress(),
            await dualStaking.getAddress(),
            treasury.address,
            owner.address
        );
        
        return { 
            satoshiBasket, 
            basketToken, 
            priceFeed, 
            coreToken, 
            btcToken, 
            dualStaking,
            owner, 
            treasury, 
            operator, 
            user 
        };
    }

    describe("Deployment", function () {
        it("Should deploy with correct Satoshi tier parameters", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            expect(await satoshiBasket.SATOSHI_RATIO()).to.equal(ethers.parseEther("16000"));
            expect(await satoshiBasket.MIN_BTC_DEPOSIT()).to.equal(ethers.parseEther("0.01"));
            expect(await satoshiBasket.MIN_CORE_DEPOSIT()).to.equal(ethers.parseEther("160"));
        });

        it("Should have correct tier configuration", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            expect(await satoshiBasket.TIGHT_REBALANCE_THRESHOLD()).to.equal(100);
            expect(await satoshiBasket.MAX_REBALANCE_SLIPPAGE()).to.equal(50);
        });
    });

    describe("Satoshi Tier Validation", function () {
        it("Should validate correct Satoshi tier deposit", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            const btcAmount = ethers.parseEther("0.1"); // 0.1 BTC
            const coreAmount = ethers.parseEther("1600"); // 1600 CORE (16,000:1 ratio)
            
            const [valid, requiredCore, reason] = await satoshiBasket.validateSatoshiDeposit(coreAmount, btcAmount);
            
            expect(valid).to.be.true;
            expect(reason).to.equal("Valid Satoshi tier deposit");
        });

        it("Should reject insufficient BTC deposit", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            const btcAmount = ethers.parseEther("0.001"); // Less than minimum
            const coreAmount = ethers.parseEther("16");
            
            const [valid, , reason] = await satoshiBasket.validateSatoshiDeposit(coreAmount, btcAmount);
            
            expect(valid).to.be.false;
            expect(reason).to.equal("BTC amount below minimum");
        });

        it("Should reject insufficient CORE for Satoshi tier", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            const btcAmount = ethers.parseEther("0.1");
            const coreAmount = ethers.parseEther("1000"); // Too low for Satoshi tier
            
            const [valid, requiredCore, reason] = await satoshiBasket.validateSatoshiDeposit(coreAmount, btcAmount);
            
            expect(valid).to.be.false;
            expect(reason).to.equal("Insufficient CORE for Satoshi tier");
            expect(requiredCore).to.equal(ethers.parseEther("1600"));
        });
    });

    describe("CORE Estimation", function () {
        it("Should estimate required CORE correctly", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            const btcAmount = ethers.parseEther("0.5");
            const expectedCore = ethers.parseEther("8000"); // 0.5 * 16,000
            
            expect(await satoshiBasket.estimateRequiredCORE(btcAmount)).to.equal(expectedCore);
        });
    });

    describe("Emergency Mode", function () {
        it("Should toggle emergency mode", async function () {
            const { satoshiBasket, owner } = await loadFixture(deploySatoshiTierBasketFixture);
            
            expect(await satoshiBasket.emergencyMode()).to.be.false;
            
            await expect(satoshiBasket.toggleEmergencyMode())
                .to.emit(satoshiBasket, "EmergencyModeToggled")
                .withArgs(true);
                
            expect(await satoshiBasket.emergencyMode()).to.be.true;
        });

        it("Should set max single deposit", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            const newMax = ethers.parseEther("200");
            await satoshiBasket.setMaxSingleDeposit(newMax);
            
            expect(await satoshiBasket.maxSingleDeposit()).to.equal(newMax);
        });
    });

    describe("Status Information", function () {
        it("Should return comprehensive Satoshi tier status", async function () {
            const { satoshiBasket } = await loadFixture(deploySatoshiTierBasketFixture);
            
            const status = await satoshiBasket.getSatoshiTierStatus();
            
            expect(status.targetRatio_).to.equal(ethers.parseEther("16000"));
            expect(status.rewardsEarned).to.equal(0);
            expect(status.estimatedAPY).to.equal(0);
        });
    });
});