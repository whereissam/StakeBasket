// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProperDualStaking
 * @dev Proper implementation of CoreDAO's Dual Staking that requires both CORE and BTC to be staked together
 */
contract ProperDualStaking is Ownable, ReentrancyGuard {
    
    // Token contracts
    IERC20 public coreToken;
    IERC20 public btcToken;
    
    // Staking tracking
    struct UserStake {
        uint256 coreAmount;
        uint256 btcAmount;
        uint256 shares;
        uint256 lastRewardTime;
        uint256 accumulatedRewards;
    }
    
    mapping(address => UserStake) public userStakes;
    
    // Tier definitions (CORE:BTC ratios - raw ratio values since we normalize by 1e8)
    uint256 public constant BASE_RATIO = 5000;      // 5,000:1
    uint256 public constant BOOST_RATIO = 20000;    // 20,000:1
    uint256 public constant SUPER_RATIO = 60000;    // 60,000:1
    uint256 public constant SATOSHI_RATIO = 160000; // 160,000:1
    
    // APY rates for each tier (basis points)
    uint256 public baseTierAPY = 800;    // 8% APY
    uint256 public boostTierAPY = 1200;  // 12% APY
    uint256 public superTierAPY = 1600;  // 16% APY
    uint256 public satoshiTierAPY = 2000; // 20% APY
    
    // Total tracking
    uint256 public totalStakedCORE;
    uint256 public totalStakedBTC;
    uint256 public totalShares;
    uint256 public rewardPool;
    
    // Events
    event DualStaked(address indexed user, uint256 coreAmount, uint256 btcAmount, uint256 shares, uint8 tier);
    event Unstaked(address indexed user, uint256 coreAmount, uint256 btcAmount, uint256 shares);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    constructor(
        address _coreToken,
        address _btcToken,
        address initialOwner
    ) Ownable(initialOwner) {
        coreToken = IERC20(_coreToken);
        btcToken = IERC20(_btcToken);
    }
    
    /**
     * @dev Stake both CORE and BTC tokens together to achieve a specific tier
     * @param coreAmount Amount of CORE tokens to stake
     * @param btcAmount Amount of BTC tokens to stake
     */
    function stake(uint256 coreAmount, uint256 btcAmount) external nonReentrant {
        require(coreAmount > 0 && btcAmount > 0, "Both amounts must be greater than 0");
        
        // Calculate the ratio and validate it meets minimum requirements
        // CORE has 18 decimals, BTC has 8 decimals, so divide CORE by 1e10 to normalize
        uint256 ratio = (coreAmount / 1e10) / btcAmount; // Normalize CORE to BTC decimals
        require(ratio >= BASE_RATIO, "Ratio too low for dual staking");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Transfer tokens
        coreToken.transferFrom(msg.sender, address(this), coreAmount);
        btcToken.transferFrom(msg.sender, address(this), btcAmount);
        
        // Calculate shares based on BTC amount (BTC is the base asset)
        uint256 shares = btcAmount; // 1:1 ratio with BTC amount
        
        // Update user stake
        userStakes[msg.sender].coreAmount += coreAmount;
        userStakes[msg.sender].btcAmount += btcAmount;
        userStakes[msg.sender].shares += shares;
        
        // Update totals
        totalStakedCORE += coreAmount;
        totalStakedBTC += btcAmount;
        totalShares += shares;
        
        // Get tier for event
        uint8 tier = uint8(_calculateTier(ratio));
        
        emit DualStaked(msg.sender, coreAmount, btcAmount, shares, tier);
    }
    
    /**
     * @dev Unstake a portion of staked tokens (maintains ratio)
     * @param shares Amount of shares to unstake
     */
    function unstake(uint256 shares) external nonReentrant {
        UserStake storage userStake = userStakes[msg.sender];
        require(shares > 0, "Shares must be greater than 0");
        require(userStake.shares >= shares, "Insufficient shares");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Calculate proportional amounts to unstake
        uint256 coreToUnstake = (userStake.coreAmount * shares) / userStake.shares;
        uint256 btcToUnstake = (userStake.btcAmount * shares) / userStake.shares;
        
        // Update user stake
        userStake.coreAmount -= coreToUnstake;
        userStake.btcAmount -= btcToUnstake;
        userStake.shares -= shares;
        
        // Update totals
        totalStakedCORE -= coreToUnstake;
        totalStakedBTC -= btcToUnstake;
        totalShares -= shares;
        
        // Transfer tokens back
        coreToken.transfer(msg.sender, coreToUnstake);
        btcToken.transfer(msg.sender, btcToUnstake);
        
        emit Unstaked(msg.sender, coreToUnstake, btcToUnstake, shares);
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant returns (uint256) {
        _updateRewards(msg.sender);
        
        uint256 rewards = userStakes[msg.sender].accumulatedRewards;
        if (rewards > 0) {
            userStakes[msg.sender].accumulatedRewards = 0;
            
            require(rewardPool >= rewards, "Insufficient reward pool");
            rewardPool -= rewards;
            coreToken.transfer(msg.sender, rewards);
            
            emit RewardsClaimed(msg.sender, rewards);
        }
        
        return rewards;
    }
    
    /**
     * @dev Update rewards for a user based on their current tier
     */
    function _updateRewards(address user) internal {
        UserStake storage stake = userStakes[user];
        
        if (stake.lastRewardTime == 0 || stake.btcAmount == 0) {
            stake.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - stake.lastRewardTime;
        if (timeElapsed == 0) return;
        
        // Calculate user's tier and APY
        uint256 ratio = (stake.coreAmount / 1e10) / stake.btcAmount;
        uint256 tierAPY = _getTierAPY(ratio);
        
        // Calculate rewards based on BTC staked and tier APY
        uint256 annualRewards = (stake.btcAmount * tierAPY) / 10000;
        uint256 periodRewards = (annualRewards * timeElapsed) / 365 days;
        
        stake.accumulatedRewards += periodRewards;
        stake.lastRewardTime = block.timestamp;
    }
    
    /**
     * @dev Calculate tier based on CORE:BTC ratio
     */
    function _calculateTier(uint256 ratio) internal pure returns (uint256) {
        if (ratio >= SATOSHI_RATIO) return 3; // Satoshi
        if (ratio >= SUPER_RATIO) return 2;   // Super
        if (ratio >= BOOST_RATIO) return 1;   // Boost
        return 0; // Base
    }
    
    /**
     * @dev Get APY for a specific ratio
     */
    function _getTierAPY(uint256 ratio) internal view returns (uint256) {
        if (ratio >= SATOSHI_RATIO) return satoshiTierAPY;
        if (ratio >= SUPER_RATIO) return superTierAPY;
        if (ratio >= BOOST_RATIO) return boostTierAPY;
        return baseTierAPY;
    }
    
    // View functions for frontend
    
    /**
     * @dev Get user's stake information
     */
    function getUserStakeInfo(address user) external view returns (
        uint256 coreStaked,
        uint256 btcStaked,
        uint256 shares,
        uint256 rewards,
        uint256 lastClaimTime
    ) {
        UserStake memory stake = userStakes[user];
        return (
            stake.coreAmount,
            stake.btcAmount,
            stake.shares,
            stake.accumulatedRewards,
            stake.lastRewardTime
        );
    }
    
    /**
     * @dev Get user's tier status
     */
    function getTierStatus(address user) external view returns (
        uint8 tier,
        uint256 coreStaked,
        uint256 btcStaked,
        uint256 ratio,
        uint256 rewards,
        uint256 apy
    ) {
        UserStake memory stake = userStakes[user];
        
        if (stake.btcAmount == 0) {
            return (0, 0, 0, 0, 0, baseTierAPY);
        }
        
        uint256 userRatio = (stake.coreAmount / 1e10) / stake.btcAmount;
        uint8 userTier = uint8(_calculateTier(userRatio));
        uint256 userAPY = _getTierAPY(userRatio);
        
        return (
            userTier,
            stake.coreAmount,
            stake.btcAmount,
            userRatio,
            stake.accumulatedRewards,
            userAPY
        );
    }
    
    /**
     * @dev Calculate tier for given amounts (for frontend preview)
     */
    function calculateTier(uint256 coreAmount, uint256 btcAmount) external pure returns (uint8) {
        if (btcAmount == 0) return 0;
        uint256 ratio = (coreAmount / 1e10) / btcAmount;
        return uint8(_calculateTier(ratio));
    }
    
    /**
     * @dev Get pending rewards for a user
     */
    function estimateRewards(address user) external view returns (uint256) {
        UserStake memory stake = userStakes[user];
        
        if (stake.lastRewardTime == 0 || stake.btcAmount == 0) {
            return stake.accumulatedRewards;
        }
        
        uint256 timeElapsed = block.timestamp - stake.lastRewardTime;
        uint256 ratio = (stake.coreAmount / 1e10) / stake.btcAmount;
        uint256 tierAPY = _getTierAPY(ratio);
        
        uint256 annualRewards = (stake.btcAmount * tierAPY) / 10000;
        uint256 periodRewards = (annualRewards * timeElapsed) / 365 days;
        
        return stake.accumulatedRewards + periodRewards;
    }
    
    // Admin functions
    
    /**
     * @dev Fund the reward pool
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        coreToken.transferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
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
}