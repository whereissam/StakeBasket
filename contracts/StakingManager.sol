// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Core staking contract interface (placeholder - to be replaced with actual interface)
interface ICoreStaking {
        function delegate(address validator, uint256 amount) external;
        function undelegate(address validator, uint256 amount) external;
        function claimRewards(address validator) external returns (uint256);
        function getDelegatedAmount(address delegator, address validator) external view returns (uint256);
        function getRewards(address delegator, address validator) external view returns (uint256);
}

// lstBTC contract interface (placeholder - to be replaced with actual interface) 
interface ILstBTC {
    function mint(uint256 coreBTCAmount) external returns (uint256);
    function redeem(uint256 lstBTCAmount) external returns (uint256);
    function getExchangeRate() external view returns (uint256);
}

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
    
    // Validator management
    address[] public activeCoreValidators;
    mapping(address => uint256) public delegatedCoreByValidator;
    mapping(address => bool) public isActiveValidator;
    mapping(address => uint256) public stakedLstBTC;
    
    // Events
    event CoreDelegated(address indexed validator, uint256 amount);
    event CoreUndelegated(address indexed validator, uint256 amount);
    event CoreRewardsClaimed(address indexed validator, uint256 amount);
    event LstBTCMinted(uint256 coreBTCAmount, uint256 lstBTCAmount);
    event LstBTCRedeemed(uint256 lstBTCAmount, uint256 coreBTCAmount);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    
    modifier onlyStakeBasket() {
        require(msg.sender == stakeBasketContract, "StakingManager: caller is not StakeBasket contract");
        _;
    }
    
    constructor(
        address _stakeBasketContract,
        address _coreStakingContract,
        address _lstBTCContract,
        address _coreBTCContract,
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
    }
    
    /**
     * @dev Delegate CORE tokens to a validator
     * @param validatorAddress Address of the validator
     * @param amount Amount of CORE to delegate
     */
    function delegateCore(address validatorAddress, uint256 amount) 
        external 
        onlyStakeBasket 
        nonReentrant 
    {
        require(isActiveValidator[validatorAddress], "StakingManager: validator not active");
        require(amount > 0, "StakingManager: amount must be greater than 0");
        
        // Transfer CORE from StakeBasket to this contract
        // Note: Assuming CORE is native token, use address(this).balance
        // In production, this would interact with actual Core staking contract
        
        if (address(coreStakingContract) != address(0)) {
            coreStakingContract.delegate(validatorAddress, amount);
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
                uint256 rewards = coreStakingContract.claimRewards(validator);
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
        
        // Find and remove validator from array
        for (uint256 i = 0; i < activeCoreValidators.length; i++) {
            if (activeCoreValidators[i] == validatorAddress) {
                activeCoreValidators[i] = activeCoreValidators[activeCoreValidators.length - 1];
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
     * @dev Get list of active validators
     * @return validators Array of active validator addresses
     */
    function getActiveCoreValidators() external view returns (address[] memory validators) {
        return activeCoreValidators;
    }
    
    // Allow contract to receive ETH (CORE)
    receive() external payable {}
}