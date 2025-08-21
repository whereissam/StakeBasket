// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IDualStaking.sol";

/**
 * @title MockDualStaking
 * @dev Mock implementation of CoreDAO's Dual Staking contract for testing
 * Simulates tier-based rewards based on CORE:BTC ratios
 */
contract MockDualStaking is IDualStaking, Ownable, ReentrancyGuard {
    
    // Token contracts
    IERC20 public coreToken;
    IERC20 public btcToken;
    
    // Staking tracking
    struct UserStake {
        uint256 coreAmount;
        uint256 btcAmount;
        uint256 lastRewardTime;
        uint256 accumulatedRewards;
    }
    
    mapping(address => UserStake) public userStakes;
    
    // Tier definitions matching CoreDAO's current structure
    uint256 public constant BASE_TIER = 0;
    uint256 public constant BOOST_TIER = 2000 * 1e18; // 2,000:1
    uint256 public constant SUPER_TIER = 6000 * 1e18; // 6,000:1  
    uint256 public constant SATOSHI_TIER = 16000 * 1e18; // 16,000:1
    
    // APY rates for each tier (basis points, annualized)
    uint256 public baseTierAPY = 800; // 8% APY
    uint256 public boostTierAPY = 1200; // 12% APY
    uint256 public superTierAPY = 1600; // 16% APY
    uint256 public satoshiTierAPY = 2000; // 20% APY
    
    // Total staked amounts
    uint256 public totalStakedCORE;
    uint256 public totalStakedBTC;
    
    // Reward pool
    uint256 public rewardPool;
    
    // Events
    event COREStaked(address indexed user, uint256 amount);
    event BTCStaked(address indexed user, uint256 amount);
    event COREUnstaked(address indexed user, uint256 amount);
    event BTCUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardPoolFunded(uint256 amount);
    
    constructor(
        address _coreToken,
        address _btcToken,
        address initialOwner
    ) Ownable(initialOwner) {
        coreToken = IERC20(_coreToken);
        btcToken = IERC20(_btcToken);
    }
    
    /**
     * @dev Stake native CORE tokens (ETH on local testnet)
     */
    function stakeCORE(uint256 amount) external payable override nonReentrant {
        require(amount > 0, "MockDualStaking: amount must be greater than 0");
        require(msg.value == amount, "MockDualStaking: sent value must equal amount");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Update user stake (native CORE staking)
        userStakes[msg.sender].coreAmount += amount;
        totalStakedCORE += amount;
        
        emit COREStaked(msg.sender, amount);
    }
    
    /**
     * @dev Stake BTC tokens
     */
    function stakeBTC(uint256 amount) external override nonReentrant {
        require(amount > 0, "MockDualStaking: amount must be greater than 0");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Transfer BTC tokens
        btcToken.transferFrom(msg.sender, address(this), amount);
        
        // Update user stake
        userStakes[msg.sender].btcAmount += amount;
        totalStakedBTC += amount;
        
        emit BTCStaked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake native CORE tokens (ETH on local testnet)
     */
    function unstakeCORE(uint256 amount) external override nonReentrant {
        require(amount > 0, "MockDualStaking: amount must be greater than 0");
        require(
            userStakes[msg.sender].coreAmount >= amount,
            "MockDualStaking: insufficient CORE stake"
        );
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Update user stake
        userStakes[msg.sender].coreAmount -= amount;
        totalStakedCORE -= amount;
        
        // Transfer native CORE back
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "MockDualStaking: transfer failed");
        
        emit COREUnstaked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake BTC tokens
     */
    function unstakeBTC(uint256 amount) external override nonReentrant {
        require(amount > 0, "MockDualStaking: amount must be greater than 0");
        require(
            userStakes[msg.sender].btcAmount >= amount,
            "MockDualStaking: insufficient BTC stake"
        );
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Update user stake
        userStakes[msg.sender].btcAmount -= amount;
        totalStakedBTC -= amount;
        
        // Transfer BTC tokens back
        btcToken.transfer(msg.sender, amount);
        
        emit BTCUnstaked(msg.sender, amount);
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external override nonReentrant returns (uint256) {
        _updateRewards(msg.sender);
        
        uint256 rewards = userStakes[msg.sender].accumulatedRewards;
        if (rewards > 0) {
            userStakes[msg.sender].accumulatedRewards = 0;
            
            // Transfer rewards in native CORE
            require(rewardPool >= rewards, "MockDualStaking: insufficient reward pool");
            rewardPool -= rewards;
            
            (bool success, ) = payable(msg.sender).call{value: rewards}("");
            require(success, "MockDualStaking: reward transfer failed");
            
            emit RewardsClaimed(msg.sender, rewards);
        }
        
        return rewards;
    }

    /**
     * @dev Combined dual staking function (CORE + BTC together for tier benefits)
     */
    function stakeDual(uint256 btcAmount) external payable override nonReentrant {
        require(msg.value > 0 && btcAmount > 0, "MockDualStaking: both amounts must be positive");
        
        uint256 coreAmount = msg.value;
        
        // Calculate the ratio and validate it meets minimum requirements
        uint256 ratio = (coreAmount * 1e18) / btcAmount;
        require(ratio >= BOOST_TIER, "MockDualStaking: ratio too low for dual staking benefits");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Transfer BTC tokens
        btcToken.transferFrom(msg.sender, address(this), btcAmount);
        
        // Update user stakes
        userStakes[msg.sender].coreAmount += coreAmount;
        userStakes[msg.sender].btcAmount += btcAmount;
        totalStakedCORE += coreAmount;
        totalStakedBTC += btcAmount;
        
        emit COREStaked(msg.sender, coreAmount);
        emit BTCStaked(msg.sender, btcAmount);
    }

    /**
     * @dev Unstake from dual staking (maintains ratio)
     */
    function unstakeDual(uint256 shares) external override nonReentrant {
        require(shares > 0, "MockDualStaking: shares must be positive");
        
        UserStake storage userStake = userStakes[msg.sender];
        require(userStake.coreAmount > 0 && userStake.btcAmount > 0, "MockDualStaking: no dual stake");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Calculate proportional amounts (shares represent percentage in basis points)
        uint256 coreToUnstake = (userStake.coreAmount * shares) / 10000;
        uint256 btcToUnstake = (userStake.btcAmount * shares) / 10000;
        
        // Update stakes
        userStake.coreAmount -= coreToUnstake;
        userStake.btcAmount -= btcToUnstake;
        totalStakedCORE -= coreToUnstake;
        totalStakedBTC -= btcToUnstake;
        
        // Transfer tokens back
        (bool success, ) = payable(msg.sender).call{value: coreToUnstake}("");
        require(success, "MockDualStaking: CORE transfer failed");
        
        btcToken.transfer(msg.sender, btcToUnstake);
        
        emit COREUnstaked(msg.sender, coreToUnstake);
        emit BTCUnstaked(msg.sender, btcToUnstake);
    }

    /**
     * @dev Claim CORE-specific rewards
     */
    function claimCoreRewards() external override nonReentrant returns (uint256) {
        return this.claimRewards(); // Call external claimRewards function
    }

    /**
     * @dev Claim BTC-specific rewards  
     */
    function claimBtcRewards() external override nonReentrant returns (uint256) {
        return 0; // No separate BTC rewards in this implementation
    }
    
    /**
     * @dev Update rewards for a user based on their current tier
     */
    function _updateRewards(address user) internal {
        UserStake storage stake = userStakes[user];
        
        if (stake.lastRewardTime == 0) {
            stake.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - stake.lastRewardTime;
        if (timeElapsed == 0) return;
        
        // Calculate user's tier based on CORE:BTC ratio
        uint256 userTier = _getUserTier(user);
        uint256 tierAPY = _getTierAPY(userTier);
        
        // Calculate rewards based on BTC staked and tier APY
        if (stake.btcAmount > 0) {
            uint256 annualRewards = (stake.btcAmount * tierAPY) / 10000;
            uint256 periodRewards = (annualRewards * timeElapsed) / 365 days;
            
            stake.accumulatedRewards += periodRewards;
        }
        
        stake.lastRewardTime = block.timestamp;
    }
    
    /**
     * @dev Get user's current tier based on CORE:BTC ratio
     */
    function _getUserTier(address user) internal view returns (uint256) {
        UserStake memory stake = userStakes[user];
        
        if (stake.btcAmount == 0) return BASE_TIER;
        
        uint256 ratio = (stake.coreAmount * 1e18) / stake.btcAmount;
        
        if (ratio >= SATOSHI_TIER) return SATOSHI_TIER;
        if (ratio >= SUPER_TIER) return SUPER_TIER;
        if (ratio >= BOOST_TIER) return BOOST_TIER;
        return BASE_TIER;
    }
    
    /**
     * @dev Get APY for a specific tier
     */
    function _getTierAPY(uint256 tier) internal view returns (uint256) {
        if (tier >= SATOSHI_TIER) return satoshiTierAPY;
        if (tier >= SUPER_TIER) return superTierAPY;
        if (tier >= BOOST_TIER) return boostTierAPY;
        return baseTierAPY;
    }
    
    /**
     * @dev Get user's stake information
     */
    function getUserStake(address user) external view override returns (uint256 btcAmount, uint256 coreAmount) {
        UserStake memory stake = userStakes[user];
        return (stake.btcAmount, stake.coreAmount);
    }
    
    /**
     * @dev Get user's tier and current APY
     */
    function getTierRewards(address user) external view override returns (uint256 tier, uint256 apy) {
        tier = _getUserTier(user);
        apy = _getTierAPY(tier);
    }
    
    /**
     * @dev Get current tier for user (IDualStaking interface)
     */
    function getCurrentTier(address user) external view override returns (uint256) {
        return _getUserTier(user);
    }
    
    /**
     * @dev Get user's current CORE:BTC ratio  
     */
    function getUserRatio(address user) external view override returns (uint256) {
        UserStake memory stake = userStakes[user];
        if (stake.btcAmount == 0) return 0;
        return (stake.coreAmount * 1e18) / stake.btcAmount;
    }

    /**
     * @dev Calculate tier based on CORE and BTC amounts
     */
    function calculateTier(uint256 coreAmount, uint256 btcAmount) external pure override returns (uint8) {
        if (btcAmount == 0) return 0;
        
        uint256 ratio = (coreAmount * 1e18) / btcAmount;
        
        if (ratio >= SATOSHI_TIER) return 4;
        if (ratio >= SUPER_TIER) return 3;
        if (ratio >= BOOST_TIER) return 2;
        return 1;
    }
    
    /**
     * @dev Get pending rewards for a user
     */
    function getPendingRewards(address user) external view returns (uint256) {
        UserStake memory stake = userStakes[user];
        
        if (stake.lastRewardTime == 0 || stake.btcAmount == 0) {
            return stake.accumulatedRewards;
        }
        
        uint256 timeElapsed = block.timestamp - stake.lastRewardTime;
        uint256 userTier = _getUserTier(user);
        uint256 tierAPY = _getTierAPY(userTier);
        
        uint256 annualRewards = (stake.btcAmount * tierAPY) / 10000;
        uint256 periodRewards = (annualRewards * timeElapsed) / 365 days;
        
        return stake.accumulatedRewards + periodRewards;
    }
    
    /**
     * @dev Get tier information
     */
    function getTierInfo() external view returns (
        uint256[4] memory tierRatios,
        uint256[4] memory tierAPYs
    ) {
        tierRatios[0] = BASE_TIER;
        tierRatios[1] = BOOST_TIER;
        tierRatios[2] = SUPER_TIER;
        tierRatios[3] = SATOSHI_TIER;
        
        tierAPYs[0] = baseTierAPY;
        tierAPYs[1] = boostTierAPY;
        tierAPYs[2] = superTierAPY;
        tierAPYs[3] = satoshiTierAPY;
    }
    
    /**
     * @dev Check if user qualifies for a specific tier
     */
    function qualifiesForTier(address user, uint256 targetTier) external view returns (bool) {
        uint256 userTier = _getUserTier(user);
        return userTier >= targetTier;
    }
    
    // Admin functions
    
    /**
     * @dev Fund the reward pool with CORE tokens
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        coreToken.transferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }
    
    /**
     * @dev Set tier APY rates
     */
    function setTierAPYs(
        uint256 _baseTierAPY,
        uint256 _boostTierAPY,
        uint256 _superTierAPY,
        uint256 _satoshiTierAPY
    ) external onlyOwner {
        baseTierAPY = _baseTierAPY;
        boostTierAPY = _boostTierAPY;
        superTierAPY = _superTierAPY;
        satoshiTierAPY = _satoshiTierAPY;
    }
    
    /**
     * @dev Emergency function to withdraw tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev Simulate time passage for testing
     */
    function simulateTimeElapse(address user, uint256 timeInSeconds) external onlyOwner {
        userStakes[user].lastRewardTime = block.timestamp - timeInSeconds;
    }
    
    /**
     * @dev Get reward pool balance
     */
    function getRewardPoolBalance() external view returns (uint256) {
        return rewardPool;
    }
    
    /**
     * @dev Get total staking statistics
     */
    function getStakingStats() external view returns (
        uint256 totalCORE,
        uint256 totalBTC,
        uint256 poolBalance
    ) {
        return (totalStakedCORE, totalStakedBTC, rewardPool);
    }

    /**
     * @dev Get total staked amounts (IDualStaking interface)
     */
    function getTotalStaked() external view override returns (uint256 totalCORE, uint256 totalBTC) {
        return (totalStakedCORE, totalStakedBTC);
    }

    /**
     * @dev Fund the reward pool with native CORE
     */
    function fundRewardPoolNative() external payable onlyOwner {
        rewardPool += msg.value;
        emit RewardPoolFunded(msg.value);
    }

    // Allow contract to receive ETH
    receive() external payable {}
}