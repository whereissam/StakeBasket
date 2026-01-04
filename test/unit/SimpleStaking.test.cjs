const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleStaking", function() {
    let staking;
    let priceFeed;
    let basketToken;
    let btcToken;
    let owner, user;
    
    beforeEach(async function() {
        [owner, user] = await ethers.getSigners();
        
        // Deploy mock contracts
        const MockToken = await ethers.getContractFactory("MockERC20");
        btcToken = await MockToken.deploy("Mock BTC", "BTC", 8);
        
        const MockSwitchboard = await ethers.getContractFactory("MockDEXRouter");
        const mockSwitchboard = await MockSwitchboard.deploy();
        
        // Deploy SimplePriceFeed
        const SimplePriceFeed = await ethers.getContractFactory("SimplePriceFeed");
        priceFeed = await SimplePriceFeed.deploy(await mockSwitchboard.getAddress(), owner.address);
        
        // Deploy SimpleBasketToken
        const SimpleBasketToken = await ethers.getContractFactory("SimpleBasketToken");
        basketToken = await SimpleBasketToken.deploy("Simple Basket", "SBT", owner.address);
        
        // Deploy SimpleStaking
        const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
        staking = await SimpleStaking.deploy(
            await basketToken.getAddress(),
            await priceFeed.getAddress(),
            await btcToken.getAddress(),
            ethers.ZeroAddress, // No DEX router for basic tests
            owner.address
        );
        
        // Set up permissions
        await basketToken.setMinter(await staking.getAddress());
        
        // Set up prices
        const coreAsset = ethers.keccak256(ethers.toUtf8Bytes("CORE"));
        const btcAsset = ethers.keccak256(ethers.toUtf8Bytes("BTC"));
        
        await priceFeed.setPrice(coreAsset, ethers.parseEther("1.5")); // $1.50 per CORE
        await priceFeed.setPrice(btcAsset, ethers.parseEther("45000")); // $45,000 per BTC
        
        // Give user some tokens
        await btcToken.mint(user.address, ethers.parseUnits("10", 8)); // 10 BTC
        await btcToken.connect(user).approve(await staking.getAddress(), ethers.parseUnits("10", 8));
    });
    
    it("Should accept deposits and mint shares", async function() {
        const coreAmount = ethers.parseEther("1000"); // 1000 CORE
        const btcAmount = ethers.parseUnits("1", 8);   // 1 BTC
        
        await staking.connect(user).deposit(btcAmount, { value: coreAmount });
        
        const shares = await basketToken.balanceOf(user.address);
        expect(shares).to.be.gt(0);
        
        const poolInfo = await staking.getPoolInfo();
        expect(poolInfo.totalCore).to.equal(coreAmount);
        expect(poolInfo.totalBtc).to.equal(btcAmount);
    });
    
    it("Should handle withdrawals correctly", async function() {
        const coreAmount = ethers.parseEther("1000");
        const btcAmount = ethers.parseUnits("1", 8);
        
        // Deposit
        await staking.connect(user).deposit(btcAmount, { value: coreAmount });
        const shares = await basketToken.balanceOf(user.address);
        
        // Withdraw half
        const userCoreBefore = await ethers.provider.getBalance(user.address);
        const userBtcBefore = await btcToken.balanceOf(user.address);
        
        await staking.connect(user).withdraw(shares / 2n);
        
        const userCoreAfter = await ethers.provider.getBalance(user.address);
        const userBtcAfter = await btcToken.balanceOf(user.address);
        
        // Should receive roughly half the assets back (minus gas)
        expect(userBtcAfter - userBtcBefore).to.be.closeTo(btcAmount / 2n, ethers.parseUnits("0.01", 8));
    });
    
    it("Should calculate ratios correctly", async function() {
        const coreAmount = ethers.parseEther("1000"); // 1,000 CORE (reduced)
        const btcAmount = ethers.parseUnits("0.1", 8);  // 0.1 BTC (reduced proportionally)
        
        await staking.connect(user).deposit(btcAmount, { value: coreAmount });
        
        const poolInfo = await staking.getPoolInfo();
        expect(poolInfo.currentRatio).to.equal(10000); // 10,000:1 ratio
    });
    
    it("Should detect when rebalancing is needed", async function() {
        // Start with balanced position
        await staking.connect(user).deposit(
            ethers.parseUnits("0.1", 8), // 0.1 BTC
            { value: ethers.parseEther("1000") } // 1,000 CORE (matches target ratio)
        );
        
        expect(await staking.needsRebalancing()).to.be.false;
        
        // Add more CORE to throw off balance
        await staking.connect(user).deposit(
            ethers.parseUnits("0.01", 8), // 0.01 BTC
            { value: ethers.parseEther("500") } // 500 CORE (creates imbalance)
        );
        
        expect(await staking.needsRebalancing()).to.be.true;
    });
    
    it("Should set target ratio", async function() {
        const newRatio = ethers.parseEther("15000"); // 15,000:1
        
        await staking.setTargetRatio(newRatio);
        
        const poolInfo = await staking.getPoolInfo();
        // We can't directly check targetRatio from poolInfo, but we can test the effect
        expect(await staking.targetRatio()).to.equal(newRatio);
    });
    
    it("Should prevent unauthorized access", async function() {
        const newRatio = ethers.parseEther("15000");
        
        await expect(
            staking.connect(user).setTargetRatio(newRatio)
        ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
});