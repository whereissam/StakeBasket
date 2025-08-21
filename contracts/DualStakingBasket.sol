// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StakeBasketToken.sol";
import "./PriceFeed.sol";
import "./interfaces/IDualStaking.sol";

// Uniswap V2 Router interface for DEX integration
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
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
    
    // Enhanced rebalancing controls
    uint256 public rebalanceCount;
    uint256 public lastRebalanceTime;
    uint256 public minRebalanceInterval = 1 hours; // Minimum time between rebalances
    uint256 public keeperReward = 10; // 0.1% reward for permissionless keepers
    mapping(address => bool) public trustedRouters; // Allowlist of DEX routers
    
    // Circuit breaker for rebalancing
    bool public rebalancingPaused;
    uint256 public maxRebalanceFailures = 3;
    uint256 public rebalanceFailureCount;
    uint256 public lastRebalanceFailure;
    
    // Fee structure
    uint256 public managementFee = 100; // 1% annual
    uint256 public performanceFee = 1000; // 10% of excess returns
    address public feeRecipient;
    uint256 public lastFeeCollection;
    
    // Events
    event TierTargetSet(StakingTier indexed tier, uint256 ratio);
    event Deposited(address indexed user, uint256 coreAmount, uint256 btcAmount, uint256 shares);
    event Redeemed(address indexed user, uint256 shares, uint256 coreAmount, uint256 btcAmount);
    event Rebalanced(uint256 coreSwapped, uint256 btcSwapped, StakingTier currentTier, address keeper);
    event RewardsCompounded(uint256 rewards, uint256 coreRewards, uint256 btcRewards);
    event TierRatioUpdated(StakingTier tier, uint256 newRatio);
    event KeeperRewardPaid(address indexed keeper, uint256 reward);
    event RebalancingPaused(string reason);
    event RebalancingResumed();
    event RouterApproved(address indexed router, bool approved);
    event CircuitBreakerTriggered(string reason);
    
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
        require(_basketToken != address(0), "DualStaking: invalid basket token");
        require(_priceFeed != address(0), "DualStaking: invalid price feed");
        // Allow zero address for native CORE token usage
        require(_btcToken != address(0), "DualStaking: invalid btc token");
        require(_dualStakingContract != address(0), "DualStaking: invalid dual staking contract");
        require(_feeRecipient != address(0), "DualStaking: invalid fee recipient");
        
        basketToken = StakeBasketToken(_basketToken);
        priceFeed = PriceFeed(_priceFeed);
        if (_coreToken != address(0)) {
            coreToken = IERC20(_coreToken);
        }
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
        lastRebalanceTime = block.timestamp;
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
     * @dev Deposit native CORE and BTC tokens
     * @param btcAmount Amount of BTC tokens to deposit (0 if none)
     */
    function depositNativeCORE(uint256 btcAmount) 
        external 
        payable
        nonReentrant 
        whenNotPaused 
    {
        uint256 coreAmount = msg.value;
        require(coreAmount > 0 || btcAmount > 0, "DualStaking: no assets provided");
        
        // Handle native CORE
        if (coreAmount > 0) {
            totalPooledCORE += coreAmount;
        }
        
        // Handle BTC tokens
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
        if (targetRatio == 0 || rebalancingPaused) return false;
        
        // Check minimum interval between rebalances
        if (block.timestamp < lastRebalanceTime + minRebalanceInterval) return false;
        
        uint256 currentRatio = _getCurrentRatio();
        uint256 deviation = currentRatio > targetRatio 
            ? ((currentRatio - targetRatio) * 10000) / targetRatio
            : ((targetRatio - currentRatio) * 10000) / targetRatio;
            
        return deviation > rebalanceThreshold;
    }
    
    /**
     * @dev Permissionless rebalancing with keeper incentive
     */
    function rebalance() external nonReentrant {
        require(needsRebalancing(), "DualStaking: rebalancing not needed");
        require(!rebalancingPaused, "DualStaking: rebalancing paused");
        
        // Circuit breaker check
        if (rebalanceFailureCount >= maxRebalanceFailures && 
            block.timestamp < lastRebalanceFailure + 1 days) {
            rebalancingPaused = true;
            emit CircuitBreakerTriggered("Too many rebalance failures");
            return;
        }
        
        try this._executeRebalance() {
            rebalanceFailureCount = 0;
            rebalanceCount++;
            lastRebalanceTime = block.timestamp;
            
            // Pay keeper reward
            if (msg.sender != owner()) {
                _payKeeperReward(msg.sender);
            }
        } catch {
            rebalanceFailureCount++;
            lastRebalanceFailure = block.timestamp;
            
            if (rebalanceFailureCount >= maxRebalanceFailures) {
                rebalancingPaused = true;
                emit CircuitBreakerTriggered("Rebalance execution failed");
            }
        }
    }
    
    /**
     * @dev Get current CORE:BTC ratio
     */
    function _getCurrentRatio() internal view returns (uint256) {
        if (totalPooledBTC == 0) return 0;
        return (totalPooledCORE * 1e18) / totalPooledBTC;
    }
    
    /**
     * @dev Internal rebalance execution (external call for try/catch)
     */
    function _executeRebalance() external {
        require(msg.sender == address(this), "DualStaking: internal function");
        
        uint256 currentRatio = _getCurrentRatio();
        uint256 coreSwapped = 0;
        uint256 btcSwapped = 0;
        
        if (currentRatio < targetRatio) {
            // Need more CORE, swap some BTC for CORE
            uint256 btcToSwap = _calculateBTCToSwap();
            if (btcToSwap > 0) {
                coreSwapped = _swapBTCForCORE(btcToSwap);
                btcSwapped = btcToSwap;
            }
        } else if (currentRatio > targetRatio) {
            // Need more BTC, swap some CORE for BTC
            uint256 coreToSwap = _calculateCOREToSwap();
            if (coreToSwap > 0) {
                btcSwapped = _swapCOREForBTC(coreToSwap);
                coreSwapped = coreToSwap;
            }
        }
        
        emit Rebalanced(coreSwapped, btcSwapped, targetTier, tx.origin);
    }
    
    /**
     * @dev Rebalance assets to maintain target tier ratio (internal)
     */
    function _rebalanceIfNeeded() internal {
        if (!needsRebalancing()) return;
        
        // For internal calls, use simplified rebalancing without keeper rewards
        uint256 currentRatio = _getCurrentRatio();
        
        if (currentRatio < targetRatio) {
            uint256 btcToSwap = _calculateBTCToSwap();
            if (btcToSwap > 0) {
                _swapBTCForCORE(btcToSwap);
            }
        } else if (currentRatio > targetRatio) {
            uint256 coreToSwap = _calculateCOREToSwap();
            if (coreToSwap > 0) {
                _swapCOREForBTC(coreToSwap);
            }
        }
        
        lastRebalanceTime = block.timestamp;
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
        uint256 btcPrice = priceFeed.getSolvBTCPrice(); // Using SolvBTC price as proxy
        
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
     * @dev Swap BTC for CORE using trusted DEX router
     */
    function _swapBTCForCORE(uint256 btcAmount) internal returns (uint256 coreReceived) {
        require(swapRouter != address(0), "DualStaking: no swap router");
        require(trustedRouters[swapRouter], "DualStaking: untrusted router");
        require(btcAmount <= totalPooledBTC, "DualStaking: insufficient BTC");
        
        // Calculate minimum CORE to receive (with slippage protection)
        uint256 expectedCore = (btcAmount * priceFeed.getSolvBTCPrice()) / priceFeed.getCorePrice();
        uint256 minCoreOut = expectedCore * (10000 - maxSlippage) / 10000;
        
        // Approve router with exact amount needed
        btcToken.approve(swapRouter, btcAmount);
        
        uint256 coreBalanceBefore = coreToken.balanceOf(address(this));
        
        // Execute swap through router with proper error handling
        require(trustedRouters[swapRouter], "DualStaking: untrusted router");
        
        // Create swap path
        address[] memory path = new address[](2);
        path[0] = address(btcToken);
        path[1] = address(coreToken);
        
        // Execute swap with try-catch for safety
        try IUniswapV2Router(swapRouter).swapExactTokensForTokens(
            btcAmount,
            minCoreOut,
            path,
            address(this),
            block.timestamp + 300
        ) returns (uint256[] memory amounts) {
            // Swap successful, amounts[1] contains received CORE
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("DualStaking: swap failed - ", reason)));
        } catch {
            revert("DualStaking: swap failed - unknown error");
        }
        
        uint256 coreBalanceAfter = coreToken.balanceOf(address(this));
        coreReceived = coreBalanceAfter - coreBalanceBefore;
        
        require(coreReceived >= minCoreOut, "DualStaking: slippage too high");
        
        // Update pool state
        totalPooledBTC -= btcAmount;
        totalPooledCORE += coreReceived;
        
        // Reset approval
        btcToken.approve(swapRouter, 0);
    }
    
    /**
     * @dev Swap CORE for BTC using trusted DEX router
     */
    function _swapCOREForBTC(uint256 coreAmount) internal returns (uint256 btcReceived) {
        require(swapRouter != address(0), "DualStaking: no swap router");
        require(trustedRouters[swapRouter], "DualStaking: untrusted router");
        require(coreAmount <= totalPooledCORE, "DualStaking: insufficient CORE");
        
        // Calculate minimum BTC to receive (with slippage protection)
        uint256 expectedBTC = (coreAmount * priceFeed.getCorePrice()) / priceFeed.getSolvBTCPrice();
        uint256 minBTCOut = expectedBTC * (10000 - maxSlippage) / 10000;
        
        // Approve router with exact amount needed
        coreToken.approve(swapRouter, coreAmount);
        
        uint256 btcBalanceBefore = btcToken.balanceOf(address(this));
        
        // Execute swap through router (implementation depends on specific DEX)
        // This would be replaced with actual DEX integration
        
        uint256 btcBalanceAfter = btcToken.balanceOf(address(this));
        btcReceived = btcBalanceAfter - btcBalanceBefore;
        
        require(btcReceived >= minBTCOut, "DualStaking: slippage too high");
        
        // Update pool state
        totalPooledCORE -= coreAmount;
        totalPooledBTC += btcReceived;
        
        // Reset approval
        coreToken.approve(swapRouter, 0);
    }
    
    /**
     * @dev Stake available assets in dual staking contract (with native CORE support)
     */
    function _stakeToDualStaking() internal {
        uint256 availableCORE = totalPooledCORE - totalStakedCORE;
        uint256 availableBTC = totalPooledBTC - totalStakedBTC;
        
        // Check if we have both assets for dual staking
        if (availableCORE > 0 && availableBTC > 0 && targetRatio > 0) {
            // Use dual staking for tier benefits
            uint256 coreToStake = availableCORE;
            uint256 btcToStake = availableBTC;
            
            // Adjust amounts to maintain target ratio
            uint256 requiredCore = (btcToStake * targetRatio) / 1e18;
            if (requiredCore < coreToStake) {
                coreToStake = requiredCore;
            } else {
                btcToStake = (coreToStake * 1e18) / targetRatio;
            }
            
            if (coreToStake > 0 && btcToStake > 0) {
                btcToken.approve(address(dualStakingContract), btcToStake);
                
                try dualStakingContract.stakeDual{value: coreToStake}(btcToStake) {
                    totalStakedCORE += coreToStake;
                    totalStakedBTC += btcToStake;
                } catch {
                    // Reset approval if staking fails
                    btcToken.approve(address(dualStakingContract), 0);
                }
            }
        } else {
            // Separate staking for individual assets
            if (availableCORE > 0) {
                try dualStakingContract.stakeCORE{value: availableCORE}(availableCORE) {
                    totalStakedCORE += availableCORE;
                } catch {
                    // Staking failed, continue
                }
            }
            
            if (availableBTC > 0) {
                btcToken.approve(address(dualStakingContract), availableBTC);
                
                try dualStakingContract.stakeBTC(availableBTC) {
                    totalStakedBTC += availableBTC;
                } catch {
                    // Reset approval if staking fails
                    btcToken.approve(address(dualStakingContract), 0);
                }
            }
        }
    }
    
    /**
     * @dev Unstake assets from dual staking contract
     */
    function _unstakeFromDualStaking(uint256 coreAmount, uint256 btcAmount) internal {
        // Try to unstake using dual unstaking first (maintains ratios)
        if (coreAmount > 0 && btcAmount > 0 && totalStakedCORE >= coreAmount && totalStakedBTC >= btcAmount) {
            // Calculate shares as percentage of total stake
            uint256 coreShare = (coreAmount * 10000) / totalStakedCORE;
            uint256 btcShare = (btcAmount * 10000) / totalStakedBTC;
            uint256 shares = coreShare < btcShare ? coreShare : btcShare;
            
            try dualStakingContract.unstakeDual(shares) {
                // Calculate actual amounts unstaked
                uint256 actualCoreUnstaked = (totalStakedCORE * shares) / 10000;
                uint256 actualBtcUnstaked = (totalStakedBTC * shares) / 10000;
                
                totalStakedCORE -= actualCoreUnstaked;
                totalStakedBTC -= actualBtcUnstaked;
                return;
            } catch {
                // Fall back to individual unstaking
            }
        }
        
        // Individual unstaking fallback
        if (coreAmount > 0 && totalStakedCORE >= coreAmount) {
            try dualStakingContract.unstakeCORE(coreAmount) {
                totalStakedCORE -= coreAmount;
            } catch {
                // Unstaking failed
            }
        }
        
        if (btcAmount > 0 && totalStakedBTC >= btcAmount) {
            try dualStakingContract.unstakeBTC(btcAmount) {
                totalStakedBTC -= btcAmount;
            } catch {
                // Unstaking failed
            }
        }
    }
    
    /**
     * @dev Calculate shares to mint for deposit
     */
    function _calculateShares(uint256 coreAmount, uint256 btcAmount) internal view returns (uint256) {
        if (basketToken.totalSupply() == 0) {
            // Initial deposit: use USD value
            uint256 coreValue = (coreAmount * priceFeed.getCorePrice()) / 1e18;
            uint256 btcValue = (btcAmount * priceFeed.getSolvBTCPrice()) / 1e18;
            return coreValue + btcValue;
        }
        
        uint256 totalValue = _getTotalValue();
        uint256 depositValue = (coreAmount * priceFeed.getCorePrice() + btcAmount * priceFeed.getSolvBTCPrice()) / 1e18;
        
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
        uint256 btcValue = (totalPooledBTC * priceFeed.getSolvBTCPrice()) / 1e18;
        return coreValue + btcValue;
    }
    
    /**
     * @dev Claim and compound dual staking rewards (enhanced version)
     */
    function compoundRewards() external nonReentrant {
        require(!paused(), "DualStaking: contract paused");
        
        // Batch claim all available rewards
        (uint256 coreRewards, uint256 btcRewards) = _claimAllRewards();
        
        uint256 totalRewardValue = 0;
        
        if (coreRewards > 0) {
            totalPooledCORE += coreRewards;
            totalRewardValue += (coreRewards * priceFeed.getCorePrice()) / 1e18;
        }
        
        if (btcRewards > 0) {
            totalPooledBTC += btcRewards;
            totalRewardValue += (btcRewards * priceFeed.getSolvBTCPrice()) / 1e18;
        }
        
        if (totalRewardValue > 0) {
            // Rebalance if needed after adding rewards
            _rebalanceIfNeeded();
            
            // Restake new balance to maximize yields
            _stakeToDualStaking();
            
            emit RewardsCompounded(totalRewardValue, coreRewards, btcRewards);
        }
    }
    
    /**
     * @dev Internal function to claim all types of rewards
     */
    function _claimAllRewards() internal returns (uint256 coreRewards, uint256 btcRewards) {
        // Record balances before claiming
        uint256 ethBalanceBefore = address(this).balance;
        uint256 btcBalanceBefore = btcToken.balanceOf(address(this));
        
        // Claim rewards from dual staking contract
        try dualStakingContract.claimRewards() {
            // Calculate actual rewards received (CORE rewards come as native ETH)
            coreRewards = address(this).balance - ethBalanceBefore;
            btcRewards = btcToken.balanceOf(address(this)) - btcBalanceBefore;
        } catch {
            // Handle reward claiming failure gracefully
            coreRewards = 0;
            btcRewards = 0;
        }
        
        // Also try claiming specific rewards
        try dualStakingContract.claimCoreRewards() {
            uint256 additionalCore = address(this).balance - ethBalanceBefore - coreRewards;
            coreRewards += additionalCore;
        } catch {
            // Continue with main rewards
        }
    }
    
    /**
     * @dev Pay keeper reward for successful rebalancing
     */
    function _payKeeperReward(address keeper) internal {
        uint256 totalValue = _getTotalValue();
        uint256 rewardAmount = (totalValue * keeperReward) / 10000;
        
        if (rewardAmount > 0 && totalPooledCORE >= rewardAmount) {
            // Pay reward in CORE tokens
            totalPooledCORE -= rewardAmount;
            coreToken.transfer(keeper, rewardAmount);
            emit KeeperRewardPaid(keeper, rewardAmount);
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
     * @dev Set dual staking contract
     */
    function setDualStakingContract(address _dualStakingContract) external onlyOwner {
        require(_dualStakingContract != address(0), "DualStaking: invalid contract");
        dualStakingContract = IDualStaking(_dualStakingContract);
    }
    
    /**
     * @dev Set price feed contract
     */
    function setPriceFeed(address _priceFeed) external onlyOwner {
        require(_priceFeed != address(0), "DualStaking: invalid price feed");
        priceFeed = PriceFeed(_priceFeed);
    }
    
    /**
     * @dev Set rebalance threshold
     */
    function setRebalanceThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 2000, "DualStaking: threshold too high"); // Max 20%
        rebalanceThreshold = _threshold;
    }
    
    /**
     * @dev Add/remove trusted DEX router
     */
    function setTrustedRouter(address _router, bool _trusted) external onlyOwner {
        require(_router != address(0), "DualStaking: invalid router");
        trustedRouters[_router] = _trusted;
        emit RouterApproved(_router, _trusted);
    }
    
    /**
     * @dev Set keeper reward percentage
     */
    function setKeeperReward(uint256 _reward) external onlyOwner {
        require(_reward <= 100, "DualStaking: reward too high"); // Max 1%
        keeperReward = _reward;
    }
    
    /**
     * @dev Set minimum rebalance interval
     */
    function setMinRebalanceInterval(uint256 _interval) external onlyOwner {
        require(_interval >= 30 minutes, "DualStaking: interval too short");
        minRebalanceInterval = _interval;
    }
    
    /**
     * @dev Emergency pause rebalancing
     */
    function pauseRebalancing(string calldata reason) external onlyOwner {
        rebalancingPaused = true;
        emit RebalancingPaused(reason);
    }
    
    /**
     * @dev Resume rebalancing
     */
    function resumeRebalancing() external onlyOwner {
        rebalancingPaused = false;
        rebalanceFailureCount = 0;
        emit RebalancingResumed();
    }
    
    /**
     * @dev Set maximum slippage for swaps
     */
    function setMaxSlippage(uint256 _slippage) external onlyOwner {
        require(_slippage <= 1000, "DualStaking: slippage too high"); // Max 10%
        maxSlippage = _slippage;
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
     * @dev Get detailed pool information
     */
    function getPoolInfo() external view returns (
        uint256 totalCORE,
        uint256 totalBTC,
        uint256 stakedCORE,
        uint256 stakedBTC,
        uint256 totalValueUSD,
        uint256 sharePrice
    ) {
        totalCORE = totalPooledCORE;
        totalBTC = totalPooledBTC;
        stakedCORE = totalStakedCORE;
        stakedBTC = totalStakedBTC;
        totalValueUSD = _getTotalValue();
        
        if (basketToken.totalSupply() > 0) {
            sharePrice = (totalValueUSD * 1e18) / basketToken.totalSupply();
        } else {
            sharePrice = 1e18; // Initial price of 1 USD
        }
    }
    
    /**
     * @dev Get rebalancing status information
     */
    function getRebalanceInfo() external view returns (
        bool isPaused,
        uint256 lastRebalance,
        uint256 failureCount,
        uint256 totalRebalances,
        bool canRebalance
    ) {
        isPaused = rebalancingPaused;
        lastRebalance = lastRebalanceTime;
        failureCount = rebalanceFailureCount;
        totalRebalances = rebalanceCount;
        canRebalance = needsRebalancing();
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
    
    /**
     * @dev Emergency withdrawal function (only owner)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(paused(), "DualStaking: contract must be paused");
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev Check if router is trusted
     */
    function isTrustedRouter(address router) external view returns (bool) {
        return trustedRouters[router];
    }
    
    // Frontend-friendly information functions
    
    /**
     * @dev Get strategy information for frontend display
     */
    function getStrategyInfo() external view returns (
        string memory strategyName,
        string memory description,
        string memory riskLevel,
        uint256 currentAPY,
        string memory targetTierName
    ) {
        strategyName = "CORE+BTC Dual Staking Basket";
        description = "Automated dual staking strategy that maintains optimal CORE:BTC ratios for maximum CoreDAO staking rewards";
        riskLevel = "Medium";
        
        // Calculate approximate APY based on current tier
        if (targetTier == StakingTier.SATOSHI) {
            currentAPY = 1200; // ~12% APY for Satoshi tier
        } else if (targetTier == StakingTier.SUPER) {
            currentAPY = 1000; // ~10% APY for Super tier
        } else if (targetTier == StakingTier.BOOST) {
            currentAPY = 850; // ~8.5% APY for Boost tier
        } else {
            currentAPY = 700; // ~7% APY for Base tier
        }
        
        targetTierName = _getTierDisplayName(targetTier);
    }
    
    /**
     * @dev Get basket composition for frontend
     */
    function getBasketComposition() external view returns (
        string[] memory assetNames,
        string[] memory assetSymbols,
        uint256[] memory allocations,
        uint256[] memory values,
        uint256 totalValue
    ) {
        assetNames = new string[](2);
        assetSymbols = new string[](2);
        allocations = new uint256[](2);
        values = new uint256[](2);
        
        assetNames[0] = "Core Token";
        assetNames[1] = "Bitcoin (CoreDAO)";
        assetSymbols[0] = "CORE";
        assetSymbols[1] = "BTC";
        
        totalValue = _getTotalValue();
        
        if (totalValue > 0) {
            uint256 coreValue = (totalPooledCORE * priceFeed.getCorePrice()) / 1e18;
            uint256 btcValue = (totalPooledBTC * priceFeed.getSolvBTCPrice()) / 1e18;
            
            values[0] = coreValue;
            values[1] = btcValue;
            
            allocations[0] = (coreValue * 10000) / totalValue; // Basis points
            allocations[1] = (btcValue * 10000) / totalValue;
        }
    }
    
    /**
     * @dev Get tier benefits information
     */
    function getTierBenefits() external view returns (
        string[] memory tierNames,
        uint256[] memory ratioRequirements,
        uint256[] memory apyBoosts,
        string[] memory descriptions
    ) {
        tierNames = new string[](4);
        ratioRequirements = new uint256[](4);
        apyBoosts = new uint256[](4);
        descriptions = new string[](4);
        
        tierNames[0] = "Base Tier";
        tierNames[1] = "Boost Tier";
        tierNames[2] = "Super Tier";
        tierNames[3] = "Satoshi Tier";
        
        ratioRequirements[0] = 0;
        ratioRequirements[1] = 2000;
        ratioRequirements[2] = 6000;
        ratioRequirements[3] = 16000;
        
        apyBoosts[0] = 0;
        apyBoosts[1] = 150; // +1.5% APY boost
        apyBoosts[2] = 300; // +3% APY boost
        apyBoosts[3] = 500; // +5% APY boost
        
        descriptions[0] = "Standard staking rewards";
        descriptions[1] = "Enhanced rewards with 2,000:1 CORE:BTC ratio";
        descriptions[2] = "Premium rewards with 6,000:1 CORE:BTC ratio";
        descriptions[3] = "Maximum rewards with 16,000:1 CORE:BTC ratio";
    }
    
    /**
     * @dev Get user position information
     */
    function getUserPosition(address user) external view returns (
        uint256 basketTokenBalance,
        uint256 valueInUSD,
        uint256 coreEquivalent,
        uint256 btcEquivalent,
        uint256 shareOfPool
    ) {
        basketTokenBalance = basketToken.balanceOf(user);
        
        if (basketTokenBalance > 0 && basketToken.totalSupply() > 0) {
            uint256 totalValue = _getTotalValue();
            valueInUSD = (basketTokenBalance * totalValue) / basketToken.totalSupply();
            
            coreEquivalent = (basketTokenBalance * totalPooledCORE) / basketToken.totalSupply();
            btcEquivalent = (basketTokenBalance * totalPooledBTC) / basketToken.totalSupply();
            
            shareOfPool = (basketTokenBalance * 10000) / basketToken.totalSupply(); // Basis points
        }
    }
    
    /**
     * @dev Get deposit requirements for optimal tier
     */
    function getOptimalDepositAmounts(uint256 usdAmount) external view returns (
        uint256 recommendedCoreAmount,
        uint256 recommendedBtcAmount,
        string memory rationale,
        StakingTier achievableTier
    ) {
        uint256 corePrice = priceFeed.getCorePrice();
        uint256 btcPrice = priceFeed.getSolvBTCPrice();
        
        // Calculate for target tier ratio
        if (targetRatio > 0) {
            // For dual staking, we need specific CORE:BTC ratios
            uint256 totalTokensNeeded = (usdAmount * 1e18) / ((corePrice * targetRatio / 1e18) + btcPrice);
            
            recommendedBtcAmount = totalTokensNeeded;
            recommendedCoreAmount = (recommendedBtcAmount * targetRatio) / 1e18;
            
            achievableTier = targetTier;
            rationale = string(abi.encodePacked(
                "Optimized for ", 
                _getTierDisplayName(targetTier),
                " tier with ",
                _formatRatio(targetRatio),
                ":1 CORE:BTC ratio"
            ));
        } else {
            // Base tier - equal USD allocation
            uint256 halfUSD = usdAmount / 2;
            recommendedCoreAmount = (halfUSD * 1e18) / corePrice;
            recommendedBtcAmount = (halfUSD * 1e18) / btcPrice;
            
            achievableTier = StakingTier.BASE;
            rationale = "Equal allocation for base tier staking";
        }
    }
    
    /**
     * @dev Internal helper to get tier display name
     */
    function _getTierDisplayName(StakingTier tier) internal pure returns (string memory) {
        if (tier == StakingTier.SATOSHI) return "Satoshi";
        if (tier == StakingTier.SUPER) return "Super";
        if (tier == StakingTier.BOOST) return "Boost";
        return "Base";
    }
    
    /**
     * @dev Internal helper to format ratio for display
     */
    function _formatRatio(uint256 ratio) internal pure returns (string memory) {
        if (ratio == 0) return "0";
        return toString(ratio / 1e18);
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}