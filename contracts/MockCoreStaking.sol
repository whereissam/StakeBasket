// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockCoreStaking
 * @dev Mock implementation of Core staking for local testing
 * Simulates CORE token delegation to validators with rewards
 */
contract MockCoreStaking is Ownable, ReentrancyGuard {
    IERC20 public immutable coreToken;
    
    struct Validator {
        address validatorAddress;
        uint256 totalDelegated;
        uint256 commissionRate; // Basis points (e.g., 500 = 5%)
        bool isActive;
        uint256 rewardRate; // Annual reward rate in basis points
    }
    
    struct Delegation {
        uint256 amount;
        uint256 lastRewardClaim;
        uint256 pendingRewards;
    }
    
    // Validator registry
    mapping(address => Validator) public validators;
    address[] public validatorList;
    
    // User delegations: delegator => validator => delegation info
    mapping(address => mapping(address => Delegation)) public delegations;
    
    // Total delegated amounts per user
    mapping(address => uint256) public totalDelegatedByUser;
    
    // Simulation parameters
    uint256 public constant ANNUAL_REWARD_RATE = 800; // 8% APY in basis points
    uint256 public constant UNBONDING_PERIOD = 7 days;
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event ValidatorRegistered(address indexed validator, uint256 commissionRate);
    event Delegated(address indexed delegator, address indexed validator, uint256 amount);
    event Undelegated(address indexed delegator, address indexed validator, uint256 amount);
    event RewardsClaimed(address indexed delegator, address indexed validator, uint256 amount);
    
    constructor(address _coreToken, address initialOwner) Ownable(initialOwner) {
        coreToken = IERC20(_coreToken);
        
        // Register some default validators for testing
        _registerValidator(address(0x1111111111111111111111111111111111111111), 500); // 5% commission
        _registerValidator(address(0x2222222222222222222222222222222222222222), 300); // 3% commission
        _registerValidator(address(0x3333333333333333333333333333333333333333), 700); // 7% commission
    }
    
    /**
     * @dev Register a new validator
     */
    function registerValidator(address validator, uint256 commissionRate) external onlyOwner {
        _registerValidator(validator, commissionRate);
    }
    
    function _registerValidator(address validator, uint256 commissionRate) internal {
        require(validator != address(0), "Invalid validator address");
        require(commissionRate <= 2000, "Commission rate too high"); // Max 20%
        require(!validators[validator].isActive, "Validator already registered");
        
        validators[validator] = Validator({
            validatorAddress: validator,
            totalDelegated: 0,
            commissionRate: commissionRate,
            isActive: true,
            rewardRate: ANNUAL_REWARD_RATE
        });
        
        validatorList.push(validator);
        emit ValidatorRegistered(validator, commissionRate);
    }
    
    /**
     * @dev Delegate CORE tokens to a validator
     */
    function delegate(address validator, uint256 amount) external nonReentrant {
        require(validators[validator].isActive, "Validator not active");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer CORE tokens from user
        coreToken.transferFrom(msg.sender, address(this), amount);
        
        // Update delegation
        Delegation storage delegation = delegations[msg.sender][validator];
        
        // Claim any pending rewards first
        if (delegation.amount > 0) {
            _updateRewards(msg.sender, validator);
        }
        
        delegation.amount += amount;
        delegation.lastRewardClaim = block.timestamp;
        
        // Update totals
        validators[validator].totalDelegated += amount;
        totalDelegatedByUser[msg.sender] += amount;
        
        emit Delegated(msg.sender, validator, amount);
    }
    
    /**
     * @dev Undelegate CORE tokens from a validator
     */
    function undelegate(address validator, uint256 amount) external nonReentrant {
        Delegation storage delegation = delegations[msg.sender][validator];
        require(delegation.amount >= amount, "Insufficient delegated amount");
        
        // Update rewards before undelegating
        _updateRewards(msg.sender, validator);
        
        // Update delegation
        delegation.amount -= amount;
        
        // Update totals
        validators[validator].totalDelegated -= amount;
        totalDelegatedByUser[msg.sender] -= amount;
        
        // Transfer tokens back (in real Core, there would be an unbonding period)
        coreToken.transfer(msg.sender, amount);
        
        emit Undelegated(msg.sender, validator, amount);
    }
    
    /**
     * @dev Claim accumulated staking rewards
     */
    function claimRewards(address validator) external nonReentrant returns (uint256) {
        _updateRewards(msg.sender, validator);
        
        Delegation storage delegation = delegations[msg.sender][validator];
        uint256 rewards = delegation.pendingRewards;
        
        if (rewards > 0) {
            delegation.pendingRewards = 0;
            
            // In a real system, rewards would come from inflation
            // For testing, we'll mint new tokens or use a reward pool
            coreToken.transfer(msg.sender, rewards);
            
            emit RewardsClaimed(msg.sender, validator, rewards);
        }
        
        return rewards;
    }
    
    /**
     * @dev Update pending rewards for a delegation
     */
    function _updateRewards(address delegator, address validator) internal {
        Delegation storage delegation = delegations[delegator][validator];
        Validator storage validatorInfo = validators[validator];
        
        if (delegation.amount == 0) return;
        
        uint256 timeElapsed = block.timestamp - delegation.lastRewardClaim;
        if (timeElapsed == 0) return;
        
        // Calculate rewards: amount * rate * time / (365 days * BASIS_POINTS)
        uint256 grossRewards = (delegation.amount * validatorInfo.rewardRate * timeElapsed) / 
                              (365 days * BASIS_POINTS);
        
        // Subtract validator commission
        uint256 commission = (grossRewards * validatorInfo.commissionRate) / BASIS_POINTS;
        uint256 netRewards = grossRewards - commission;
        
        delegation.pendingRewards += netRewards;
        delegation.lastRewardClaim = block.timestamp;
    }
    
    /**
     * @dev Get delegation info for a user and validator
     */
    function getDelegatedAmount(address delegator, address validator) external view returns (uint256) {
        return delegations[delegator][validator].amount;
    }
    
    /**
     * @dev Get current rewards for a delegation (including pending)
     */
    function getRewards(address delegator, address validator) external view returns (uint256) {
        Delegation storage delegation = delegations[delegator][validator];
        Validator storage validatorInfo = validators[validator];
        
        if (delegation.amount == 0) return delegation.pendingRewards;
        
        uint256 timeElapsed = block.timestamp - delegation.lastRewardClaim;
        uint256 grossRewards = (delegation.amount * validatorInfo.rewardRate * timeElapsed) / 
                              (365 days * BASIS_POINTS);
        uint256 commission = (grossRewards * validatorInfo.commissionRate) / BASIS_POINTS;
        uint256 netRewards = grossRewards - commission;
        
        return delegation.pendingRewards + netRewards;
    }
    
    /**
     * @dev Get list of all validators
     */
    function getValidators() external view returns (address[] memory) {
        return validatorList;
    }
    
    /**
     * @dev Get validator info
     */
    function getValidator(address validator) external view returns (
        uint256 totalDelegated,
        uint256 commissionRate,
        bool isActive,
        uint256 rewardRate
    ) {
        Validator storage v = validators[validator];
        return (v.totalDelegated, v.commissionRate, v.isActive, v.rewardRate);
    }
    
    /**
     * @dev Emergency function to fund rewards pool (for testing)
     */
    function fundRewards(uint256 amount) external onlyOwner {
        coreToken.transferFrom(msg.sender, address(this), amount);
    }
}