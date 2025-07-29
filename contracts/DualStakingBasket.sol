// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StakeBasketToken.sol";
import "./PriceFeed.sol";

// Dual staking interface
interface IDualStaking {
    function stakeBTC(uint256 amount) external;
    function stakeCORE(uint256 amount) external;
    function unstakeBTC(uint256 amount) external;
    function unstakeCORE(uint256 amount) external;
    function claimRewards() external returns (uint256);
    function getUserStake(address user) external view returns (uint256 btcAmount, uint256 coreAmount);
    function getTierRewards(address user) external view returns (uint256 tier, uint256 apy);
}

/**
 * @title DualStakingBasket
 * @dev BASKET strategy that optimizes for CoreDAO Dual Staking tiers
 * Automatically maintains specific CORE:BTC ratios for maximum yield
 */
contract DualStakingBasket is ReentrancyGuard, Ownable, Pausable {
    
    // Tier definitions
    enum StakingTier {
        BASE,    // No CORE requirement
        BOOST,   // 2,000:1 CORE:BTC
        SUPER,   // 6,000:1 CORE:BTC
        SATOSHI  // 16,000:1 CORE:BTC (maximum yield)
    }
    
    // Contract references
    StakeBasketToken public immutable basketToken;
    PriceFeed public priceFeed;
    IERC20 public coreToken;
    IERC20 public btcToken; // Wrapped BTC or coreBTC
    
    IDualStaking public dualStakingContract;
    
    // Strategy configuration
    StakingTier public targetTier;
    uint256 public targetRatio; // CORE per 1 BTC (scaled by 1e18)
    
    // Tier ratios (CORE per 1 BTC, scaled by 1e18)
    mapping(StakingTier => uint256) public tierRatios;
    
    // Pool state
    uint256 public totalPooledCORE;
    uint256 public totalPooledBTC;
    uint256 public totalStakedCORE;
    uint256 public totalStakedBTC;
    
    // Rebalancing parameters
    uint256 public rebalanceThreshold = 500; // 5% deviation threshold
    uint256 public maxSlippage = 200; // 2% max slippage for swaps
    address public swapRouter; // DEX router for rebalancing
    
    // Fee structure
    uint256 public managementFee = 100; // 1% annual
    uint256 public performanceFee = 1000; // 10% of excess returns
    address public feeRecipient;
    uint256 public lastFeeCollection;
    
    // Events
    event TierTargetSet(StakingTier indexed tier, uint256 ratio);
    event Deposited(address indexed user, uint256 coreAmount, uint256 btcAmount, uint256 shares);
    event Redeemed(address indexed user, uint256 shares, uint256 coreAmount, uint256 btcAmount);
    event Rebalanced(uint256 coreSwapped, uint256 btcSwapped, StakingTier currentTier);
    event RewardsCompounded(uint256 rewards);
    event TierRatioUpdated(StakingTier tier, uint256 newRatio);
    
    constructor(
        address _basketToken,
        address _priceFeed,
        address _coreToken,
        address _btcToken,
        address _dualStakingContract,
        address _feeRecipient,
        StakingTier _targetTier,
        address initialOwner
    ) Ownable(initialOwner) {
        basketToken = StakeBasketToken(_basketToken);
        priceFeed = PriceFeed(_priceFeed);
        coreToken = IERC20(_coreToken);
        btcToken = IERC20(_btcToken);
        dualStakingContract = IDualStaking(_dualStakingContract);
        feeRecipient = _feeRecipient;
        targetTier = _targetTier;
        
        // Initialize tier ratios (CORE per 1 BTC, scaled by 1e18)
        tierRatios[StakingTier.BASE] = 0;
        tierRatios[StakingTier.BOOST] = 2000 * 1e18;
        tierRatios[StakingTier.SUPER] = 6000 * 1e18;
        tierRatios[StakingTier.SATOSHI] = 16000 * 1e18;
        
        targetRatio = tierRatios[_targetTier];
        lastFeeCollection = block.timestamp;
    }
    
    /**
     * @dev Deposit assets and receive BASKET tokens
     * Automatically swaps to maintain target tier ratio
     */
    function deposit(uint256 coreAmount, uint256 btcAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(coreAmount > 0 || btcAmount > 0, "DualStaking: no assets provided");
        
        // Transfer assets from user
        if (coreAmount > 0) {
            coreToken.transferFrom(msg.sender, address(this), coreAmount);
            totalPooledCORE += coreAmount;
        }
        if (btcAmount > 0) {
            btcToken.transferFrom(msg.sender, address(this), btcAmount);
            totalPooledBTC += btcAmount;
        }
        
        // Calculate shares before rebalancing
        uint256 sharesToMint = _calculateShares(coreAmount, btcAmount);
        
        // Rebalance to maintain target ratio
        _rebalanceIfNeeded();
        
        // Stake in dual staking contract
        _stakeToDualStaking();
        
        // Mint shares to user
        basketToken.mint(msg.sender, sharesToMint);
        
        emit Deposited(msg.sender, coreAmount, btcAmount, sharesToMint);
    }
    
    /**
     * @dev Redeem BASKET tokens for underlying assets
     */
    function redeem(uint256 shares) external nonReentrant whenNotPaused {
        require(shares > 0, "DualStaking: invalid share amount");
        require(basketToken.balanceOf(msg.sender) >= shares, "DualStaking: insufficient shares");
        
        // Calculate proportional assets to return
        (uint256 coreAmount, uint256 btcAmount) = _calculateRedemption(shares);
        
        // Unstake from dual staking if needed
        _unstakeFromDualStaking(coreAmount, btcAmount);
        
        // Burn user shares
        basketToken.burn(msg.sender, shares);
        
        // Transfer assets to user
        if (coreAmount > 0) {
            coreToken.transfer(msg.sender, coreAmount);
            totalPooledCORE -= coreAmount;
        }
        if (btcAmount > 0) {
            btcToken.transfer(msg.sender, btcAmount);
            totalPooledBTC -= btcAmount;
        }
        
        emit Redeemed(msg.sender, shares, coreAmount, btcAmount);
    }
    
    /**
     * @dev Check if rebalancing is needed based on current ratio
     */
    function needsRebalancing() public view returns (bool) {
        if (targetRatio == 0) return false; // Base tier doesn't need rebalancing
        
        uint256 currentRatio = _getCurrentRatio();
        uint256 deviation = currentRatio > targetRatio 
            ? ((currentRatio - targetRatio) * 10000) / targetRatio
            : ((targetRatio - currentRatio) * 10000) / targetRatio;
            
        return deviation > rebalanceThreshold;
    }
    
    /**
     * @dev Get current CORE:BTC ratio
     */
    function _getCurrentRatio() internal view returns (uint256) {
        if (totalPooledBTC == 0) return 0;
        return (totalPooledCORE * 1e18) / totalPooledBTC;
    }
    
    /**
     * @dev Rebalance assets to maintain target tier ratio
     */
    function _rebalanceIfNeeded() internal {
        if (!needsRebalancing()) return;
        
        uint256 currentRatio = _getCurrentRatio();
        
        if (currentRatio < targetRatio) {
            // Need more CORE, swap some BTC for CORE
            uint256 btcToSwap = _calculateBTCToSwap();
            if (btcToSwap > 0) {
                _swapBTCForCORE(btcToSwap);
            }
        } else if (currentRatio > targetRatio) {
            // Need more BTC, swap some CORE for BTC
            uint256 coreToSwap = _calculateCOREToSwap();
            if (coreToSwap > 0) {
                _swapCOREForBTC(coreToSwap);
            }
        }
        
        emit Rebalanced(0, 0, targetTier);
    }
    
    /**
     * @dev Calculate BTC amount needed to swap for CORE
     */
    function _calculateBTCToSwap() internal view returns (uint256) {
        if (totalPooledBTC == 0) return 0;
        
        // Calculate required CORE amount for target ratio
        uint256 requiredCORE = (totalPooledBTC * targetRatio) / 1e18;
        
        if (requiredCORE <= totalPooledCORE) return 0;
        
        uint256 coreNeeded = requiredCORE - totalPooledCORE;
        
        // Convert CORE needed to BTC amount (considering swap rates)
        uint256 corePrice = priceFeed.getCorePrice();
        uint256 btcPrice = priceFeed.getLstBTCPrice(); // Using lstBTC price as proxy
        
        uint256 btcToSwap = (coreNeeded * corePrice) / btcPrice;
        
        // Ensure we don't swap more than available
        return btcToSwap > totalPooledBTC ? totalPooledBTC / 2 : btcToSwap;
    }
    
    /**
     * @dev Calculate CORE amount needed to swap for BTC
     */
    function _calculateCOREToSwap() internal view returns (uint256) {
        if (totalPooledCORE == 0) return 0;
        
        uint256 currentRatio = _getCurrentRatio();
        uint256 excessCORE = totalPooledCORE - ((totalPooledBTC * targetRatio) / 1e18);
        
        // Convert excess CORE to BTC needs
        return excessCORE / 2; // Conservative approach
    }
    
    /**
     * @dev Swap BTC for CORE using DEX
     */
    function _swapBTCForCORE(uint256 btcAmount) internal {
        // Implementation would integrate with a DEX router
        // For now, this is a placeholder that would call the actual swap
        
        // Update pool state after swap
        totalPooledBTC -= btcAmount;
        // totalPooledCORE += coreReceived; // Would be set based on actual swap result
    }
    
    /**
     * @dev Swap CORE for BTC using DEX
     */
    function _swapCOREForBTC(uint256 coreAmount) internal {
        // Implementation would integrate with a DEX router
        // For now, this is a placeholder that would call the actual swap
        
        // Update pool state after swap
        totalPooledCORE -= coreAmount;
        // totalPooledBTC += btcReceived; // Would be set based on actual swap result
    }
    
    /**
     * @dev Stake available assets in dual staking contract
     */
    function _stakeToDualStaking() internal {
        uint256 availableCORE = totalPooledCORE - totalStakedCORE;
        uint256 availableBTC = totalPooledBTC - totalStakedBTC;
        
        if (availableCORE > 0) {
            coreToken.approve(address(dualStakingContract), availableCORE);
            dualStakingContract.stakeCORE(availableCORE);
            totalStakedCORE += availableCORE;
        }
        
        if (availableBTC > 0) {
            btcToken.approve(address(dualStakingContract), availableBTC);
            dualStakingContract.stakeBTC(availableBTC);
            totalStakedBTC += availableBTC;
        }
    }
    
    /**
     * @dev Unstake assets from dual staking contract
     */
    function _unstakeFromDualStaking(uint256 coreAmount, uint256 btcAmount) internal {
        if (coreAmount > 0 && totalStakedCORE >= coreAmount) {
            dualStakingContract.unstakeCORE(coreAmount);
            totalStakedCORE -= coreAmount;
        }
        
        if (btcAmount > 0 && totalStakedBTC >= btcAmount) {
            dualStakingContract.unstakeBTC(btcAmount);
            totalStakedBTC -= btcAmount;
        }
    }
    
    /**
     * @dev Calculate shares to mint for deposit
     */
    function _calculateShares(uint256 coreAmount, uint256 btcAmount) internal view returns (uint256) {
        if (basketToken.totalSupply() == 0) {
            // Initial deposit: use USD value
            uint256 coreValue = (coreAmount * priceFeed.getCorePrice()) / 1e18;
            uint256 btcValue = (btcAmount * priceFeed.getLstBTCPrice()) / 1e18;
            return coreValue + btcValue;
        }
        
        uint256 totalValue = _getTotalValue();
        uint256 depositValue = (coreAmount * priceFeed.getCorePrice() + btcAmount * priceFeed.getLstBTCPrice()) / 1e18;
        
        return (depositValue * basketToken.totalSupply()) / totalValue;
    }
    
    /**
     * @dev Calculate assets to return for redemption
     */
    function _calculateRedemption(uint256 shares) internal view returns (uint256 coreAmount, uint256 btcAmount) {
        uint256 totalShares = basketToken.totalSupply();
        
        coreAmount = (totalPooledCORE * shares) / totalShares;
        btcAmount = (totalPooledBTC * shares) / totalShares;
    }
    
    /**
     * @dev Get total portfolio value in USD
     */
    function _getTotalValue() internal view returns (uint256) {
        uint256 coreValue = (totalPooledCORE * priceFeed.getCorePrice()) / 1e18;
        uint256 btcValue = (totalPooledBTC * priceFeed.getLstBTCPrice()) / 1e18;
        return coreValue + btcValue;
    }
    
    /**
     * @dev Claim and compound dual staking rewards
     */
    function compoundRewards() external onlyOwner {
        uint256 rewards = dualStakingContract.claimRewards();
        
        if (rewards > 0) {
            // Rewards are typically paid in CORE
            totalPooledCORE += rewards;
            
            // Rebalance if needed after adding rewards
            _rebalanceIfNeeded();
            
            // Restake new balance
            _stakeToDualStaking();
            
            emit RewardsCompounded(rewards);
        }
    }
    
    // Admin functions
    
    /**
     * @dev Set target staking tier
     */
    function setTargetTier(StakingTier _tier) external onlyOwner {
        targetTier = _tier;
        targetRatio = tierRatios[_tier];
        emit TierTargetSet(_tier, targetRatio);
    }
    
    /**
     * @dev Update tier ratios (governance-driven)
     */
    function updateTierRatio(StakingTier _tier, uint256 _ratio) external onlyOwner {
        tierRatios[_tier] = _ratio;
        
        if (_tier == targetTier) {
            targetRatio = _ratio;
        }
        
        emit TierRatioUpdated(_tier, _ratio);
    }
    
    /**
     * @dev Set DEX router for swaps
     */
    function setSwapRouter(address _router) external onlyOwner {
        swapRouter = _router;
    }
    
    /**
     * @dev Set rebalance threshold
     */
    function setRebalanceThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 2000, "DualStaking: threshold too high"); // Max 20%
        rebalanceThreshold = _threshold;
    }
    
    /**
     * @dev Get current tier status
     */
    function getCurrentTierStatus() external view returns (
        StakingTier currentTier,
        uint256 currentRatio,
        uint256 targetRatio_,
        bool needsRebalance
    ) {
        currentRatio = _getCurrentRatio();
        targetRatio_ = targetRatio;
        needsRebalance = needsRebalancing();
        
        // Determine current tier based on ratio
        if (currentRatio >= tierRatios[StakingTier.SATOSHI]) {
            currentTier = StakingTier.SATOSHI;
        } else if (currentRatio >= tierRatios[StakingTier.SUPER]) {
            currentTier = StakingTier.SUPER;
        } else if (currentRatio >= tierRatios[StakingTier.BOOST]) {
            currentTier = StakingTier.BOOST;
        } else {
            currentTier = StakingTier.BASE;
        }
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}