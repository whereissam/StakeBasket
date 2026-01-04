const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Staking System Integration", function() {
    let system = {};
    let users;
    
    beforeEach(async function() {
        users = await ethers.getSigners();
        const [owner, user1, user2] = users;
        
        // Deploy all contracts
        const MockToken = await ethers.getContractFactory("MockERC20");
        const btcToken = await MockToken.deploy("Mock BTC", "BTC", 8);
        
        const MockSwitchboard = await ethers.getContractFactory("MockDEXRouter");
        const mockSwitchboard = await MockSwitchboard.deploy();
        
        const SimplePriceFeed = await ethers.getContractFactory("SimplePriceFeed");
        const priceFeed = await SimplePriceFeed.deploy(await mockSwitchboard.getAddress(), owner.address);
        
        const SimpleBasketToken = await ethers.getContractFactory("SimpleBasketToken");
        const basketToken = await SimpleBasketToken.deploy("Simple Basket", "SBT", owner.address);
        
        const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
        const staking = await SimpleStaking.deploy(
            await basketToken.getAddress(),
            await priceFeed.getAddress(),
            await btcToken.getAddress(),
            ethers.ZeroAddress,
            owner.address
        );
        
        // Set up system
        await basketToken.setMinter(await staking.getAddress());
        
        const coreAsset = ethers.keccak256(ethers.toUtf8Bytes("CORE"));
        const btcAsset = ethers.keccak256(ethers.toUtf8Bytes("BTC"));
        await priceFeed.setPrice(coreAsset, ethers.parseEther("1.5"));
        await priceFeed.setPrice(btcAsset, ethers.parseEther("45000"));
        
        // Give users tokens
        for (let i = 1; i < 3; i++) {
            await btcToken.mint(users[i].address, ethers.parseUnits("100", 8));
            await btcToken.connect(users[i]).approve(await staking.getAddress(), ethers.parseUnits("100", 8));
        }
        
        system = { priceFeed, basketToken, staking, btcToken };
    });
    
    it("Should handle multiple users depositing and withdrawing", async function() {
        const { staking, basketToken } = system;
        const [, user1, user2] = users;
        
        // User 1 deposits
        await staking.connect(user1).deposit(
            ethers.parseUnits("0.1", 8), // 0.1 BTC
            { value: ethers.parseEther("1000") } // 1000 CORE
        );
        
        const user1Shares = await basketToken.balanceOf(user1.address);
        expect(user1Shares).to.be.gt(0);
        
        // User 2 deposits same amounts
        await staking.connect(user2).deposit(
            ethers.parseUnits("0.1", 8),
            { value: ethers.parseEther("1000") }
        );
        
        const user2Shares = await basketToken.balanceOf(user2.address);
        expect(user2Shares).to.be.closeTo(user1Shares, ethers.parseEther("1")); // Should be nearly equal
        
        // Both users withdraw half
        await staking.connect(user1).withdraw(user1Shares / 2n);
        await staking.connect(user2).withdraw(user2Shares / 2n);
        
        // Pool should still have roughly half the original amounts
        const poolInfo = await staking.getPoolInfo();
        expect(poolInfo.totalCore).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("100"));
        expect(poolInfo.totalBtc).to.be.closeTo(ethers.parseUnits("0.1", 8), ethers.parseUnits("0.01", 8));
    });
    
    it("Should maintain share price consistency", async function() {
        const { staking, basketToken } = system;
        const [, user1, user2] = users;
        
        // First deposit establishes baseline
        await staking.connect(user1).deposit(
            ethers.parseUnits("0.1", 8),
            { value: ethers.parseEther("1000") }
        );
        
        let poolInfo = await staking.getPoolInfo();
        const initialSharePrice = poolInfo.sharePrice;
        
        // Second user deposit should get similar price per share
        await staking.connect(user2).deposit(
            ethers.parseUnits("0.05", 8),
            { value: ethers.parseEther("500") }
        );
        
        poolInfo = await staking.getPoolInfo();
        expect(poolInfo.sharePrice).to.be.closeTo(initialSharePrice, ethers.parseEther("0.01"));
    });
    
    it("Should handle edge case of first depositor", async function() {
        const { staking, basketToken } = system;
        const [, user1] = users;
        
        // Very first deposit to empty pool
        await staking.connect(user1).deposit(
            ethers.parseUnits("0.1", 8), // 0.1 BTC
            { value: ethers.parseEther("1000") } // 1000 CORE
        );
        
        const shares = await basketToken.balanceOf(user1.address);
        expect(shares).to.be.gt(0);
        
        const poolInfo = await staking.getPoolInfo();
        expect(poolInfo.totalCore).to.equal(ethers.parseEther("1000"));
        expect(poolInfo.totalBtc).to.equal(ethers.parseUnits("0.1", 8));
    });
    
    it("Should handle price updates", async function() {
        const { priceFeed, staking } = system;
        const [, user1] = users;
        
        // Initial deposit
        await staking.connect(user1).deposit(
            ethers.parseUnits("0.1", 8),
            { value: ethers.parseEther("1000") }
        );
        
        let poolInfo = await staking.getPoolInfo();
        const initialSharePrice = poolInfo.sharePrice;
        
        // Update BTC price (double it)
        const btcAsset = ethers.keccak256(ethers.toUtf8Bytes("BTC"));
        await priceFeed.setPrice(btcAsset, ethers.parseEther("90000")); // Double from 45k to 90k
        
        poolInfo = await staking.getPoolInfo();
        expect(poolInfo.sharePrice).to.be.gt(initialSharePrice); // Share price should increase
    });
});