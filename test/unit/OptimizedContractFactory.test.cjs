const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("OptimizedContractFactory", function () {
    async function deployOptimizedFactoryFixture() {
        const [owner, addr1] = await ethers.getSigners();
        
        const OptimizedContractFactory = await ethers.getContractFactory("OptimizedContractFactory");
        const factory = await OptimizedContractFactory.deploy();
        
        return { factory, owner, addr1 };
    }

    describe("Deployment", function () {
        it("Should deploy with correct owner", async function () {
            const { factory, owner } = await loadFixture(deployOptimizedFactoryFixture);
            expect(await factory.owner()).to.equal(owner.address);
        });

        it("Should have small bytecode size", async function () {
            const { factory } = await loadFixture(deployOptimizedFactoryFixture);
            const code = await ethers.provider.getCode(await factory.getAddress());
            
            // Verify the contract is much smaller than original
            expect(code.length).to.be.lessThan(10000); // Much smaller than original
        });
    });

    describe("Contract Registration", function () {
        it("Should register deployment successfully", async function () {
            const { factory, owner } = await loadFixture(deployOptimizedFactoryFixture);
            
            const mockAddresses = [
                "0x1234567890123456789012345678901234567890",
                "0x2345678901234567890123456789012345678901",
                "0x3456789012345678901234567890123456789012",
                "0x4567890123456789012345678901234567890123"
            ];
            
            await expect(factory.registerDeployment(...mockAddresses))
                .to.emit(factory, "SystemDeployed");
        });

        it("Should return deployed addresses", async function () {
            const { factory } = await loadFixture(deployOptimizedFactoryFixture);
            
            const mockAddresses = [
                "0x1234567890123456789012345678901234567890",
                "0x2345678901234567890123456789012345678901", 
                "0x3456789012345678901234567890123456789012",
                "0x4567890123456789012345678901234567890123"
            ];
            
            await factory.registerDeployment(...mockAddresses);
            
            const result = await factory.getDeployedAddresses();
            expect(result[0]).to.equal(mockAddresses[0]);
            expect(result[1]).to.equal(mockAddresses[1]);
            expect(result[2]).to.equal(mockAddresses[2]);
            expect(result[3]).to.equal(mockAddresses[3]);
        });
    });
});