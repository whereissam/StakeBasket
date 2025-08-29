const { expect } = require("chai");
const { ethers } = require("hardhat");
const { TestSetup } = require("../helpers/TestSetup.cjs");

describe("PriceFeed", function () {
  let setup;
  let priceFeed, mockPriceFeed;
  let owner, user1, updater;

  before(async function () {
    setup = new TestSetup();
    await setup.initialize();
    
    ({ mockPriceFeed } = setup.contracts);
    ({ owner, user1 } = setup);
    
    const signers = await ethers.getSigners();
    updater = signers[6];

    // Deploy the actual PriceFeed contract for testing
    const PriceFeed = await ethers.getContractFactory("PriceFeed");
    priceFeed = await PriceFeed.deploy(owner.address);
    await priceFeed.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await priceFeed.owner()).to.equal(owner.address);
    });

    it("Should have initial zero prices", async function () {
      expect(await priceFeed.getPrice("CORE")).to.equal(0);
      expect(await priceFeed.getPrice("BTC")).to.equal(0);
      expect(await priceFeed.getPrice("ETH")).to.equal(0);
    });

    it("Should initialize staleness threshold", async function () {
      expect(await priceFeed.stalenessThreshold()).to.equal(3600); // 1 hour
    });
  });

  describe("Price Updates", function () {
    it("Should update CORE price", async function () {
      const newPrice = ethers.parseUnits("1.5", 8); // $1.5 with 8 decimals
      
      await expect(
        priceFeed.connect(owner).updatePrice("CORE", newPrice)
      ).to.emit(priceFeed, "PriceUpdated")
        .withArgs("CORE", newPrice, await ethers.provider.getBlockNumber() + 1);
      
      expect(await priceFeed.getPrice("CORE")).to.equal(newPrice);
    });

    it("Should update BTC price", async function () {
      const newPrice = ethers.parseUnits("95000", 8); // $95k with 8 decimals
      
      await priceFeed.connect(owner).updatePrice("BTC", newPrice);
      expect(await priceFeed.getPrice("BTC")).to.equal(newPrice);
    });

    it("Should update multiple prices", async function () {
      const corePrice = ethers.parseUnits("2.0", 8);
      const btcPrice = ethers.parseUnits("100000", 8);
      const ethPrice = ethers.parseUnits("4000", 8);
      
      const symbols = ["CORE", "BTC", "ETH"];
      const prices = [corePrice, btcPrice, ethPrice];
      
      await expect(
        priceFeed.connect(owner).updatePrices(symbols, prices)
      ).to.emit(priceFeed, "PriceUpdated");
      
      expect(await priceFeed.getPrice("CORE")).to.equal(corePrice);
      expect(await priceFeed.getPrice("BTC")).to.equal(btcPrice);
      expect(await priceFeed.getPrice("ETH")).to.equal(ethPrice);
    });

    it("Should reject non-owner price updates", async function () {
      const newPrice = ethers.parseUnits("1.8", 8);
      
      await expect(
        priceFeed.connect(user1).updatePrice("CORE", newPrice)
      ).to.be.revertedWithCustomError(priceFeed, "OwnableUnauthorizedAccount");
    });

    it("Should reject mismatched array lengths", async function () {
      const symbols = ["CORE", "BTC"];
      const prices = [ethers.parseUnits("1.5", 8)]; // Only one price for two symbols
      
      await expect(
        priceFeed.connect(owner).updatePrices(symbols, prices)
      ).to.be.revertedWith("PriceFeed: array length mismatch");
    });
  });

  describe("Price Retrieval", function () {
    beforeEach(async function () {
      // Set up some prices
      await priceFeed.connect(owner).updatePrice("CORE", ethers.parseUnits("1.5", 8));
      await priceFeed.connect(owner).updatePrice("BTC", ethers.parseUnits("95000", 8));
    });

    it("Should return correct prices", async function () {
      expect(await priceFeed.getPrice("CORE")).to.equal(ethers.parseUnits("1.5", 8));
      expect(await priceFeed.getPrice("BTC")).to.equal(ethers.parseUnits("95000", 8));
    });

    it("Should return price info with timestamp", async function () {
      const priceInfo = await priceFeed.getPriceInfo("CORE");
      
      expect(priceInfo.price).to.equal(ethers.parseUnits("1.5", 8));
      expect(priceInfo.timestamp).to.be.gt(0);
    });

    it("Should return zero for non-existent symbol", async function () {
      expect(await priceFeed.getPrice("NONEXISTENT")).to.equal(0);
    });

    it("Should check if price is stale", async function () {
      expect(await priceFeed.isPriceStale("CORE")).to.be.false;
      
      // Advance time beyond staleness threshold
      await setup.advanceTime(3700); // 1 hour + 100 seconds
      
      expect(await priceFeed.isPriceStale("CORE")).to.be.true;
    });
  });

  describe("Specific Token Prices", function () {
    beforeEach(async function () {
      await priceFeed.connect(owner).updatePrice("CORE", ethers.parseUnits("1.5", 8));
      await priceFeed.connect(owner).updatePrice("BTC", ethers.parseUnits("95000", 8));
      await priceFeed.connect(owner).updatePrice("SolvBTC", ethers.parseUnits("96000", 8));
    });

    it("Should return CORE price", async function () {
      expect(await priceFeed.getCorePrice()).to.equal(ethers.parseUnits("1.5", 8));
    });

    it("Should return SolvBTC price", async function () {
      expect(await priceFeed.getSolvBTCPrice()).to.equal(ethers.parseUnits("96000", 8));
    });

    it("Should fallback to BTC price for SolvBTC if not set", async function () {
      // Deploy fresh price feed
      const freshPriceFeed = await ethers.deployContract("PriceFeed", [owner.address]);
      
      // Only set BTC price
      await freshPriceFeed.connect(owner).updatePrice("BTC", ethers.parseUnits("95000", 8));
      
      // SolvBTC should fallback to BTC price
      expect(await freshPriceFeed.getSolvBTCPrice()).to.equal(ethers.parseUnits("95000", 8));
    });
  });

  describe("Oracle Integration", function () {
    it("Should add authorized oracle", async function () {
      await priceFeed.connect(owner).addAuthorizedOracle(updater.address);
      
      expect(await priceFeed.authorizedOracles(updater.address)).to.be.true;
    });

    it("Should remove authorized oracle", async function () {
      await priceFeed.connect(owner).addAuthorizedOracle(updater.address);
      await priceFeed.connect(owner).removeAuthorizedOracle(updater.address);
      
      expect(await priceFeed.authorizedOracles(updater.address)).to.be.false;
    });

    it("Should allow authorized oracle to update prices", async function () {
      await priceFeed.connect(owner).addAuthorizedOracle(updater.address);
      
      const newPrice = ethers.parseUnits("2.0", 8);
      
      await expect(
        priceFeed.connect(updater).updatePrice("CORE", newPrice)
      ).to.emit(priceFeed, "PriceUpdated");
      
      expect(await priceFeed.getPrice("CORE")).to.equal(newPrice);
    });

    it("Should reject unauthorized oracle updates", async function () {
      const newPrice = ethers.parseUnits("2.0", 8);
      
      await expect(
        priceFeed.connect(updater).updatePrice("CORE", newPrice)
      ).to.be.revertedWith("PriceFeed: not authorized oracle or owner");
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      // Set up some prices
      await priceFeed.connect(owner).updatePrice("CORE", ethers.parseUnits("1.5", 8));
      await priceFeed.connect(owner).updatePrice("BTC", ethers.parseUnits("95000", 8));
    });

    it("Should pause price updates", async function () {
      await priceFeed.connect(owner).pause();
      
      expect(await priceFeed.paused()).to.be.true;
      
      await expect(
        priceFeed.connect(owner).updatePrice("CORE", ethers.parseUnits("2.0", 8))
      ).to.be.revertedWithCustomError(priceFeed, "EnforcedPause");
    });

    it("Should unpause price updates", async function () {
      await priceFeed.connect(owner).pause();
      await priceFeed.connect(owner).unpause();
      
      expect(await priceFeed.paused()).to.be.false;
      
      await expect(
        priceFeed.connect(owner).updatePrice("CORE", ethers.parseUnits("2.0", 8))
      ).to.not.be.reverted;
    });

    it("Should still allow price reading when paused", async function () {
      await priceFeed.connect(owner).pause();
      
      expect(await priceFeed.getPrice("CORE")).to.equal(ethers.parseUnits("1.5", 8));
    });

    it("Should set emergency price", async function () {
      const emergencyPrice = ethers.parseUnits("1.0", 8);
      
      await priceFeed.connect(owner).setEmergencyPrice("CORE", emergencyPrice);
      
      expect(await priceFeed.getPrice("CORE")).to.equal(emergencyPrice);
    });
  });

  describe("Configuration", function () {
    it("Should update staleness threshold", async function () {
      const newThreshold = 7200; // 2 hours
      
      await priceFeed.connect(owner).setStalenessThreshold(newThreshold);
      
      expect(await priceFeed.stalenessThreshold()).to.equal(newThreshold);
    });

    it("Should reject invalid staleness threshold", async function () {
      await expect(
        priceFeed.connect(owner).setStalenessThreshold(0)
      ).to.be.revertedWith("PriceFeed: invalid threshold");
    });

    it("Should set price decimals", async function () {
      const newDecimals = 18;
      
      await priceFeed.connect(owner).setPriceDecimals(newDecimals);
      
      expect(await priceFeed.priceDecimals()).to.equal(newDecimals);
    });
  });

  describe("Batch Operations", function () {
    it("Should handle batch price updates efficiently", async function () {
      const symbols = ["CORE", "BTC", "ETH", "SolvBTC", "USDT"];
      const prices = [
        ethers.parseUnits("1.5", 8),
        ethers.parseUnits("95000", 8),
        ethers.parseUnits("4000", 8),
        ethers.parseUnits("96000", 8),
        ethers.parseUnits("1.0", 8)
      ];
      
      const tx = await priceFeed.connect(owner).updatePrices(symbols, prices);
      const receipt = await tx.wait();
      
      // Should emit multiple PriceUpdated events
      const priceUpdateEvents = receipt.logs.filter(
        log => log.fragment && log.fragment.name === "PriceUpdated"
      );
      expect(priceUpdateEvents.length).to.equal(5);
      
      // Verify all prices were set
      for (let i = 0; i < symbols.length; i++) {
        expect(await priceFeed.getPrice(symbols[i])).to.equal(prices[i]);
      }
    });

    it("Should get multiple prices at once", async function () {
      const symbols = ["CORE", "BTC"];
      const expectedPrices = [
        ethers.parseUnits("1.5", 8),
        ethers.parseUnits("95000", 8)
      ];
      
      await priceFeed.connect(owner).updatePrices(symbols, expectedPrices);
      
      const prices = await priceFeed.getPrices(symbols);
      
      expect(prices.length).to.equal(2);
      expect(prices[0]).to.equal(expectedPrices[0]);
      expect(prices[1]).to.equal(expectedPrices[1]);
    });
  });

  describe("MockPriceFeed", function () {
    it("Should work with mock price feed", async function () {
      // Test the mock price feed used in other tests
      await mockPriceFeed.setPrice("CORE", ethers.parseUnits("1.5", 8));
      await mockPriceFeed.setPrice("BTC", ethers.parseUnits("95000", 8));
      
      expect(await mockPriceFeed.getPrice("CORE")).to.equal(ethers.parseUnits("1.5", 8));
      expect(await mockPriceFeed.getPrice("BTC")).to.equal(ethers.parseUnits("95000", 8));
    });

    it("Should simulate price changes in mock", async function () {
      const initialPrice = ethers.parseUnits("1.5", 8);
      const newPrice = ethers.parseUnits("1.8", 8);
      
      await mockPriceFeed.setPrice("CORE", initialPrice);
      expect(await mockPriceFeed.getPrice("CORE")).to.equal(initialPrice);
      
      await mockPriceFeed.setPrice("CORE", newPrice);
      expect(await mockPriceFeed.getPrice("CORE")).to.equal(newPrice);
    });
  });

  describe("Price Validation", function () {
    it("Should validate price ranges", async function () {
      // Test maximum valid price
      const maxPrice = ethers.parseUnits("1000000", 8); // $1M
      await expect(
        priceFeed.connect(owner).updatePrice("BTC", maxPrice)
      ).to.not.be.reverted;
      
      // Test minimum valid price
      const minPrice = ethers.parseUnits("0.01", 8); // $0.01
      await expect(
        priceFeed.connect(owner).updatePrice("CORE", minPrice)
      ).to.not.be.reverted;
    });

    it("Should reject zero prices in production mode", async function () {
      // Enable production mode
      await priceFeed.connect(owner).setProductionMode(true);
      
      await expect(
        priceFeed.connect(owner).updatePrice("CORE", 0)
      ).to.be.revertedWith("PriceFeed: zero price not allowed in production");
    });

    it("Should allow zero prices in test mode", async function () {
      // Ensure test mode (default)
      await priceFeed.connect(owner).setProductionMode(false);
      
      await expect(
        priceFeed.connect(owner).updatePrice("CORE", 0)
      ).to.not.be.reverted;
    });
  });

  describe("Events", function () {
    it("Should emit PriceUpdated event", async function () {
      const newPrice = ethers.parseUnits("2.0", 8);
      const blockNumber = await ethers.provider.getBlockNumber();
      
      await expect(
        priceFeed.connect(owner).updatePrice("CORE", newPrice)
      ).to.emit(priceFeed, "PriceUpdated")
        .withArgs("CORE", newPrice, blockNumber + 1);
    });

    it("Should emit OracleAdded event", async function () {
      await expect(
        priceFeed.connect(owner).addAuthorizedOracle(updater.address)
      ).to.emit(priceFeed, "OracleAdded")
        .withArgs(updater.address);
    });

    it("Should emit OracleRemoved event", async function () {
      await priceFeed.connect(owner).addAuthorizedOracle(updater.address);
      
      await expect(
        priceFeed.connect(owner).removeAuthorizedOracle(updater.address)
      ).to.emit(priceFeed, "OracleRemoved")
        .withArgs(updater.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large prices", async function () {
      const largePrice = ethers.parseUnits("999999999", 8); // Very large price
      
      await expect(
        priceFeed.connect(owner).updatePrice("BTC", largePrice)
      ).to.not.be.reverted;
      
      expect(await priceFeed.getPrice("BTC")).to.equal(largePrice);
    });

    it("Should handle long symbol names", async function () {
      const longSymbol = "VERYLONGSYMBOLNAME";
      const price = ethers.parseUnits("100", 8);
      
      await expect(
        priceFeed.connect(owner).updatePrice(longSymbol, price)
      ).to.not.be.reverted;
      
      expect(await priceFeed.getPrice(longSymbol)).to.equal(price);
    });

    it("Should handle empty symbol gracefully", async function () {
      const price = ethers.parseUnits("100", 8);
      
      // This might revert or handle gracefully depending on implementation
      await expect(
        priceFeed.connect(owner).updatePrice("", price)
      ).to.not.be.reverted;
    });

    it("Should handle rapid price updates", async function () {
      const prices = [
        ethers.parseUnits("1.0", 8),
        ethers.parseUnits("1.1", 8),
        ethers.parseUnits("1.2", 8),
        ethers.parseUnits("1.3", 8),
        ethers.parseUnits("1.4", 8)
      ];
      
      for (const price of prices) {
        await priceFeed.connect(owner).updatePrice("CORE", price);
        expect(await priceFeed.getPrice("CORE")).to.equal(price);
      }
    });
  });
});