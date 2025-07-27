// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakeBasketToken
 * @dev ERC-20 token representing shares in the StakeBasket multi-asset ETF
 * Only the StakeBasket contract can mint and burn tokens
 */
contract StakeBasketToken is ERC20, Ownable {
    address public stakeBasketContract;
    
    event StakeBasketContractSet(address indexed newContract);
    
    modifier onlyStakeBasket() {
        require(msg.sender == stakeBasketContract, "StakeBasketToken: caller is not the StakeBasket contract");
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {}
    
    /**
     * @dev Set the StakeBasket contract address that can mint/burn tokens
     * @param _stakeBasketContract Address of the StakeBasket contract
     */
    function setStakeBasketContract(address _stakeBasketContract) external onlyOwner {
        require(_stakeBasketContract != address(0), "StakeBasketToken: invalid contract address");
        stakeBasketContract = _stakeBasketContract;
        emit StakeBasketContractSet(_stakeBasketContract);
    }
    
    /**
     * @dev Mint new ETF tokens to a user
     * @param account Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address account, uint256 amount) external onlyStakeBasket {
        _mint(account, amount);
    }
    
    /**
     * @dev Burn ETF tokens from a user
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address account, uint256 amount) external onlyStakeBasket {
        _burn(account, amount);
    }
}