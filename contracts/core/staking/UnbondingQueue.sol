// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UnbondingQueue
 * @dev Enhanced unbonding queue with liquidity pool for instant withdrawals
 * 
 * LIQUIDITY POOL DESIGN:
 * - Instant withdrawal for amounts < 100K tokens when liquidity is available
 * - Liquidity pool funded by:
 *   1. Protocol reserves (portion of fund assets remain unstaked)
 *   2. User deposits waiting to be staked
 *   3. Recently claimed rewards
 *   4. Optional external liquidity providers
 * 
 * FUNDING MECHANISMS:
 * - Reserve Pool: 5-10% of total assets kept liquid for instant withdrawals
 * - Recycling: Completed unbonding requests replenish liquidity pool
 * - Dynamic Sizing: Pool size adjusts based on withdrawal demand patterns
 * - Emergency Liquidity: External providers can supply liquidity for premium
 */
contract UnbondingQueue is Ownable, ReentrancyGuard {
    struct UnbondingRequest {
        address user;
        uint256 amount;
        uint256 requestTime;
        uint256 unlockTime;
        bool processed;
        string assetType; // "CORE" or "lstBTC"
    }

    struct QueueInfo {
        uint256 totalQueued;
        uint256 averageWaitTime;
        uint256 position;
        uint256 estimatedUnlockTime;
    }

    // Constants
    uint256 public constant CORE_UNBONDING_PERIOD = 1 days; // Reduced for testing
    uint256 public constant LSTBTC_UNBONDING_PERIOD = 1 days;
    uint256 public constant MAX_INSTANT_WITHDRAWAL = 100000 ether; // 100k tokens

    // State variables
    mapping(address => UnbondingRequest[]) public userUnbondingRequests;
    mapping(string => uint256) public totalQueuedByAsset;
    mapping(string => uint256) public availableLiquidity;
    
    UnbondingRequest[] public globalQueue;
    uint256 public nextRequestId;
    
    // Enhanced liquidity pool management
    mapping(string => uint256) public reservePoolSize; // Target reserve size for each asset
    mapping(string => uint256) public reservePoolRatio; // Percentage of total to keep liquid (basis points)
    mapping(address => mapping(string => uint256)) public liquidityProviderShares;
    mapping(string => uint256) public totalLiquidityProviderShares;
    mapping(string => uint256) public liquidityProviderRewards;
    
    // Liquidity pool parameters
    uint256 public constant DEFAULT_RESERVE_RATIO = 500; // 5% default reserve
    uint256 public instantWithdrawalFee = 25; // 0.25% fee for instant withdrawals
    uint256 public liquidityProviderFee = 10; // 0.1% fee goes to liquidity providers
    uint256 public maxInstantWithdrawalRatio = 1000; // Max 10% of pool per instant withdrawal
    
    // Dynamic sizing parameters
    uint256 public demandSmoothingFactor = 100; // Basis points for demand-based pool sizing

    // Events
    event UnbondingRequested(
        address indexed user, 
        uint256 indexed requestId, 
        uint256 amount, 
        string assetType, 
        uint256 unlockTime
    );
    event InstantWithdrawal(address indexed user, uint256 amount, string assetType, uint256 fee);
    event UnbondingProcessed(address indexed user, uint256 indexed requestId, uint256 amount);
    event LiquidityProvided(address indexed provider, string assetType, uint256 amount, uint256 shares);
    event LiquidityWithdrawn(address indexed provider, string assetType, uint256 amount, uint256 shares);
    event ReservePoolSized(string assetType, uint256 newSize, uint256 ratio);
    event LiquidityRebalanced(string assetType, uint256 newAvailable, uint256 targetSize);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Request withdrawal with unbonding period
     */
    function requestUnbonding(
        address user,
        uint256 amount,
        string memory assetType
    ) external onlyOwner returns (uint256 requestId) {
        uint256 unbondingPeriod = _getUnbondingPeriod(assetType);
        uint256 unlockTime = block.timestamp + unbondingPeriod;

        UnbondingRequest memory request = UnbondingRequest({
            user: user,
            amount: amount,
            requestTime: block.timestamp,
            unlockTime: unlockTime,
            processed: false,
            assetType: assetType
        });

        userUnbondingRequests[user].push(request);
        globalQueue.push(request);
        
        requestId = nextRequestId++;
        totalQueuedByAsset[assetType] += amount;

        emit UnbondingRequested(user, requestId, amount, assetType, unlockTime);
        
        return requestId;
    }

    /**
     * @dev Enhanced instant withdrawal eligibility check
     */
    function canWithdrawInstantly(uint256 amount, string memory assetType) 
        public 
        view 
        returns (bool) 
    {
        uint256 maxSingleWithdrawal = (availableLiquidity[assetType] * maxInstantWithdrawalRatio) / 10000;
        return amount <= MAX_INSTANT_WITHDRAWAL && 
               amount <= availableLiquidity[assetType] &&
               amount <= maxSingleWithdrawal;
    }
    
    /**
     * @dev Get instant withdrawal fee for amount
     */
    function getInstantWithdrawalFee(uint256 amount) public view returns (uint256) {
        return (amount * instantWithdrawalFee) / 10000;
    }

    /**
     * @dev Enhanced instant withdrawal processing with fees
     */
    function processInstantWithdrawal(
        address user,
        uint256 amount,
        string memory assetType
    ) external onlyOwner returns (uint256 netAmount, uint256 fee) {
        require(canWithdrawInstantly(amount, assetType), "UnbondingQueue: instant withdrawal not available");
        
        fee = getInstantWithdrawalFee(amount);
        netAmount = amount - fee;
        
        // Update liquidity
        availableLiquidity[assetType] -= amount;
        
        // Distribute fee
        uint256 lpFee = (fee * liquidityProviderFee * 10000) / (instantWithdrawalFee * 10000);
        liquidityProviderRewards[assetType] += lpFee;
        
        emit InstantWithdrawal(user, netAmount, assetType, fee);
        
        return (netAmount, fee);
    }

    /**
     * @dev Get queue information for user
     */
    function getQueueInfo(address user, string memory assetType) 
        external 
        view 
        returns (QueueInfo memory info) 
    {
        UnbondingRequest[] memory userRequests = userUnbondingRequests[user];
        
        uint256 userQueuedAmount = 0;
        uint256 earliestUnlock = type(uint256).max;
        uint256 position = 0;

        // Calculate user's position and earliest unlock
        for (uint256 i = 0; i < userRequests.length; i++) {
            if (!userRequests[i].processed && 
                keccak256(bytes(userRequests[i].assetType)) == keccak256(bytes(assetType))) {
                userQueuedAmount += userRequests[i].amount;
                if (userRequests[i].unlockTime < earliestUnlock) {
                    earliestUnlock = userRequests[i].unlockTime;
                }
            }
        }

        // Calculate position in global queue
        for (uint256 i = 0; i < globalQueue.length; i++) {
            if (globalQueue[i].user == user && !globalQueue[i].processed) {
                position = i + 1;
                break;
            }
        }

        info = QueueInfo({
            totalQueued: totalQueuedByAsset[assetType],
            averageWaitTime: _getUnbondingPeriod(assetType),
            position: position,
            estimatedUnlockTime: earliestUnlock == type(uint256).max ? 0 : earliestUnlock
        });
    }

    /**
     * @dev Get all pending requests for user
     */
    function getUserPendingRequests(address user) 
        external 
        view 
        returns (UnbondingRequest[] memory) 
    {
        UnbondingRequest[] memory allRequests = userUnbondingRequests[user];
        uint256 pendingCount = 0;

        // Count pending requests
        for (uint256 i = 0; i < allRequests.length; i++) {
            if (!allRequests[i].processed) {
                pendingCount++;
            }
        }

        // Create array of pending requests
        UnbondingRequest[] memory pendingRequests = new UnbondingRequest[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allRequests.length; i++) {
            if (!allRequests[i].processed) {
                pendingRequests[index] = allRequests[i];
                index++;
            }
        }

        return pendingRequests;
    }

    /**
     * @dev Process ready unbonding requests
     */
    function processReadyRequests() external onlyOwner returns (uint256 processed) {
        for (uint256 i = 0; i < globalQueue.length; i++) {
            if (!globalQueue[i].processed && 
                block.timestamp >= globalQueue[i].unlockTime) {
                
                globalQueue[i].processed = true;
                totalQueuedByAsset[globalQueue[i].assetType] -= globalQueue[i].amount;
                
                emit UnbondingProcessed(
                    globalQueue[i].user, 
                    i, 
                    globalQueue[i].amount
                );
                
                processed++;
            }
        }
    }

    /**
     * @dev Provide liquidity to the pool
     */
    function provideLiquidity(address provider, string memory assetType, uint256 amount) 
        external 
        onlyOwner 
        returns (uint256 shares)
    {
        require(amount > 0, "UnbondingQueue: invalid amount");
        
        // Calculate shares to mint
        if (totalLiquidityProviderShares[assetType] == 0) {
            shares = amount; // 1:1 for first provider
        } else {
            shares = (amount * totalLiquidityProviderShares[assetType]) / availableLiquidity[assetType];
        }
        
        // Update state
        liquidityProviderShares[provider][assetType] += shares;
        totalLiquidityProviderShares[assetType] += shares;
        availableLiquidity[assetType] += amount;
        
        emit LiquidityProvided(provider, assetType, amount, shares);
        
        return shares;
    }
    
    /**
     * @dev Withdraw liquidity from the pool
     */
    function withdrawLiquidity(address provider, string memory assetType, uint256 shares) 
        external 
        onlyOwner 
        returns (uint256 amount)
    {
        require(shares > 0, "UnbondingQueue: invalid shares");
        require(liquidityProviderShares[provider][assetType] >= shares, "UnbondingQueue: insufficient shares");
        
        // Calculate amount to withdraw
        amount = (shares * availableLiquidity[assetType]) / totalLiquidityProviderShares[assetType];
        
        // Include earned rewards
        uint256 providerRewardShare = (liquidityProviderRewards[assetType] * shares) / totalLiquidityProviderShares[assetType];
        amount += providerRewardShare;
        
        // Update state
        liquidityProviderShares[provider][assetType] -= shares;
        totalLiquidityProviderShares[assetType] -= shares;
        availableLiquidity[assetType] -= (amount - providerRewardShare);
        liquidityProviderRewards[assetType] -= providerRewardShare;
        
        emit LiquidityWithdrawn(provider, assetType, amount, shares);
        
        return amount;
    }
    
    /**
     * @dev Update available liquidity for instant withdrawals
     */
    function updateAvailableLiquidity(string memory assetType, uint256 amount) 
        external 
        onlyOwner 
    {
        availableLiquidity[assetType] = amount;
        
        // Auto-size reserve pool based on total assets
        _autoSizeReservePool(assetType);
    }
    
    /**
     * @dev Automatically size reserve pool based on demand patterns
     */
    function _autoSizeReservePool(string memory assetType) internal {
        uint256 currentRatio = reservePoolRatio[assetType];
        if (currentRatio == 0) {
            currentRatio = DEFAULT_RESERVE_RATIO;
        }
        
        // Calculate target reserve size
        uint256 totalAssetValue = availableLiquidity[assetType] + totalQueuedByAsset[assetType];
        uint256 targetReserveSize = (totalAssetValue * currentRatio) / 10000;
        
        reservePoolSize[assetType] = targetReserveSize;
        
        emit ReservePoolSized(assetType, targetReserveSize, currentRatio);
    }

    /**
     * @dev Get unbonding period for asset type
     */
    function _getUnbondingPeriod(string memory assetType) 
        private 
        pure 
        returns (uint256) 
    {
        if (keccak256(bytes(assetType)) == keccak256(bytes("CORE"))) {
            return CORE_UNBONDING_PERIOD;
        } else if (keccak256(bytes(assetType)) == keccak256(bytes("lstBTC"))) {
            return LSTBTC_UNBONDING_PERIOD;
        }
        return CORE_UNBONDING_PERIOD; // Default
    }

    /**
     * @dev Get queue statistics
     */
    function getQueueStats() 
        external 
        view 
        returns (
            uint256 totalCoreQueued,
            uint256 totalLstBTCQueued,
            uint256 totalRequests,
            uint256 avgWaitTime
        ) 
    {
        totalCoreQueued = totalQueuedByAsset["CORE"];
        totalLstBTCQueued = totalQueuedByAsset["lstBTC"];
        totalRequests = globalQueue.length;
        
        uint256 totalWaitTime = 0;
        uint256 activeRequests = 0;
        
        for (uint256 i = 0; i < globalQueue.length; i++) {
            if (!globalQueue[i].processed) {
                totalWaitTime += (globalQueue[i].unlockTime - globalQueue[i].requestTime);
                activeRequests++;
            }
        }
        
        avgWaitTime = activeRequests > 0 ? totalWaitTime / activeRequests : 0;
    }
    
    /**
     * @dev Set reserve pool parameters
     */
    function setReservePoolRatio(string memory assetType, uint256 ratio) external onlyOwner {
        require(ratio <= 2000, "UnbondingQueue: ratio too high"); // Max 20%
        reservePoolRatio[assetType] = ratio;
        _autoSizeReservePool(assetType);
    }
    
    /**
     * @dev Set instant withdrawal parameters
     */
    function setInstantWithdrawalParams(
        uint256 _instantWithdrawalFee,
        uint256 _liquidityProviderFee,
        uint256 _maxInstantWithdrawalRatio
    ) external onlyOwner {
        require(_instantWithdrawalFee <= 100, "UnbondingQueue: fee too high"); // Max 1%
        require(_liquidityProviderFee <= 50, "UnbondingQueue: LP fee too high"); // Max 0.5%
        require(_maxInstantWithdrawalRatio <= 2000, "UnbondingQueue: ratio too high"); // Max 20%
        
        instantWithdrawalFee = _instantWithdrawalFee;
        liquidityProviderFee = _liquidityProviderFee;
        maxInstantWithdrawalRatio = _maxInstantWithdrawalRatio;
    }
    
    /**
     * @dev Get liquidity provider information
     */
    function getLiquidityProviderInfo(address provider, string memory assetType) 
        external 
        view 
        returns (
            uint256 shares,
            uint256 liquidityValue,
            uint256 earnedRewards
        )
    {
        shares = liquidityProviderShares[provider][assetType];
        
        if (totalLiquidityProviderShares[assetType] > 0) {
            liquidityValue = (shares * availableLiquidity[assetType]) / totalLiquidityProviderShares[assetType];
            earnedRewards = (liquidityProviderRewards[assetType] * shares) / totalLiquidityProviderShares[assetType];
        }
    }
    
    /**
     * @dev Get pool health metrics
     */
    function getPoolHealth(string memory assetType) 
        external 
        view 
        returns (
            uint256 utilizationRate,
            uint256 liquidityRatio,
            bool isHealthy
        )
    {
        uint256 totalValue = availableLiquidity[assetType] + totalQueuedByAsset[assetType];
        
        if (totalValue > 0) {
            utilizationRate = (totalQueuedByAsset[assetType] * 10000) / totalValue;
            liquidityRatio = (availableLiquidity[assetType] * 10000) / totalValue;
            
            // Pool is healthy if liquidity ratio is above reserve target
            uint256 targetRatio = reservePoolRatio[assetType];
            if (targetRatio == 0) targetRatio = DEFAULT_RESERVE_RATIO;
            
            isHealthy = liquidityRatio >= targetRatio;
        }
    }
    
    /**
     * @dev Rebalance liquidity pool
     */
    function rebalanceLiquidity(string memory assetType, uint256 targetLiquidity) external onlyOwner {
        require(targetLiquidity <= reservePoolSize[assetType] * 120 / 100, "UnbondingQueue: target too high");
        
        availableLiquidity[assetType] = targetLiquidity;
        
        emit LiquidityRebalanced(assetType, targetLiquidity, reservePoolSize[assetType]);
    }
}