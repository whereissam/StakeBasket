// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../core/tokens/StakeBasketToken.sol";

/**
 * @title TestHelper
 * @dev Helper contract for testing - allows minting tokens for testing purposes
 */
contract TestHelper {
    StakeBasketToken public basketToken;
    
    constructor(address _basketToken) {
        basketToken = StakeBasketToken(_basketToken);
    }
    
    /**
     * @dev Mint tokens for testing (acts as StakeBasket contract)
     */
    function mint(address account, uint256 amount) external {
        basketToken.mint(account, amount);
    }
}