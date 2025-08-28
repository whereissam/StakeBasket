// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ICoreBTCStaking.sol";

/**
 * @title CoreDAOLiquidBTC (lstBTC Implementation)
 * @dev Liquid staking token for CoreDAO's Bitcoin ecosystem
 * 
 * STRATEGY CLARIFICATION:
 * This contract implements lstBTC as a liquid derivative of coreBTC on CoreDAO.
 * It leverages CoreDAO's Bitcoin staking mechanism to generate yield while maintaining liquidity.
 * 
 * CoreDAO Integration:
 * - coreBTC: Wrapped Bitcoin on CoreDAO (1:1 with BTC)
 * - lstBTC: Liquid staked coreBTC (this contract)
 * - Yield Source: CoreDAO's Bitcoin staking rewards + potential restaking rewards
 * 
 * Design Features:
 * - Dynamic exchange rate based on accrued staking rewards
 * - Integration with CoreDAO's validator network for Bitcoin staking
 * - Cross-chain yield opportunities through CoreDAO's Bitcoin bridge
 * - Restaking capabilities for additional yield layers
 */
contract CoreDAOLiquidBTC is ERC20, Ownable, ReentrancyGuard, Pausable {
    
    // Core interfaces
    IERC20 public immutable coreBTC;
    ICoreBTCStaking public coreBTCStaking;
    
    // Exchange rate tracking
    uint256 public totalStakedCoreBTC;
    uint256 public lastRewardUpdate;
    uint256 public accumulatedRewards;
    
    // Performance tracking
    uint256 public baseExchangeRate = 1e18; // 1:1 initial rate
    uint256 public totalRewardsEarned;
    uint256 public totalFeesCollected;
    
    // Fee structure
    uint256 public stakingFee = 100; // 1% on staking
    uint256 public unstakingFee = 50; // 0.5% on unstaking
    uint256 public performanceFee = 1000; // 10% on rewards
    address public feeRecipient;
    
    // Staking parameters
    uint256 public minStakeAmount = 0.001e18; // 0.001 coreBTC minimum
    uint256 public unstakingDelay = 7 days; // 7-day unbonding period
    
    // Unbonding queue
    struct UnbondingRequest {
        uint256 lstBTCAmount;
        uint256 coreBTCAmount;
        uint256 unlockTime;
        bool claimed;
    }
    
    mapping(address => UnbondingRequest[]) public unbondingRequests;
    uint256 public totalUnbondingCoreBTC;
    
    // Restaking integration
    address[] public restakingProtocols;
    mapping(address => bool) public isRestakingProtocol;
    mapping(address => uint256) public restakedAmounts;
    
    // Validator management for Bitcoin staking
    address[] public btcValidators;
    mapping(address => uint256) public validatorStakes;
    mapping(address => bool) public isActiveBTCValidator;
    
    // Events
    event Staked(address indexed user, uint256 coreBTCAmount, uint256 lstBTCAmount);
    event UnstakeRequested(address indexed user, uint256 lstBTCAmount, uint256 coreBTCAmount, uint256 unlockTime);
    event Unstaked(address indexed user, uint256 coreBTCAmount);
    event RewardsCompounded(uint256 rewardAmount, uint256 newExchangeRate);
    event ValidatorAdded(address indexed validator);
    event RestakingProtocolAdded(address indexed protocol, uint256 amount);
    event ExchangeRateUpdated(uint256 newRate);
    
    constructor(
        address _coreBTC,
        address _coreBTCStaking,
        address _feeRecipient,
        address initialOwner
    ) ERC20("CoreDAO Liquid Bitcoin", "lstBTC") Ownable(initialOwner) {
        require(_coreBTC != address(0), "lstBTC: invalid coreBTC address");
        require(_feeRecipient != address(0), "lstBTC: invalid fee recipient");
        
        coreBTC = IERC20(_coreBTC);
        if (_coreBTCStaking != address(0)) {
            coreBTCStaking = ICoreBTCStaking(_coreBTCStaking);
        }
        feeRecipient = _feeRecipient;
        lastRewardUpdate = block.timestamp;
    }
    
    /**
     * @dev Stake coreBTC and receive lstBTC tokens
     * @param amount Amount of coreBTC to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= minStakeAmount, "lstBTC: amount below minimum");
        
        // Calculate lstBTC to mint based on current exchange rate
        uint256 lstBTCAmount = _coreBTCToLstBTC(amount);
        
        // Apply staking fee
        uint256 feeAmount = (amount * stakingFee) / 10000;
        uint256 netAmount = amount - feeAmount;
        
        // Transfer coreBTC from user
        coreBTC.transferFrom(msg.sender, address(this), amount);
        
        // Handle fee
        if (feeAmount > 0) {
            coreBTC.transfer(feeRecipient, feeAmount);
            totalFeesCollected += feeAmount;
        }
        
        // Update state
        totalStakedCoreBTC += netAmount;
        
        // Stake coreBTC in CoreDAO Bitcoin staking
        _stakeCoreBTC(netAmount);
        
        // Mint lstBTC to user
        _mint(msg.sender, lstBTCAmount);
        
        emit Staked(msg.sender, amount, lstBTCAmount);
    }
    
    /**
     * @dev Request unstaking of lstBTC (with unbonding period)
     * @param lstBTCAmount Amount of lstBTC to unstake
     */
    function requestUnstake(uint256 lstBTCAmount) external nonReentrant {
        require(lstBTCAmount > 0, "lstBTC: invalid amount");
        require(balanceOf(msg.sender) >= lstBTCAmount, "lstBTC: insufficient balance");
        
        // Calculate coreBTC to return
        uint256 coreBTCAmount = _lstBTCToCoreBTC(lstBTCAmount);
        
        // Apply unstaking fee
        uint256 feeAmount = (coreBTCAmount * unstakingFee) / 10000;
        uint256 netCoreBTCAmount = coreBTCAmount - feeAmount;
        
        // Burn user's lstBTC
        _burn(msg.sender, lstBTCAmount);
        
        // Create unbonding request
        unbondingRequests[msg.sender].push(UnbondingRequest({
            lstBTCAmount: lstBTCAmount,
            coreBTCAmount: netCoreBTCAmount,
            unlockTime: block.timestamp + unstakingDelay,
            claimed: false
        }));
        
        // Update tracking
        totalUnbondingCoreBTC += netCoreBTCAmount;
        totalStakedCoreBTC -= coreBTCAmount;
        
        // Handle fee
        if (feeAmount > 0) {
            coreBTC.transfer(feeRecipient, feeAmount);
            totalFeesCollected += feeAmount;
        }
        
        // Begin unstaking process from CoreDAO
        _unstakeCoreBTC(coreBTCAmount);
        
        emit UnstakeRequested(msg.sender, lstBTCAmount, netCoreBTCAmount, block.timestamp + unstakingDelay);
    }
    
    /**
     * @dev Claim unstaked coreBTC after unbonding period
     * @param requestIndex Index of the unbonding request
     */
    function claimUnstaked(uint256 requestIndex) external nonReentrant {
        UnbondingRequest[] storage requests = unbondingRequests[msg.sender];
        require(requestIndex < requests.length, "lstBTC: invalid request index");
        
        UnbondingRequest storage request = requests[requestIndex];
        require(!request.claimed, "lstBTC: already claimed");
        require(block.timestamp >= request.unlockTime, "lstBTC: still unbonding");
        
        request.claimed = true;
        totalUnbondingCoreBTC -= request.coreBTCAmount;
        
        // Transfer coreBTC to user
        coreBTC.transfer(msg.sender, request.coreBTCAmount);
        
        emit Unstaked(msg.sender, request.coreBTCAmount);
    }
    
    /**
     * @dev Get current exchange rate (coreBTC per lstBTC)
     */
    function getExchangeRate() public view returns (uint256) {
        if (totalSupply() == 0) return baseExchangeRate;
        
        uint256 totalValue = totalStakedCoreBTC + accumulatedRewards;
        return (totalValue * 1e18) / totalSupply();
    }
    
    /**
     * @dev Convert coreBTC amount to lstBTC amount
     */
    function _coreBTCToLstBTC(uint256 coreBTCAmount) internal view returns (uint256) {
        uint256 exchangeRate = getExchangeRate();
        return (coreBTCAmount * 1e18) / exchangeRate;
    }
    
    /**
     * @dev Convert lstBTC amount to coreBTC amount
     */
    function _lstBTCToCoreBTC(uint256 lstBTCAmount) internal view returns (uint256) {
        uint256 exchangeRate = getExchangeRate();
        return (lstBTCAmount * exchangeRate) / 1e18;
    }
    
    /**
     * @dev Stake coreBTC in CoreDAO Bitcoin staking system
     */
    function _stakeCoreBTC(uint256 amount) internal {
        if (address(coreBTCStaking) == address(0)) return;
        
        // Approve and stake with CoreDAO Bitcoin staking
        coreBTC.approve(address(coreBTCStaking), amount);
        
        // Distribute stake across active validators
        if (btcValidators.length > 0) {
            uint256 amountPerValidator = amount / btcValidators.length;
            for (uint256 i = 0; i < btcValidators.length; i++) {
                if (amountPerValidator > 0) {
                    coreBTCStaking.stake(btcValidators[i], amountPerValidator);
                    validatorStakes[btcValidators[i]] += amountPerValidator;
                }
            }
        } else {
            // Fallback to default staking if no validators configured
            coreBTCStaking.stake(address(0), amount);
        }
    }
    
    /**
     * @dev Unstake coreBTC from CoreDAO Bitcoin staking system
     */
    function _unstakeCoreBTC(uint256 amount) internal {
        if (address(coreBTCStaking) == address(0)) return;
        
        // Unstake proportionally from validators
        uint256 remainingAmount = amount;
        for (uint256 i = 0; i < btcValidators.length && remainingAmount > 0; i++) {
            address validator = btcValidators[i];
            uint256 validatorStake = validatorStakes[validator];
            
            if (validatorStake > 0) {
                uint256 unstakeFromValidator = remainingAmount > validatorStake ? validatorStake : remainingAmount;
                coreBTCStaking.unstake(validator, unstakeFromValidator);
                validatorStakes[validator] -= unstakeFromValidator;
                remainingAmount -= unstakeFromValidator;
            }
        }
    }
    
    /**
     * @dev Compound staking rewards
     */
    function compoundRewards() external onlyOwner {
        if (address(coreBTCStaking) == address(0)) return;
        
        uint256 totalRewards = 0;
        
        // Claim rewards from all validators
        for (uint256 i = 0; i < btcValidators.length; i++) {
            try coreBTCStaking.claimRewards(btcValidators[i]) returns (uint256 rewards) {
                totalRewards += rewards;
            } catch {
                // Continue with other validators if one fails
            }
        }
        
        if (totalRewards > 0) {
            // Apply performance fee
            uint256 feeAmount = (totalRewards * performanceFee) / 10000;
            uint256 netRewards = totalRewards - feeAmount;
            
            // Update state
            accumulatedRewards += netRewards;
            totalRewardsEarned += totalRewards;
            lastRewardUpdate = block.timestamp;
            
            // Handle performance fee
            if (feeAmount > 0) {
                coreBTC.transfer(feeRecipient, feeAmount);
                totalFeesCollected += feeAmount;
            }
            
            // Restake rewards for compounding
            _stakeCoreBTC(netRewards);
            totalStakedCoreBTC += netRewards;
            
            emit RewardsCompounded(totalRewards, getExchangeRate());
            emit ExchangeRateUpdated(getExchangeRate());
        }
    }
    
    /**
     * @dev Add Bitcoin validator for staking
     */
    function addBTCValidator(address validator) external onlyOwner {
        require(validator != address(0), "lstBTC: invalid validator");
        require(!isActiveBTCValidator[validator], "lstBTC: validator already active");
        
        btcValidators.push(validator);
        isActiveBTCValidator[validator] = true;
        
        emit ValidatorAdded(validator);
    }
    
    /**
     * @dev Remove Bitcoin validator
     */
    function removeBTCValidator(address validator) external onlyOwner {
        require(isActiveBTCValidator[validator], "lstBTC: validator not active");
        require(validatorStakes[validator] == 0, "lstBTC: validator has stakes");
        
        // Remove from array
        for (uint256 i = 0; i < btcValidators.length; i++) {
            if (btcValidators[i] == validator) {
                btcValidators[i] = btcValidators[btcValidators.length - 1];
                btcValidators.pop();
                break;
            }
        }
        
        isActiveBTCValidator[validator] = false;
    }
    
    /**
     * @dev Add restaking protocol for additional yield
     */
    function addRestakingProtocol(address protocol, uint256 amount) external onlyOwner {
        require(protocol != address(0), "lstBTC: invalid protocol");
        require(amount <= totalStakedCoreBTC, "lstBTC: insufficient stake");
        
        if (!isRestakingProtocol[protocol]) {
            restakingProtocols.push(protocol);
            isRestakingProtocol[protocol] = true;
        }
        
        // Approve and restake coreBTC
        coreBTC.approve(protocol, amount);
        restakedAmounts[protocol] += amount;
        
        emit RestakingProtocolAdded(protocol, amount);
    }
    
    /**
     * @dev Get user's unbonding requests
     */
    function getUserUnbondingRequests(address user) 
        external 
        view 
        returns (UnbondingRequest[] memory) 
    {
        return unbondingRequests[user];
    }
    
    /**
     * @dev Get total value locked (TVL)
     */
    function getTVL() external view returns (uint256) {
        return totalStakedCoreBTC + accumulatedRewards;
    }
    
    /**
     * @dev Get APY based on recent performance
     */
    function getAPY() external view returns (uint256) {
        if (totalStakedCoreBTC == 0 || block.timestamp <= lastRewardUpdate) return 0;
        
        uint256 timeElapsed = block.timestamp - lastRewardUpdate;
        if (timeElapsed < 1 days) return 0;
        
        uint256 recentRewards = accumulatedRewards;
        uint256 annualRewards = (recentRewards * 365 days) / timeElapsed;
        
        return (annualRewards * 10000) / totalStakedCoreBTC; // APY in basis points
    }
    
    // Admin functions
    function setCoreBTCStaking(address _coreBTCStaking) external onlyOwner {
        coreBTCStaking = ICoreBTCStaking(_coreBTCStaking);
    }
    
    function setFees(uint256 _stakingFee, uint256 _unstakingFee, uint256 _performanceFee) external onlyOwner {
        require(_stakingFee <= 500, "lstBTC: staking fee too high"); // Max 5%
        require(_unstakingFee <= 200, "lstBTC: unstaking fee too high"); // Max 2%
        require(_performanceFee <= 2000, "lstBTC: performance fee too high"); // Max 20%
        
        stakingFee = _stakingFee;
        unstakingFee = _unstakingFee;
        performanceFee = _performanceFee;
    }
    
    function setUnstakingDelay(uint256 _delay) external onlyOwner {
        require(_delay <= 14 days, "lstBTC: delay too long");
        unstakingDelay = _delay;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}