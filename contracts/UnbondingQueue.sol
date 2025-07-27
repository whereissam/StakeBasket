// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UnbondingQueue
 * @dev Manages unbonding periods and withdrawal queues for staked assets
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
    uint256 public constant CORE_UNBONDING_PERIOD = 7 days;
    uint256 public constant LSTBTC_UNBONDING_PERIOD = 1 days;
    uint256 public constant MAX_INSTANT_WITHDRAWAL = 100000 ether; // 100k tokens

    // State variables
    mapping(address => UnbondingRequest[]) public userUnbondingRequests;
    mapping(string => uint256) public totalQueuedByAsset;
    mapping(string => uint256) public availableLiquidity;
    
    UnbondingRequest[] public globalQueue;
    uint256 public nextRequestId;

    // Events
    event UnbondingRequested(
        address indexed user, 
        uint256 indexed requestId, 
        uint256 amount, 
        string assetType, 
        uint256 unlockTime
    );
    event InstantWithdrawal(address indexed user, uint256 amount, string assetType);
    event UnbondingProcessed(address indexed user, uint256 indexed requestId, uint256 amount);

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
     * @dev Check if instant withdrawal is possible
     */
    function canWithdrawInstantly(uint256 amount, string memory assetType) 
        public 
        view 
        returns (bool) 
    {
        return amount <= MAX_INSTANT_WITHDRAWAL && 
               amount <= availableLiquidity[assetType];
    }

    /**
     * @dev Process instant withdrawal
     */
    function processInstantWithdrawal(
        address user,
        uint256 amount,
        string memory assetType
    ) external onlyOwner {
        require(canWithdrawInstantly(amount, assetType), "UnbondingQueue: instant withdrawal not available");
        
        availableLiquidity[assetType] -= amount;
        
        emit InstantWithdrawal(user, amount, assetType);
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
     * @dev Update available liquidity for instant withdrawals
     */
    function updateAvailableLiquidity(string memory assetType, uint256 amount) 
        external 
        onlyOwner 
    {
        availableLiquidity[assetType] = amount;
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
}