const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PriceSecurityModule", function () {
  let priceSecurityModule;
  let owner, oracle1, oracle2, oracle3, user1;

  const ASSET_CORE = "CORE";
  const ASSET_BTC = "BTC";

  beforeEach(async function () {
    [owner, oracle1, oracle2, oracle3, user1] = await ethers.getSigners();

    const PriceSecurityModule = await ethers.getContractFactory("PriceSecurityModule");
    priceSecurityModule = await PriceSecurityModule.deploy(await owner.getAddress());
    await priceSecurityModule.waitForDeployment();

    // Add oracle sources
    await priceSecurityModule.connect(owner).addOracleSource(ASSET_CORE, await oracle1.getAddress());
    await priceSecurityModule.connect(owner).addOracleSource(ASSET_CORE, await oracle2.getAddress());
    await priceSecurityModule.connect(owner).addOracleSource(ASSET_BTC, await oracle1.getAddress());
    await priceSecurityModule.connect(owner).addOracleSource(ASSET_BTC, await oracle3.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await priceSecurityModule.owner()).to.equal(await owner.getAddress());
      expect(await priceSecurityModule.emergencyMode()).to.be.false;
      expect(await priceSecurityModule.emergencyModeStart()).to.equal(0);
    });

    it("Should have correct initial security config", async function () {
      const config = await priceSecurityModule.securityConfig();
      
      expect(config.maxDeviationBps).to.equal(1000); // 10%
      expect(config.minUpdateInterval).to.equal(300); // 5 minutes
      expect(config.twapWindow).to.equal(3600); // 1 hour
      expect(config.minSources).to.equal(2);
      expect(config.emergencyCooldown).to.equal(86400); // 24 hours
    });
  });

  describe("Oracle Source Management", function () {
    it("Should add oracle sources", async function () {
      const newOracle = await ethers.getSigner(10);
      
      await priceSecurityModule.connect(owner).addOracleSource(ASSET_CORE, await newOracle.getAddress());
      
      const sources = await priceSecurityModule.getOracleSources(ASSET_CORE);
      expect(sources).to.include(await newOracle.getAddress());
    });

    it("Should remove oracle sources", async function () {
      await priceSecurityModule.connect(owner).removeOracleSource(ASSET_CORE, await oracle1.getAddress());
      
      const sources = await priceSecurityModule.getOracleSources(ASSET_CORE);
      expect(sources).to.not.include(await oracle1.getAddress());
    });

    it("Should get oracle sources for asset", async function () {
      const sources = await priceSecurityModule.getOracleSources(ASSET_CORE);
      
      expect(sources.length).to.equal(2);
      expect(sources).to.include(await oracle1.getAddress());
      expect(sources).to.include(await oracle2.getAddress());
    });

    it("Should reject invalid oracle source address", async function () {
      await expect(
        priceSecurityModule.connect(owner).addOracleSource(ASSET_CORE, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid source address");
    });

    it("Should reject non-owner oracle management", async function () {
      await expect(
        priceSecurityModule.connect(user1).addOracleSource(ASSET_CORE, await oracle3.getAddress())
      ).to.be.revertedWithCustomError(priceSecurityModule, "OwnableUnauthorizedAccount");
    });
  });

  describe("Price Validation", function () {
    const price = ethers.parseEther("1000");
    const sources = [];

    beforeEach(async function () {
      sources.push(await oracle1.getAddress(), await oracle2.getAddress());
    });

    it("Should validate first price update", async function () {
      const [isValid, twapPrice] = await priceSecurityModule.validatePriceUpdate(
        ASSET_CORE,
        price,
        sources
      );
      
      expect(isValid).to.be.true;
      expect(twapPrice).to.equal(price); // First update returns input price
    });

    it("Should validate price within deviation threshold", async function () {
      // First update to initialize TWAP
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, price);
      
      // Advance time to meet minimum interval
      await time.increase(301);
      
      // Price with 5% deviation (within 10% threshold)
      const newPrice = price * 105n / 100n;
      
      const [isValid, twapPrice] = await priceSecurityModule.validatePriceUpdate(
        ASSET_CORE,
        newPrice,
        sources
      );
      
      expect(isValid).to.be.true;
      expect(twapPrice).to.equal(price);
    });

    it("Should reject price with excessive deviation", async function () {
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, price);
      await time.increase(301);
      
      // Price with 15% deviation (exceeds 10% threshold)
      const newPrice = price * 115n / 100n;
      
      const [isValid, twapPrice] = await priceSecurityModule.validatePriceUpdate(
        ASSET_CORE,
        newPrice,
        sources
      );
      
      expect(isValid).to.be.false;
      expect(twapPrice).to.equal(price);
    });

    it("Should reject insufficient oracle sources", async function () {
      const insufficientSources = [await oracle1.getAddress()]; // Only 1 source, need 2
      
      await expect(
        priceSecurityModule.validatePriceUpdate(ASSET_CORE, price, insufficientSources)
      ).to.be.revertedWithCustomError(priceSecurityModule, "InsufficientOracleSources");
    });

    it("Should reject updates too soon after previous", async function () {
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, price);
      
      // Try to update immediately (within 5 minute minimum interval)
      await expect(
        priceSecurityModule.validatePriceUpdate(ASSET_CORE, price, sources)
      ).to.be.revertedWithCustomError(priceSecurityModule, "InsufficientTimeBetweenUpdates");
    });

    it("Should reject zero price", async function () {
      await expect(
        priceSecurityModule.validatePriceUpdate(ASSET_CORE, 0, sources)
      ).to.be.revertedWith("Invalid price");
    });

    it("Should reject validation when in emergency mode", async function () {
      await priceSecurityModule.connect(owner).activateEmergencyMode("Testing emergency");
      
      await expect(
        priceSecurityModule.validatePriceUpdate(ASSET_CORE, price, sources)
      ).to.be.revertedWith("EmergencyModeActive");
    });
  });

  describe("TWAP Calculation", function () {
    it("Should update TWAP data", async function () {
      const price = ethers.parseEther("1000");
      
      await expect(
        priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, price)
      ).to.emit(priceSecurityModule, "PriceUpdated");
      
      const [prices, timestamps, currentIndex, initialized] = 
        await priceSecurityModule.getTWAPData(ASSET_CORE);
      
      expect(initialized).to.be.true;
      expect(prices[0]).to.equal(price);
      expect(timestamps[0]).to.be.gt(0);
      expect(currentIndex).to.equal(1);
    });

    it("Should calculate TWAP correctly", async function () {
      const prices = [
        ethers.parseEther("1000"),
        ethers.parseEther("1100"),
        ethers.parseEther("1050")
      ];
      
      // Add multiple price points
      for (let i = 0; i < prices.length; i++) {
        await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, prices[i]);
        if (i < prices.length - 1) {
          await time.increase(300); // 5 minutes between updates
        }
      }
      
      const twap = await priceSecurityModule.calculateTWAP(ASSET_CORE);
      expect(twap).to.be.gt(0);
      expect(twap).to.be.closeTo(ethers.parseEther("1050"), ethers.parseEther("50"));
    });

    it("Should handle circular buffer correctly", async function () {
      const price = ethers.parseEther("1000");
      
      // Fill up the buffer (20 entries) and add more
      for (let i = 0; i < 25; i++) {
        await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, price + BigInt(i));
        await time.increase(60); // 1 minute between updates
      }
      
      const [prices, timestamps, currentIndex, initialized] = 
        await priceSecurityModule.getTWAPData(ASSET_CORE);
      
      expect(initialized).to.be.true;
      expect(currentIndex).to.equal(5); // Should wrap around (25 % 20 = 5)
      expect(prices[0]).to.equal(price + 20n); // Should contain overwritten values
    });

    it("Should filter stale data from TWAP calculation", async function () {
      const price = ethers.parseEther("1000");
      
      // Add old data point
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, price);
      
      // Fast forward beyond TWAP window (1 hour)
      await time.increase(3700);
      
      // Add new data point
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, price * 2n);
      
      // TWAP should ignore stale data
      const twap = await priceSecurityModule.calculateTWAP(ASSET_CORE);
      expect(twap).to.equal(price * 2n); // Should only use recent data
    });

    it("Should reject TWAP calculation for uninitialized asset", async function () {
      await expect(
        priceSecurityModule.calculateTWAP("NONEXISTENT")
      ).to.be.revertedWith("TWAP not initialized");
    });

    it("Should reject TWAP calculation with no valid data", async function () {
      // Initialize but add no valid data
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, ethers.parseEther("1000"));
      
      // Fast forward way beyond TWAP window to make all data stale
      await time.increase(10000);
      
      await expect(
        priceSecurityModule.calculateTWAP(ASSET_CORE)
      ).to.be.revertedWith("No valid TWAP data");
    });
  });

  describe("Deviation Calculation", function () {
    it("Should calculate zero deviation for equal prices", async function () {
      const price = ethers.parseEther("1000");
      
      expect(await priceSecurityModule.calculateDeviation(price, price)).to.equal(0);
    });

    it("Should calculate deviation correctly", async function () {
      const price1 = ethers.parseEther("1000");
      const price2 = ethers.parseEther("1100"); // 10% higher
      
      const deviation = await priceSecurityModule.calculateDeviation(price1, price2);
      expect(deviation).to.be.closeTo(952, 10); // ~9.52% in basis points
    });

    it("Should handle large price differences", async function () {
      const price1 = ethers.parseEther("1000");
      const price2 = ethers.parseEther("2000"); // 100% higher
      
      const deviation = await priceSecurityModule.calculateDeviation(price1, price2);
      expect(deviation).to.equal(6666); // 66.66% in basis points
    });

    it("Should handle small price differences", async function () {
      const price1 = ethers.parseEther("1000");
      const price2 = ethers.parseEther("1001"); // 0.1% higher
      
      const deviation = await priceSecurityModule.calculateDeviation(price1, price2);
      expect(deviation).to.be.closeTo(10, 1); // ~0.1% in basis points
    });
  });

  describe("Emergency Mode", function () {
    it("Should activate emergency mode", async function () {
      const reason = "Oracle manipulation detected";
      
      await expect(
        priceSecurityModule.connect(owner).activateEmergencyMode(reason)
      ).to.emit(priceSecurityModule, "EmergencyModeActivated")
        .withArgs(reason);
      
      expect(await priceSecurityModule.emergencyMode()).to.be.true;
      expect(await priceSecurityModule.paused()).to.be.true;
      expect(await priceSecurityModule.emergencyModeStart()).to.be.gt(0);
    });

    it("Should reject deactivation before cooldown", async function () {
      await priceSecurityModule.connect(owner).activateEmergencyMode("Test");
      
      await expect(
        priceSecurityModule.connect(owner).deactivateEmergencyMode()
      ).to.be.revertedWith("Cooldown period not elapsed");
    });

    it("Should deactivate emergency mode after cooldown", async function () {
      await priceSecurityModule.connect(owner).activateEmergencyMode("Test");
      
      // Fast forward past cooldown period (24 hours)
      await time.increase(86401);
      
      await expect(
        priceSecurityModule.connect(owner).deactivateEmergencyMode()
      ).to.emit(priceSecurityModule, "EmergencyModeDeactivated");
      
      expect(await priceSecurityModule.emergencyMode()).to.be.false;
      expect(await priceSecurityModule.paused()).to.be.false;
      expect(await priceSecurityModule.emergencyModeStart()).to.equal(0);
    });

    it("Should reject deactivation when not in emergency mode", async function () {
      await expect(
        priceSecurityModule.connect(owner).deactivateEmergencyMode()
      ).to.be.revertedWith("Emergency mode not active");
    });

    it("Should reject non-owner emergency operations", async function () {
      await expect(
        priceSecurityModule.connect(user1).activateEmergencyMode("Test")
      ).to.be.revertedWithCustomError(priceSecurityModule, "OwnableUnauthorizedAccount");
    });
  });

  describe("Security Configuration", function () {
    it("Should update security configuration", async function () {
      const newConfig = {
        maxDeviationBps: 2000, // 20%
        minUpdateInterval: 600, // 10 minutes
        twapWindow: 7200, // 2 hours
        minSources: 3,
        emergencyCooldown: 172800 // 48 hours
      };
      
      await expect(
        priceSecurityModule.connect(owner).updateSecurityConfig(
          newConfig.maxDeviationBps,
          newConfig.minUpdateInterval,
          newConfig.twapWindow,
          newConfig.minSources,
          newConfig.emergencyCooldown
        )
      ).to.emit(priceSecurityModule, "SecurityConfigUpdated");
      
      const config = await priceSecurityModule.securityConfig();
      expect(config.maxDeviationBps).to.equal(newConfig.maxDeviationBps);
      expect(config.minUpdateInterval).to.equal(newConfig.minUpdateInterval);
      expect(config.twapWindow).to.equal(newConfig.twapWindow);
      expect(config.minSources).to.equal(newConfig.minSources);
      expect(config.emergencyCooldown).to.equal(newConfig.emergencyCooldown);
    });

    it("Should reject invalid configuration parameters", async function () {
      // Max deviation too high (>50%)
      await expect(
        priceSecurityModule.connect(owner).updateSecurityConfig(
          6000, 300, 3600, 2, 86400
        )
      ).to.be.revertedWith("Max deviation too high");
      
      // Update interval too short (<1 minute)
      await expect(
        priceSecurityModule.connect(owner).updateSecurityConfig(
          1000, 30, 3600, 2, 86400
        )
      ).to.be.revertedWith("Update interval too short");
      
      // TWAP window too short (<5 minutes)
      await expect(
        priceSecurityModule.connect(owner).updateSecurityConfig(
          1000, 300, 200, 2, 86400
        )
      ).to.be.revertedWith("TWAP window too short");
      
      // Minimum sources = 0
      await expect(
        priceSecurityModule.connect(owner).updateSecurityConfig(
          1000, 300, 3600, 0, 86400
        )
      ).to.be.revertedWith("Must have at least 1 source");
      
      // Emergency cooldown too short (<1 hour)
      await expect(
        priceSecurityModule.connect(owner).updateSecurityConfig(
          1000, 300, 3600, 2, 3000
        )
      ).to.be.revertedWith("Cooldown too short");
    });

    it("Should reject non-owner configuration updates", async function () {
      await expect(
        priceSecurityModule.connect(user1).updateSecurityConfig(
          1000, 300, 3600, 2, 86400
        )
      ).to.be.revertedWithCustomError(priceSecurityModule, "OwnableUnauthorizedAccount");
    });
  });

  describe("Access Control", function () {
    it("Should restrict TWAP updates to owner", async function () {
      await expect(
        priceSecurityModule.connect(user1).updateTWAPData(ASSET_CORE, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(priceSecurityModule, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to transfer ownership", async function () {
      await priceSecurityModule.connect(owner).transferOwnership(await user1.getAddress());
      expect(await priceSecurityModule.owner()).to.equal(await user1.getAddress());
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete price validation workflow", async function () {
      const sources = [await oracle1.getAddress(), await oracle2.getAddress()];
      const initialPrice = ethers.parseEther("1000");
      
      // First price update
      const [isValid1, twapPrice1] = await priceSecurityModule.validatePriceUpdate(
        ASSET_CORE,
        initialPrice,
        sources
      );
      expect(isValid1).to.be.true;
      
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, initialPrice);
      
      // Wait for minimum interval
      await time.increase(301);
      
      // Second price update within threshold
      const newPrice = initialPrice * 105n / 100n; // 5% increase
      const [isValid2, twapPrice2] = await priceSecurityModule.validatePriceUpdate(
        ASSET_CORE,
        newPrice,
        sources
      );
      expect(isValid2).to.be.true;
      expect(twapPrice2).to.equal(initialPrice);
      
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, newPrice);
      
      // Third price update exceeding threshold
      await time.increase(301);
      const extremePrice = initialPrice * 120n / 100n; // 20% increase
      const [isValid3, twapPrice3] = await priceSecurityModule.validatePriceUpdate(
        ASSET_CORE,
        extremePrice,
        sources
      );
      expect(isValid3).to.be.false;
    });

    it("Should handle multiple assets independently", async function () {
      const sources = [await oracle1.getAddress(), await oracle2.getAddress()];
      const corePrice = ethers.parseEther("1000");
      const btcPrice = ethers.parseEther("50000");
      
      // Update prices for both assets
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_CORE, corePrice);
      await priceSecurityModule.connect(owner).updateTWAPData(ASSET_BTC, btcPrice);
      
      // Verify TWAP calculation for each asset
      const coreTWAP = await priceSecurityModule.calculateTWAP(ASSET_CORE);
      const btcTWAP = await priceSecurityModule.calculateTWAP(ASSET_BTC);
      
      expect(coreTWAP).to.equal(corePrice);
      expect(btcTWAP).to.equal(btcPrice);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large price values", async function () {
      const largePrice = ethers.parseEther("1000000000"); // 1B tokens
      const sources = [await oracle1.getAddress(), await oracle2.getAddress()];
      
      const [isValid, twapPrice] = await priceSecurityModule.validatePriceUpdate(
        ASSET_CORE,
        largePrice,
        sources
      );
      
      expect(isValid).to.be.true;
      expect(twapPrice).to.equal(largePrice);
    });

    it("Should handle minimal price differences", async function () {
      const basePrice = ethers.parseEther("1000");
      const slightlyDifferentPrice = basePrice + 1n; // Minimal difference
      
      const deviation = await priceSecurityModule.calculateDeviation(basePrice, slightlyDifferentPrice);
      expect(deviation).to.be.closeTo(0, 1);
    });
  });
});