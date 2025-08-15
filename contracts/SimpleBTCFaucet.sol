// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title SimpleBTCFaucet
 * @dev Ultra simple BTC token with unlimited faucet for testing
 */
contract SimpleBTCFaucet is ERC20 {
    uint8 private _decimals = 8; // BTC uses 8 decimals
    uint256 public constant FAUCET_AMOUNT = 1 * 10**8; // 1 BTC per claim
    
    event FaucetUsed(address indexed user, uint256 amount);
    
    constructor() ERC20("Simple Test BTC", "sBTC") {
        // No initial mint - just use faucet
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Simple faucet - anyone can claim anytime
     */
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetUsed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev Claim multiple BTC at once
     */
    function faucetMultiple(uint256 count) external {
        require(count > 0 && count <= 10, "Count must be 1-10");
        uint256 amount = FAUCET_AMOUNT * count;
        _mint(msg.sender, amount);
        emit FaucetUsed(msg.sender, amount);
    }
}