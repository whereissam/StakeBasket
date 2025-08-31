// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OptimizedContractFactory
 * @dev Minimal factory that deploys contracts using CREATE2 for deterministic addresses
 * Reduces bytecode by removing embedded contract constructors
 */
contract OptimizedContractFactory is Ownable {
    
    struct DeploymentData {
        address stakeBasketToken;
        address priceFeed;
        address unbondingQueue;
        address coreLiquidStakingManager;
        bool isDeployed;
    }

    DeploymentData public deployment;
    
    event ContractDeployed(bytes32 indexed salt, address indexed contractAddress, string contractType);
    event SystemDeployed(address indexed owner, uint256 timestamp);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Deploy contract using CREATE2 with bytecode
     */
    function deployContract(
        bytes memory bytecode,
        bytes32 salt,
        string memory contractType
    ) external onlyOwner returns (address) {
        address deployed;
        assembly {
            deployed := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(deployed != address(0), "Deployment failed");
        
        emit ContractDeployed(salt, deployed, contractType);
        return deployed;
    }
    
    /**
     * @dev Register deployed contracts
     */
    function registerDeployment(
        address _stakeBasketToken,
        address _priceFeed,
        address _unbondingQueue,
        address _coreLiquidStakingManager
    ) external onlyOwner {
        deployment = DeploymentData({
            stakeBasketToken: _stakeBasketToken,
            priceFeed: _priceFeed,
            unbondingQueue: _unbondingQueue,
            coreLiquidStakingManager: _coreLiquidStakingManager,
            isDeployed: true
        });
        
        emit SystemDeployed(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get deployed addresses
     */
    function getDeployedAddresses() external view returns (
        address stakeBasketToken,
        address priceFeed,
        address unbondingQueue,
        address coreLiquidStakingManager
    ) {
        require(deployment.isDeployed, "System not deployed");
        return (
            deployment.stakeBasketToken,
            deployment.priceFeed,
            deployment.unbondingQueue,
            deployment.coreLiquidStakingManager
        );
    }
    
    /**
     * @dev Calculate deterministic address
     */
    function getAddress(bytes memory bytecode, bytes32 salt) external view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        )))));
    }
}