const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MinimalContractFactory", function () {
    async function deployMinimalFactoryFixture() {
        const [owner, addr1] = await ethers.getSigners();
        
        const MinimalContractFactory = await ethers.getContractFactory("MinimalContractFactory");
        const factory = await MinimalContractFactory.deploy();
        
        return { factory, owner, addr1 };
    }

    describe("Deployment", function () {
        it("Should deploy with correct owner", async function () {
            const { factory, owner } = await loadFixture(deployMinimalFactoryFixture);
            expect(await factory.owner()).to.equal(owner.address);
        });

        it("Should have empty initial state", async function () {
            const { factory } = await loadFixture(deployMinimalFactoryFixture);
            
            const [names, addresses] = await factory.getAllContracts();
            expect(names.length).to.equal(0);
            expect(addresses.length).to.equal(0);
        });
    });

    describe("Contract Registration", function () {
        it("Should register contract successfully", async function () {
            const { factory, owner } = await loadFixture(deployMinimalFactoryFixture);
            
            const testAddress = "0x1234567890123456789012345678901234567890";
            
            await expect(factory.registerContract("TestContract", testAddress))
                .to.emit(factory, "ContractRegistered")
                .withArgs("TestContract", testAddress);
        });

        it("Should get contract by name", async function () {
            const { factory } = await loadFixture(deployMinimalFactoryFixture);
            
            const testAddress = "0x1234567890123456789012345678901234567890";
            await factory.registerContract("TestContract", testAddress);
            
            expect(await factory.getContract("TestContract")).to.equal(testAddress);
        });

        it("Should return all contracts", async function () {
            const { factory } = await loadFixture(deployMinimalFactoryFixture);
            
            await factory.registerContract("Contract1", "0x1234567890123456789012345678901234567890");
            await factory.registerContract("Contract2", "0x2345678901234567890123456789012345678901");
            
            const [names, addresses] = await factory.getAllContracts();
            expect(names.length).to.equal(2);
            expect(addresses.length).to.equal(2);
        });

        it("Should initialize system successfully", async function () {
            const { factory, owner } = await loadFixture(deployMinimalFactoryFixture);
            
            await factory.registerContract("TestContract", "0x1234567890123456789012345678901234567890");
            
            await expect(factory.initializeSystem())
                .to.emit(factory, "SystemInitialized")
                .withArgs(owner.address, 1);
        });
    });
});