// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockCORE
 * @dev Mock CORE token for testing
 */
contract MockCORE is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Core", "CORE") Ownable(initialOwner) {
        // Mint initial supply for testing
        _mint(initialOwner, 1000000 * 10**decimals()); // 1M CORE
    }
    
    /**
     * @dev Mint tokens (for testing purposes)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Faucet function - anyone can mint small amounts for testing
     */
    function faucet() external {
        require(balanceOf(msg.sender) < 1000 * 10**decimals(), "Already has enough tokens");
        _mint(msg.sender, 100 * 10**decimals()); // Mint 100 CORE
    }
}

/**
 * @title MockCoreBTC
 * @dev Mock coreBTC token for testing (bridged Bitcoin on Core)
 */
contract MockCoreBTC is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Core Bitcoin", "coreBTC") Ownable(initialOwner) {
        // Mint initial supply for testing
        _mint(initialOwner, 1000 * 10**decimals()); // 1000 coreBTC (8 decimals like Bitcoin)
    }
    
    /**
     * @dev Mint tokens (for testing purposes)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Faucet function - anyone can mint small amounts for testing
     */
    function faucet() external {
        require(balanceOf(msg.sender) < 10 * 10**decimals(), "Already has enough tokens");
        _mint(msg.sender, 1 * 10**decimals()); // Mint 1 coreBTC
    }
    
    /**
     * @dev Override decimals to match Bitcoin (8 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 8;
    }
}