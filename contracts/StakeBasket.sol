// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StakeBasketToken.sol";
import "./StakingManager.sol";
import "./PriceFeed.sol";

interface IBasketStaking {
    function getFeeReduction(address user) external view returns (uint256);
}

/**
 * @title StakeBasket
 * @dev Main contract for the StakeBasket multi-asset staking ETF
 * Allows users to deposit CORE and lstBTC tokens and receive ETF shares
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
    uint256 public totalProtocolFeesCollected;
    
    // Events
    event Deposited(address indexed user, uint256 coreAmount, uint256 sharesIssued);
    event Redeemed(address indexed user, uint256 sharesBurned, uint256 coreAmount);
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
        
        // Transfer CORE tokens from user to this contract
        // Note: In a real implementation, you'd use the actual CORE token contract
        // For this POC, we're simulating with native CORE (ETH-like behavior on Core chain)
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
     * @dev Redeem ETF shares for underlying CORE tokens
     * @param shares Amount of ETF shares to burn
     */
    function redeem(uint256 shares) external nonReentrant whenNotPaused {
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
        
        emit Redeemed(msg.sender, shares, coreAmount);
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
        
        uint256 corePrice = priceFeed.getCorePrice();
        uint256 lstBTCPrice = priceFeed.getLstBTCPrice();
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
            corePrice_ = priceFeed.getCorePrice();
            lstBTCPrice_ = priceFeed.getLstBTCPrice();
        } else {
            // Fallback to mock prices
            corePrice_ = 1e18;
            lstBTCPrice_ = 95000e18;
        }
        
        uint256 totalAssetValue = (totalPooledCore * corePrice_ + totalPooledLstBTC * lstBTCPrice_) / 1e18;
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
            corePrice_ = priceFeed.getCorePrice();
            lstBTCPrice_ = priceFeed.getLstBTCPrice();
        } else {
            // Fallback to mock prices
            corePrice_ = 1e18;
            lstBTCPrice_ = 95000e18;
        }
        
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
            corePrice_ = priceFeed.getCorePrice();
            lstBTCPrice_ = priceFeed.getLstBTCPrice();
        } else {
            // Fallback to mock prices
            corePrice_ = 1e18;
            lstBTCPrice_ = 95000e18;
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
            corePrice_ = priceFeed.getCorePrice();
            lstBTCPrice_ = priceFeed.getLstBTCPrice();
        } else {
            // Fallback to mock prices
            corePrice_ = 1e18;
            lstBTCPrice_ = 95000e18;
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
     * @dev Collect management and performance fees
     */
    function collectFees() external {
        uint256 currentTime = block.timestamp;
        uint256 timeSinceLastCollection = currentTime - lastFeeCollection;
        
        if (timeSinceLastCollection == 0) return;
        
        // Calculate management fee (annualized)
        uint256 totalAssetValue = getTotalAUM();
        uint256 managementFee = (totalAssetValue * managementFeeBasisPoints * timeSinceLastCollection) / 
                               (10000 * 365 days);
        
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
            
            // Handle protocol fees
            if (protocolFeeAmount > 0) {
                totalProtocolFeesCollected += protocolFeeAmount;
                
                // If BasketStaking contract is set, send fees there for distribution
                if (basketStaking != address(0)) {
                    (bool success, ) = payable(basketStaking).call{value: protocolFeeAmount}("");
                    if (success) {
                        emit ProtocolFeesDistributed(protocolFeeAmount);
                    }
                } else if (protocolTreasury != address(0)) {
                    // Otherwise send to protocol treasury
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
     * @dev Simulate staking rewards (in production, integrate with Core staking)
     */
    function simulateRewards() external onlyOwner {
        uint256 rewardAmount = (totalPooledCore * 85) / 10000; // 0.85% reward
        totalPooledCore += rewardAmount;
    }
    
    // Allow contract to receive ETH (CORE)
    receive() external payable {}
}