// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestBTC
 * @dev Simple BTC token for testing on Core Testnet with faucet functionality
 */
contract TestBTC is ERC20, Ownable {
    uint8 private _decimals = 8; // BTC uses 8 decimals
    uint256 public constant FAUCET_AMOUNT = 1 * 10**8; // 1 BTC
    uint256 public constant MAX_BALANCE = 100 * 10**8; // 100 BTC max
    
    mapping(address => uint256) public lastFaucetTime;
    uint256 public constant FAUCET_COOLDOWN = 1 hours; // 1 hour cooldown
    
    event FaucetUsed(address indexed user, uint256 amount);
    
    constructor() ERC20("Test Bitcoin", "testBTC") Ownable(msg.sender) {
        // Mint initial supply to owner for distribution
        _mint(msg.sender, 1000 * 10**8); // 1000 BTC to owner
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Faucet function - users can claim test BTC tokens
     */
    function faucet() external {
        require(balanceOf(msg.sender) < MAX_BALANCE, "Already has enough tokens");
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "Faucet cooldown active"
        );
        
        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetUsed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev Owner can mint tokens to any address for testing
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Check if user can use faucet
     */
    function canUseFaucet(address user) external view returns (bool) {
        return balanceOf(user) < MAX_BALANCE && 
               block.timestamp >= lastFaucetTime[user] + FAUCET_COOLDOWN;
    }
    
    /**
     * @dev Get remaining cooldown time in seconds
     */
    function getRemainingCooldown(address user) external view returns (uint256) {
        if (block.timestamp >= lastFaucetTime[user] + FAUCET_COOLDOWN) {
            return 0;
        }
        return (lastFaucetTime[user] + FAUCET_COOLDOWN) - block.timestamp;
    }
    
    /**
     * @dev Owner can reset user's faucet cooldown for testing
     */
    function resetCooldown(address user) external onlyOwner {
        lastFaucetTime[user] = 0;
    }
    
    /**
     * @dev Owner can burn tokens from any address for testing
     */
    function burnFrom(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}