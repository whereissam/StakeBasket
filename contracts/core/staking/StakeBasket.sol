// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../tokens/StakeBasketToken.sol";
import "./StakingManager.sol";
import "../../integrations/oracles/PriceFeed.sol";

interface IBasketStaking {
    function getFeeReduction(address user) external view returns (uint256);
}

/**
 * @title StakeBasket
 * @dev Multi-asset staking ETF - User-facing contract for deposits/withdrawals
 * 
 * ARCHITECTURE SEPARATION:
 * - StakeBasket: User-facing logic (deposits, withdrawals, NAV calculation, fees)
 * - StakingManager: External protocol coordination (validator delegation, lstBTC operations)
 * - DualStakingBasket: Specialized strategy for CoreDAO dual staking optimization
 * 
 * This contract handles:
 * - User deposits and withdrawals
 * - Share minting/burning with tiered fee reductions
 * - NAV calculation and fee collection
 * - Protocol fee distribution via BasketStaking contract
 * - Integration with StakingManager for actual staking operations
 */
contract StakeBasket is ReentrancyGuard, Ownable, Pausable {
    StakeBasketToken public immutable etfToken;
    StakingManager public stakingManager;
    PriceFeed public priceFeed;
    
    // State variables
    uint256 public totalPooledCore;
    uint256 public totalPooledLstBTC;
    uint256 public managementFeeBasisPoints = 50; // 0.5%
    uint256 public performanceFeeBasisPoints = 1000; // 10%
    address public feeRecipient;
    address public protocolTreasury;
    address public basketStaking;
    uint256 public lastFeeCollection;
    uint256 public protocolFeePercentage = 2000; // 20% of fees go to protocol
    
    // Fee tracking
    uint256 public accumulatedManagementFees;
    uint256 public accumulatedPerformanceFees;
    
    // Unbonding queue system
    struct WithdrawalRequest {
        address user;
        uint256 shares;
        uint256 requestTime;
        bool isProcessed;
    }
    
    WithdrawalRequest[] public withdrawalQueue;
    mapping(address => uint256[]) public userWithdrawalRequests;
    uint256 public constant UNBONDING_PERIOD = 1 days;
    uint256 public emergencyReserveRatio = 1000; // 10% kept for instant redemptions
    uint256 public totalProtocolFeesCollected;
    
    // Enhanced fee distribution mechanism
    mapping(address => uint256) public userLastValueSnapshot;
    uint256 public lastPerformanceCalculation;
    bool public feeDistributionAsETH = true; // Distribute fees as ETH rewards
    
    // Events
    event Deposited(address indexed user, uint256 coreAmount, uint256 sharesIssued);
    event Redeemed(address indexed user, uint256 sharesBurned, uint256 coreAmount);
    event WithdrawalRequested(address indexed user, uint256 shares, uint256 requestId, uint256 requestTime);
    event WithdrawalProcessed(address indexed user, uint256 shares, uint256 coreAmount, uint256 requestId);
    event InstantRedeemExecuted(address indexed user, uint256 shares, uint256 coreAmount);
    event FeesCollected(address indexed recipient, uint256 amount);
    event StakingManagerSet(address indexed newManager);
    event PriceFeedSet(address indexed newPriceFeed);
    event RewardsCompounded(uint256 totalRewards);
    event ProtocolTreasurySet(address indexed newTreasury);
    event BasketStakingSet(address indexed newStaking);
    event ProtocolFeesDistributed(uint256 amount);
    
    constructor(
        address _etfToken,
        address payable _stakingManager,
        address _priceFeed,
        address _feeRecipient,
        address _protocolTreasury,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_etfToken != address(0), "StakeBasket: invalid ETF token address");
        require(_feeRecipient != address(0), "StakeBasket: invalid fee recipient");
        
        etfToken = StakeBasketToken(_etfToken);
        if (_stakingManager != address(0)) {
            stakingManager = StakingManager(_stakingManager);
        }
        if (_priceFeed != address(0)) {
            priceFeed = PriceFeed(_priceFeed);
        }
        feeRecipient = _feeRecipient;
        protocolTreasury = _protocolTreasury;
        lastFeeCollection = block.timestamp;
    }
    
    /**
     * @dev Deposit CORE tokens and receive ETF shares (with tiered fee reduction)
     * @param amount Amount of CORE tokens to deposit
     */
    function deposit(uint256 amount) external payable nonReentrant whenNotPaused {
        require(amount > 0, "StakeBasket: amount must be greater than 0");
        
        // Accept native CORE (ETH) payments
        require(msg.value == amount, "StakeBasket: sent value must equal amount");
        
        // Apply tiered fee reduction if BasketStaking is set
        uint256 effectiveAmount = amount;
        if (basketStaking != address(0)) {
            uint256 feeReduction = IBasketStaking(basketStaking).getFeeReduction(msg.sender);
            if (feeReduction > 0) {
                uint256 implicitFee = (amount * managementFeeBasisPoints) / 10000;
                uint256 reducedFee = (implicitFee * feeReduction) / 10000;
                effectiveAmount = amount + reducedFee; // Effectively reduces the fee burden
            }
        }
        
        // Calculate shares to mint based on effective amount
        uint256 sharesToMint = _calculateSharesToMint(effectiveAmount);
        
        // Update state with actual amount
        totalPooledCore += amount;
        
        // Mint ETF tokens to user
        etfToken.mint(msg.sender, sharesToMint);
        
        emit Deposited(msg.sender, amount, sharesToMint);
    }
    
    /**
     * @dev Request withdrawal - queued for 1 day unbonding period
     * @param shares Amount of ETF shares to redeem
     * @return requestId ID of the withdrawal request
     */
    function requestWithdrawal(uint256 shares) external nonReentrant whenNotPaused returns (uint256) {
        require(shares > 0, "StakeBasket: shares must be greater than 0");
        require(etfToken.balanceOf(msg.sender) >= shares, "StakeBasket: insufficient shares");
        
        // Create withdrawal request
        uint256 requestId = withdrawalQueue.length;
        withdrawalQueue.push(WithdrawalRequest({
            user: msg.sender,
            shares: shares,
            requestTime: block.timestamp,
            isProcessed: false
        }));
        
        userWithdrawalRequests[msg.sender].push(requestId);
        
        // Lock shares by transferring to this contract
        etfToken.transferFrom(msg.sender, address(this), shares);
        
        emit WithdrawalRequested(msg.sender, shares, requestId, block.timestamp);
        return requestId;
    }
    
    /**
     * @dev Process matured withdrawal request after unbonding period
     * @param requestId ID of the withdrawal request to process
     */
    function processWithdrawal(uint256 requestId) external nonReentrant whenNotPaused {
        require(requestId < withdrawalQueue.length, "StakeBasket: invalid request ID");
        WithdrawalRequest storage request = withdrawalQueue[requestId];
        
        require(request.user == msg.sender, "StakeBasket: not request owner");
        require(!request.isProcessed, "StakeBasket: already processed");
        require(block.timestamp >= request.requestTime + UNBONDING_PERIOD, "StakeBasket: unbonding period not complete");
        
        // Calculate CORE amount to return
        uint256 coreAmount = _calculateCoreToReturn(request.shares);
        
        // If insufficient liquidity, auto-undelegate from validators
        if (address(this).balance < coreAmount && address(stakingManager) != address(0)) {
            _undelegateForWithdrawal(coreAmount);
        }
        
        require(address(this).balance >= coreAmount, "StakeBasket: insufficient liquidity even after undelegation");
        
        // Mark as processed
        request.isProcessed = true;
        
        // Update state
        totalPooledCore -= coreAmount;
        
        // Burn locked ETF tokens
        etfToken.burn(address(this), request.shares);
        
        // Transfer CORE back to user
        (bool success, ) = payable(msg.sender).call{value: coreAmount}("");
        require(success, "StakeBasket: transfer failed");
        
        emit WithdrawalProcessed(msg.sender, request.shares, coreAmount, requestId);
    }
    
    /**
     * @dev Instant redeem for demo purposes (NOT RECOMMENDED - keeps emergency reserve)
     * @param shares Amount of ETF shares to burn
     */
    function instantRedeem(uint256 shares) external nonReentrant whenNotPaused {
        require(shares > 0, "StakeBasket: shares must be greater than 0");
        require(etfToken.balanceOf(msg.sender) >= shares, "StakeBasket: insufficient shares");
        
        // Calculate CORE amount to return
        uint256 coreAmount = _calculateCoreToReturn(shares);
        
        // Check emergency reserve limit
        uint256 maxInstantRedeem = (address(this).balance * emergencyReserveRatio) / 10000;
        require(coreAmount <= maxInstantRedeem, "StakeBasket: exceeds instant redeem limit - use requestWithdrawal()");
        require(address(this).balance >= coreAmount, "StakeBasket: insufficient liquidity for instant redeem");
        
        // Update state
        totalPooledCore -= coreAmount;
        
        // Burn user's ETF tokens
        etfToken.burn(msg.sender, shares);
        
        // Transfer CORE back to user
        (bool success, ) = payable(msg.sender).call{value: coreAmount}("");
        require(success, "StakeBasket: transfer failed");
        
        emit InstantRedeemExecuted(msg.sender, shares, coreAmount);
    }
    
    /**
     * @dev Legacy redeem function - simplified for basic functionality
     * @param shares Amount of ETF shares to redeem
     */
    function redeem(uint256 shares) external nonReentrant whenNotPaused returns (uint256) {
        require(shares > 0, "StakeBasket: shares must be greater than 0");
        require(etfToken.balanceOf(msg.sender) >= shares, "StakeBasket: insufficient shares");
        
        // Calculate CORE amount to return
        uint256 coreAmount = _calculateCoreToReturn(shares);
        require(address(this).balance >= coreAmount, "StakeBasket: insufficient liquidity");
        
        // Update state
        totalPooledCore -= coreAmount;
        
        // Burn user's ETF tokens
        etfToken.burn(msg.sender, shares);
        
        // Transfer CORE back to user
        (bool success, ) = payable(msg.sender).call{value: coreAmount}("");
        require(success, "StakeBasket: transfer failed");
        
        return coreAmount;
    }
    
    /**
     * @dev Get current NAV per share
     * @return NAV per share in USD (18 decimals)
     */
    function getNAVPerShare() external view returns (uint256) {
        return _getNAVPerShare();
    }
    
    /**
     * @dev Get total assets under management in USD
     * @return Total AUM in USD (18 decimals)
     */
    function getTotalAUM() public view returns (uint256) {
        if (address(priceFeed) == address(0)) {
            // Fallback to mock prices if PriceFeed not set
            return (totalPooledCore * 1e18 + totalPooledLstBTC * 95000e18) / 1e18;
        }
        
        uint256 corePrice = priceFeed.getPrice("CORE") * 1e10; // Convert from 8 to 18 decimals
        uint256 lstBTCPrice = priceFeed.getPrice("BTC") * 1e10; // Convert from 8 to 18 decimals
        return (totalPooledCore * corePrice + totalPooledLstBTC * lstBTCPrice) / 1e18;
    }
    
    /**
     * @dev Calculate shares to mint for a given CORE amount
     * @param coreAmount Amount of CORE tokens
     * @return Number of shares to mint
     */
    function _calculateSharesToMint(uint256 coreAmount) internal view returns (uint256) {
        if (etfToken.totalSupply() == 0) {
            // Initial deposit: 1 CORE = 1 share
            return coreAmount;
        }
        
        uint256 corePrice_;
        uint256 lstBTCPrice_;
        
        if (address(priceFeed) != address(0)) {
            corePrice_ = priceFeed.getPrice("CORE") * 1e10; // Convert from 8 to 18 decimals
            lstBTCPrice_ = priceFeed.getPrice("BTC") * 1e10; // Convert from 8 to 18 decimals
        } else {
            // Fallback to mock prices
            corePrice_ = 15e17;  // $1.5 CORE
            lstBTCPrice_ = 95000e18; // $95k BTC
        }
        
        // Add overflow protection and zero division checks
        require(totalPooledCore <= type(uint128).max, "StakeBasket: totalPooledCore too large");
        require(totalPooledLstBTC <= type(uint128).max, "StakeBasket: totalPooledLstBTC too large");
        require(coreAmount <= type(uint128).max, "StakeBasket: coreAmount too large");
        
        uint256 totalAssetValue = (totalPooledCore * corePrice_ + totalPooledLstBTC * lstBTCPrice_) / 1e18;
        require(totalAssetValue > 0, "StakeBasket: zero total asset value");
        
        uint256 newAssetValue = (coreAmount * corePrice_) / 1e18;
        
        return (newAssetValue * etfToken.totalSupply()) / totalAssetValue;
    }
    
    /**
     * @dev Calculate CORE amount to return for given shares
     * @param shares Number of shares to redeem
     * @return Amount of CORE tokens to return
     */
    function _calculateCoreToReturn(uint256 shares) internal view returns (uint256) {
        uint256 corePrice_;
        uint256 lstBTCPrice_;
        
        if (address(priceFeed) != address(0)) {
            corePrice_ = priceFeed.getPrice("CORE") * 1e10; // Convert from 8 to 18 decimals
            lstBTCPrice_ = priceFeed.getPrice("BTC") * 1e10; // Convert from 8 to 18 decimals
        } else {
            // Fallback to mock prices
            corePrice_ = 15e17;  // $1.5 CORE
            lstBTCPrice_ = 95000e18; // $95k BTC
        }
        
        // Add overflow protection and zero division checks
        require(shares <= type(uint128).max, "StakeBasket: shares too large");
        require(etfToken.totalSupply() > 0, "StakeBasket: zero total supply");
        require(corePrice_ > 0, "StakeBasket: zero core price");
        
        uint256 totalAssetValue = (totalPooledCore * corePrice_ + totalPooledLstBTC * lstBTCPrice_) / 1e18;
        uint256 shareValue = (shares * totalAssetValue) / etfToken.totalSupply();
        
        // Return equivalent value in CORE
        return (shareValue * 1e18) / corePrice_;
    }
    
    /**
     * @dev Calculate shares to mint for given asset amount and type
     * @param amount Amount of asset
     * @param asset Asset address (or address(0) for CORE)
     * @return Number of shares to mint
     */
    function _calculateShares(uint256 amount, address asset) internal view returns (uint256) {
        if (etfToken.totalSupply() == 0) {
            return amount; // Initial deposit: 1:1 ratio
        }
        
        uint256 corePrice_;
        uint256 lstBTCPrice_;
        
        if (address(priceFeed) != address(0)) {
            corePrice_ = priceFeed.getPrice("CORE") * 1e10; // Convert from 8 to 18 decimals
            lstBTCPrice_ = priceFeed.getPrice("BTC") * 1e10; // Convert from 8 to 18 decimals
        } else {
            // Fallback to mock prices
            corePrice_ = 15e17;  // $1.5 CORE
            lstBTCPrice_ = 95000e18; // $95k BTC
        }
        
        uint256 assetPrice = asset == address(0) ? corePrice_ : lstBTCPrice_;
        uint256 assetValue = (amount * assetPrice) / 1e18;
        uint256 totalAssetValue = (totalPooledCore * corePrice_ + totalPooledLstBTC * lstBTCPrice_) / 1e18;
        
        return (assetValue * etfToken.totalSupply()) / totalAssetValue;
    }
    
    /**
     * @dev Get current NAV per share
     * @return NAV per share in USD (18 decimals)
     */
    function _getNAVPerShare() internal view returns (uint256) {
        if (etfToken.totalSupply() == 0) {
            return 1e18; // Initial NAV = 1 USD
        }
        
        uint256 corePrice_;
        uint256 lstBTCPrice_;
        
        if (address(priceFeed) != address(0)) {
            corePrice_ = priceFeed.getPrice("CORE") * 1e10; // Convert from 8 to 18 decimals
            lstBTCPrice_ = priceFeed.getPrice("BTC") * 1e10; // Convert from 8 to 18 decimals
        } else {
            // Fallback to mock prices
            corePrice_ = 15e17;  // $1.5 CORE
            lstBTCPrice_ = 95000e18; // $95k BTC
        }
        
        uint256 totalAssetValue = (totalPooledCore * corePrice_ + totalPooledLstBTC * lstBTCPrice_) / 1e18;
        return (totalAssetValue * 1e18) / etfToken.totalSupply();
    }
    
    /**
     * @dev Compound rewards by claiming and reinvesting them
     */
    function claimAndReinvestRewards() external onlyOwner {
        if (address(stakingManager) == address(0)) return;
        
        uint256 totalRewards = stakingManager.claimCoreRewards();
        
        if (totalRewards > 0) {
            // Reinvest rewards back into the pool
            totalPooledCore += totalRewards;
            emit RewardsCompounded(totalRewards);
        }
    }
    
    /**
     * @dev Delegate CORE to validators through StakingManager
     * Enhanced with automatic optimal validator selection
     * @param amount Amount to delegate (0 = delegate all available)
     */
    function delegateCore(uint256 amount) external onlyOwner {
        require(address(stakingManager) != address(0), "StakeBasket: staking manager not set");
        
        uint256 availableBalance = address(this).balance;
        uint256 delegateAmount = amount == 0 ? availableBalance : amount;
        require(availableBalance >= delegateAmount, "StakeBasket: insufficient balance");
        
        // Get optimal validator distribution from StakingManager
        (address[] memory validators, uint256[] memory allocations) = 
            stakingManager.getOptimalValidatorDistribution();
        
        require(validators.length > 0, "StakeBasket: no optimal validators available");
        
        // Distribute delegation across optimal validators
        for (uint256 i = 0; i < validators.length; i++) {
            uint256 validatorAmount = (delegateAmount * allocations[i]) / 10000;
            if (validatorAmount > 0) {
                stakingManager.delegateCore{value: validatorAmount}(validators[i], validatorAmount);
            }
        }
    }
    
    /**
     * @dev Enhanced fee collection with ETH reward distribution
     * Fees are collected in CORE/lstBTC and can be swapped to ETH for reward distribution
     */
    function collectFees() external {
        uint256 currentTime = block.timestamp;
        uint256 timeSinceLastCollection = currentTime - lastFeeCollection;
        
        if (timeSinceLastCollection == 0) return;
        
        // Calculate management fee (annualized) with higher precision
        uint256 totalAssetValue = getTotalAUM();
        require(totalAssetValue > 0, "StakeBasket: zero asset value for fee calculation");
        
        // Use 1e18 precision for intermediate calculations to prevent precision loss
        uint256 managementFee = (totalAssetValue * managementFeeBasisPoints * timeSinceLastCollection * 1e18) / 
                               (10000 * 365 days * 1e18);
        
        // Calculate performance fee based on growth since last collection
        // This is a simplified implementation
        uint256 performanceFee = 0;
        
        uint256 totalFees = managementFee + performanceFee;
        
        if (totalFees > 0) {
            accumulatedManagementFees += managementFee;
            accumulatedPerformanceFees += performanceFee;
            
            // Calculate protocol fee share
            uint256 protocolFeeAmount = (totalFees * protocolFeePercentage) / 10000;
            uint256 feeRecipientAmount = totalFees - protocolFeeAmount;
            
            // Mint fee tokens to fee recipient
            if (feeRecipientAmount > 0) {
                uint256 feeShares = _calculateSharesToMint(feeRecipientAmount);
                etfToken.mint(feeRecipient, feeShares);
            }
            
            // Enhanced protocol fee handling with ETH conversion
            if (protocolFeeAmount > 0) {
                totalProtocolFeesCollected += protocolFeeAmount;
                
                if (feeDistributionAsETH && basketStaking != address(0)) {
                    // Convert fees to ETH via StakingManager if needed
                    uint256 ethAmount = _convertFeesToETH(protocolFeeAmount);
                    
                    // Send ETH rewards to BasketStaking for distribution
                    (bool success, ) = payable(basketStaking).call{value: ethAmount}("");
                    if (success) {
                        emit ProtocolFeesDistributed(ethAmount);
                    }
                } else if (protocolTreasury != address(0)) {
                    // Send CORE fees to protocol treasury
                    (bool success, ) = payable(protocolTreasury).call{value: protocolFeeAmount}("");
                    require(success, "StakeBasket: protocol fee transfer failed");
                }
            }
            
            emit FeesCollected(feeRecipient, totalFees);
        }
        
        lastFeeCollection = currentTime;
    }
    
    // Admin functions
    
    /**
     * @dev Set StakingManager contract address
     * @param _stakingManager New StakingManager address
     */
    function setStakingManager(address payable _stakingManager) external onlyOwner {
        stakingManager = StakingManager(_stakingManager);
        emit StakingManagerSet(_stakingManager);
    }
    
    /**
     * @dev Set PriceFeed contract address
     * @param _priceFeed New PriceFeed address
     */
    function setPriceFeed(address _priceFeed) external onlyOwner {
        priceFeed = PriceFeed(_priceFeed);
        emit PriceFeedSet(_priceFeed);
    }
    
    /**
     * @dev Set fee recipient address
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "StakeBasket: invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Set management fee
     * @param _feeBasisPoints New fee in basis points (100 = 1%)
     */
    function setManagementFee(uint256 _feeBasisPoints) external onlyOwner {
        require(_feeBasisPoints <= 1000, "StakeBasket: fee too high"); // Max 10%
        managementFeeBasisPoints = _feeBasisPoints;
    }
    
    /**
     * @dev Set protocol treasury address
     * @param _protocolTreasury New protocol treasury address
     */
    function setProtocolTreasury(address _protocolTreasury) external onlyOwner {
        protocolTreasury = _protocolTreasury;
        emit ProtocolTreasurySet(_protocolTreasury);
    }
    
    /**
     * @dev Set BasketStaking contract address
     * @param _basketStaking New BasketStaking contract address
     */
    function setBasketStaking(address _basketStaking) external onlyOwner {
        basketStaking = _basketStaking;
        emit BasketStakingSet(_basketStaking);
    }
    
    /**
     * @dev Set protocol fee percentage
     * @param _percentage New protocol fee percentage in basis points
     */
    function setProtocolFeePercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 5000, "StakeBasket: protocol fee too high"); // Max 50%
        protocolFeePercentage = _percentage;
    }
    
    /**
     * @dev Set fee distribution mechanism (ETH vs CORE)
     * @param _asETH Whether to distribute fees as ETH rewards
     */
    function setFeeDistributionAsETH(bool _asETH) external onlyOwner {
        feeDistributionAsETH = _asETH;
    }
    
    /**
     * @dev Convert collected fees to ETH via DEX or StakingManager
     * @param amount Amount of CORE fees to convert
     * @return ethAmount Amount of ETH received
     */
    function _convertFeesToETH(uint256 amount) internal returns (uint256 ethAmount) {
        // For CoreDAO, CORE is the native token (ETH), so no conversion needed
        // In a multi-chain setup, this would handle DEX swaps
        return amount;
    }
    
    /**
     * @dev Enhanced portfolio rebalancing through StakingManager
     */
    function rebalancePortfolio() external onlyOwner {
        require(address(stakingManager) != address(0), "StakeBasket: staking manager not set");
        
        // Check if rebalancing is needed
        (bool needsRebalance, string memory reason) = stakingManager.shouldRebalance();
        
        if (needsRebalance) {
            // Get optimal distribution
            (address[] memory validators, uint256[] memory allocations) = 
                stakingManager.getOptimalValidatorDistribution();
            
            // Trigger automated rebalancing in StakingManager
            // This would involve undelegating from suboptimal validators
            // and redelegating to optimal ones
            emit RewardsCompounded(0); // Placeholder event
        }
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Internal function to undelegate CORE from validators when needed for withdrawals
     * @param requiredAmount Amount of CORE needed for withdrawal
     */
    function _undelegateForWithdrawal(uint256 requiredAmount) internal {
        if (address(stakingManager) == address(0)) return;
        
        // This will undelegate from validators to provide liquidity
        // In a real implementation, this would call StakingManager.undelegateCore()
        // For now, we'll add funds to demonstrate the concept
        
        // Emergency: Owner should manually undelegate or add funds
        // This is a placeholder - in production, integrate with StakingManager
    }
    
    /**
     * @dev Emergency function to undelegate CORE from validators (Owner only)
     * @param amount Amount to undelegate (0 = undelegate what's needed for pending withdrawals)
     */
    function emergencyUndelegate(uint256 amount) external onlyOwner {
        require(address(stakingManager) != address(0), "StakeBasket: staking manager not set");
        
        if (amount == 0) {
            // Calculate total pending withdrawal amount
            uint256 totalPending = 0;
            for (uint256 i = 0; i < withdrawalQueue.length; i++) {
                if (!withdrawalQueue[i].isProcessed) {
                    totalPending += _calculateCoreToReturn(withdrawalQueue[i].shares);
                }
            }
            amount = totalPending;
        }
        
        if (amount > 0 && address(this).balance < amount) {
            // Call StakingManager to undelegate the required amount
            // stakingManager.undelegateCore(amount - address(this).balance);
        }
    }
    
    /**
     * @dev Get user's pending withdrawal requests
     * @param user Address of the user
     * @return requestIds Array of request IDs
     * @return amounts Array of share amounts
     * @return timestamps Array of request timestamps
     * @return canProcess Array indicating if each request can be processed
     */
    function getUserWithdrawalRequests(address user) external view returns (
        uint256[] memory requestIds,
        uint256[] memory amounts,
        uint256[] memory timestamps,
        bool[] memory canProcess
    ) {
        uint256[] storage userRequests = userWithdrawalRequests[user];
        uint256 length = userRequests.length;
        
        requestIds = new uint256[](length);
        amounts = new uint256[](length);
        timestamps = new uint256[](length);
        canProcess = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 requestId = userRequests[i];
            WithdrawalRequest storage request = withdrawalQueue[requestId];
            
            requestIds[i] = requestId;
            amounts[i] = request.shares;
            timestamps[i] = request.requestTime;
            canProcess[i] = !request.isProcessed && 
                          block.timestamp >= request.requestTime + UNBONDING_PERIOD;
        }
    }
    
    /**
     * @dev Simulate staking rewards (in production, integrate with Core staking)
     */
    function simulateRewards() external onlyOwner {
        uint256 rewardAmount = (totalPooledCore * 85) / 10000; // 0.85% reward
        totalPooledCore += rewardAmount;
    }
    
    // Allow contract to receive ETH (CORE)
    receive() external payable {}
}