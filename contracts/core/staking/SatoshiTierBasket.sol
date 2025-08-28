// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DualStakingBasket.sol";

/**
 * @title SatoshiTierBasket
 * @dev Specialized BASKET strategy targeting CoreDAO's highest-yield Satoshi Tier
 * Maintains 16,000:1 CORE:BTC ratio for maximum dual staking rewards
 */
contract SatoshiTierBasket is DualStakingBasket {
    
    // Satoshi Tier specific parameters
    uint256 public constant SATOSHI_RATIO = 16000 * 1e18; // 16,000 CORE per 1 BTC
    uint256 public constant MIN_BTC_DEPOSIT = 0.01 * 1e18; // Minimum 0.01 BTC
    uint256 public constant MIN_CORE_DEPOSIT = 160 * 1e18; // Minimum equivalent CORE
    
    // Enhanced rebalancing for high-value tier
    uint256 public constant TIGHT_REBALANCE_THRESHOLD = 100; // 1% for Satoshi tier
    uint256 public constant MAX_REBALANCE_SLIPPAGE = 50; // 0.5% max slippage
    
    // Performance tracking
    uint256 public totalRewardsEarned;
    uint256 public lastRewardClaim;
    uint256 public averageAPY; // Tracked over time
    
    // Emergency safeguards
    bool public emergencyMode;
    uint256 public maxSingleDeposit = 100 * 1e18; // Max 100 BTC per deposit initially
    
    event SatoshiTierAchieved(uint256 timestamp, uint256 ratio);
    event RatioMaintained(uint256 coreAmount, uint256 btcAmount, uint256 ratio);
    event EmergencyModeToggled(bool enabled);
    event PerformanceUpdated(uint256 newAPY, uint256 totalRewards);
    event RewardsCompounded(address indexed user, uint256 rewardAmount, uint256 timestamp);
    
    constructor(
        address _basketToken,
        address _priceFeed,
        address _coreToken,
        address _btcToken,
        address _dualStakingContract,
        address _feeRecipient,
        address initialOwner
    ) DualStakingBasket(
        _basketToken,
        _priceFeed,
        _coreToken,
        _btcToken,
        _dualStakingContract,
        _feeRecipient,
        StakingTier.SATOSHI,
        initialOwner
    ) {
        // Set tighter parameters for Satoshi tier
        rebalanceThreshold = TIGHT_REBALANCE_THRESHOLD;
        maxSlippage = MAX_REBALANCE_SLIPPAGE;
        
        // Enhanced management fees for premium tier
        managementFee = 150; // 1.5% for premium service
        performanceFee = 1500; // 15% of excess returns
    }
    
    /**
     * @dev Enhanced deposit function with Satoshi tier requirements
     */
    function depositForSatoshiTier(uint256 coreAmount, uint256 btcAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(!emergencyMode, "SatoshiTier: emergency mode active");
        require(btcAmount >= MIN_BTC_DEPOSIT, "SatoshiTier: BTC amount too small");
        require(btcAmount <= maxSingleDeposit, "SatoshiTier: exceeds max deposit");
        
        // Calculate optimal CORE amount for Satoshi tier
        uint256 optimalCoreAmount = (btcAmount * SATOSHI_RATIO) / 1e18;
        
        if (coreAmount == 0) {
            // Auto-calculate CORE needed
            coreAmount = optimalCoreAmount;
            
            // Transfer CORE from user
            require(
                coreToken.balanceOf(msg.sender) >= coreAmount,
                "SatoshiTier: insufficient CORE balance"
            );
        } else {
            // Validate user-provided CORE amount is sufficient for Satoshi tier
            require(
                coreAmount >= optimalCoreAmount * 95 / 100, // Allow 5% tolerance
                "SatoshiTier: insufficient CORE for Satoshi tier"
            );
        }
        
        // Transfer tokens and perform deposit logic
        if (coreAmount > 0) {
            coreToken.transferFrom(msg.sender, address(this), coreAmount);
            totalPooledCORE += coreAmount;
        }
        if (btcAmount > 0) {
            btcToken.transferFrom(msg.sender, address(this), btcAmount);
            totalPooledBTC += btcAmount;
        }
        
        // Calculate shares
        uint256 sharesToMint = _calculateShares(coreAmount, btcAmount);
        
        // Rebalance to maintain target ratio
        _rebalanceIfNeeded();
        
        // Stake in dual staking contract
        _stakeToDualStaking();
        
        // Mint shares to user
        basketToken.mint(msg.sender, sharesToMint);
        
        emit Deposited(msg.sender, coreAmount, btcAmount, sharesToMint);
        
        // Verify we achieved Satoshi tier
        uint256 currentRatio = _getCurrentRatio();
        if (currentRatio >= SATOSHI_RATIO) {
            emit SatoshiTierAchieved(block.timestamp, currentRatio);
        }
    }
    
    /**
     * @dev Auto-rebalancing function specifically for Satoshi tier maintenance
     */
    function maintainSatoshiRatio() external {
        require(msg.sender == owner(), "SatoshiTier: not authorized");
        
        uint256 currentRatio = _getCurrentRatio();
        
        // Check if we're below Satoshi threshold
        if (currentRatio < SATOSHI_RATIO) {
            uint256 deviation = ((SATOSHI_RATIO - currentRatio) * 10000) / SATOSHI_RATIO;
            
            if (deviation > TIGHT_REBALANCE_THRESHOLD) {
                _rebalanceToSatoshiTier();
            }
        }
        
        emit RatioMaintained(totalPooledCORE, totalPooledBTC, currentRatio);
    }
    
    /**
     * @dev Specialized rebalancing for Satoshi tier
     */
    function _rebalanceToSatoshiTier() internal {
        uint256 currentRatio = _getCurrentRatio();
        
        if (currentRatio < SATOSHI_RATIO) {
            // Need more CORE relative to BTC
            uint256 requiredCORE = (totalPooledBTC * SATOSHI_RATIO) / 1e18;
            uint256 coreDeficit = requiredCORE - totalPooledCORE;
            
            // Calculate BTC to swap for CORE
            uint256 btcToSwap = _calculateOptimalBTCSwap(coreDeficit);
            
            if (btcToSwap > 0 && btcToSwap <= totalPooledBTC / 10) { // Max 10% of BTC pool
                _swapBTCForCORE(btcToSwap);
            }
        }
    }
    
    /**
     * @dev Calculate optimal BTC swap amount with minimal impact
     */
    function _calculateOptimalBTCSwap(uint256 coreNeeded) internal view returns (uint256) {
        if (coreNeeded == 0) return 0;
        
        uint256 corePrice = priceFeed.getCorePrice();
        uint256 btcPrice = priceFeed.getSolvBTCPrice();
        
        // Account for slippage and fees
        uint256 btcNeeded = (coreNeeded * corePrice * (10000 + MAX_REBALANCE_SLIPPAGE)) / (btcPrice * 10000);
        
        // Ensure we don't exceed available BTC
        return btcNeeded > totalPooledBTC ? 0 : btcNeeded;
    }
    
    /**
     * @dev Enhanced reward compounding with performance tracking
     */
    function compoundSatoshiRewards() external onlyOwner {
        uint256 rewardsBefore = totalRewardsEarned;
        
        // Claim rewards from dual staking
        uint256 newRewards = dualStakingContract.claimRewards();
        
        if (newRewards > 0) {
            totalRewardsEarned += newRewards;
            totalPooledCORE += newRewards;
            
            // Update performance metrics
            _updatePerformanceMetrics(newRewards);
            
            // Rebalance to maintain Satoshi ratio
            _rebalanceToSatoshiTier();
            
            // Restake optimally
            _stakeToDualStaking();
            
            emit RewardsCompounded(msg.sender, newRewards, block.timestamp);
            emit PerformanceUpdated(averageAPY, totalRewardsEarned);
        }
        
        lastRewardClaim = block.timestamp;
    }
    
    /**
     * @dev Update rolling average APY calculation
     */
    function _updatePerformanceMetrics(uint256 newRewards) internal {
        if (lastRewardClaim == 0) return;
        
        uint256 timePeriod = block.timestamp - lastRewardClaim;
        if (timePeriod == 0) return;
        
        uint256 totalValue = _getTotalValue();
        if (totalValue == 0) return;
        
        // Calculate annualized return
        uint256 periodReturn = (newRewards * 1e18) / totalValue;
        uint256 annualizedReturn = (periodReturn * 365 days) / timePeriod;
        
        // Update rolling average (weighted by time)
        if (averageAPY == 0) {
            averageAPY = annualizedReturn;
        } else {
            // Simple moving average over last 30 days
            averageAPY = (averageAPY * 9 + annualizedReturn) / 10;
        }
    }
    
    /**
     * @dev Emergency functions for Satoshi tier protection
     */
    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }
    
    /**
     * @dev Emergency exit from dual staking (with potential tier loss)
     */
    function emergencyExit() external onlyOwner {
        require(emergencyMode, "SatoshiTier: not in emergency mode");
        
        // Unstake all assets
        if (totalStakedCORE > 0) {
            dualStakingContract.unstakeCORE(totalStakedCORE);
            totalStakedCORE = 0;
        }
        
        if (totalStakedBTC > 0) {
            dualStakingContract.unstakeBTC(totalStakedBTC);
            totalStakedBTC = 0;
        }
    }
    
    /**
     * @dev Set maximum single deposit (risk management)
     */
    function setMaxSingleDeposit(uint256 _maxDeposit) external onlyOwner {
        require(_maxDeposit >= MIN_BTC_DEPOSIT, "SatoshiTier: below minimum");
        maxSingleDeposit = _maxDeposit;
    }
    
    /**
     * @dev Get comprehensive Satoshi tier status
     */
    function getSatoshiTierStatus() external view returns (
        bool isSatoshiTier,
        uint256 currentRatio,
        uint256 targetRatio_,
        uint256 rewardsEarned,
        uint256 estimatedAPY,
        bool needsRebalance,
        uint256 nextRebalanceThreshold
    ) {
        currentRatio = _getCurrentRatio();
        targetRatio_ = SATOSHI_RATIO;
        isSatoshiTier = currentRatio >= SATOSHI_RATIO;
        rewardsEarned = totalRewardsEarned;
        estimatedAPY = averageAPY;
        needsRebalance = needsRebalancing();
        
        if (currentRatio > 0) {
            uint256 deviation = currentRatio > SATOSHI_RATIO 
                ? ((currentRatio - SATOSHI_RATIO) * 10000) / SATOSHI_RATIO
                : ((SATOSHI_RATIO - currentRatio) * 10000) / SATOSHI_RATIO;
            nextRebalanceThreshold = TIGHT_REBALANCE_THRESHOLD - deviation;
        }
    }
    
    /**
     * @dev Estimate required CORE for a given BTC amount
     */
    function estimateRequiredCORE(uint256 btcAmount) external pure returns (uint256) {
        return (btcAmount * SATOSHI_RATIO) / 1e18;
    }
    
    /**
     * @dev Check if deposit meets Satoshi tier requirements
     */
    function validateSatoshiDeposit(uint256 coreAmount, uint256 btcAmount) 
        external 
        pure 
        returns (bool valid, uint256 requiredCore, string memory reason) 
    {
        if (btcAmount < MIN_BTC_DEPOSIT) {
            return (false, 0, "BTC amount below minimum");
        }
        
        requiredCore = (btcAmount * SATOSHI_RATIO) / 1e18;
        
        if (coreAmount < requiredCore * 95 / 100) { // 5% tolerance
            return (false, requiredCore, "Insufficient CORE for Satoshi tier");
        }
        
        return (true, requiredCore, "Valid Satoshi tier deposit");
    }
}