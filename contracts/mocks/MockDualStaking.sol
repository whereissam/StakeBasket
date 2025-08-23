// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockDualStaking
 * @dev Simple mock of the CoreDAO dual staking contract for local testing
 */
contract MockDualStaking is ReentrancyGuard {
    
    // Simple staking records
    mapping(address => uint256) public coreStaked;
    mapping(address => uint256) public btcStaked;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public lastStakeTime;
    
    // Mock rewards rate (10% annual, simplified)
    uint256 public constant REWARD_RATE = 10;
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    
    IERC20 public btcToken;
    
    event CoreStaked(address indexed user, uint256 amount);
    event BtcStaked(address indexed user, uint256 amount);
    event DualStaked(address indexed user, uint256 coreAmount, uint256 btcAmount);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    constructor() {
        // Constructor can be empty for mock
    }
    
    /**
     * @dev Set BTC token address (for testing setup)
     */
    function setBtcToken(address _btcToken) external {
        btcToken = IERC20(_btcToken);
    }
    
    /**
     * @dev Mock CORE staking (receives native ETH)
     */
    function stakeCORE(uint256 amount) external payable nonReentrant {
        require(msg.value == amount, "MockDualStaking: value mismatch");
        require(amount > 0, "MockDualStaking: zero amount");
        
        _updateRewards(msg.sender);
        coreStaked[msg.sender] += amount;
        lastStakeTime[msg.sender] = block.timestamp;
        
        emit CoreStaked(msg.sender, amount);
    }
    
    /**
     * @dev Mock BTC token staking
     */
    function stakeBTC(uint256 amount) external nonReentrant {
        require(amount > 0, "MockDualStaking: zero amount");
        require(address(btcToken) != address(0), "MockDualStaking: BTC token not set");
        
        btcToken.transferFrom(msg.sender, address(this), amount);
        
        _updateRewards(msg.sender);
        btcStaked[msg.sender] += amount;
        lastStakeTime[msg.sender] = block.timestamp;
        
        emit BtcStaked(msg.sender, amount);
    }
    
    /**
     * @dev Mock dual staking (CORE + BTC together for bonus)
     */
    function stakeDual(uint256 btcAmount) external payable nonReentrant {
        uint256 coreAmount = msg.value;
        require(coreAmount > 0 && btcAmount > 0, "MockDualStaking: zero amounts");
        require(address(btcToken) != address(0), "MockDualStaking: BTC token not set");
        
        btcToken.transferFrom(msg.sender, address(this), btcAmount);
        
        _updateRewards(msg.sender);
        coreStaked[msg.sender] += coreAmount;
        btcStaked[msg.sender] += btcAmount;
        lastStakeTime[msg.sender] = block.timestamp;
        
        emit DualStaked(msg.sender, coreAmount, btcAmount);
    }
    
    /**
     * @dev Mock unstaking CORE
     */
    function unstakeCORE(uint256 amount) external nonReentrant {
        require(coreStaked[msg.sender] >= amount, "MockDualStaking: insufficient stake");
        
        _updateRewards(msg.sender);
        coreStaked[msg.sender] -= amount;
        
        // Send back native ETH
        payable(msg.sender).transfer(amount);
    }
    
    /**
     * @dev Mock unstaking BTC
     */
    function unstakeBTC(uint256 amount) external nonReentrant {
        require(btcStaked[msg.sender] >= amount, "MockDualStaking: insufficient stake");
        
        _updateRewards(msg.sender);
        btcStaked[msg.sender] -= amount;
        
        btcToken.transfer(msg.sender, amount);
    }
    
    /**
     * @dev Mock dual unstaking (percentage-based)
     */
    function unstakeDual(uint256 shares) external nonReentrant {
        require(shares <= 10000, "MockDualStaking: invalid shares");
        require(coreStaked[msg.sender] > 0 || btcStaked[msg.sender] > 0, "MockDualStaking: no stake");
        
        _updateRewards(msg.sender);
        
        uint256 coreToUnstake = (coreStaked[msg.sender] * shares) / 10000;
        uint256 btcToUnstake = (btcStaked[msg.sender] * shares) / 10000;
        
        if (coreToUnstake > 0) {
            coreStaked[msg.sender] -= coreToUnstake;
            payable(msg.sender).transfer(coreToUnstake);
        }
        
        if (btcToUnstake > 0) {
            btcStaked[msg.sender] -= btcToUnstake;
            btcToken.transfer(msg.sender, btcToUnstake);
        }
    }
    
    /**
     * @dev Mock reward claiming
     */
    function claimRewards() external nonReentrant {
        _updateRewards(msg.sender);
        
        uint256 rewardAmount = rewards[msg.sender];
        if (rewardAmount > 0) {
            rewards[msg.sender] = 0;
            payable(msg.sender).transfer(rewardAmount);
            emit RewardsClaimed(msg.sender, rewardAmount);
        }
    }
    
    /**
     * @dev Mock CORE reward claiming
     */
    function claimCoreRewards() external nonReentrant {
        claimRewards(); // Same as general claim for simplicity
    }
    
    /**
     * @dev Internal function to update rewards (simplified)
     */
    function _updateRewards(address user) internal {
        if (lastStakeTime[user] == 0) return;
        
        uint256 timeElapsed = block.timestamp - lastStakeTime[user];
        uint256 totalStaked = coreStaked[user] + btcStaked[user];
        
        if (totalStaked > 0) {
            uint256 reward = (totalStaked * REWARD_RATE * timeElapsed) / (100 * SECONDS_PER_YEAR);
            rewards[user] += reward;
        }
        
        lastStakeTime[user] = block.timestamp;
    }
    
    /**
     * @dev Get user stake info
     */
    function getUserStakeInfo(address user) external view returns (
        uint256 coreAmount,
        uint256 btcAmount,
        uint256 pendingRewards,
        uint256 stakeTime
    ) {
        coreAmount = coreStaked[user];
        btcAmount = btcStaked[user];
        pendingRewards = rewards[user];
        stakeTime = lastStakeTime[user];
        
        // Add pending rewards since last update
        if (stakeTime > 0) {
            uint256 timeElapsed = block.timestamp - stakeTime;
            uint256 totalStaked = coreAmount + btcAmount;
            if (totalStaked > 0) {
                uint256 additionalReward = (totalStaked * REWARD_RATE * timeElapsed) / (100 * SECONDS_PER_YEAR);
                pendingRewards += additionalReward;
            }
        }
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}