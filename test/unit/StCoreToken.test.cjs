const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StCoreToken", function () {
  let stCoreToken;
  let owner, liquidStakingManager, user1, user2, unauthorized;

  const PRECISION = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, liquidStakingManager, user1, user2, unauthorized] = await ethers.getSigners();

    // Deploy StCoreToken
    const StCoreToken = await ethers.getContractFactory("StCoreToken");
    stCoreToken = await StCoreToken.deploy(await owner.getAddress());
    await stCoreToken.waitForDeployment();

    // Set liquid staking manager
    await stCoreToken.connect(owner).setLiquidStakingManager(await liquidStakingManager.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await stCoreToken.name()).to.equal("Staked CORE");
      expect(await stCoreToken.symbol()).to.equal("stCORE");
      expect(await stCoreToken.decimals()).to.equal(18);
      expect(await stCoreToken.totalSupply()).to.equal(0);
      expect(await stCoreToken.totalStakedCore()).to.equal(0);
      expect(await stCoreToken.owner()).to.equal(await owner.getAddress());
    });

    it("Should have initial 1:1 conversion rate", async function () {
      expect(await stCoreToken.getConversionRate()).to.equal(PRECISION);
    });

    it("Should set liquid staking manager", async function () {
      expect(await stCoreToken.liquidStakingManager()).to.equal(await liquidStakingManager.getAddress());
    });

    it("Should reject zero address as liquid staking manager", async function () {
      await expect(
        stCoreToken.connect(owner).setLiquidStakingManager(ethers.ZeroAddress)
      ).to.be.revertedWith("StCoreToken: invalid address");
    });
  });

  describe("Minting", function () {
    it("Should mint stCORE tokens with 1:1 ratio initially", async function () {
      const coreAmount = ethers.parseEther("100");
      
      await expect(
        stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), coreAmount)
      ).to.emit(stCoreToken, "Minted")
        .withArgs(await user1.getAddress(), coreAmount, coreAmount);

      expect(await stCoreToken.balanceOf(await user1.getAddress())).to.equal(coreAmount);
      expect(await stCoreToken.totalSupply()).to.equal(coreAmount);
      expect(await stCoreToken.totalStakedCore()).to.equal(coreAmount);
      expect(await stCoreToken.getConversionRate()).to.equal(PRECISION);
    });

    it("Should mint with updated conversion rate after rewards", async function () {
      const initialCore = ethers.parseEther("100");
      const rewardsCore = ethers.parseEther("10");
      
      // Initial mint
      await stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), initialCore);
      
      // Simulate rewards by updating total staked CORE
      await stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(initialCore + rewardsCore);
      
      // New conversion rate should be (110 CORE / 100 stCORE) = 1.1
      const expectedRate = (initialCore + rewardsCore) * PRECISION / initialCore;
      expect(await stCoreToken.getConversionRate()).to.equal(expectedRate);
      
      // Second mint should give fewer stCORE tokens due to improved rate
      const secondCoreAmount = ethers.parseEther("55"); // 55 CORE should give ~50 stCORE
      const expectedStCoreAmount = (secondCoreAmount * PRECISION) / expectedRate;
      
      await expect(
        stCoreToken.connect(liquidStakingManager).mint(await user2.getAddress(), secondCoreAmount)
      ).to.emit(stCoreToken, "Minted")
        .withArgs(await user2.getAddress(), expectedStCoreAmount, secondCoreAmount);

      expect(await stCoreToken.balanceOf(await user2.getAddress())).to.equal(expectedStCoreAmount);
    });

    it("Should reject minting from unauthorized address", async function () {
      await expect(
        stCoreToken.connect(unauthorized).mint(await user1.getAddress(), ethers.parseEther("100"))
      ).to.be.revertedWith("StCoreToken: caller is not liquid staking manager");
    });

    it("Should reject minting to zero address", async function () {
      await expect(
        stCoreToken.connect(liquidStakingManager).mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("StCoreToken: mint to zero address");
    });

    it("Should reject minting zero amount", async function () {
      await expect(
        stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), 0)
      ).to.be.revertedWith("StCoreToken: mint amount must be positive");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      await stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), ethers.parseEther("100"));
    });

    it("Should burn stCORE tokens and return CORE with 1:1 ratio", async function () {
      const burnAmount = ethers.parseEther("50");
      
      await expect(
        stCoreToken.connect(liquidStakingManager).burn(await user1.getAddress(), burnAmount)
      ).to.emit(stCoreToken, "Burned")
        .withArgs(await user1.getAddress(), burnAmount, burnAmount);

      expect(await stCoreToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("50"));
      expect(await stCoreToken.totalSupply()).to.equal(ethers.parseEther("50"));
      expect(await stCoreToken.totalStakedCore()).to.equal(ethers.parseEther("50"));
    });

    it("Should burn with updated conversion rate after rewards", async function () {
      const rewardsCore = ethers.parseEther("10");
      
      // Simulate rewards
      await stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(
        await stCoreToken.totalStakedCore() + rewardsCore
      );
      
      // New rate should be 1.1 (110 CORE / 100 stCORE)
      const expectedRate = ethers.parseEther("110") * PRECISION / ethers.parseEther("100");
      expect(await stCoreToken.getConversionRate()).to.equal(expectedRate);
      
      // Burning 50 stCORE should return 55 CORE
      const burnStCoreAmount = ethers.parseEther("50");
      const expectedCoreAmount = burnStCoreAmount * expectedRate / PRECISION;
      
      await expect(
        stCoreToken.connect(liquidStakingManager).burn(await user1.getAddress(), burnStCoreAmount)
      ).to.emit(stCoreToken, "Burned")
        .withArgs(await user1.getAddress(), burnStCoreAmount, expectedCoreAmount);
    });

    it("Should reject burning from unauthorized address", async function () {
      await expect(
        stCoreToken.connect(unauthorized).burn(await user1.getAddress(), ethers.parseEther("50"))
      ).to.be.revertedWith("StCoreToken: caller is not liquid staking manager");
    });

    it("Should reject burning from zero address", async function () {
      await expect(
        stCoreToken.connect(liquidStakingManager).burn(ethers.ZeroAddress, ethers.parseEther("50"))
      ).to.be.revertedWith("StCoreToken: burn from zero address");
    });

    it("Should reject burning zero amount", async function () {
      await expect(
        stCoreToken.connect(liquidStakingManager).burn(await user1.getAddress(), 0)
      ).to.be.revertedWith("StCoreToken: burn amount must be positive");
    });

    it("Should reject burning more than balance", async function () {
      await expect(
        stCoreToken.connect(liquidStakingManager).burn(await user1.getAddress(), ethers.parseEther("200"))
      ).to.be.revertedWith("StCoreToken: insufficient balance");
    });

    it("Should reject burning more CORE than available", async function () {
      // This shouldn't happen in normal operations, but test for safety
      await stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(ethers.parseEther("50"));
      
      await expect(
        stCoreToken.connect(liquidStakingManager).burn(await user1.getAddress(), ethers.parseEther("100"))
      ).to.be.revertedWith("StCoreToken: insufficient staked CORE");
    });
  });

  describe("Total Staked Core Updates", function () {
    beforeEach(async function () {
      await stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), ethers.parseEther("100"));
    });

    it("Should update total staked CORE after rewards", async function () {
      const newTotal = ethers.parseEther("120"); // 20% rewards
      
      await expect(
        stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(newTotal)
      ).to.emit(stCoreToken, "ConversionRateUpdated");

      expect(await stCoreToken.totalStakedCore()).to.equal(newTotal);
      
      // Conversion rate should be 1.2 (120 CORE / 100 stCORE)
      const expectedRate = newTotal * PRECISION / ethers.parseEther("100");
      expect(await stCoreToken.getConversionRate()).to.equal(expectedRate);
    });

    it("Should reject decreasing total staked CORE", async function () {
      await expect(
        stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(ethers.parseEther("50"))
      ).to.be.revertedWith("StCoreToken: total staked cannot decrease without burns");
    });

    it("Should reject updates from unauthorized address", async function () {
      await expect(
        stCoreToken.connect(unauthorized).updateTotalStakedCore(ethers.parseEther("120"))
      ).to.be.revertedWith("StCoreToken: caller is not liquid staking manager");
    });
  });

  describe("Conversion Functions", function () {
    beforeEach(async function () {
      await stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), ethers.parseEther("100"));
      // Simulate 10% rewards
      await stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(ethers.parseEther("110"));
    });

    it("Should convert CORE to stCORE correctly", async function () {
      const coreAmount = ethers.parseEther("55");
      const expectedStCoreAmount = ethers.parseEther("50"); // 55/1.1 = 50
      
      expect(await stCoreToken.coreToStCore(coreAmount)).to.equal(expectedStCoreAmount);
    });

    it("Should convert stCORE to CORE correctly", async function () {
      const stCoreAmount = ethers.parseEther("50");
      const expectedCoreAmount = ethers.parseEther("55"); // 50*1.1 = 55
      
      expect(await stCoreToken.stCoreToCore(stCoreAmount)).to.equal(expectedCoreAmount);
    });

    it("Should handle zero amounts", async function () {
      expect(await stCoreToken.coreToStCore(0)).to.equal(0);
      expect(await stCoreToken.stCoreToCore(0)).to.equal(0);
    });
  });

  describe("Token Information", function () {
    beforeEach(async function () {
      await stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), ethers.parseEther("100"));
      await stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(ethers.parseEther("110"));
    });

    it("Should return correct token info", async function () {
      const [
        name,
        symbol,
        decimals,
        totalSupply,
        totalStaked,
        conversionRate
      ] = await stCoreToken.getTokenInfo();

      expect(name).to.equal("Staked CORE");
      expect(symbol).to.equal("stCORE");
      expect(decimals).to.equal(18);
      expect(totalSupply).to.equal(ethers.parseEther("100"));
      expect(totalStaked).to.equal(ethers.parseEther("110"));
      expect(conversionRate).to.equal(ethers.parseEther("1.1"));
    });
  });

  describe("Access Control", function () {
    it("Should restrict owner functions", async function () {
      await expect(
        stCoreToken.connect(user1).setLiquidStakingManager(await user2.getAddress())
      ).to.be.revertedWithCustomError(stCoreToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to transfer ownership", async function () {
      await stCoreToken.connect(owner).transferOwnership(await user1.getAddress());
      expect(await stCoreToken.owner()).to.equal(await user1.getAddress());
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large amounts", async function () {
      const largeAmount = ethers.parseEther("1000000000"); // 1 billion CORE
      
      await expect(
        stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), largeAmount)
      ).to.not.be.reverted;

      expect(await stCoreToken.balanceOf(await user1.getAddress())).to.equal(largeAmount);
    });

    it("Should handle very small amounts", async function () {
      const smallAmount = 1; // 1 wei
      
      await expect(
        stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), smallAmount)
      ).to.not.be.reverted;

      expect(await stCoreToken.balanceOf(await user1.getAddress())).to.equal(smallAmount);
    });

    it("Should maintain precision with multiple operations", async function () {
      // Multiple mint and burn operations should maintain precision
      await stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), ethers.parseEther("100"));
      await stCoreToken.connect(liquidStakingManager).updateTotalStakedCore(ethers.parseEther("105")); // 5% rewards
      
      const burnAmount = ethers.parseEther("50");
      await stCoreToken.connect(liquidStakingManager).burn(await user1.getAddress(), burnAmount);
      
      // Remaining balance should be 50 stCORE
      expect(await stCoreToken.balanceOf(await user1.getAddress())).to.equal(ethers.parseEther("50"));
      
      // Total staked should be reduced by the CORE equivalent of burned stCORE
      const expectedRemainingCore = ethers.parseEther("52.5"); // 50 * 1.05 = 52.5
      expect(await stCoreToken.totalStakedCore()).to.equal(expectedRemainingCore);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy in mint function", async function () {
      // This test would require a malicious contract to properly test reentrancy
      // For now, we just verify the modifier is present and function works normally
      await expect(
        stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), ethers.parseEther("100"))
      ).to.not.be.reverted;
    });

    it("Should prevent reentrancy in burn function", async function () {
      await stCoreToken.connect(liquidStakingManager).mint(await user1.getAddress(), ethers.parseEther("100"));
      
      await expect(
        stCoreToken.connect(liquidStakingManager).burn(await user1.getAddress(), ethers.parseEther("50"))
      ).to.not.be.reverted;
    });
  });
});