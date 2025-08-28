// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceFeed
 * @dev Simple, reliable price feed for local testing - no circuit breakers or complex logic
 */
contract MockPriceFeed is Ownable {
    
    // Simple price storage
    mapping(string => uint256) private prices;
    
    // Events
    event PriceUpdated(string indexed asset, uint256 price);
    
    constructor() Ownable(msg.sender) {
        // Set simple, stable prices for testing
        prices["CORE"] = 1.5e18;      // $1.50 per CORE
        prices["SolvBTC"] = 65000e18; // $65,000 per BTC
        prices["cbBTC"] = 65000e18;   // $65,000 per BTC
        prices["coreBTC"] = 65000e18; // $65,000 per BTC
        prices["USDT"] = 1e18;        // $1.00 per USDT
        prices["USDC"] = 1e18;        // $1.00 per USDC
    }
    
    /**
     * @dev Get CORE price in USD (18 decimals)
     */
    function getCorePrice() external view returns (uint256) {
        return prices["CORE"];
    }
    
    /**
     * @dev Get SolvBTC price in USD (18 decimals)
     */
    function getSolvBTCPrice() external view returns (uint256) {
        return prices["SolvBTC"];
    }
    
    /**
     * @dev Get cbBTC price in USD (18 decimals)
     */
    function getCbBTCPrice() external view returns (uint256) {
        return prices["cbBTC"];
    }
    
    /**
     * @dev Get coreBTC price in USD (18 decimals)
     */
    function getCoreBTCPrice() external view returns (uint256) {
        return prices["coreBTC"];
    }
    
    /**
     * @dev Get USDT price in USD (18 decimals)
     */
    function getUSDTPrice() external view returns (uint256) {
        return prices["USDT"];
    }
    
    /**
     * @dev Get USDC price in USD (18 decimals)
     */
    function getUSDCPrice() external view returns (uint256) {
        return prices["USDC"];
    }
    
    /**
     * @dev Get any asset price in USD (18 decimals)
     */
    function getPrice(string memory asset) external view returns (uint256) {
        uint256 price = prices[asset];
        require(price > 0, "MockPriceFeed: price not set");
        return price;
    }
    
    /**
     * @dev Set price for any asset (only owner, for testing)
     */
    function setPrice(string memory asset, uint256 price) external onlyOwner {
        require(price > 0, "MockPriceFeed: invalid price");
        prices[asset] = price;
        emit PriceUpdated(asset, price);
    }
    
    /**
     * @dev Batch set multiple prices (for testing convenience)
     */
    function setPrices(
        string[] memory assets,
        uint256[] memory priceValues
    ) external onlyOwner {
        require(assets.length == priceValues.length, "MockPriceFeed: length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            require(priceValues[i] > 0, "MockPriceFeed: invalid price");
            prices[assets[i]] = priceValues[i];
            emit PriceUpdated(assets[i], priceValues[i]);
        }
    }
    
    /**
     * @dev Simulate price movement for testing (percentage change in basis points)
     */
    function simulatePriceChange(string memory asset, int256 percentChange) external onlyOwner {
        uint256 currentPrice = prices[asset];
        require(currentPrice > 0, "MockPriceFeed: asset not found");
        require(percentChange > -10000, "MockPriceFeed: change too large"); // Max -100%
        
        if (percentChange >= 0) {
            // Increase price
            uint256 increase = (currentPrice * uint256(percentChange)) / 10000;
            prices[asset] = currentPrice + increase;
        } else {
            // Decrease price
            uint256 decrease = (currentPrice * uint256(-percentChange)) / 10000;
            prices[asset] = currentPrice - decrease;
        }
        
        emit PriceUpdated(asset, prices[asset]);
    }
    
    /**
     * @dev Reset to default testing prices
     */
    function resetToDefaults() external onlyOwner {
        prices["CORE"] = 1.5e18;      // $1.50
        prices["SolvBTC"] = 65000e18; // $65,000
        prices["cbBTC"] = 65000e18;   // $65,000
        prices["coreBTC"] = 65000e18; // $65,000
        prices["USDT"] = 1e18;        // $1.00
        prices["USDC"] = 1e18;        // $1.00
        
        emit PriceUpdated("CORE", prices["CORE"]);
        emit PriceUpdated("SolvBTC", prices["SolvBTC"]);
        emit PriceUpdated("cbBTC", prices["cbBTC"]);
        emit PriceUpdated("coreBTC", prices["coreBTC"]);
        emit PriceUpdated("USDT", prices["USDT"]);
        emit PriceUpdated("USDC", prices["USDC"]);
    }
}