// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ISparks
 * @dev Interface for CoreDAO's Sparks point system integration
 * This interface defines the expected functions for interacting with CoreDAO's Sparks system
 */
interface ISparks {
    /**
     * @dev Emitted when Sparks points are awarded to a user
     * @param user The address that received the points
     * @param amount The amount of Sparks points awarded
     * @param reason The reason for the points (e.g., "BASKET_HOLD", "STAKING_DEPOSIT")
     */
    event SparksAwarded(address indexed user, uint256 amount, string reason);

    /**
     * @dev Emitted when Sparks points are spent by a user
     * @param user The address that spent the points
     * @param amount The amount of Sparks points spent
     * @param reason The reason for spending (e.g., "FEE_REDUCTION", "EXCLUSIVE_ACCESS")
     */
    event SparksSpent(address indexed user, uint256 amount, string reason);

    /**
     * @dev Award Sparks points to a user
     * @param user The address to award points to
     * @param amount The amount of points to award
     * @param reason The reason for awarding points
     */
    function awardSparks(address user, uint256 amount, string calldata reason) external;

    /**
     * @dev Spend Sparks points from a user's balance
     * @param user The address to spend points from
     * @param amount The amount of points to spend
     * @param reason The reason for spending points
     * @return success Whether the spending was successful
     */
    function spendSparks(address user, uint256 amount, string calldata reason) external returns (bool success);

    /**
     * @dev Get the Sparks balance of a user
     * @param user The address to check
     * @return balance The user's Sparks balance
     */
    function getSparksBalance(address user) external view returns (uint256 balance);

    /**
     * @dev Get the total Sparks earned by a user (lifetime)
     * @param user The address to check
     * @return totalEarned The total Sparks earned by the user
     */
    function getTotalSparksEarned(address user) external view returns (uint256 totalEarned);

    /**
     * @dev Check if a user has enough Sparks for a specific action
     * @param user The address to check
     * @param requiredAmount The amount of Sparks required
     * @return hasEnough Whether the user has enough Sparks
     */
    function hasEnoughSparks(address user, uint256 requiredAmount) external view returns (bool hasEnough);

    /**
     * @dev Get the current earning rate for Sparks (points per token per day)
     * @return rate The current earning rate
     */
    function getCurrentEarningRate() external view returns (uint256 rate);

    /**
     * @dev Get user's Sparks earning history
     * @param user The address to check
     * @param offset The starting index for pagination
     * @param limit The number of records to return
     * @return history Array of earning records
     */
    function getSparksHistory(address user, uint256 offset, uint256 limit) 
        external view returns (SparksRecord[] memory history);
}

/**
 * @dev Structure for Sparks earning/spending records
 */
struct SparksRecord {
    uint256 timestamp;
    uint256 amount;
    string reason;
    bool isEarning; // true for earning, false for spending
}