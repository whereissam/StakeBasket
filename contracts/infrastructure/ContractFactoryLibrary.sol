// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/tokens/StakeBasketToken.sol";
import "../core/tokens/SimpleToken.sol";
import "../core/staking/UnbondingQueue.sol";
import "../core/staking/CoreLiquidStakingManager.sol";
import "../integrations/oracles/PriceFeed.sol";
import "../security/AccessControlManager.sol";
import "../security/PriceSecurityModule.sol";

/**
 * @title ContractFactoryLibrary
 * @dev Library to reduce ContractFactory bytecode size
 */
library ContractFactoryLibrary {
    
    struct DeployedContracts {
        address stakeBasketToken;
        address simpleToken;
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

    event ContractDeployed(string contractName, address contractAddress);
    
    function deployUtilityContracts(address owner) 
        external 
        returns (address priceFeed, address acm, address psm) 
    {
        // Deploy PriceFeed
        PriceFeed _priceFeed = new PriceFeed(owner, address(0), address(0));
        emit ContractDeployed("PriceFeed", address(_priceFeed));
        
        // Deploy AccessControlManager
        AccessControlManager _acm = new AccessControlManager(owner);
        emit ContractDeployed("AccessControlManager", address(_acm));
        
        // Deploy PriceSecurityModule
        PriceSecurityModule _psm = new PriceSecurityModule(owner);
        emit ContractDeployed("PriceSecurityModule", address(_psm));
        
        return (address(_priceFeed), address(_acm), address(_psm));
    }
    
    function deployTokenContracts(
        string memory basketName,
        string memory basketSymbol,
        string memory testName,
        string memory testSymbol,
        address owner
    ) external returns (address basketToken, address testToken) {
        // Deploy StakeBasketToken
        StakeBasketToken _basketToken = new StakeBasketToken(basketName, basketSymbol, owner);
        emit ContractDeployed("StakeBasketToken", address(_basketToken));
        
        // Deploy SimpleToken (test BTC)
        SimpleToken _testToken = new SimpleToken(testName, testSymbol);
        emit ContractDeployed("SimpleToken", address(_testToken));
        
        return (address(_basketToken), address(_testToken));
    }
    
    function deployStakingInfrastructure(
        address coreStaking,
        address treasury,
        address operator,
        address owner
    ) external returns (address unbondingQueue, address stakingManager, address stCoreToken) {
        // Deploy UnbondingQueue
        UnbondingQueue _queue = new UnbondingQueue(owner);
        emit ContractDeployed("UnbondingQueue", address(_queue));
        
        // Deploy CoreLiquidStakingManager
        CoreLiquidStakingManager _manager = new CoreLiquidStakingManager(
            coreStaking,
            treasury,
            operator,
            address(_queue),
            owner
        );
        emit ContractDeployed("CoreLiquidStakingManager", address(_manager));
        
        // Get stCoreToken address
        address _stCoreToken = address(_manager.stCoreToken());
        
        return (address(_queue), address(_manager), _stCoreToken);
    }
}