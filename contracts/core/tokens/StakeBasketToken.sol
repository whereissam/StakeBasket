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
    event StakeBasketContractProposed(address indexed newContract, uint256 effectiveTime);
    
    modifier onlyStakeBasket() {
        require(msg.sender == stakeBasketContract, "StakeBasketToken: caller is not the StakeBasket contract");
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {}
    
    // Two-step ownership transfer for enhanced security
    address public pendingStakeBasketContract;
    uint256 public stakeBasketContractSetTime;
    uint256 public constant TIMELOCK_DELAY = 2 days;
    
    /**
     * @dev Propose new StakeBasket contract address (step 1)
     * @param _stakeBasketContract Address of the new StakeBasket contract
     */
    function proposeStakeBasketContract(address _stakeBasketContract) external onlyOwner {
        require(_stakeBasketContract != address(0), "StakeBasketToken: invalid contract address");
        require(_stakeBasketContract != stakeBasketContract, "StakeBasketToken: same contract address");
        
        pendingStakeBasketContract = _stakeBasketContract;
        stakeBasketContractSetTime = block.timestamp + TIMELOCK_DELAY;
        
        emit StakeBasketContractProposed(_stakeBasketContract, stakeBasketContractSetTime);
    }
    
    /**
     * @dev Confirm new StakeBasket contract address (step 2)
     */
    function confirmStakeBasketContract() external onlyOwner {
        require(pendingStakeBasketContract != address(0), "StakeBasketToken: no pending contract");
        require(block.timestamp >= stakeBasketContractSetTime, "StakeBasketToken: timelock not expired");
        
        stakeBasketContract = pendingStakeBasketContract;
        pendingStakeBasketContract = address(0);
        stakeBasketContractSetTime = 0;
        
        emit StakeBasketContractSet(stakeBasketContract);
    }
    
    /**
     * @dev Cancel pending contract change
     */
    function cancelStakeBasketContract() external onlyOwner {
        pendingStakeBasketContract = address(0);
        stakeBasketContractSetTime = 0;
    }
    
    /**
     * @dev Emergency function to set contract immediately (testing only)
     * @param _stakeBasketContract Address of the StakeBasket contract
     */
    function emergencySetStakeBasketContract(address _stakeBasketContract) external onlyOwner {
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