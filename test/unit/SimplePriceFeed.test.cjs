const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimplePriceFeed", function() {
    let priceFeed;
    let owner;
    let mockSwitchboard;
    
    beforeEach(async function() {
        [owner] = await ethers.getSigners();
        
        // Deploy mock Switchboard
        const MockSwitchboard = await ethers.getContractFactory("MockDEXRouter"); // Reuse existing mock
        mockSwitchboard = await MockSwitchboard.deploy();
        
        // Deploy SimplePriceFeed
        const SimplePriceFeed = await ethers.getContractFactory("SimplePriceFeed");
        priceFeed = await SimplePriceFeed.deploy(await mockSwitchboard.getAddress(), owner.address);
    });
    
    it("Should set and get prices", async function() {
        const coreAsset = ethers.keccak256(ethers.toUtf8Bytes("CORE"));
        const price = ethers.parseEther("1.5"); // $1.50
        
        await priceFeed.setPrice(coreAsset, price);
        
        expect(await priceFeed.getPriceUnsafe(coreAsset)).to.equal(price);
    });
    
    it("Should configure feed IDs", async function() {
        const coreAsset = ethers.keccak256(ethers.toUtf8Bytes("CORE"));
        const feedId = "0x1234567890123456789012345678901234567890123456789012345678901234";
        
        await priceFeed.setFeedId(coreAsset, feedId);
        
        expect(await priceFeed.feedIds(coreAsset)).to.equal(feedId);
    });
    
    it("Should provide helper functions for common assets", async function() {
        const coreAsset = ethers.keccak256(ethers.toUtf8Bytes("CORE"));
        const btcAsset = ethers.keccak256(ethers.toUtf8Bytes("BTC"));
        
        const corePrice = ethers.parseEther("1.5");
        const btcPrice = ethers.parseEther("45000");
        
        await priceFeed.setPrice(coreAsset, corePrice);
        await priceFeed.setPrice(btcAsset, btcPrice);
        
        expect(await priceFeed.getCorePrice()).to.equal(corePrice);
        expect(await priceFeed.getBtcPrice()).to.equal(btcPrice);
    });
    
    it("Should revert on stale prices", async function() {
        const coreAsset = ethers.keccak256(ethers.toUtf8Bytes("CORE"));
        
        // Price is not set, should revert
        await expect(priceFeed.getPrice(coreAsset)).to.be.revertedWith("Price not set");
        
        // Set price and check it works
        await priceFeed.setPrice(coreAsset, ethers.parseEther("1.5"));
        expect(await priceFeed.getPrice(coreAsset)).to.equal(ethers.parseEther("1.5"));
    });
});