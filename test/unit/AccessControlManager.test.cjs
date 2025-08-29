const { expect } = require("chai");
const { ethers } = require("hardhat");
const { TestSetup } = require("../helpers/TestSetup.cjs");

describe("AccessControlManager", function () {
  let setup;
  let accessControlManager;
  let owner, user1, user2, admin, operator;

  before(async function () {
    setup = new TestSetup();
    await setup.initialize();
    await setup.deploySecurityContracts();
    
    ({ accessControlManager } = setup.contracts);
    ({ owner, user1, user2 } = setup);
    
    const signers = await ethers.getSigners();
    admin = signers[6];
    operator = signers[7];
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await accessControlManager.owner()).to.equal(owner.address);
    });

    it("Should initialize with default roles", async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      expect(ADMIN_ROLE).to.be.a('string');
      expect(OPERATOR_ROLE).to.be.a('string');
      
      // Owner should have admin role initially
      expect(await accessControlManager.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should grant admin role", async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      
      await expect(
        accessControlManager.connect(owner).grantRole(ADMIN_ROLE, admin.address)
      ).to.emit(accessControlManager, "RoleGranted")
        .withArgs(ADMIN_ROLE, admin.address, owner.address);
      
      expect(await accessControlManager.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should grant operator role", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
      
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;
    });

    it("Should revoke roles", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, user1.address);
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user1.address)).to.be.true;
      
      await accessControlManager.connect(owner).revokeRole(OPERATOR_ROLE, user1.address);
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user1.address)).to.be.false;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      
      await expect(
        accessControlManager.connect(user1).grantRole(ADMIN_ROLE, user2.address)
      ).to.be.revertedWithCustomError(accessControlManager, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Permission Checks", function () {
    beforeEach(async function () {
      // Set up roles
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).grantRole(ADMIN_ROLE, admin.address);
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
    });

    it("Should check admin permissions", async function () {
      expect(await accessControlManager.isAdmin(owner.address)).to.be.true;
      expect(await accessControlManager.isAdmin(admin.address)).to.be.true;
      expect(await accessControlManager.isAdmin(user1.address)).to.be.false;
    });

    it("Should check operator permissions", async function () {
      expect(await accessControlManager.isOperator(operator.address)).to.be.true;
      expect(await accessControlManager.isOperator(user1.address)).to.be.false;
    });

    it("Should check admin or operator permissions", async function () {
      expect(await accessControlManager.isAdminOrOperator(owner.address)).to.be.true;
      expect(await accessControlManager.isAdminOrOperator(admin.address)).to.be.true;
      expect(await accessControlManager.isAdminOrOperator(operator.address)).to.be.true;
      expect(await accessControlManager.isAdminOrOperator(user1.address)).to.be.false;
    });
  });

  describe("Contract Authorization", function () {
    let mockContract;

    beforeEach(async function () {
      // Deploy a mock contract for testing
      const MockContract = await ethers.getContractFactory("MockERC20");
      mockContract = await MockContract.deploy("Mock", "MCK", 18);
      await mockContract.waitForDeployment();
    });

    it("Should authorize contract", async function () {
      await expect(
        accessControlManager.connect(owner).authorizeContract(await mockContract.getAddress())
      ).to.emit(accessControlManager, "ContractAuthorized")
        .withArgs(await mockContract.getAddress());
      
      expect(await accessControlManager.isAuthorizedContract(await mockContract.getAddress())).to.be.true;
    });

    it("Should unauthorize contract", async function () {
      const contractAddress = await mockContract.getAddress();
      
      await accessControlManager.connect(owner).authorizeContract(contractAddress);
      
      await expect(
        accessControlManager.connect(owner).unauthorizeContract(contractAddress)
      ).to.emit(accessControlManager, "ContractUnauthorized")
        .withArgs(contractAddress);
      
      expect(await accessControlManager.isAuthorizedContract(contractAddress)).to.be.false;
    });

    it("Should prevent non-admin from authorizing contracts", async function () {
      await expect(
        accessControlManager.connect(user1).authorizeContract(await mockContract.getAddress())
      ).to.be.revertedWith("AccessControlManager: caller is not admin");
    });
  });

  describe("Function-Level Access Control", function () {
    beforeEach(async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
    });

    it("Should set function access control", async function () {
      const contractAddress = ethers.ZeroAddress; // Use zero address as example
      const functionSig = "transfer(address,uint256)";
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).setFunctionAccess(
        contractAddress,
        functionSig,
        OPERATOR_ROLE
      );
      
      expect(await accessControlManager.getFunctionAccess(contractAddress, functionSig))
        .to.equal(OPERATOR_ROLE);
    });

    it("Should check function access permissions", async function () {
      const contractAddress = ethers.ZeroAddress;
      const functionSig = "transfer(address,uint256)";
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).setFunctionAccess(
        contractAddress,
        functionSig,
        OPERATOR_ROLE
      );
      
      expect(await accessControlManager.hasFunctionAccess(
        contractAddress,
        functionSig,
        operator.address
      )).to.be.true;
      
      expect(await accessControlManager.hasFunctionAccess(
        contractAddress,
        functionSig,
        user1.address
      )).to.be.false;
    });
  });

  describe("Batch Operations", function () {
    it("Should grant multiple roles at once", async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      const accounts = [user1.address, user2.address];
      const roles = [ADMIN_ROLE, OPERATOR_ROLE];
      
      await accessControlManager.connect(owner).batchGrantRoles(accounts, roles);
      
      expect(await accessControlManager.hasRole(ADMIN_ROLE, user1.address)).to.be.true;
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user2.address)).to.be.true;
    });

    it("Should revoke multiple roles at once", async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      // First grant roles
      await accessControlManager.connect(owner).grantRole(ADMIN_ROLE, user1.address);
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, user2.address);
      
      const accounts = [user1.address, user2.address];
      const roles = [ADMIN_ROLE, OPERATOR_ROLE];
      
      await accessControlManager.connect(owner).batchRevokeRoles(accounts, roles);
      
      expect(await accessControlManager.hasRole(ADMIN_ROLE, user1.address)).to.be.false;
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user2.address)).to.be.false;
    });

    it("Should authorize multiple contracts", async function () {
      const contract1 = ethers.getAddress("0x" + "1".repeat(40));
      const contract2 = ethers.getAddress("0x" + "2".repeat(40));
      
      const contracts = [contract1, contract2];
      
      await accessControlManager.connect(owner).batchAuthorizeContracts(contracts);
      
      expect(await accessControlManager.isAuthorizedContract(contract1)).to.be.true;
      expect(await accessControlManager.isAuthorizedContract(contract2)).to.be.true;
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      // Set up some roles
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).grantRole(ADMIN_ROLE, admin.address);
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
    });

    it("Should pause contract", async function () {
      await expect(
        accessControlManager.connect(owner).pause()
      ).to.emit(accessControlManager, "Paused")
        .withArgs(owner.address);
      
      expect(await accessControlManager.paused()).to.be.true;
    });

    it("Should unpause contract", async function () {
      await accessControlManager.connect(owner).pause();
      
      await expect(
        accessControlManager.connect(owner).unpause()
      ).to.emit(accessControlManager, "Unpaused")
        .withArgs(owner.address);
      
      expect(await accessControlManager.paused()).to.be.false;
    });

    it("Should prevent role operations when paused", async function () {
      await accessControlManager.connect(owner).pause();
      
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await expect(
        accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, user1.address)
      ).to.be.revertedWithCustomError(accessControlManager, "EnforcedPause");
    });

    it("Should still allow role checks when paused", async function () {
      await accessControlManager.connect(owner).pause();
      
      // View functions should still work
      expect(await accessControlManager.isAdmin(owner.address)).to.be.true;
      expect(await accessControlManager.isOperator(operator.address)).to.be.true;
    });

    it("Should emergency revoke all roles", async function () {
      await accessControlManager.connect(owner).emergencyRevokeAllRoles(admin.address);
      
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      expect(await accessControlManager.hasRole(ADMIN_ROLE, admin.address)).to.be.false;
    });
  });

  describe("Role Hierarchy", function () {
    it("Should respect role hierarchy", async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      // Admin should be able to grant operator role
      await accessControlManager.connect(owner).grantRole(ADMIN_ROLE, admin.address);
      
      await expect(
        accessControlManager.connect(admin).grantRole(OPERATOR_ROLE, user1.address)
      ).to.not.be.reverted;
      
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user1.address)).to.be.true;
    });

    it("Should prevent lower roles from granting higher roles", async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
      
      // Operator should not be able to grant admin role
      await expect(
        accessControlManager.connect(operator).grantRole(ADMIN_ROLE, user1.address)
      ).to.be.revertedWithCustomError(accessControlManager, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Time-Based Access Control", function () {
    it("Should set temporary role", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      const duration = 3600; // 1 hour
      
      await accessControlManager.connect(owner).grantTemporaryRole(
        OPERATOR_ROLE,
        user1.address,
        duration
      );
      
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user1.address)).to.be.true;
    });

    it("Should expire temporary role", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      const duration = 1; // 1 second
      
      await accessControlManager.connect(owner).grantTemporaryRole(
        OPERATOR_ROLE,
        user1.address,
        duration
      );
      
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user1.address)).to.be.true;
      
      // Advance time
      await setup.advanceTime(2);
      
      // Role should have expired
      expect(await accessControlManager.hasRole(OPERATOR_ROLE, user1.address)).to.be.false;
    });
  });

  describe("Access Control Events", function () {
    it("Should emit role granted events", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await expect(
        accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, user1.address)
      ).to.emit(accessControlManager, "RoleGranted")
        .withArgs(OPERATOR_ROLE, user1.address, owner.address);
    });

    it("Should emit role revoked events", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, user1.address);
      
      await expect(
        accessControlManager.connect(owner).revokeRole(OPERATOR_ROLE, user1.address)
      ).to.emit(accessControlManager, "RoleRevoked")
        .withArgs(OPERATOR_ROLE, user1.address, owner.address);
    });
  });

  describe("Integration with Other Contracts", function () {
    it("Should integrate with access control modifier", async function () {
      // This would test integration with contracts that use this access control
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      
      await accessControlManager.connect(owner).grantRole(ADMIN_ROLE, admin.address);
      
      // Test that the admin role is properly recognized
      expect(await accessControlManager.isAdmin(admin.address)).to.be.true;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const ADMIN_ROLE = await accessControlManager.ADMIN_ROLE();
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      await accessControlManager.connect(owner).grantRole(ADMIN_ROLE, admin.address);
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, user1.address);
    });

    it("Should get role member count", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      const count = await accessControlManager.getRoleMemberCount(OPERATOR_ROLE);
      expect(count).to.be.gte(2); // At least operator and user1
    });

    it("Should get role members", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      
      const member0 = await accessControlManager.getRoleMember(OPERATOR_ROLE, 0);
      const member1 = await accessControlManager.getRoleMember(OPERATOR_ROLE, 1);
      
      expect([member0, member1]).to.include(operator.address);
      expect([member0, member1]).to.include(user1.address);
    });

    it("Should get all authorized contracts", async function () {
      const contract1 = ethers.getAddress("0x" + "1".repeat(40));
      const contract2 = ethers.getAddress("0x" + "2".repeat(40));
      
      await accessControlManager.connect(owner).authorizeContract(contract1);
      await accessControlManager.connect(owner).authorizeContract(contract2);
      
      const authorized = await accessControlManager.getAuthorizedContracts();
      expect(authorized).to.include(contract1);
      expect(authorized).to.include(contract2);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use minimal gas for role checks", async function () {
      const OPERATOR_ROLE = await accessControlManager.OPERATOR_ROLE();
      await accessControlManager.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
      
      // This is a simple gas consumption test
      const gasEstimate = await accessControlManager.isOperator.estimateGas(operator.address);
      expect(gasEstimate).to.be.lt(50000); // Should be much less than 50k gas
    });
  });
});