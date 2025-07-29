// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/ISparks.sol";

/**
 * @title SparksManager
 * @dev Manages Sparks point accumulation and utility for StakeBasket ecosystem
 * This contract tracks user engagement and provides rewards through the Sparks system
 */
contract SparksManager is ISparks, Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Sparks balances for each user
    mapping(address => uint256) private _sparksBalances;
    
    // Total Sparks earned by each user (lifetime)
    mapping(address => uint256) private _totalSparksEarned;
    
    // Last update timestamp for each user
    mapping(address => uint256) private _lastUpdateTime;
    
    // User earning history
    mapping(address => SparksRecord[]) private _userHistory;
    
    // Authorized contracts that can award/spend Sparks
    mapping(address => bool) public authorizedContracts;
    
    // Earning rates (Sparks per token per day)
    uint256 public constant BASKET_HOLDING_RATE = 1e18; // 1 Spark per BASKET per day
    uint256 public constant STAKING_BONUS_RATE = 2e18;  // 2 Sparks per BASKET staked per day
    uint256 public constant DUAL_STAKING_BONUS_RATE = 3e18; // 3 Sparks for dual staking per day
    
    // Fee reduction thresholds
    uint256 public constant BRONZE_THRESHOLD = 1000e18;  // 1,000 Sparks for 5% fee reduction
    uint256 public constant SILVER_THRESHOLD = 5000e18;  // 5,000 Sparks for 10% fee reduction
    uint256 public constant GOLD_THRESHOLD = 20000e18;   // 20,000 Sparks for 25% fee reduction
    uint256 public constant PLATINUM_THRESHOLD = 100000e18; // 100,000 Sparks for 50% fee reduction
    
    // Constants for time calculations
    uint256 private constant SECONDS_PER_DAY = 86400;
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() {
        // Owner is automatically authorized
        authorizedContracts[msg.sender] = true;
    }

    /**
     * @dev Add or remove authorized contracts
     * @param contractAddress The contract address to authorize/deauthorize
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuthorizedContract(address contractAddress, bool authorized) external onlyOwner {
        authorizedContracts[contractAddress] = authorized;
        emit AuthorizedContractUpdated(contractAddress, authorized);
    }

    /**
     * @dev Award Sparks points to a user
     * @param user The address to award points to
     * @param amount The amount of points to award
     * @param reason The reason for awarding points
     */
    function awardSparks(address user, uint256 amount, string calldata reason) 
        external 
        override 
        onlyAuthorized 
    {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");

        _sparksBalances[user] = _sparksBalances[user].add(amount);
        _totalSparksEarned[user] = _totalSparksEarned[user].add(amount);
        
        // Record in history
        _userHistory[user].push(SparksRecord({
            timestamp: block.timestamp,
            amount: amount,
            reason: reason,
            isEarning: true
        }));

        emit SparksAwarded(user, amount, reason);
    }

    /**
     * @dev Spend Sparks points from a user's balance
     * @param user The address to spend points from
     * @param amount The amount of points to spend
     * @param reason The reason for spending points
     * @return success Whether the spending was successful
     */
    function spendSparks(address user, uint256 amount, string calldata reason) 
        external 
        override 
        onlyAuthorized 
        returns (bool success) 
    {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        if (_sparksBalances[user] < amount) {
            return false;
        }

        _sparksBalances[user] = _sparksBalances[user].sub(amount);
        
        // Record in history
        _userHistory[user].push(SparksRecord({
            timestamp: block.timestamp,
            amount: amount,
            reason: reason,
            isEarning: false
        }));

        emit SparksSpent(user, amount, reason);
        return true;
    }

    /**
     * @dev Calculate and award Sparks for BASKET token holding
     * @param user The user to award Sparks to
     * @param basketBalance The user's current BASKET balance
     */
    function updateBasketHoldingSparks(address user, uint256 basketBalance) external onlyAuthorized {
        uint256 lastUpdate = _lastUpdateTime[user];
        if (lastUpdate == 0) {
            _lastUpdateTime[user] = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp.sub(lastUpdate);
        if (timeElapsed == 0) return;

        uint256 daysElapsed = timeElapsed.div(SECONDS_PER_DAY);
        if (daysElapsed == 0) return;

        uint256 sparksToAward = basketBalance.mul(BASKET_HOLDING_RATE).mul(daysElapsed).div(1e18);
        
        if (sparksToAward > 0) {
            _sparksBalances[user] = _sparksBalances[user].add(sparksToAward);
            _totalSparksEarned[user] = _totalSparksEarned[user].add(sparksToAward);
            
            _userHistory[user].push(SparksRecord({
                timestamp: block.timestamp,
                amount: sparksToAward,
                reason: "BASKET_HOLDING",
                isEarning: true
            }));

            emit SparksAwarded(user, sparksToAward, "BASKET_HOLDING");
        }

        _lastUpdateTime[user] = block.timestamp;
    }

    /**
     * @dev Get the Sparks balance of a user
     * @param user The address to check
     * @return balance The user's Sparks balance
     */
    function getSparksBalance(address user) external view override returns (uint256 balance) {
        return _sparksBalances[user];
    }

    /**
     * @dev Get the total Sparks earned by a user (lifetime)
     * @param user The address to check
     * @return totalEarned The total Sparks earned by the user
     */
    function getTotalSparksEarned(address user) external view override returns (uint256 totalEarned) {
        return _totalSparksEarned[user];
    }

    /**
     * @dev Check if a user has enough Sparks for a specific action
     * @param user The address to check
     * @param requiredAmount The amount of Sparks required
     * @return hasEnough Whether the user has enough Sparks
     */
    function hasEnoughSparks(address user, uint256 requiredAmount) 
        external 
        view 
        override 
        returns (bool hasEnough) 
    {
        return _sparksBalances[user] >= requiredAmount;
    }

    /**
     * @dev Get the current earning rate for Sparks (points per token per day)
     * @return rate The current earning rate
     */
    function getCurrentEarningRate() external pure override returns (uint256 rate) {
        return BASKET_HOLDING_RATE;
    }

    /**
     * @dev Get user's Sparks earning history
     * @param user The address to check
     * @param offset The starting index for pagination
     * @param limit The number of records to return
     * @return history Array of earning records
     */
    function getSparksHistory(address user, uint256 offset, uint256 limit) 
        external 
        view 
        override 
        returns (SparksRecord[] memory history) 
    {
        uint256 totalRecords = _userHistory[user].length;
        
        if (offset >= totalRecords) {
            return new SparksRecord[](0);
        }

        uint256 end = offset + limit;
        if (end > totalRecords) {
            end = totalRecords;
        }

        uint256 length = end - offset;
        history = new SparksRecord[](length);

        for (uint256 i = 0; i < length; i++) {
            history[i] = _userHistory[user][totalRecords - 1 - offset - i]; // Reverse chronological order
        }

        return history;
    }

    /**
     * @dev Calculate fee reduction percentage based on Sparks balance
     * @param user The user to check
     * @return reductionPercent The fee reduction percentage (0-50)
     */
    function getFeeReduction(address user) external view returns (uint256 reductionPercent) {
        uint256 balance = _sparksBalances[user];
        
        if (balance >= PLATINUM_THRESHOLD) {
            return 50; // 50% reduction
        } else if (balance >= GOLD_THRESHOLD) {
            return 25; // 25% reduction
        } else if (balance >= SILVER_THRESHOLD) {
            return 10; // 10% reduction
        } else if (balance >= BRONZE_THRESHOLD) {
            return 5;  // 5% reduction
        }
        
        return 0; // No reduction
    }

    /**
     * @dev Get user's Sparks tier based on balance
     * @param user The user to check
     * @return tier The user's tier (0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum)
     */
    function getUserTier(address user) external view returns (uint256 tier) {
        uint256 balance = _sparksBalances[user];
        
        if (balance >= PLATINUM_THRESHOLD) {
            return 4; // Platinum
        } else if (balance >= GOLD_THRESHOLD) {
            return 3; // Gold
        } else if (balance >= SILVER_THRESHOLD) {
            return 2; // Silver
        } else if (balance >= BRONZE_THRESHOLD) {
            return 1; // Bronze
        }
        
        return 0; // None
    }

    /**
     * @dev Get detailed user Sparks information
     * @param user The user to check
     * @return balance Current Sparks balance
     * @return totalEarned Total Sparks earned (lifetime)
     * @return tier Current tier (0-4)
     * @return feeReduction Fee reduction percentage (0-50)
     * @return nextTierThreshold Sparks needed for next tier
     */
    function getUserSparksInfo(address user) 
        external 
        view 
        returns (
            uint256 balance,
            uint256 totalEarned,
            uint256 tier,
            uint256 feeReduction,
            uint256 nextTierThreshold
        ) 
    {
        balance = _sparksBalances[user];
        totalEarned = _totalSparksEarned[user];
        
        // Calculate tier
        if (balance >= PLATINUM_THRESHOLD) {
            tier = 4;
            feeReduction = 50;
            nextTierThreshold = 0; // Max tier
        } else if (balance >= GOLD_THRESHOLD) {
            tier = 3;
            feeReduction = 25;
            nextTierThreshold = PLATINUM_THRESHOLD;
        } else if (balance >= SILVER_THRESHOLD) {
            tier = 2;
            feeReduction = 10;
            nextTierThreshold = GOLD_THRESHOLD;
        } else if (balance >= BRONZE_THRESHOLD) {
            tier = 1;
            feeReduction = 5;
            nextTierThreshold = SILVER_THRESHOLD;
        } else {
            tier = 0;
            feeReduction = 0;
            nextTierThreshold = BRONZE_THRESHOLD;
        }
    }

    // Events
    event AuthorizedContractUpdated(address indexed contractAddress, bool authorized);
}