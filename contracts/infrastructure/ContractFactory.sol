// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../core/tokens/StakeBasketToken.sol";
import "../core/tokens/SimpleToken.sol";
import "../core/staking/UnbondingQueue.sol";
import "../core/staking/CoreLiquidStakingManager.sol";
import "../integrations/oracles/PriceFeed.sol";
import "../security/AccessControlManager.sol";
import "../security/PriceSecurityModule.sol";

/**
 * @title ContractFactory
 * @dev Factory contract for deploying the complete staking ecosystem
 * Ensures proper deployment order and configuration
 */
contract ContractFactory is Ownable {
    
    struct DeployedContracts {
        address stakeBasketToken;
        address simpleToken;  // Used as test BTC
        address unbondingQueue;
        address coreLiquidStakingManager;
        address stCoreToken;
        address priceFeed;
        address accessControlManager;
        address priceSecurityModule;
        address mockCoreStaking;
    }

    struct DeploymentConfig {
        address owner;
        address treasury;
        address operator;
        string basketTokenName;
        string basketTokenSymbol;
        string testTokenName;
        string testTokenSymbol;
    }

    DeployedContracts public deployedContracts;
    bool public isDeployed;
    
    event SystemDeployed(
        address indexed owner,
        address stakeBasketToken,
        address coreLiquidStakingManager,
        uint256 timestamp
    );
    
    event ContractDeployed(string contractName, address contractAddress);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Deploys the complete staking system
     * @param config Deployment configuration parameters
     */
    function deployCompleteSystem(DeploymentConfig memory config) 
        external 
        onlyOwner 
        returns (DeployedContracts memory) 
    {
        require(!isDeployed, "ContractFactory: system already deployed");
        require(config.owner != address(0), "ContractFactory: invalid owner");
        require(config.treasury != address(0), "ContractFactory: invalid treasury");
        require(config.operator != address(0), "ContractFactory: invalid operator");
        
        DeployedContracts memory contracts;
        
        // Phase 1: Deploy independent utility contracts
        contracts.priceFeed = _deployPriceFeed(config.owner);
        contracts.accessControlManager = _deployAccessControlManager(config.owner);
        contracts.priceSecurityModule = _deployPriceSecurityModule(config.owner);
        
        // Phase 2: Deploy mock infrastructure
        contracts.mockCoreStaking = _deployMockCoreStaking();
        
        // Phase 3: Deploy token contracts
        contracts.stakeBasketToken = _deployStakeBasketToken(
            config.basketTokenName,
            config.basketTokenSymbol,
            config.owner
        );
        
        contracts.simpleToken = _deploySimpleToken(
            config.testTokenName,
            config.testTokenSymbol
        );
        
        // Phase 4: Deploy staking infrastructure
        contracts.unbondingQueue = _deployUnbondingQueue(config.owner);
        
        contracts.coreLiquidStakingManager = _deployCoreLiquidStakingManager(
            contracts.mockCoreStaking,
            config.treasury,
            config.operator,
            contracts.unbondingQueue,
            config.owner
        );
        
        // Get stCoreToken address from the manager
        contracts.stCoreToken = address(CoreLiquidStakingManager(payable(contracts.coreLiquidStakingManager)).stCoreToken());
        
        // Phase 5: Configure relationships
        _configureSystem(contracts, config);
        
        deployedContracts = contracts;
        isDeployed = true;
        
        emit SystemDeployed(
            config.owner,
            contracts.stakeBasketToken,
            contracts.coreLiquidStakingManager,
            block.timestamp
        );
        
        return contracts;
    }
    
    /**
     * @dev Simplified deployment function for basic testing
     */
    function deployBasicSystem(
        address owner,
        address treasury,
        address operator
    ) external onlyOwner returns (address[9] memory) {
        DeploymentConfig memory config = DeploymentConfig({
            owner: owner,
            treasury: treasury,
            operator: operator,
            basketTokenName: "Stake Basket Token",
            basketTokenSymbol: "BASKET",
            testTokenName: "Test BTC",
            testTokenSymbol: "TBTC"
        });
        
        DeployedContracts memory contracts = this.deployCompleteSystem(config);
        
        return [
            contracts.stakeBasketToken,
            contracts.simpleToken,
            contracts.mockCoreStaking,
            contracts.priceFeed,
            contracts.unbondingQueue,
            contracts.coreLiquidStakingManager,
            contracts.stCoreToken,
            contracts.accessControlManager,
            contracts.priceSecurityModule
        ];
    }
    
    function _deployPriceFeed(address owner) internal returns (address) {
        PriceFeed priceFeed = new PriceFeed(
            owner,
            address(0), // Mock Pyth oracle
            address(0)  // Mock Switchboard oracle
        );
        
        emit ContractDeployed("PriceFeed", address(priceFeed));
        return address(priceFeed);
    }
    
    function _deployAccessControlManager(address owner) internal returns (address) {
        AccessControlManager acm = new AccessControlManager(owner);
        
        emit ContractDeployed("AccessControlManager", address(acm));
        return address(acm);
    }
    
    function _deployPriceSecurityModule(address owner) internal returns (address) {
        PriceSecurityModule psm = new PriceSecurityModule(owner);
        
        emit ContractDeployed("PriceSecurityModule", address(psm));
        return address(psm);
    }
    
    function _deployMockCoreStaking() internal returns (address) {
        // Deploy a simple mock contract for testing
        // In production, this would be the actual CoreDAO staking contract
        SimpleToken mockContract = new SimpleToken("Mock CORE Staking", "MCORE");
        
        emit ContractDeployed("MockCoreStaking", address(mockContract));
        return address(mockContract);
    }
    
    function _deployStakeBasketToken(
        string memory name,
        string memory symbol,
        address owner
    ) internal returns (address) {
        StakeBasketToken token = new StakeBasketToken(name, symbol, owner);
        
        emit ContractDeployed("StakeBasketToken", address(token));
        return address(token);
    }
    
    function _deploySimpleToken(
        string memory name,
        string memory symbol
    ) internal returns (address) {
        SimpleToken token = new SimpleToken(name, symbol);
        
        emit ContractDeployed("SimpleToken", address(token));
        return address(token);
    }
    
    function _deployUnbondingQueue(address owner) internal returns (address) {
        UnbondingQueue queue = new UnbondingQueue(owner);
        
        emit ContractDeployed("UnbondingQueue", address(queue));
        return address(queue);
    }
    
    function _deployCoreLiquidStakingManager(
        address coreStaking,
        address treasury,
        address operator,
        address unbondingQueue,
        address owner
    ) internal returns (address) {
        CoreLiquidStakingManager manager = new CoreLiquidStakingManager(
            coreStaking,
            treasury,
            operator,
            unbondingQueue,
            owner
        );
        
        emit ContractDeployed("CoreLiquidStakingManager", address(manager));
        return address(manager);
    }
    
    function _configureSystem(
        DeployedContracts memory contracts,
        DeploymentConfig memory config
    ) internal {
        // Set initial prices in PriceFeed
        PriceFeed priceFeed = PriceFeed(contracts.priceFeed);
        priceFeed.setPrice("CORE", 1e18); // $1
        priceFeed.setPrice("BTC", 50000e18); // $50,000
        priceFeed.setPrice("ETH", 2000e18); // $2,000
        
        // Configure SimpleToken minter
        SimpleToken(contracts.simpleToken).setAuthorizedMinter(config.owner);
        
        // Note: StakeBasketToken relationship would be set by the main StakeBasket contract
        // when it's deployed separately
    }
    
    /**
     * @dev Gets all deployed contract addresses
     */
    function getAllContracts() external view returns (address[9] memory) {
        require(isDeployed, "ContractFactory: system not deployed");
        
        return [
            deployedContracts.stakeBasketToken,
            deployedContracts.simpleToken,
            deployedContracts.mockCoreStaking,
            deployedContracts.priceFeed,
            deployedContracts.unbondingQueue,
            deployedContracts.coreLiquidStakingManager,
            deployedContracts.stCoreToken,
            deployedContracts.accessControlManager,
            deployedContracts.priceSecurityModule
        ];
    }
    
    /**
     * @dev Gets deployment info
     */
    function getDeploymentInfo() external view returns (
        bool deployed,
        address stakeBasketToken,
        address coreLiquidStakingManager,
        address priceFeed
    ) {
        return (
            isDeployed,
            deployedContracts.stakeBasketToken,
            deployedContracts.coreLiquidStakingManager,
            deployedContracts.priceFeed
        );
    }
    
    /**
     * @dev Resets the factory (for testing purposes)
     */
    function resetFactory() external onlyOwner {
        delete deployedContracts;
        isDeployed = false;
    }
    
    /**
     * @dev Generates a salt for CREATE2 deployment
     */
    function salt() internal view returns (bytes32) {
        return keccak256(abi.encodePacked(block.timestamp, block.number, msg.sender));
    }
}