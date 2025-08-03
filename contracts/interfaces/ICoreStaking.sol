// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICoreStaking
 * @dev Interface for CoreDAO staking functionality
 */
interface ICoreStaking {
    function delegate(address validator) external payable;
    function undelegate(address validator, uint256 amount) external;
    function redelegate(address fromValidator, address toValidator, uint256 amount) external;
    function claimReward(address validator) external returns (uint256);
    function getDelegatedAmount(address delegator, address validator) external view returns (uint256);
    function getRewards(address delegator, address validator) external view returns (uint256);
    function getAllValidatorAddresses() external view returns (address[] memory);
    function getValidatorInfo(address validator) external view returns (
        uint256 delegatedCore,
        uint256 commissionRate,
        uint256 hybridScore,
        bool isActive
    );
    function getValidatorEffectiveAPY(address validator) external view returns (uint256);
    function getValidatorRiskScore(address validator) external view returns (uint256);
}