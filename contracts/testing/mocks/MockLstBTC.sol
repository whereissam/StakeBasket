// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockLstBTC
 * @dev Mock implementation of Liquid Staked Bitcoin for testing
 * Simulates minting lstBTC from coreBTC with auto-compounding rewards
 */
contract MockLstBTC is ERC20, Ownable, ReentrancyGuard {
    IERC20 public immutable coreBTC;
    
    // Exchange rate starts at 1:1 and increases over time to simulate rewards
    uint256 public exchangeRate; // coreBTC per lstBTC (scaled by 1e18)
    uint256 public lastUpdateTime;
    uint256 public constant ANNUAL_YIELD_RATE = 600; // 6% APY in basis points
    uint256 public constant BASIS_POINTS = 10000;
    
    // Tracking for statistics
    uint256 public totalCoreBTCDeposited;
    uint256 public totalRewardsAccrued;
    
    // Events
    event Minted(address indexed user, uint256 coreBTCAmount, uint256 lstBTCAmount);
    event Redeemed(address indexed user, uint256 lstBTCAmount, uint256 coreBTCAmount);
    event ExchangeRateUpdated(uint256 newRate);
    
    constructor(
        address _coreBTC,
        address initialOwner
    ) ERC20("Liquid Staked Bitcoin", "lstBTC") Ownable(initialOwner) {
        coreBTC = IERC20(_coreBTC);
        exchangeRate = 1e18; // Start at 1:1 ratio
        lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Mint lstBTC by depositing coreBTC
     * @param coreBTCAmount Amount of coreBTC to deposit
     * @return lstBTCAmount Amount of lstBTC minted
     */
    function mint(uint256 coreBTCAmount) external nonReentrant returns (uint256) {
        require(coreBTCAmount > 0, "Amount must be greater than 0");
        
        // Update exchange rate before minting
        _updateExchangeRate();
        
        // Transfer coreBTC from user
        coreBTC.transferFrom(msg.sender, address(this), coreBTCAmount);
        
        // Calculate lstBTC amount to mint: coreBTCAmount * 1e18 / exchangeRate
        uint256 lstBTCAmount = (coreBTCAmount * 1e18) / exchangeRate;
        
        // Mint lstBTC to user
        _mint(msg.sender, lstBTCAmount);
        
        // Update tracking
        totalCoreBTCDeposited += coreBTCAmount;
        
        emit Minted(msg.sender, coreBTCAmount, lstBTCAmount);
        return lstBTCAmount;
    }
    
    /**
     * @dev Redeem lstBTC for coreBTC
     * @param lstBTCAmount Amount of lstBTC to redeem
     * @return coreBTCAmount Amount of coreBTC returned
     */
    function redeem(uint256 lstBTCAmount) external nonReentrant returns (uint256) {
        require(lstBTCAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= lstBTCAmount, "Insufficient lstBTC balance");
        
        // Update exchange rate before redemption
        _updateExchangeRate();
        
        // Calculate coreBTC amount to return: lstBTCAmount * exchangeRate / 1e18
        uint256 coreBTCAmount = (lstBTCAmount * exchangeRate) / 1e18;
        
        // Ensure we have enough coreBTC in the contract
        require(coreBTC.balanceOf(address(this)) >= coreBTCAmount, "Insufficient coreBTC in contract");
        
        // Burn lstBTC from user
        _burn(msg.sender, lstBTCAmount);
        
        // Transfer coreBTC to user
        coreBTC.transfer(msg.sender, coreBTCAmount);
        
        emit Redeemed(msg.sender, lstBTCAmount, coreBTCAmount);
        return coreBTCAmount;
    }
    
    /**
     * @dev Update the exchange rate to simulate reward accrual
     */
    function _updateExchangeRate() internal {
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        if (timeElapsed == 0) return;
        
        // Calculate compound interest: rate = rate * (1 + APY * time / year)
        uint256 interestFactor = 1e18 + (ANNUAL_YIELD_RATE * timeElapsed * 1e18) / (BASIS_POINTS * 365 days);
        uint256 newExchangeRate = (exchangeRate * interestFactor) / 1e18;
        
        // Track accrued rewards
        if (totalSupply() > 0) {
            uint256 oldValue = (totalSupply() * exchangeRate) / 1e18;
            uint256 newValue = (totalSupply() * newExchangeRate) / 1e18;
            totalRewardsAccrued += newValue - oldValue;
        }
        
        exchangeRate = newExchangeRate;
        lastUpdateTime = block.timestamp;
        
        emit ExchangeRateUpdated(newExchangeRate);
    }
    
    /**
     * @dev Get current exchange rate (coreBTC per lstBTC)
     */
    function getExchangeRate() external view returns (uint256) {
        return _getCurrentExchangeRate();
    }
    
    /**
     * @dev Calculate current exchange rate without updating state
     */
    function _getCurrentExchangeRate() internal view returns (uint256) {
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        if (timeElapsed == 0) return exchangeRate;
        
        uint256 interestFactor = 1e18 + (ANNUAL_YIELD_RATE * timeElapsed * 1e18) / (BASIS_POINTS * 365 days);
        return (exchangeRate * interestFactor) / 1e18;
    }
    
    /**
     * @dev Get the coreBTC value of a given amount of lstBTC
     */
    function lstBTCToCoreBTC(uint256 lstBTCAmount) external view returns (uint256) {
        uint256 currentRate = _getCurrentExchangeRate();
        return (lstBTCAmount * currentRate) / 1e18;
    }
    
    /**
     * @dev Get the lstBTC amount for a given amount of coreBTC
     */
    function coreBTCToLstBTC(uint256 coreBTCAmount) external view returns (uint256) {
        uint256 currentRate = _getCurrentExchangeRate();
        return (coreBTCAmount * 1e18) / currentRate;
    }
    
    /**
     * @dev Get total value locked in coreBTC
     */
    function getTotalValueLocked() external view returns (uint256) {
        return (totalSupply() * _getCurrentExchangeRate()) / 1e18;
    }
    
    /**
     * @dev Get APY for informational purposes
     */
    function getAPY() external pure returns (uint256) {
        return ANNUAL_YIELD_RATE; // Returns basis points
    }
    
    /**
     * @dev Manual exchange rate update (for testing)
     */
    function updateExchangeRate() external {
        _updateExchangeRate();
    }
    
    /**
     * @dev Emergency function to fund rewards pool (for testing)
     */
    function fundRewards(uint256 amount) external onlyOwner {
        coreBTC.transferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Override decimals to match Bitcoin (8 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 8;
    }
}