// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleBasketToken
 * @dev Clean ERC20 token for staking shares
 */
contract SimpleBasketToken is ERC20, Ownable {
    address public minter;
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {}
    
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }
    
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        _burn(from, amount);
    }
}