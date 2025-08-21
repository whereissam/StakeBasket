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
        uint256 hybridScore; // Performance/reliability metric (0-1000)
        uint256 lastPenalty; // Timestamp of last penalty/jail
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
    uint256 public constant UNBONDING_PERIOD = 1 days; // Reduced for testing
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event ValidatorRegistered(address indexed validator, uint256 commissionRate);
    event Delegated(address indexed delegator, address indexed validator, uint256 amount);
    event Undelegated(address indexed delegator, address indexed validator, uint256 amount);
    event Redelegated(address indexed delegator, address indexed fromValidator, address indexed toValidator, uint256 amount);
    event RewardsClaimed(address indexed delegator, address indexed validator, uint256 amount);
    event ValidatorStatusChanged(address indexed validator, bool isActive);
    event ValidatorCommissionChanged(address indexed validator, uint256 newRate);
    event ValidatorHybridScoreChanged(address indexed validator, uint256 newScore);
    
    constructor(address _coreToken, address initialOwner) Ownable(initialOwner) {
        coreToken = IERC20(_coreToken);
        
        // Register some default validators for testing
        _registerValidator(address(0x1111111111111111111111111111111111111111), 500, 850); // 5% commission, 85% score
        _registerValidator(address(0x2222222222222222222222222222222222222222), 300, 920); // 3% commission, 92% score
        _registerValidator(address(0x3333333333333333333333333333333333333333), 700, 750); // 7% commission, 75% score
    }
    
    /**
     * @dev Register a new validator
     */
    function registerValidator(address validator, uint256 commissionRate, uint256 hybridScore) external onlyOwner {
        _registerValidator(validator, commissionRate, hybridScore);
    }
    
    function _registerValidator(address validator, uint256 commissionRate, uint256 hybridScore) internal {
        require(validator != address(0), "Invalid validator address");
        require(commissionRate <= 2000, "Commission rate too high"); // Max 20%
        require(hybridScore <= 1000, "Hybrid score too high"); // Max 100%
        require(validators[validator].validatorAddress == address(0), "Validator already exists");
        
        validators[validator] = Validator({
            validatorAddress: validator,
            totalDelegated: 0,
            commissionRate: commissionRate,
            isActive: true,
            rewardRate: ANNUAL_REWARD_RATE,
            hybridScore: hybridScore,
            lastPenalty: 0
        });
        
        validatorList.push(validator);
        emit ValidatorRegistered(validator, commissionRate);
    }
    
    /**
     * @dev Delegate CORE tokens to a validator (public interface)
     */
    function delegate(address validator) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        _delegate(msg.sender, validator, msg.value);
    }
    
    /**
     * @dev Delegate CORE tokens to a validator with amount parameter (legacy)
     */
    function delegate(address validator, uint256 amount) external nonReentrant {
        _delegate(msg.sender, validator, amount);
    }
    
    /**
     * @dev Internal delegate function that can be called by proxy contracts
     */
    function _delegate(address delegator, address validator, uint256 amount) internal {
        require(validators[validator].isActive, "Validator not active");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer CORE tokens from delegator (if not ETH payment)
        if (msg.value == 0 && address(coreToken) != address(0)) {
            coreToken.transferFrom(delegator, address(this), amount);
        }
        
        // Update delegation
        Delegation storage delegation = delegations[delegator][validator];
        
        // Claim any pending rewards first
        if (delegation.amount > 0) {
            _updateRewards(delegator, validator);
        }
        
        delegation.amount += amount;
        delegation.lastRewardClaim = block.timestamp;
        
        // Update totals
        validators[validator].totalDelegated += amount;
        totalDelegatedByUser[delegator] += amount;
        
        emit Delegated(delegator, validator, amount);
    }
    
    /**
     * @dev Undelegate CORE tokens from a validator (public interface)
     */
    function undelegate(address validator, uint256 amount) external nonReentrant {
        _undelegate(msg.sender, validator, amount);
    }
    
    /**
     * @dev Internal undelegate function that can be called by proxy contracts
     */
    function _undelegate(address delegator, address validator, uint256 amount) internal {
        Delegation storage delegation = delegations[delegator][validator];
        require(delegation.amount >= amount, "Insufficient delegated amount");
        
        // Update rewards before undelegating
        _updateRewards(delegator, validator);
        
        // Update delegation
        delegation.amount -= amount;
        
        // Update totals
        validators[validator].totalDelegated -= amount;
        totalDelegatedByUser[delegator] -= amount;
        
        // Transfer tokens back (in real Core, there would be an unbonding period)
        if (address(coreToken) != address(0)) {
            coreToken.transfer(delegator, amount);
        } else {
            // Transfer ETH back
            payable(delegator).transfer(amount);
        }
        
        emit Undelegated(delegator, validator, amount);
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
            if (address(coreToken) != address(0)) {
                coreToken.transfer(msg.sender, rewards);
            } else {
                // Transfer ETH rewards
                payable(msg.sender).transfer(rewards);
            }
            
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
        // Adjust for hybrid score (performance multiplier)
        uint256 grossRewards = (delegation.amount * validatorInfo.rewardRate * timeElapsed * validatorInfo.hybridScore) / 
                              (365 days * BASIS_POINTS * 1000);
        
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
        uint256 grossRewards = (delegation.amount * validatorInfo.rewardRate * timeElapsed * validatorInfo.hybridScore) / 
                              (365 days * BASIS_POINTS * 1000);
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
     * @dev Redelegate CORE tokens from one validator to another
     */
    function redelegate(address fromValidator, address toValidator, uint256 amount) external nonReentrant {
        require(validators[fromValidator].isActive || validators[fromValidator].validatorAddress != address(0), "From validator not found");
        require(validators[toValidator].isActive, "To validator not active");
        require(amount > 0, "Amount must be greater than 0");
        
        Delegation storage fromDelegation = delegations[msg.sender][fromValidator];
        require(fromDelegation.amount >= amount, "Insufficient delegated amount");
        
        // Update rewards for both validators
        _updateRewards(msg.sender, fromValidator);
        if (delegations[msg.sender][toValidator].amount > 0) {
            _updateRewards(msg.sender, toValidator);
        }
        
        // Move delegation
        fromDelegation.amount -= amount;
        validators[fromValidator].totalDelegated -= amount;
        
        Delegation storage toDelegation = delegations[msg.sender][toValidator];
        toDelegation.amount += amount;
        toDelegation.lastRewardClaim = block.timestamp;
        validators[toValidator].totalDelegated += amount;
        
        emit Redelegated(msg.sender, fromValidator, toValidator, amount);
    }
    
    /**
     * @dev Get all validator addresses
     */
    function getAllValidatorAddresses() external view returns (address[] memory) {
        return validatorList;
    }
    
    /**
     * @dev Get validator info with extended details
     */
    function getValidatorInfo(address validator) external view returns (
        uint256 delegatedCore,
        uint256 commissionRate,
        uint256 hybridScore,
        bool isActive
    ) {
        Validator storage v = validators[validator];
        return (v.totalDelegated, v.commissionRate, v.hybridScore, v.isActive);
    }
    
    /**
     * @dev Get validator info (legacy function for backward compatibility)
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
    
    // Admin functions for testing validator state changes
    
    /**
     * @dev Set validator status (for testing scenarios)
     */
    function setValidatorStatus(address validator, bool isActive) external onlyOwner {
        require(validators[validator].validatorAddress != address(0), "Validator not registered");
        validators[validator].isActive = isActive;
        if (!isActive) {
            validators[validator].lastPenalty = block.timestamp;
        }
        emit ValidatorStatusChanged(validator, isActive);
    }
    
    /**
     * @dev Set validator commission rate (for testing scenarios)
     */
    function setValidatorCommission(address validator, uint256 newRate) external onlyOwner {
        require(validators[validator].validatorAddress != address(0), "Validator not registered");
        require(newRate <= 2000, "Commission rate too high");
        validators[validator].commissionRate = newRate;
        emit ValidatorCommissionChanged(validator, newRate);
    }
    
    /**
     * @dev Set validator hybrid score (for testing scenarios)
     */
    function setValidatorHybridScore(address validator, uint256 newScore) external onlyOwner {
        require(validators[validator].validatorAddress != address(0), "Validator not registered");
        require(newScore <= 1000, "Hybrid score too high");
        validators[validator].hybridScore = newScore;
        emit ValidatorHybridScoreChanged(validator, newScore);
    }
    
    /**
     * @dev Emergency function to fund rewards pool (for testing)
     */
    function fundRewards(uint256 amount) external payable onlyOwner {
        if (msg.value > 0) {
            // ETH funding
            require(msg.value == amount, "Amount mismatch");
        } else if (address(coreToken) != address(0)) {
            // Token funding
            coreToken.transferFrom(msg.sender, address(this), amount);
        }
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
    
    /**
     * @dev Calculate effective APY for a validator (for rebalancing decisions)
     */
    function getValidatorEffectiveAPY(address validator) external view returns (uint256) {
        Validator storage v = validators[validator];
        if (!v.isActive) return 0;
        
        // Base APY adjusted for commission and hybrid score
        uint256 baseAPY = ANNUAL_REWARD_RATE; // 8% = 800 basis points
        uint256 afterCommission = baseAPY - ((baseAPY * v.commissionRate) / BASIS_POINTS);
        uint256 effectiveAPY = (afterCommission * v.hybridScore) / 1000;
        
        return effectiveAPY;
    }
    
    /**
     * @dev Get validator risk score (higher = riskier)
     */
    function getValidatorRiskScore(address validator) external view returns (uint256) {
        Validator storage v = validators[validator];
        
        if (!v.isActive) return 1000; // Maximum risk
        if (v.hybridScore < 500) return 600; // High risk
        if (v.hybridScore < 700) return 400; // Medium risk
        if (v.hybridScore < 850) return 200; // Low risk
        return 100; // Very low risk
    }
    
    /**
     * @dev Delegate on behalf of another address (for proxy contracts)
     */
    function delegateFor(address delegator, address validator, uint256 amount) external nonReentrant {
        // Only allow authorized proxy contracts to call this
        require(msg.sender != delegator, "Use regular delegate function");
        _delegate(delegator, validator, amount);
    }
    
    /**
     * @dev Undelegate on behalf of another address (for proxy contracts)
     */
    function undelegateFor(address delegator, address validator, uint256 amount) external nonReentrant {
        // Only allow authorized proxy contracts to call this
        require(msg.sender != delegator, "Use regular undelegate function");
        _undelegate(delegator, validator, amount);
    }
}