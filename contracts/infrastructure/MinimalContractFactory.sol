// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MinimalContractFactory
 * @dev Lightweight registry for deployed contracts
 * Deployment logic moved to external scripts to reduce bytecode
 */
contract MinimalContractFactory is Ownable {
    
    mapping(string => address) public contracts;
    mapping(address => bool) public isRegistered;
    string[] public contractNames;
    
    event ContractRegistered(string indexed name, address indexed contractAddress);
    event SystemInitialized(address indexed owner, uint256 contractCount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Register a deployed contract
     */
    function registerContract(string memory name, address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        require(!isRegistered[contractAddress], "Already registered");
        
        contracts[name] = contractAddress;
        isRegistered[contractAddress] = true;
        contractNames.push(name);
        
        emit ContractRegistered(name, contractAddress);
    }
    
    /**
     * @dev Get contract address by name
     */
    function getContract(string memory name) external view returns (address) {
        address contractAddr = contracts[name];
        require(contractAddr != address(0), "Contract not found");
        return contractAddr;
    }
    
    /**
     * @dev Get all registered contracts
     */
    function getAllContracts() external view returns (string[] memory names, address[] memory addresses) {
        uint256 length = contractNames.length;
        names = new string[](length);
        addresses = new address[](length);
        
        for (uint i = 0; i < length; i++) {
            names[i] = contractNames[i];
            addresses[i] = contracts[contractNames[i]];
        }
    }
    
    /**
     * @dev Initialize system after all contracts deployed
     */
    function initializeSystem() external onlyOwner {
        require(contractNames.length > 0, "No contracts registered");
        emit SystemInitialized(msg.sender, contractNames.length);
    }
}