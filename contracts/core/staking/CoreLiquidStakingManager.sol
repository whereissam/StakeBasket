// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StCoreToken.sol";
import "./interfaces/ICoreStaking.sol";
import "./UnbondingQueue.sol";

/**
 * @title Core Liquid Staking Manager
 * @dev Main contract for liquid staking of CORE tokens using CoreDAO's staking protocol
 * Integrates with CoreDAO's Earn.sol contract for automated validator rebalancing
 */
contract CoreLiquidStakingManager is Ownable, ReentrancyGuard, Pausable {
    
    // State variables
    StCoreToken public stCoreToken;
    ICoreStaking public coreStakingContract;
    UnbondingQueue public unbondingQueue;
    
    // Validator management
    address[] public activeValidators;
    mapping(address => uint256) public delegatedAmountByValidator;
    mapping(address => bool) public isActiveValidator;
    
    // Rebalancing parameters
    uint256 public rebalanceThreshold = 500; // 5% in basis points
    uint256 public maxValidatorRisk = 600; // Max risk score for validators
    uint256 public minValidatorCount = 3; // Minimum validators to delegate to
    
    // Protocol parameters
    uint256 public unstakingPeriod = 7 days; // Time to wait for unstaking
    uint256 public protocolFee = 50; // 0.5% protocol fee in basis points
    uint256 public performanceFee = 1000; // 10% performance fee in basis points
    
    // Treasury and operator
    address public treasury;
    address public operator;
    
    // Unstaking requests
    struct UnstakeRequest {
        address user;
        uint256 stCoreAmount;
        uint256 coreAmount;
        uint256 requestTime;
        bool fulfilled;
    }
    
    mapping(uint256 => UnstakeRequest) public unstakeRequests;
    uint256 public nextUnstakeRequestId;
    
    // Events
    event Staked(address indexed user, uint256 coreAmount, uint256 stCoreAmount);
    event UnstakeRequested(address indexed user, uint256 requestId, uint256 stCoreAmount, uint256 coreAmount);
    event Unstaked(address indexed user, uint256 requestId, uint256 coreAmount);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event Rebalanced(address[] fromValidators, uint256[] fromAmounts, address[] toValidators, uint256[] toAmounts);
    event RewardsCollected(uint256 totalRewards, uint256 protocolFees, uint256 performanceFees);
    event ParameterUpdated(string param, uint256 oldValue, uint256 newValue);
    
    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "CoreLiquidStaking: not operator");
        _;
    }
    
    constructor(
        address _coreStakingContract,
        address _treasury,
        address _operator,
        address _unbondingQueue,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_coreStakingContract != address(0), "CoreLiquidStaking: invalid core staking contract");
        require(_treasury != address(0), "CoreLiquidStaking: invalid treasury");
        require(_operator != address(0), "CoreLiquidStaking: invalid operator");
        
        coreStakingContract = ICoreStaking(_coreStakingContract);
        treasury = _treasury;
        operator = _operator;
        
        // Deploy stCORE token with this contract as owner initially
        stCoreToken = new StCoreToken(address(this));
        stCoreToken.setLiquidStakingManager(address(this));
        
        // Transfer ownership to initialOwner
        stCoreToken.transferOwnership(initialOwner);
        
        // Set unbonding queue if provided
        if (_unbondingQueue != address(0)) {
            unbondingQueue = UnbondingQueue(_unbondingQueue);
        }
    }
    
    /**
     * @dev Stake CORE tokens and receive stCORE
     * @param validator Preferred validator address (optional, can be zero address)
     */
    function stake(address validator) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "CoreLiquidStaking: stake amount must be positive");
        
        uint256 coreAmount = msg.value;
        
        // Select validator if not provided or invalid
        if (validator == address(0) || !isActiveValidator[validator]) {
            validator = selectOptimalValidator();
        }
        
        require(validator != address(0), "CoreLiquidStaking: no active validators");
        
        // Delegate to CoreDAO staking contract
        coreStakingContract.delegate{value: coreAmount}(validator);
        
        // Update internal tracking
        delegatedAmountByValidator[validator] += coreAmount;
        
        // Mint stCORE tokens to user
        uint256 stCoreAmount = stCoreToken.mint(msg.sender, coreAmount);
        
        emit Staked(msg.sender, coreAmount, stCoreAmount);
    }
    
    /**
     * @dev Request unstaking of stCORE tokens
     * @param stCoreAmount Amount of stCORE to unstake
     */
    function requestUnstake(uint256 stCoreAmount) external nonReentrant whenNotPaused {
        require(stCoreAmount > 0, "CoreLiquidStaking: unstake amount must be positive");
        require(stCoreToken.balanceOf(msg.sender) >= stCoreAmount, "CoreLiquidStaking: insufficient stCORE balance");
        
        // Calculate CORE amount to return
        uint256 coreAmount = stCoreToken.stCoreToCore(stCoreAmount);
        
        // Transfer stCORE to this contract (will be burned later)
        stCoreToken.transferFrom(msg.sender, address(this), stCoreAmount);
        
        // Use UnbondingQueue if available, otherwise use internal queue
        if (address(unbondingQueue) != address(0)) {
            uint256 requestId = unbondingQueue.requestUnbonding(msg.sender, coreAmount, "CORE");
            emit UnstakeRequested(msg.sender, requestId, stCoreAmount, coreAmount);
        } else {
            // Fallback to internal queue
            uint256 requestId = nextUnstakeRequestId++;
            unstakeRequests[requestId] = UnstakeRequest({
                user: msg.sender,
                stCoreAmount: stCoreAmount,
                coreAmount: coreAmount,
                requestTime: block.timestamp,
                fulfilled: false
            });
            emit UnstakeRequested(msg.sender, requestId, stCoreAmount, coreAmount);
        }
    }
    
    /**
     * @dev Fulfill unstake request after unstaking period
     * @param requestId ID of the unstake request
     */
    function fulfillUnstake(uint256 requestId) external nonReentrant {
        UnstakeRequest storage request = unstakeRequests[requestId];
        require(!request.fulfilled, "CoreLiquidStaking: request already fulfilled");
        require(block.timestamp >= request.requestTime + unstakingPeriod, "CoreLiquidStaking: unstaking period not elapsed");
        
        // Mark as fulfilled
        request.fulfilled = true;
        
        // Burn stCORE tokens
        stCoreToken.burn(address(this), request.stCoreAmount);
        
        // Transfer CORE to user
        payable(request.user).transfer(request.coreAmount);
        
        emit Unstaked(request.user, requestId, request.coreAmount);
    }
    
    /**
     * @dev Automated rebalancing function (similar to CoreDAO's rebalance())
     * Redistributes stake across validators to optimize yield and reduce risk
     */
    function rebalance() external onlyOperator {
        require(activeValidators.length >= minValidatorCount, "CoreLiquidStaking: insufficient validators");
        
        // Get optimal validator distribution
        (address[] memory optimalValidators, uint256[] memory targetAllocations) = getOptimalValidatorDistribution();
        
        // Calculate current total delegated
        uint256 totalDelegated = getTotalDelegated();
        
        // Arrays for rebalancing
        address[] memory fromValidators = new address[](activeValidators.length);
        uint256[] memory fromAmounts = new uint256[](activeValidators.length);
        address[] memory toValidators = new address[](optimalValidators.length);
        uint256[] memory toAmounts = new uint256[](optimalValidators.length);
        
        uint256 fromCount = 0;
        uint256 toCount = 0;
        
        // Calculate rebalancing moves
        for (uint256 i = 0; i < activeValidators.length; i++) {
            address validator = activeValidators[i];
            uint256 currentAmount = delegatedAmountByValidator[validator];
            uint256 targetAmount = 0;
            
            // Find target amount for this validator
            for (uint256 j = 0; j < optimalValidators.length; j++) {
                if (optimalValidators[j] == validator) {
                    targetAmount = (totalDelegated * targetAllocations[j]) / 10000;
                    break;
                }
            }
            
            if (currentAmount > targetAmount) {
                // Need to move stake away from this validator
                uint256 excessAmount = currentAmount - targetAmount;
                if (excessAmount > 0) {
                    fromValidators[fromCount] = validator;
                    fromAmounts[fromCount] = excessAmount;
                    fromCount++;
                }
            }
        }
        
        // Find validators that need more stake
        for (uint256 i = 0; i < optimalValidators.length; i++) {
            address validator = optimalValidators[i];
            uint256 currentAmount = delegatedAmountByValidator[validator];
            uint256 targetAmount = (totalDelegated * targetAllocations[i]) / 10000;
            
            if (targetAmount > currentAmount) {
                uint256 neededAmount = targetAmount - currentAmount;
                if (neededAmount > 0) {
                    toValidators[toCount] = validator;
                    toAmounts[toCount] = neededAmount;
                    toCount++;
                }
            }
        }
        
        // Execute rebalancing via redelegate
        for (uint256 i = 0; i < fromCount && i < toCount; i++) {
            if (fromAmounts[i] > 0 && toAmounts[i] > 0) {
                uint256 amount = fromAmounts[i] < toAmounts[i] ? fromAmounts[i] : toAmounts[i];
                
                coreStakingContract.redelegate(fromValidators[i], toValidators[i], amount);
                
                // Update internal tracking
                delegatedAmountByValidator[fromValidators[i]] -= amount;
                delegatedAmountByValidator[toValidators[i]] += amount;
            }
        }
        
        emit Rebalanced(fromValidators, fromAmounts, toValidators, toAmounts);
    }
    
    /**
     * @dev Manual rebalancing function (similar to CoreDAO's manualRebalance())
     * @param fromValidator Validator to move stake from
     * @param toValidator Validator to move stake to
     * @param amount Amount to move
     */
    function manualRebalance(address fromValidator, address toValidator, uint256 amount) 
        external 
        onlyOperator 
    {
        require(isActiveValidator[fromValidator], "CoreLiquidStaking: invalid from validator");
        require(isActiveValidator[toValidator], "CoreLiquidStaking: invalid to validator");
        require(delegatedAmountByValidator[fromValidator] >= amount, "CoreLiquidStaking: insufficient delegation");
        
        // Execute redelegate
        coreStakingContract.redelegate(fromValidator, toValidator, amount);
        
        // Update internal tracking
        delegatedAmountByValidator[fromValidator] -= amount;
        delegatedAmountByValidator[toValidator] += amount;
        
        address[] memory fromValidators = new address[](1);
        uint256[] memory fromAmounts = new uint256[](1);
        address[] memory toValidators = new address[](1);
        uint256[] memory toAmounts = new uint256[](1);
        
        fromValidators[0] = fromValidator;
        fromAmounts[0] = amount;
        toValidators[0] = toValidator;
        toAmounts[0] = amount;
        
        emit Rebalanced(fromValidators, fromAmounts, toValidators, toAmounts);
    }
    
    /**
     * @dev Daily reward collection and compounding (similar to CoreDAO's afterTurnRound())
     * Collects rewards, compounds them, and updates conversion ratio
     */
    function afterTurnRound() external onlyOperator {
        uint256 totalRewardsBefore = address(this).balance;
        
        // Collect rewards from all validators
        for (uint256 i = 0; i < activeValidators.length; i++) {
            address validator = activeValidators[i];
            if (delegatedAmountByValidator[validator] > 0) {
                try coreStakingContract.claimReward(validator) {
                    // Rewards claimed successfully
                } catch {
                    // Continue with other validators if one fails
                }
            }
        }
        
        uint256 totalRewards = address(this).balance - totalRewardsBefore;
        
        if (totalRewards > 0) {
            // Calculate fees
            uint256 protocolFees = (totalRewards * protocolFee) / 10000;
            uint256 performanceFees = (totalRewards * performanceFee) / 10000;
            uint256 totalFees = protocolFees + performanceFees;
            
            // Send fees to treasury
            if (totalFees > 0) {
                payable(treasury).transfer(totalFees);
            }
            
            // Compound remaining rewards
            uint256 compoundAmount = totalRewards - totalFees;
            if (compoundAmount > 0) {
                // Stake rewards with optimal validator
                address optimalValidator = selectOptimalValidator();
                if (optimalValidator != address(0)) {
                    coreStakingContract.delegate{value: compoundAmount}(optimalValidator);
                    delegatedAmountByValidator[optimalValidator] += compoundAmount;
                }
            }
            
            // Update stCORE conversion ratio
            uint256 newTotalStaked = stCoreToken.totalStakedCore() + compoundAmount;
            stCoreToken.updateTotalStakedCore(newTotalStaked);
            
            emit RewardsCollected(totalRewards, protocolFees, performanceFees);
        }
        
        // Check for inactive/jailed validators and move stake away
        _handleInactiveValidators();
    }
    
    /**
     * @dev Handle inactive or jailed validators by moving stake to active ones
     */
    function _handleInactiveValidators() internal {
        for (uint256 i = 0; i < activeValidators.length; i++) {
            address validator = activeValidators[i];
            uint256 delegatedAmount = delegatedAmountByValidator[validator];
            
            if (delegatedAmount > 0) {
                // Check validator status
                (, , , bool isActive) = coreStakingContract.getValidatorInfo(validator);
                
                if (!isActive) {
                    // Move stake to optimal active validator
                    address optimalValidator = selectOptimalValidator();
                    if (optimalValidator != address(0) && optimalValidator != validator) {
                        coreStakingContract.redelegate(validator, optimalValidator, delegatedAmount);
                        
                        // Update tracking
                        delegatedAmountByValidator[validator] = 0;
                        delegatedAmountByValidator[optimalValidator] += delegatedAmount;
                    }
                }
            }
        }
    }
    
    /**
     * @dev Select optimal validator based on performance metrics
     * @return validator Address of optimal validator
     */
    function selectOptimalValidator() public view returns (address validator) {
        uint256 bestScore = 0;
        address bestValidator = address(0);
        
        for (uint256 i = 0; i < activeValidators.length; i++) {
            address currentValidator = activeValidators[i];
            
            // Check if validator is active
            (, , , bool isActive) = coreStakingContract.getValidatorInfo(currentValidator);
            if (!isActive) continue;
            
            // Check risk score
            uint256 riskScore = coreStakingContract.getValidatorRiskScore(currentValidator);
            if (riskScore >= maxValidatorRisk) continue;
            
            // Calculate performance score (higher APY = better score)
            uint256 apy = coreStakingContract.getValidatorEffectiveAPY(currentValidator);
            uint256 score = apy * 1000 / (riskScore + 1); // Adjust for risk
            
            if (score > bestScore) {
                bestScore = score;
                bestValidator = currentValidator;
            }
        }
        
        return bestValidator;
    }
    
    /**
     * @dev Get optimal validator distribution for rebalancing
     * @return validators Array of optimal validators
     * @return allocations Array of allocation percentages (basis points)
     */
    function getOptimalValidatorDistribution() public view returns (
        address[] memory validators,
        uint256[] memory allocations
    ) {
        // Count active validators with acceptable risk
        uint256 validCount = 0;
        for (uint256 i = 0; i < activeValidators.length; i++) {
            (, , , bool isActive) = coreStakingContract.getValidatorInfo(activeValidators[i]);
            uint256 riskScore = coreStakingContract.getValidatorRiskScore(activeValidators[i]);
            
            if (isActive && riskScore < maxValidatorRisk) {
                validCount++;
            }
        }
        
        if (validCount == 0) {
            return (new address[](0), new uint256[](0));
        }
        
        validators = new address[](validCount);
        allocations = new uint256[](validCount);
        uint256[] memory apyScores = new uint256[](validCount);
        uint256 totalAPYScore = 0;
        uint256 index = 0;
        
        // Collect valid validators and their APY scores
        for (uint256 i = 0; i < activeValidators.length; i++) {
            (, , , bool isActive) = coreStakingContract.getValidatorInfo(activeValidators[i]);
            uint256 riskScore = coreStakingContract.getValidatorRiskScore(activeValidators[i]);
            
            if (isActive && riskScore < maxValidatorRisk) {
                validators[index] = activeValidators[i];
                apyScores[index] = coreStakingContract.getValidatorEffectiveAPY(activeValidators[i]);
                totalAPYScore += apyScores[index];
                index++;
            }
        }
        
        // Calculate allocations based on APY scores
        if (totalAPYScore > 0) {
            for (uint256 i = 0; i < validCount; i++) {
                allocations[i] = (apyScores[i] * 10000) / totalAPYScore;
            }
        } else {
            // Equal allocation if no APY data
            uint256 equalAllocation = 10000 / validCount;
            for (uint256 i = 0; i < validCount; i++) {
                allocations[i] = equalAllocation;
            }
        }
        
        return (validators, allocations);
    }
    
    /**
     * @dev Get total amount delegated across all validators
     * @return total Total delegated amount
     */
    function getTotalDelegated() public view returns (uint256 total) {
        for (uint256 i = 0; i < activeValidators.length; i++) {
            total += delegatedAmountByValidator[activeValidators[i]];
        }
        return total;
    }
    
    /**
     * @dev Add a validator to the active list
     * @param validator Validator address to add
     */
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "CoreLiquidStaking: invalid validator");
        require(!isActiveValidator[validator], "CoreLiquidStaking: validator already active");
        
        activeValidators.push(validator);
        isActiveValidator[validator] = true;
        
        emit ValidatorAdded(validator);
    }
    
    /**
     * @dev Remove a validator from the active list
     * @param validator Validator address to remove
     */
    function removeValidator(address validator) external onlyOwner {
        require(isActiveValidator[validator], "CoreLiquidStaking: validator not active");
        require(delegatedAmountByValidator[validator] == 0, "CoreLiquidStaking: validator has delegations");
        
        // Remove from array
        for (uint256 i = 0; i < activeValidators.length; i++) {
            if (activeValidators[i] == validator) {
                activeValidators[i] = activeValidators[activeValidators.length - 1];
                activeValidators.pop();
                break;
            }
        }
        
        isActiveValidator[validator] = false;
        
        emit ValidatorRemoved(validator);
    }
    
    /**
     * @dev Set protocol parameters
     */
    function setRebalanceThreshold(uint256 _threshold) external onlyOwner {
        emit ParameterUpdated("rebalanceThreshold", rebalanceThreshold, _threshold);
        rebalanceThreshold = _threshold;
    }
    
    function setMaxValidatorRisk(uint256 _maxRisk) external onlyOwner {
        emit ParameterUpdated("maxValidatorRisk", maxValidatorRisk, _maxRisk);
        maxValidatorRisk = _maxRisk;
    }
    
    function setProtocolFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "CoreLiquidStaking: fee too high"); // Max 10%
        emit ParameterUpdated("protocolFee", protocolFee, _fee);
        protocolFee = _fee;
    }
    
    function setPerformanceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 2000, "CoreLiquidStaking: fee too high"); // Max 20%
        emit ParameterUpdated("performanceFee", performanceFee, _fee);
        performanceFee = _fee;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "CoreLiquidStaking: invalid treasury");
        treasury = _treasury;
    }
    
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "CoreLiquidStaking: invalid operator");
        operator = _operator;
    }
    
    /**
     * @dev Set unbonding queue contract
     * @param _unbondingQueue Address of the unbonding queue contract
     */
    function setUnbondingQueue(address _unbondingQueue) external onlyOwner {
        unbondingQueue = UnbondingQueue(_unbondingQueue);
    }
    
    /**
     * @dev Emergency functions
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get contract information
     */
    function getContractInfo() external view returns (
        address stCoreTokenAddress,
        uint256 totalStaked,
        uint256 totalStCoreSupply,
        uint256 conversionRate,
        uint256 validatorCount,
        uint256 totalDelegated
    ) {
        return (
            address(stCoreToken),
            stCoreToken.totalStakedCore(),
            stCoreToken.totalSupply(),
            stCoreToken.getConversionRate(),
            activeValidators.length,
            getTotalDelegated()
        );
    }
    
    /**
     * @dev Receive function to accept CORE rewards
     */
    receive() external payable {}
}