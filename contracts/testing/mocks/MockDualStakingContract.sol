// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockDualStakingContract
 * @dev Mock contract to simulate dual staking functionality for testing
 */
contract MockDualStakingContract {
    
    event DualStakePerformed(address indexed staker, uint256 coreAmount, uint256 btcAmount);
    
    /**
     * @dev Mock stakeDual function that accepts CORE (as ETH) and BTC amount
     * @param btcAmount Amount of BTC to stake
     */
    function stakeDual(uint256 btcAmount) external payable {
        require(msg.value > 0, "MockDualStaking: CORE amount required");
        require(btcAmount > 0, "MockDualStaking: BTC amount required");
        
        // Just emit an event to show it worked
        emit DualStakePerformed(msg.sender, msg.value, btcAmount);
        
        // In a real contract, this would stake the assets
        // For testing, we just accept them
    }
    
    /**
     * @dev Allow withdrawal of any funds for testing
     */
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * @dev Check contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}