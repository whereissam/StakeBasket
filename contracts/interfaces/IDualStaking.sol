// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDualStaking
 * @dev Interface for CoreDAO Dual Staking functionality
 */
interface IDualStaking {
    function stakeBTC(uint256 amount) external;
    function stakeCORE(uint256 amount) external;
    function unstakeBTC(uint256 amount) external;
    function unstakeCORE(uint256 amount) external;
    function claimRewards() external returns (uint256);
    function getUserStake(address user) external view returns (uint256 btcAmount, uint256 coreAmount);
    function getTierRewards(address user) external view returns (uint256 tier, uint256 apy);
    function getCurrentTier(address user) external view returns (uint256);
}