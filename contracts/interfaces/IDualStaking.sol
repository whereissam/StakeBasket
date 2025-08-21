// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDualStaking
 * @dev Interface for CoreDAO Dual Staking functionality
 * Support both native CORE staking and dual CORE+BTC staking
 */
interface IDualStaking {
    // Native CORE staking functions
    function stakeCORE(uint256 amount) external payable;
    function unstakeCORE(uint256 amount) external;
    
    // BTC token staking functions
    function stakeBTC(uint256 amount) external;
    function unstakeBTC(uint256 amount) external;
    
    // Combined dual staking function (CORE + BTC together for tier benefits)
    function stakeDual(uint256 btcAmount) external payable;
    function unstakeDual(uint256 shares) external;
    
    // Reward functions
    function claimRewards() external returns (uint256);
    function claimCoreRewards() external returns (uint256);
    function claimBtcRewards() external returns (uint256);
    
    // View functions
    function getUserStake(address user) external view returns (uint256 btcAmount, uint256 coreAmount);
    function getTierRewards(address user) external view returns (uint256 tier, uint256 apy);
    function getCurrentTier(address user) external view returns (uint256);
    function getUserRatio(address user) external view returns (uint256);
    function calculateTier(uint256 coreAmount, uint256 btcAmount) external pure returns (uint8);
    
    // Pool information
    function getTotalStaked() external view returns (uint256 totalCORE, uint256 totalBTC);
    function getRewardPoolBalance() external view returns (uint256);
}