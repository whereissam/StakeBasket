// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleToken
 * @dev Simple ERC20 token without timelock - for immediate testing
 */
contract SimpleToken is ERC20, Ownable {
    address public authorizedMinter;
    
    modifier onlyMinter() {
        require(msg.sender == authorizedMinter, "SimpleToken: not authorized");
        _;
    }
    
    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol) 
        Ownable(msg.sender) 
    {}
    
    function setAuthorizedMinter(address _minter) external onlyOwner {
        authorizedMinter = _minter;
    }
    
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external onlyMinter {
        _burn(from, amount);
    }
}