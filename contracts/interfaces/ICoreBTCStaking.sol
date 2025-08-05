// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICoreBTCStaking
 * @dev Interface for CoreDAO Bitcoin staking functionality
 * 
 * This interface defines the standard for Bitcoin staking on CoreDAO,
 * enabling liquid staking derivatives like lstBTC to interact with
 * the underlying Bitcoin validator network.
 */
interface ICoreBTCStaking {
    
    /**
     * @dev Stake coreBTC tokens to a Bitcoin validator
     * @param validator Address of the Bitcoin validator
     * @param amount Amount of coreBTC to stake
     */
    function stake(address validator, uint256 amount) external;
    
    /**
     * @dev Unstake coreBTC tokens from a Bitcoin validator
     * @param validator Address of the Bitcoin validator
     * @param amount Amount of coreBTC to unstake
     */
    function unstake(address validator, uint256 amount) external;
    
    /**
     * @dev Claim staking rewards from a Bitcoin validator
     * @param validator Address of the Bitcoin validator
     * @return rewards Amount of rewards claimed
     */
    function claimRewards(address validator) external returns (uint256 rewards);
    
    /**
     * @dev Get pending rewards for a staker from a validator
     * @param staker Address of the staker
     * @param validator Address of the validator
     * @return rewards Amount of pending rewards
     */
    function getPendingRewards(address staker, address validator) external view returns (uint256 rewards);
    
    /**
     * @dev Get staked amount for a staker with a validator
     * @param staker Address of the staker
     * @param validator Address of the validator
     * @return amount Amount staked
     */
    function getStakedAmount(address staker, address validator) external view returns (uint256 amount);
    
    /**
     * @dev Get validator information
     * @param validator Address of the validator
     * @return isActive Whether validator is active
     * @return commission Validator commission rate (basis points)
     * @return totalStaked Total amount staked with validator
     * @return rewardRate Current reward rate (basis points)
     */
    function getValidatorInfo(address validator) 
        external 
        view 
        returns (
            bool isActive,
            uint256 commission,
            uint256 totalStaked,
            uint256 rewardRate
        );
    
    /**
     * @dev Get all active Bitcoin validators
     * @return validators Array of active validator addresses
     */
    function getActiveValidators() external view returns (address[] memory validators);
    
    /**
     * @dev Get total staked coreBTC across all validators
     * @return totalStaked Total amount of coreBTC staked
     */
    function getTotalStaked() external view returns (uint256 totalStaked);
    
    /**
     * @dev Get current Bitcoin staking APY
     * @return apy Annual percentage yield in basis points
     */
    function getCurrentAPY() external view returns (uint256 apy);
    
    /**
     * @dev Check if validator is accepting new stakes
     * @param validator Address of the validator
     * @return accepting Whether validator is accepting stakes
     */
    function isValidatorAcceptingStakes(address validator) external view returns (bool accepting);
}