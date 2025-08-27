// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StakeBasket.sol";
import "./BasketStaking.sol";
import "./StakingManager.sol";
import "./StakeBasketToken.sol";
import "./MockDualStaking.sol";
import "./PriceFeed.sol";
import "./CoreLiquidStakingManager.sol";
import "./UnbondingQueue.sol";
import "./TestBTC.sol";

/**
 * @title ContractFactory
 * @dev Factory contract to deploy all related contracts in correct order
 * Resolves circular dependency issues during deployment
 */
contract ContractFactory {
    
    // Deployed contract addresses
    address public stakeBasketToken;
    address public testBTC;
    address public mockDualStaking;
    address public priceFeed;
    address public unbondingQueue;
    address public coreLiquidStakingManager;
    address public stakingManager;
    address public basketStaking;
    address public stakeBasket;
    
    // Events
    event ContractDeployed(string contractName, address contractAddress);
    event SystemDeploymentCompleted(address[] allContracts);
    
    /**
     * @dev Deploy all contracts in the correct order
     * @param owner Address that will own all deployed contracts
     * @param treasury Address for protocol treasury
     * @param operator Address for automated operations
     * @return deployedContracts Array of all deployed contract addresses
     */
    function deployCompleteSystem(
        address owner,
        address treasury,
        address operator
    ) external returns (address[] memory deployedContracts) {
        
        // Phase 1: Deploy independent contracts
        _deployTokenContracts(owner);
        _deployInfrastructureContracts(owner, treasury, operator);
        
        // Phase 2: Deploy contracts with dependencies
        _deployStakingContracts(owner, treasury, operator);
        
        // Phase 3: Configure contract relationships
        _configureContractRelationships();
        
        // Return all deployed addresses
        deployedContracts = new address[](9);
        deployedContracts[0] = stakeBasketToken;
        deployedContracts[1] = testBTC;
        deployedContracts[2] = mockDualStaking;
        deployedContracts[3] = priceFeed;
        deployedContracts[4] = unbondingQueue;
        deployedContracts[5] = coreLiquidStakingManager;
        deployedContracts[6] = stakingManager;
        deployedContracts[7] = basketStaking;
        deployedContracts[8] = stakeBasket;
        
        emit SystemDeploymentCompleted(deployedContracts);
        
        return deployedContracts;
    }
    
    /**
     * @dev Deploy token contracts (no dependencies)
     */
    function _deployTokenContracts(address owner) internal {
        // Deploy StakeBasketToken
        stakeBasketToken = address(new StakeBasketToken(
            "Core BTC ETF",
            "cbETF", 
            owner
        ));
        emit ContractDeployed("StakeBasketToken", stakeBasketToken);
        
        // Deploy TestBTC token for local testing
        testBTC = address(new TestBTC());
        emit ContractDeployed("TestBTC", testBTC);
    }
    
    /**
     * @dev Deploy infrastructure contracts
     */
    function _deployInfrastructureContracts(
        address owner,
        address treasury,
        address operator
    ) internal {
        // Deploy PriceFeed with placeholder oracles for local testing
        priceFeed = address(new PriceFeed(owner, address(0x1), address(0x2)));
        emit ContractDeployed("PriceFeed", priceFeed);
        
        // Deploy UnbondingQueue
        unbondingQueue = address(new UnbondingQueue(owner));
        emit ContractDeployed("UnbondingQueue", unbondingQueue);
        
        // Deploy MockDualStaking
        mockDualStaking = address(new MockDualStaking(
            address(0), // No ERC20 CORE token for local testnet
            testBTC,
            owner
        ));
        emit ContractDeployed("MockDualStaking", mockDualStaking);
        
        // Fund the dual staking contract with some ETH for rewards
        (bool success, ) = payable(mockDualStaking).call{value: 10 ether}("");
        require(success, "Failed to fund MockDualStaking");
    }
    
    /**
     * @dev Deploy staking contracts with proper dependencies
     */
    function _deployStakingContracts(
        address owner,
        address treasury,
        address operator
    ) internal {
        // Deploy CoreLiquidStakingManager (needs unbondingQueue)
        coreLiquidStakingManager = address(new CoreLiquidStakingManager(
            address(0), // No core staking contract for local testnet
            treasury,
            operator,
            unbondingQueue,
            owner
        ));
        emit ContractDeployed("CoreLiquidStakingManager", coreLiquidStakingManager);
        
        // Deploy StakingManager (placeholder for stakeBasket address)
        stakingManager = address(new StakingManager(
            address(0), // Will be set later
            address(0), // No core staking contract for local testnet  
            address(0), // No lstBTC contract for local testnet
            testBTC,    // Use testBTC as coreBTC
            address(0), // No ERC20 CORE token for local testnet
            owner
        ));
        emit ContractDeployed("StakingManager", stakingManager);
        
        // Deploy BasketStaking
        basketStaking = address(new BasketStaking(stakeBasketToken, owner));
        emit ContractDeployed("BasketStaking", basketStaking);
        
        // Deploy StakeBasket (main contract)
        stakeBasket = address(new StakeBasket(
            stakeBasketToken,
            payable(stakingManager),
            priceFeed,
            treasury,    // Fee recipient
            treasury,    // Protocol treasury
            owner
        ));
        emit ContractDeployed("StakeBasket", stakeBasket);
    }
    
    /**
     * @dev Configure relationships between contracts
     */
    function _configureContractRelationships() internal {
        // Set StakeBasket address in StakingManager
        StakingManager(payable(stakingManager)).setStakeBasketContract(stakeBasket);
        
        // Set BasketStaking in StakeBasket
        StakeBasket(payable(stakeBasket)).setBasketStaking(basketStaking);
        
        // Configure StakeBasketToken permissions (emergency method for testing)
        StakeBasketToken(stakeBasketToken).emergencySetStakeBasketContract(stakeBasket);
        
        // Set up PriceFeed with initial prices for local testing
        PriceFeed(priceFeed).setPrice("CORE", 150000000); // $1.50 with 8 decimals
        PriceFeed(priceFeed).setPrice("BTC", 9500000000000); // $95,000 with 8 decimals
        PriceFeed(priceFeed).setPrice("SolvBTC", 9500000000000); // $95,000 with 8 decimals
    }
    
    /**
     * @dev Get all deployed contract addresses
     */
    function getAllContracts() external view returns (
        address _stakeBasketToken,
        address _testBTC,
        address _mockDualStaking,
        address _priceFeed,
        address _unbondingQueue,
        address _coreLiquidStakingManager,
        address _stakingManager,
        address _basketStaking,
        address _stakeBasket
    ) {
        return (
            stakeBasketToken,
            testBTC,
            mockDualStaking,
            priceFeed,
            unbondingQueue,
            coreLiquidStakingManager,
            stakingManager,
            basketStaking,
            stakeBasket
        );
    }
    
    /**
     * @dev Emergency function to fund contracts with ETH
     */
    function fundContract(address target, uint256 amount) external payable {
        require(msg.value >= amount, "Insufficient ETH sent");
        (bool success, ) = payable(target).call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}