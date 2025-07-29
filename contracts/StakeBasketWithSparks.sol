// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StakeBasketToken.sol";
import "./StakingManager.sol";
import "./PriceFeed.sol";
import "./interfaces/ISparks.sol";

/**
 * @title StakeBasketWithSparks
 * @dev Enhanced StakeBasket contract with integrated Sparks point system
 * Users earn Sparks points for participating and can use them for benefits
 */
contract StakeBasketWithSparks is ReentrancyGuard, Ownable, Pausable {
    StakeBasketToken public immutable etfToken;
    StakingManager public stakingManager;
    PriceFeed public priceFeed;
    ISparks public sparksManager;
    
    // State variables
    uint256 public totalPooledCore;
    uint256 public totalPooledLstBTC;
    uint256 public managementFeeBasisPoints = 50; // 0.5%
    uint256 public performanceFeeBasisPoints = 1000; // 10%
    address public feeRecipient;
    address public protocolTreasury;
    uint256 public lastFeeCollection;
    uint256 public protocolFeePercentage = 2000; // 20% of fees go to protocol
    
    // Sparks integration
    mapping(address => uint256) public lastSparksUpdate;
    uint256 public constant SPARKS_PER_DEPOSIT = 100e18; // 100 Sparks per deposit
    uint256 public constant SPARKS_PER_HOLD_PER_DAY = 1e18; // 1 Spark per BASKET per day
    
    // Fee tracking
    uint256 public accumulatedManagementFees;
    uint256 public accumulatedPerformanceFees;
    uint256 public totalProtocolFeesCollected;
    
    // Events
    event Deposited(address indexed user, uint256 coreAmount, uint256 sharesIssued, uint256 sparksAwarded);
    event Redeemed(address indexed user, uint256 sharesBurned, uint256 coreAmount);
    event FeesCollected(address indexed recipient, uint256 amount);
    event StakingManagerSet(address indexed newManager);
    event PriceFeedSet(address indexed newPriceFeed);
    event SparksManagerSet(address indexed newSparksManager);
    event RewardsCompounded(uint256 totalRewards);
    event ProtocolTreasurySet(address indexed newTreasury);
    event SparksUpdated(address indexed user, uint256 basketBalance);
    event FeeReductionApplied(address indexed user, uint256 originalFee, uint256 reducedFee, uint256 reductionPercent);
    
    constructor(
        address _etfToken,
        address payable _stakingManager,
        address _priceFeed,
        address _sparksManager,
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
        if (_sparksManager != address(0)) {
            sparksManager = ISparks(_sparksManager);
        }
        feeRecipient = _feeRecipient;
        protocolTreasury = _protocolTreasury;
        lastFeeCollection = block.timestamp;
    }
    
    /**
     * @dev Deposit CORE tokens and receive ETF shares with Sparks rewards
     * @param amount Amount of CORE tokens to deposit
     */
    function deposit(uint256 amount) external payable nonReentrant whenNotPaused {
        require(amount > 0, "StakeBasket: amount must be greater than 0");
        require(msg.value == amount, "StakeBasket: sent value must equal amount");
        
        // Update user's Sparks before processing deposit
        _updateUserSparks(msg.sender);
        
        // Apply Sparks-based fee reduction
        uint256 effectiveAmount = _applyFeeReduction(amount, msg.sender);
        
        // Calculate shares to mint
        uint256 sharesToMint;
        uint256 totalSupply = etfToken.totalSupply();
        
        if (totalSupply == 0) {
            // First deposit - mint 1:1 ratio
            sharesToMint = effectiveAmount;
        } else {
            // Calculate based on current NAV
            uint256 totalValue = getTotalAUM();
            sharesToMint = (effectiveAmount * totalSupply) / totalValue;
        }
        
        require(sharesToMint > 0, "StakeBasket: shares to mint must be greater than 0");
        
        // Update pooled amounts
        totalPooledCore += amount;
        
        // Mint shares to user
        etfToken.mint(msg.sender, sharesToMint);
        
        // Award Sparks for deposit
        uint256 sparksAwarded = 0;
        if (address(sparksManager) != address(0)) {
            sparksAwarded = SPARKS_PER_DEPOSIT;
            sparksManager.awardSparks(msg.sender, sparksAwarded, "STAKEBASKET_DEPOSIT");
        }
        
        // Stake with StakingManager if available
        if (address(stakingManager) != address(0)) {
            stakingManager.stake{value: amount}();
        }
        
        emit Deposited(msg.sender, amount, sharesToMint, sparksAwarded);
    }
    
    /**
     * @dev Redeem ETF shares for underlying CORE tokens
     * @param shares Amount of ETF shares to redeem
     */
    function redeem(uint256 shares) external nonReentrant whenNotPaused {
        require(shares > 0, "StakeBasket: shares must be greater than 0");
        require(etfToken.balanceOf(msg.sender) >= shares, "StakeBasket: insufficient balance");
        
        // Update user's Sparks before processing redemption
        _updateUserSparks(msg.sender);
        
        // Calculate CORE amount to return
        uint256 totalSupply = etfToken.totalSupply();
        uint256 coreAmount = (shares * totalPooledCore) / totalSupply;
        
        require(coreAmount > 0, "StakeBasket: core amount must be greater than 0");
        require(address(this).balance >= coreAmount, "StakeBasket: insufficient contract balance");
        
        // Burn shares
        etfToken.burn(msg.sender, shares);
        
        // Update pooled amounts
        totalPooledCore -= coreAmount;
        
        // Transfer CORE tokens back to user
        (bool success, ) = payable(msg.sender).call{value: coreAmount}("");
        require(success, "StakeBasket: transfer failed");
        
        emit Redeemed(msg.sender, shares, coreAmount);
    }
    
    /**
     * @dev Update user's Sparks based on their BASKET token holding
     * @param user The user to update Sparks for
     */
    function updateUserSparks(address user) external {
        _updateUserSparks(user);
    }
    
    /**
     * @dev Internal function to update user's Sparks
     * @param user The user to update Sparks for
     */
    function _updateUserSparks(address user) internal {
        if (address(sparksManager) == address(0)) return;
        
        uint256 basketBalance = etfToken.balanceOf(user);
        
        // Award Sparks based on holding duration
        if (basketBalance > 0 && address(sparksManager) != address(0)) {
            sparksManager.updateBasketHoldingSparks(user, basketBalance);
        }
        
        lastSparksUpdate[user] = block.timestamp;
        emit SparksUpdated(user, basketBalance);
    }
    
    /**
     * @dev Apply fee reduction based on user's Sparks balance
     * @param amount The original amount
     * @param user The user to check for fee reduction
     * @return effectiveAmount The amount after fee reduction
     */
    function _applyFeeReduction(uint256 amount, address user) internal returns (uint256 effectiveAmount) {
        effectiveAmount = amount;
        
        if (address(sparksManager) != address(0)) {
            // Get user's fee reduction percentage from Sparks
            uint256 reductionPercent = sparksManager.getFeeReduction(user);
            
            if (reductionPercent > 0) {
                // Calculate the implicit management fee
                uint256 implicitFee = (amount * managementFeeBasisPoints) / 10000;
                
                // Calculate fee reduction
                uint256 feeReduction = (implicitFee * reductionPercent) / 100;
                
                // Apply the reduction by increasing effective amount
                effectiveAmount = amount + feeReduction;
                
                emit FeeReductionApplied(user, implicitFee, implicitFee - feeReduction, reductionPercent);
            }
        }
    }
    
    /**
     * @dev Get user's comprehensive Sparks information
     * @param user The user to check
     * @return sparksBalance Current Sparks balance
     * @return totalEarned Total Sparks earned
     * @return tier Current Sparks tier
     * @return feeReduction Fee reduction percentage
     * @return nextTierThreshold Sparks needed for next tier
     */
    function getUserSparksInfo(address user) 
        external 
        view 
        returns (
            uint256 sparksBalance,
            uint256 totalEarned,
            uint256 tier,
            uint256 feeReduction,
            uint256 nextTierThreshold
        ) 
    {
        if (address(sparksManager) == address(0)) {
            return (0, 0, 0, 0, 0);
        }
        
        return sparksManager.getUserSparksInfo(user);
    }
    
    /**
     * @dev Calculate the total Assets Under Management (AUM)
     * @return totalAUM The total value of all pooled assets
     */
    function getTotalAUM() public view returns (uint256 totalAUM) {
        uint256 coreValue = totalPooledCore;
        uint256 lstBTCValue = totalPooledLstBTC;
        
        // Add price feed integration if available
        if (address(priceFeed) != address(0)) {
            uint256 corePrice = priceFeed.getCorePrice();
            uint256 lstBTCPrice = priceFeed.getLstBTCPrice();
            
            coreValue = (totalPooledCore * corePrice) / 1e18;
            lstBTCValue = (totalPooledLstBTC * lstBTCPrice) / 1e18;
        }
        
        totalAUM = coreValue + lstBTCValue;
    }
    
    /**
     * @dev Get the current Net Asset Value (NAV) per share
     * @return navPerShare The NAV per share in wei
     */
    function getNAVPerShare() external view returns (uint256 navPerShare) {
        uint256 totalSupply = etfToken.totalSupply();
        if (totalSupply == 0) {
            return 1e18; // 1:1 ratio for first deposit
        }
        
        uint256 totalAUM = getTotalAUM();
        navPerShare = (totalAUM * 1e18) / totalSupply;
    }
    
    // Admin functions
    function setSparksManager(address _sparksManager) external onlyOwner {
        sparksManager = ISparks(_sparksManager);
        emit SparksManagerSet(_sparksManager);
    }
    
    function setStakingManager(address payable _stakingManager) external onlyOwner {
        stakingManager = StakingManager(_stakingManager);
        emit StakingManagerSet(_stakingManager);
    }
    
    function setPriceFeed(address _priceFeed) external onlyOwner {
        priceFeed = PriceFeed(_priceFeed);
        emit PriceFeedSet(_priceFeed);
    }
    
    function setProtocolTreasury(address _protocolTreasury) external onlyOwner {
        protocolTreasury = _protocolTreasury;
        emit ProtocolTreasurySet(_protocolTreasury);
    }
    
    function setManagementFee(uint256 _managementFeeBasisPoints) external onlyOwner {
        require(_managementFeeBasisPoints <= 500, "StakeBasket: management fee too high"); // Max 5%
        managementFeeBasisPoints = _managementFeeBasisPoints;
    }
    
    function setPerformanceFee(uint256 _performanceFeeBasisPoints) external onlyOwner {
        require(_performanceFeeBasisPoints <= 2000, "StakeBasket: performance fee too high"); // Max 20%
        performanceFeeBasisPoints = _performanceFeeBasisPoints;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency function
    receive() external payable {
        // Allow contract to receive CORE/ETH
    }
}