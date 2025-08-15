// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ICoreStaking.sol";
import "./interfaces/ILstBTC.sol";


/**
 * @title StakingManager
 * @dev Handles external staking interactions for CORE and lstBTC
 * Only the StakeBasket contract can call these functions
 */
contract StakingManager is Ownable, ReentrancyGuard {
    // State variables
    address public immutable stakeBasketContract;
    ICoreStaking public coreStakingContract;
    ILstBTC public lstBTCContract;
    IERC20 public coreBTCContract;
    IERC20 public coreToken; // Added CORE token interface
    
    // Validator management
    address[] public activeCoreValidators;
    mapping(address => uint256) public delegatedCoreByValidator;
    mapping(address => bool) public isActiveValidator;
    mapping(address => uint256) public stakedLstBTC;
    
    // Rebalancing parameters
    uint256 public rebalanceThresholdAPY = 50; // 0.5% APY difference threshold
    uint256 public rebalanceThresholdRisk = 600; // Risk score threshold
    address public automationBot; // Authorized bot for automated rebalancing
    
    // Events
    event CoreDelegated(address indexed validator, uint256 amount);
    event CoreUndelegated(address indexed validator, uint256 amount);
    event CoreRedelegated(address indexed fromValidator, address indexed toValidator, uint256 amount);
    event CoreRewardsClaimed(address indexed validator, uint256 amount);
    event LstBTCMinted(uint256 coreBTCAmount, uint256 lstBTCAmount);
    event LstBTCRedeemed(uint256 lstBTCAmount, uint256 coreBTCAmount);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event CoreStakingRebalanced(
        address[] undelegatedFrom,
        uint256[] undelegatedAmounts,
        address[] delegatedTo,
        uint256[] delegatedAmounts
    );
    event AutomationBotSet(address indexed newBot);
    event RebalanceThresholdsUpdated(uint256 apyThreshold, uint256 riskThreshold);
    
    modifier onlyStakeBasket() {
        require(msg.sender == stakeBasketContract, "StakingManager: caller is not StakeBasket contract");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || msg.sender == automationBot || msg.sender == stakeBasketContract,
            "StakingManager: caller not authorized"
        );
        _;
    }
    
    constructor(
        address _stakeBasketContract,
        address _coreStakingContract,
        address _lstBTCContract,
        address _coreBTCContract,
        address _coreToken,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_stakeBasketContract != address(0), "StakingManager: invalid StakeBasket contract");
        
        stakeBasketContract = _stakeBasketContract;
        if (_coreStakingContract != address(0)) {
            coreStakingContract = ICoreStaking(_coreStakingContract);
        }
        if (_lstBTCContract != address(0)) {
            lstBTCContract = ILstBTC(_lstBTCContract);
        }
        if (_coreBTCContract != address(0)) {
            coreBTCContract = IERC20(_coreBTCContract);
        }
        if (_coreToken != address(0)) {
            coreToken = IERC20(_coreToken);
        }
    }
    
    /**
     * @dev Delegate CORE tokens to a validator
     * @param validatorAddress Address of the validator
     * @param amount Amount of CORE to delegate
     */
    function delegateCore(address validatorAddress, uint256 amount) 
        external 
        payable
        onlyStakeBasket 
        nonReentrant 
    {
        require(isActiveValidator[validatorAddress], "StakingManager: validator not active");
        require(amount > 0, "StakingManager: amount must be greater than 0");
        
        // Handle CORE delegation - should receive ETH from StakeBasket
        require(msg.value == amount, "StakingManager: ETH amount mismatch");
        
        if (address(coreStakingContract) != address(0)) {
            // Delegate ETH to validator
            coreStakingContract.delegate{value: amount}(validatorAddress);
        }
        
        delegatedCoreByValidator[validatorAddress] += amount;
        emit CoreDelegated(validatorAddress, amount);
    }
    
    /**
     * @dev Undelegate CORE tokens from a validator
     * @param validatorAddress Address of the validator
     * @param amount Amount of CORE to undelegate
     */
    function undelegateCore(address validatorAddress, uint256 amount) 
        external 
        onlyStakeBasket 
        nonReentrant 
    {
        require(amount > 0, "StakingManager: amount must be greater than 0");
        require(
            delegatedCoreByValidator[validatorAddress] >= amount, 
            "StakingManager: insufficient delegated amount"
        );
        
        if (address(coreStakingContract) != address(0)) {
            coreStakingContract.undelegate(validatorAddress, amount);
        }
        
        delegatedCoreByValidator[validatorAddress] -= amount;
        emit CoreUndelegated(validatorAddress, amount);
    }
    
    /**
     * @dev Claim CORE staking rewards from all validators
     * @return totalRewards Total rewards claimed
     */
    function claimCoreRewards() external onlyStakeBasket nonReentrant returns (uint256 totalRewards) {
        for (uint256 i = 0; i < activeCoreValidators.length; i++) {
            address validator = activeCoreValidators[i];
            
            if (address(coreStakingContract) != address(0)) {
                uint256 rewards = coreStakingContract.claimReward(validator);
                totalRewards += rewards;
                
                if (rewards > 0) {
                    emit CoreRewardsClaimed(validator, rewards);
                }
            }
        }
        
        // Transfer claimed rewards to StakeBasket contract
        if (totalRewards > 0) {
            (bool success, ) = payable(stakeBasketContract).call{value: totalRewards}("");
            require(success, "StakingManager: reward transfer failed");
        }
    }
    
    /**
     * @dev Mint lstBTC by depositing coreBTC
     * @param coreBTCAmount Amount of coreBTC to deposit
     * @return lstBTCAmount Amount of lstBTC minted
     */
    function mintLstBTC(uint256 coreBTCAmount) 
        external 
        onlyStakeBasket 
        nonReentrant 
        returns (uint256 lstBTCAmount) 
    {
        require(coreBTCAmount > 0, "StakingManager: amount must be greater than 0");
        require(address(lstBTCContract) != address(0), "StakingManager: lstBTC contract not set");
        
        // Transfer coreBTC from StakeBasket to this contract
        if (address(coreBTCContract) != address(0)) {
            coreBTCContract.transferFrom(stakeBasketContract, address(this), coreBTCAmount);
            coreBTCContract.approve(address(lstBTCContract), coreBTCAmount);
        }
        
        // Mint lstBTC
        lstBTCAmount = lstBTCContract.mint(coreBTCAmount);
        stakedLstBTC[stakeBasketContract] += lstBTCAmount;
        
        // Transfer lstBTC to StakeBasket contract
        IERC20(address(lstBTCContract)).transfer(stakeBasketContract, lstBTCAmount);
        
        emit LstBTCMinted(coreBTCAmount, lstBTCAmount);
    }
    
    /**
     * @dev Redeem lstBTC for coreBTC
     * @param lstBTCAmount Amount of lstBTC to redeem
     * @return coreBTCAmount Amount of coreBTC received
     */
    function redeemLstBTC(uint256 lstBTCAmount) 
        external 
        onlyStakeBasket 
        nonReentrant 
        returns (uint256 coreBTCAmount) 
    {
        require(lstBTCAmount > 0, "StakingManager: amount must be greater than 0");
        require(address(lstBTCContract) != address(0), "StakingManager: lstBTC contract not set");
        require(
            stakedLstBTC[stakeBasketContract] >= lstBTCAmount, 
            "StakingManager: insufficient lstBTC balance"
        );
        
        // Transfer lstBTC from StakeBasket to this contract
        IERC20(address(lstBTCContract)).transferFrom(stakeBasketContract, address(this), lstBTCAmount);
        
        // Redeem lstBTC for coreBTC
        coreBTCAmount = lstBTCContract.redeem(lstBTCAmount);
        stakedLstBTC[stakeBasketContract] -= lstBTCAmount;
        
        // Transfer coreBTC to StakeBasket contract
        if (address(coreBTCContract) != address(0)) {
            coreBTCContract.transfer(stakeBasketContract, coreBTCAmount);
        }
        
        emit LstBTCRedeemed(lstBTCAmount, coreBTCAmount);
    }
    
    /**
     * @dev Get total delegated CORE across all validators
     * @return totalDelegated Total amount of CORE delegated
     */
    function getTotalDelegatedCore() external view returns (uint256 totalDelegated) {
        for (uint256 i = 0; i < activeCoreValidators.length; i++) {
            totalDelegated += delegatedCoreByValidator[activeCoreValidators[i]];
        }
    }
    
    /**
     * @dev Get pending rewards for all validators
     * @return totalRewards Total pending rewards
     */
    function getPendingRewards() external view returns (uint256 totalRewards) {
        if (address(coreStakingContract) == address(0)) return 0;
        
        for (uint256 i = 0; i < activeCoreValidators.length; i++) {
            address validator = activeCoreValidators[i];
            totalRewards += coreStakingContract.getRewards(address(this), validator);
        }
    }
    
    // Admin functions
    
    /**
     * @dev Add a validator to the active list
     * @param validatorAddress Address of the validator to add
     */
    function addCoreValidator(address validatorAddress) external onlyOwner {
        require(validatorAddress != address(0), "StakingManager: invalid validator address");
        require(!isActiveValidator[validatorAddress], "StakingManager: validator already active");
        
        activeCoreValidators.push(validatorAddress);
        isActiveValidator[validatorAddress] = true;
        
        emit ValidatorAdded(validatorAddress);
    }
    
    /**
     * @dev Remove a validator from the active list
     * @param validatorAddress Address of the validator to remove
     */
    function removeCoreValidator(address validatorAddress) external onlyOwner {
        require(isActiveValidator[validatorAddress], "StakingManager: validator not active");
        require(
            delegatedCoreByValidator[validatorAddress] == 0, 
            "StakingManager: validator has delegated CORE"
        );
        
        // Find and remove validator from array (with gas limit protection)
        uint256 validatorsLength = activeCoreValidators.length;
        require(validatorsLength <= 100, "StakingManager: too many validators for removal");
        
        for (uint256 i = 0; i < validatorsLength; i++) {
            if (activeCoreValidators[i] == validatorAddress) {
                activeCoreValidators[i] = activeCoreValidators[validatorsLength - 1];
                activeCoreValidators.pop();
                break;
            }
        }
        
        isActiveValidator[validatorAddress] = false;
        emit ValidatorRemoved(validatorAddress);
    }
    
    /**
     * @dev Update contract addresses
     */
    function setCoreStakingContract(address _coreStakingContract) external onlyOwner {
        coreStakingContract = ICoreStaking(_coreStakingContract);
    }
    
    function setLstBTCContract(address _lstBTCContract) external onlyOwner {
        lstBTCContract = ILstBTC(_lstBTCContract);
    }
    
    function setCoreBTCContract(address _coreBTCContract) external onlyOwner {
        coreBTCContract = IERC20(_coreBTCContract);
    }
    
    function setCoreTokenContract(address _coreToken) external onlyOwner {
        coreToken = IERC20(_coreToken);
    }
    
    /**
     * @dev Emergency function to recover accidentally sent tokens
     * @param tokenAddress Address of the token to recover
     * @param amount Amount to recover
     */
    function recoverTokens(address tokenAddress, uint256 amount) external onlyOwner {
        if (tokenAddress == address(0)) {
            // Recover native tokens
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "StakingManager: recovery failed");
        } else {
            // Recover ERC20 tokens
            IERC20(tokenAddress).transfer(owner(), amount);
        }
    }
    
    /**
     * @dev Automated validator rebalancing function
     * @param validatorsToUndelegate Validators to undelegate from
     * @param amountsToUndelegate Amounts to undelegate from each validator
     * @param validatorsToDelegate Validators to delegate to
     * @param amountsToDelegate Amounts to delegate to each validator
     */
    function rebalanceCoreStaking(
        address[] calldata validatorsToUndelegate,
        uint256[] calldata amountsToUndelegate,
        address[] calldata validatorsToDelegate,
        uint256[] calldata amountsToDelegate
    ) external onlyAuthorized nonReentrant {
        require(
            validatorsToUndelegate.length == amountsToUndelegate.length,
            "StakingManager: mismatched undelegate arrays"
        );
        require(
            validatorsToDelegate.length == amountsToDelegate.length,
            "StakingManager: mismatched delegate arrays"
        );
        require(
            validatorsToUndelegate.length == validatorsToDelegate.length,
            "StakingManager: mismatched rebalance arrays"
        );
        
        if (address(coreStakingContract) == address(0)) {
            revert("StakingManager: core staking contract not set");
        }
        
        // Perform redelegations
        for (uint256 i = 0; i < validatorsToUndelegate.length; i++) {
            if (amountsToUndelegate[i] > 0) {
                require(
                    delegatedCoreByValidator[validatorsToUndelegate[i]] >= amountsToUndelegate[i],
                    "StakingManager: insufficient delegation to undelegate"
                );
                
                // Use redelegate for direct transfer between validators
                coreStakingContract.redelegate(
                    validatorsToUndelegate[i],
                    validatorsToDelegate[i],
                    amountsToUndelegate[i]
                );
                
                // Update internal tracking
                delegatedCoreByValidator[validatorsToUndelegate[i]] -= amountsToUndelegate[i];
                delegatedCoreByValidator[validatorsToDelegate[i]] += amountsToUndelegate[i];
                
                emit CoreRedelegated(
                    validatorsToUndelegate[i],
                    validatorsToDelegate[i],
                    amountsToUndelegate[i]
                );
            }
        }
        
        emit CoreStakingRebalanced(
            validatorsToUndelegate,
            amountsToUndelegate,
            validatorsToDelegate,
            amountsToDelegate
        );
    }
    
    /**
     * @dev Get optimal validator distribution based on current performance
     * @return validators Array of recommended validators
     * @return allocations Recommended allocation percentages (basis points)
     */
    function getOptimalValidatorDistribution() external view returns (
        address[] memory validators,
        uint256[] memory allocations
    ) {
        if (address(coreStakingContract) == address(0)) {
            return (new address[](0), new uint256[](0));
        }
        
        address[] memory allValidators = coreStakingContract.getAllValidatorAddresses();
        uint256 validCount = 0;
        
        // First pass: count valid validators
        for (uint256 i = 0; i < allValidators.length; i++) {
            (, , , bool isActive) = coreStakingContract.getValidatorInfo(allValidators[i]);
            uint256 riskScore = coreStakingContract.getValidatorRiskScore(allValidators[i]);
            
            if (isActive && riskScore < rebalanceThresholdRisk) {
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
        
        // Second pass: collect valid validators and their APY scores
        for (uint256 i = 0; i < allValidators.length; i++) {
            (, , , bool isActive) = coreStakingContract.getValidatorInfo(allValidators[i]);
            uint256 riskScore = coreStakingContract.getValidatorRiskScore(allValidators[i]);
            
            if (isActive && riskScore < rebalanceThresholdRisk) {
                validators[index] = allValidators[i];
                apyScores[index] = coreStakingContract.getValidatorEffectiveAPY(allValidators[i]);
                totalAPYScore += apyScores[index];
                index++;
            }
        }
        
        // Calculate allocations based on APY scores (higher APY gets more allocation)
        if (totalAPYScore > 0) {
            for (uint256 i = 0; i < validCount; i++) {
                allocations[i] = (apyScores[i] * 10000) / totalAPYScore;
            }
        } else {
            // Equal allocation if no APY data available
            uint256 equalAllocation = 10000 / validCount;
            for (uint256 i = 0; i < validCount; i++) {
                allocations[i] = equalAllocation;
            }
        }
        
        return (validators, allocations);
    }
    
    /**
     * @dev Check if rebalancing is needed based on current validator performance
     * @return needsRebalance Whether rebalancing is recommended
     * @return reason Reason for rebalancing recommendation
     */
    function shouldRebalance() external view returns (bool needsRebalance, string memory reason) {
        if (address(coreStakingContract) == address(0)) {
            return (false, "Core staking contract not set");
        }
        
        // Check each validator we have delegations to
        for (uint256 i = 0; i < activeCoreValidators.length; i++) {
            address validator = activeCoreValidators[i];
            if (delegatedCoreByValidator[validator] == 0) continue;
            
            (, , , bool isActive) = coreStakingContract.getValidatorInfo(validator);
            uint256 riskScore = coreStakingContract.getValidatorRiskScore(validator);
            
            // Check if validator is inactive or too risky
            if (!isActive) {
                return (true, "Validator inactive");
            }
            if (riskScore >= rebalanceThresholdRisk) {
                return (true, "Validator risk too high");
            }
        }
        
        // Check for better performing validators
        (address[] memory optimalValidators, ) = this.getOptimalValidatorDistribution();
        
        // Simple check: if we have delegations to validators not in optimal list
        for (uint256 i = 0; i < activeCoreValidators.length; i++) {
            if (delegatedCoreByValidator[activeCoreValidators[i]] == 0) continue;
            
            bool isOptimal = false;
            for (uint256 j = 0; j < optimalValidators.length; j++) {
                if (activeCoreValidators[i] == optimalValidators[j]) {
                    isOptimal = true;
                    break;
                }
            }
            
            if (!isOptimal) {
                return (true, "Better validators available");
            }
        }
        
        return (false, "No rebalancing needed");
    }
    
    /**
     * @dev Set automation bot address
     * @param _automationBot Address of the automation bot
     */
    function setAutomationBot(address _automationBot) external onlyOwner {
        automationBot = _automationBot;
        emit AutomationBotSet(_automationBot);
    }
    
    /**
     * @dev Update rebalancing thresholds
     * @param _apyThreshold APY difference threshold in basis points
     * @param _riskThreshold Risk score threshold
     */
    function setRebalanceThresholds(uint256 _apyThreshold, uint256 _riskThreshold) external onlyOwner {
        require(_riskThreshold <= 1000, "StakingManager: invalid risk threshold");
        rebalanceThresholdAPY = _apyThreshold;
        rebalanceThresholdRisk = _riskThreshold;
        emit RebalanceThresholdsUpdated(_apyThreshold, _riskThreshold);
    }
    
    /**
     * @dev Get list of active validators
     * @return validators Array of active validator addresses
     */
    function getActiveCoreValidators() external view returns (address[] memory validators) {
        return activeCoreValidators;
    }
    
    // Allow contract to receive ETH (CORE)
    receive() external payable {}
}