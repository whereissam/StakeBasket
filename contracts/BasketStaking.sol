// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./StakeBasketToken.sol";

/**
 * @title BasketStaking
 * @dev Staking contract for BASKET tokens to earn protocol fee rewards
 * Implements tiered benefits system based on staking amounts
 */
contract BasketStaking is ReentrancyGuard, Ownable {
    StakeBasketToken public immutable basketToken;
    
    // Staking parameters
    uint256 public totalStaked;
    uint256 public rewardIndex;
    uint256 public lastUpdateTime;
    uint256 public constant PRECISION = 1e18;
    
    // Tier thresholds (in BASKET tokens)
    uint256 public constant BRONZE_THRESHOLD = 100e18;      // 100 BASKET
    uint256 public constant SILVER_THRESHOLD = 1000e18;     // 1,000 BASKET
    uint256 public constant GOLD_THRESHOLD = 10000e18;      // 10,000 BASKET
    uint256 public constant PLATINUM_THRESHOLD = 100000e18; // 100,000 BASKET
    
    // Tier multipliers (basis points, 10000 = 1x)
    uint256 public constant BRONZE_MULTIPLIER = 10000;   // 1x
    uint256 public constant SILVER_MULTIPLIER = 11000;   // 1.1x
    uint256 public constant GOLD_MULTIPLIER = 12500;     // 1.25x
    uint256 public constant PLATINUM_MULTIPLIER = 15000; // 1.5x
    
    enum Tier {
        None,
        Bronze,
        Silver,
        Gold,
        Platinum
    }
    
    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 pendingRewards;
        uint256 lastClaimTime;
        Tier tier;
    }
    
    // Storage
    mapping(address => StakeInfo) public stakeInfo;
    mapping(Tier => uint256) public tierCounts;
    uint256 public protocolFeePool;
    
    // Events
    event Staked(address indexed user, uint256 amount, Tier tier);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event ProtocolFeesDeposited(uint256 amount);
    event TierUpgraded(address indexed user, Tier oldTier, Tier newTier);
    
    constructor(
        address _basketToken,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_basketToken != address(0), "BasketStaking: invalid token address");
        basketToken = StakeBasketToken(_basketToken);
        lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Stake BASKET tokens
     * @param amount Amount of BASKET tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "BasketStaking: amount must be greater than 0");
        require(basketToken.balanceOf(msg.sender) >= amount, "BasketStaking: insufficient balance");
        
        _updateRewards();
        _updateUserRewards(msg.sender);
        
        // Transfer tokens from user to this contract
        basketToken.transferFrom(msg.sender, address(this), amount);
        
        StakeInfo storage userStake = stakeInfo[msg.sender];
        Tier oldTier = userStake.tier;
        
        userStake.amount += amount;
        totalStaked += amount;
        
        // Update tier based on new staked amount
        Tier newTier = _calculateTier(userStake.amount);
        if (newTier != oldTier) {
            if (oldTier != Tier.None) {
                tierCounts[oldTier]--;
            }
            tierCounts[newTier]++;
            userStake.tier = newTier;
            emit TierUpgraded(msg.sender, oldTier, newTier);
        }
        
        userStake.rewardDebt = (userStake.amount * rewardIndex) / PRECISION;
        
        emit Staked(msg.sender, amount, newTier);
    }
    
    /**
     * @dev Unstake BASKET tokens
     * @param amount Amount of BASKET tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "BasketStaking: amount must be greater than 0");
        
        StakeInfo storage userStake = stakeInfo[msg.sender];
        require(userStake.amount >= amount, "BasketStaking: insufficient staked amount");
        
        _updateRewards();
        _updateUserRewards(msg.sender);
        
        Tier oldTier = userStake.tier;
        userStake.amount -= amount;
        totalStaked -= amount;
        
        // Update tier based on new staked amount
        Tier newTier = _calculateTier(userStake.amount);
        if (newTier != oldTier) {
            tierCounts[oldTier]--;
            if (newTier != Tier.None) {
                tierCounts[newTier]++;
            }
            userStake.tier = newTier;
            emit TierUpgraded(msg.sender, oldTier, newTier);
        }
        
        userStake.rewardDebt = (userStake.amount * rewardIndex) / PRECISION;
        
        // Transfer tokens back to user
        basketToken.transfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewards();
        _updateUserRewards(msg.sender);
        
        StakeInfo storage userStake = stakeInfo[msg.sender];
        uint256 rewards = userStake.pendingRewards;
        
        require(rewards > 0, "BasketStaking: no rewards to claim");
        require(protocolFeePool >= rewards, "BasketStaking: insufficient reward pool");
        
        userStake.pendingRewards = 0;
        userStake.lastClaimTime = block.timestamp;
        protocolFeePool -= rewards;
        
        // Transfer rewards in ETH (or could be BASKET tokens)
        (bool success, ) = payable(msg.sender).call{value: rewards}("");
        require(success, "BasketStaking: reward transfer failed");
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Deposit protocol fees to be distributed as rewards
     */
    function depositProtocolFees() external payable {
        require(msg.value > 0, "BasketStaking: no fees to deposit");
        
        _updateRewards();
        
        if (totalStaked > 0) {
            uint256 rewardPerToken = (msg.value * PRECISION) / totalStaked;
            rewardIndex += rewardPerToken;
        }
        
        protocolFeePool += msg.value;
        
        emit ProtocolFeesDeposited(msg.value);
    }
    
    /**
     * @dev Calculate tier based on staked amount
     * @param stakedAmount Amount of staked tokens
     * @return Tier of the user
     */
    function _calculateTier(uint256 stakedAmount) internal pure returns (Tier) {
        if (stakedAmount >= PLATINUM_THRESHOLD) {
            return Tier.Platinum;
        } else if (stakedAmount >= GOLD_THRESHOLD) {
            return Tier.Gold;
        } else if (stakedAmount >= SILVER_THRESHOLD) {
            return Tier.Silver;
        } else if (stakedAmount >= BRONZE_THRESHOLD) {
            return Tier.Bronze;
        } else {
            return Tier.None;
        }
    }
    
    /**
     * @dev Get tier multiplier
     * @param tier Tier to get multiplier for
     * @return Multiplier in basis points
     */
    function getTierMultiplier(Tier tier) public pure returns (uint256) {
        if (tier == Tier.Platinum) {
            return PLATINUM_MULTIPLIER;
        } else if (tier == Tier.Gold) {
            return GOLD_MULTIPLIER;
        } else if (tier == Tier.Silver) {
            return SILVER_MULTIPLIER;
        } else if (tier == Tier.Bronze) {
            return BRONZE_MULTIPLIER;
        } else {
            return 10000; // No tier = 1x multiplier
        }
    }
    
    /**
     * @dev Update global rewards
     */
    function _updateRewards() internal {
        lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Update user-specific rewards
     * @param user Address of the user
     */
    function _updateUserRewards(address user) internal {
        StakeInfo storage userStake = stakeInfo[user];
        
        if (userStake.amount > 0) {
            uint256 pending = ((userStake.amount * rewardIndex) / PRECISION) - userStake.rewardDebt;
            
            // Apply tier multiplier
            uint256 multiplier = getTierMultiplier(userStake.tier);
            pending = (pending * multiplier) / 10000;
            
            userStake.pendingRewards += pending;
        }
    }
    
    /**
     * @dev Get pending rewards for a user
     * @param user Address of the user
     * @return Amount of pending rewards
     */
    function getPendingRewards(address user) external view returns (uint256) {
        StakeInfo storage userStake = stakeInfo[user];
        
        if (userStake.amount == 0) {
            return userStake.pendingRewards;
        }
        
        uint256 pending = ((userStake.amount * rewardIndex) / PRECISION) - userStake.rewardDebt;
        
        // Apply tier multiplier
        uint256 multiplier = getTierMultiplier(userStake.tier);
        pending = (pending * multiplier) / 10000;
        
        return userStake.pendingRewards + pending;
    }
    
    /**
     * @dev Get user's tier
     * @param user Address of the user
     * @return User's current tier
     */
    function getUserTier(address user) external view returns (Tier) {
        return stakeInfo[user].tier;
    }
    
    /**
     * @dev Get user's staking information
     * @param user Address of the user
     * @return amount Staked amount
     * @return pendingRewards Pending rewards
     * @return lastClaimTime Last claim timestamp
     * @return tier User's tier
     */
    function getUserStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 pendingRewards,
        uint256 lastClaimTime,
        Tier tier
    ) {
        StakeInfo storage userStake = stakeInfo[user];
        return (
            userStake.amount,
            this.getPendingRewards(user),
            userStake.lastClaimTime,
            userStake.tier
        );
    }
    
    /**
     * @dev Get tier benefits for a specific tier
     * @param tier Tier to get benefits for
     * @return threshold Minimum tokens required for tier
     * @return multiplier Reward multiplier in basis points
     * @return benefits Description of tier benefits
     */
    function getTierBenefits(Tier tier) external pure returns (
        uint256 threshold,
        uint256 multiplier,
        string memory benefits
    ) {
        if (tier == Tier.Platinum) {
            return (
                PLATINUM_THRESHOLD,
                PLATINUM_MULTIPLIER,
                "50% fee reduction, 1.5x voting power, priority support, exclusive strategies"
            );
        } else if (tier == Tier.Gold) {
            return (
                GOLD_THRESHOLD,
                GOLD_MULTIPLIER,
                "25% fee reduction, 1.25x voting power, early access to strategies"
            );
        } else if (tier == Tier.Silver) {
            return (
                SILVER_THRESHOLD,
                SILVER_MULTIPLIER,
                "10% fee reduction, 1.1x voting power"
            );
        } else if (tier == Tier.Bronze) {
            return (
                BRONZE_THRESHOLD,
                BRONZE_MULTIPLIER,
                "5% fee reduction"
            );
        } else {
            return (0, 10000, "No benefits");
        }
    }
    
    /**
     * @dev Check if user qualifies for fee reduction
     * @param user Address of the user
     * @return Fee reduction percentage (basis points)
     */
    function getFeeReduction(address user) external view returns (uint256) {
        Tier tier = stakeInfo[user].tier;
        
        if (tier == Tier.Platinum) {
            return 5000; // 50% reduction
        } else if (tier == Tier.Gold) {
            return 2500; // 25% reduction
        } else if (tier == Tier.Silver) {
            return 1000; // 10% reduction
        } else if (tier == Tier.Bronze) {
            return 500;  // 5% reduction
        } else {
            return 0;    // No reduction
        }
    }
    
    /**
     * @dev Get voting power multiplier for governance
     * @param user Address of the user
     * @return Voting power multiplier (basis points)
     */
    function getVotingMultiplier(address user) external view returns (uint256) {
        return getTierMultiplier(stakeInfo[user].tier);
    }
    
    /**
     * @dev Emergency withdraw function (only owner)
     * @param token Token address to withdraw (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "BasketStaking: ETH transfer failed");
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    // Allow contract to receive ETH for fee distribution
    receive() external payable {
        if (msg.value > 0) {
            this.depositProtocolFees{value: msg.value}();
        }
    }
}