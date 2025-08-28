// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev Simple ERC20 token for testing with custom decimals and minting
 */
contract MockERC20 is ERC20, Ownable {
    
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 tokenDecimals
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = tokenDecimals;
        
        // Mint initial supply for testing
        _mint(msg.sender, 1000000 * 10**tokenDecimals); // 1M tokens
        
        // Mint tokens to common test addresses for convenience
        address testUser1 = address(0x1111111111111111111111111111111111111111);
        address testUser2 = address(0x2222222222222222222222222222222222222222);
        
        _mint(testUser1, 100000 * 10**tokenDecimals); // 100K tokens
        _mint(testUser2, 100000 * 10**tokenDecimals); // 100K tokens
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mint tokens to any address (for testing)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Mint tokens to caller (public faucet for testing)
     */
    function faucet(uint256 amount) external {
        require(amount <= 10000 * 10**_decimals, "MockERC20: faucet limit exceeded");
        _mint(msg.sender, amount);
    }
    
    /**
     * @dev Burn tokens from caller
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}