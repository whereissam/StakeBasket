// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Chainlink-style aggregator interface
interface AggregatorV3Interface {
        function decimals() external view returns (uint8);
        function description() external view returns (string memory);
        function version() external view returns (uint256);
        function latestRoundData()
            external
            view
            returns (
                uint80 roundId,
                int256 answer,
                uint256 startedAt,
                uint256 updatedAt,
                uint80 answeredInRound
            );
}

/**
 * @title PriceFeed
 * @dev Oracle integration for CORE and lstBTC price feeds
 * Supports both Chainlink-style oracles and manual price updates for testing
 */
contract PriceFeed is Ownable {
    struct PriceData {
        uint256 price;
        uint256 lastUpdated;
        uint8 decimals;
        bool isActive;
    }
    
    // Price data storage
    mapping(string => PriceData) public priceData;
    mapping(string => address) public priceFeeds; // Chainlink aggregator addresses
    
    // Configuration
    uint256 public constant MAX_PRICE_AGE = 3600; // 1 hour
    uint256 public constant PRICE_DEVIATION_THRESHOLD = 1000; // 10% (basis points)
    bool public circuitBreakerEnabled = true;
    
    // Events
    event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp);
    event PriceFeedSet(string indexed asset, address indexed feed);
    event CircuitBreakerTriggered(string indexed asset, uint256 oldPrice, uint256 newPrice);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        // Initialize with mock prices for CoreDAO ecosystem
        _setPriceData("CORE", 15e17, 18);        // $1.5 USD (native CORE)
        _setPriceData("SolvBTC", 95000e18, 18);  // $95,000 USD (SolvBTC.CORE)
        _setPriceData("cbBTC", 95000e18, 18);    // $95,000 USD (cbBTC Core)
        _setPriceData("coreBTC", 95000e18, 18);  // $95,000 USD (coreBTC)
        _setPriceData("USDT", 1e18, 18);         // $1.0 USD (bridged USDT)
        _setPriceData("USDC", 1e18, 18);         // $1.0 USD (bridged USDC)
        _setPriceData("stCORE", 15e17, 18);      // $1.5 USD (liquid staking CORE)
    }
    
    /**
     * @dev Get CORE price in USD
     * @return price CORE price with 18 decimals
     */
    function getCorePrice() external view returns (uint256 price) {
        return _getPrice("CORE");
    }
    
    /**
     * @dev Get SolvBTC.CORE price in USD
     * @return price SolvBTC price with 18 decimals
     */
    function getSolvBTCPrice() external view returns (uint256 price) {
        return _getPrice("SolvBTC");
    }
    
    /**
     * @dev Get cbBTC Core price in USD
     * @return price cbBTC price with 18 decimals
     */
    function getCbBTCPrice() external view returns (uint256 price) {
        return _getPrice("cbBTC");
    }
    
    /**
     * @dev Get coreBTC price in USD
     * @return price coreBTC price with 18 decimals
     */
    function getCoreBTCPrice() external view returns (uint256 price) {
        return _getPrice("coreBTC");
    }
    
    /**
     * @dev Get primary BTC price (SolvBTC as default)
     * @return price Primary BTC token price with 18 decimals
     */
    function getPrimaryBTCPrice() external view returns (uint256 price) {
        return _getPrice("SolvBTC");
    }
    
    /**
     * @dev Get USDT price in USD
     * @return price USDT price with 18 decimals
     */
    function getUSDTPrice() external view returns (uint256 price) {
        return _getPrice("USDT");
    }
    
    /**
     * @dev Get USDC price in USD
     * @return price USDC price with 18 decimals
     */
    function getUSDCPrice() external view returns (uint256 price) {
        return _getPrice("USDC");
    }
    
    /**
     * @dev Get stCORE price in USD
     * @return price stCORE price with 18 decimals
     */
    function getStCorePrice() external view returns (uint256 price) {
        return _getPrice("stCORE");
    }
    
    /**
     * @dev Get price for any supported asset
     * @param asset Asset symbol (e.g., "CORE", "lstBTC", "BTC")
     * @return price Asset price with 18 decimals
     */
    function getPrice(string memory asset) external view returns (uint256 price) {
        return _getPrice(asset);
    }
    
    /**
     * @dev Internal function to get price with validation
     * @param asset Asset symbol
     * @return price Asset price with 18 decimals
     */
    function _getPrice(string memory asset) internal view returns (uint256 price) {
        PriceData memory data = priceData[asset];
        
        require(data.isActive, "PriceFeed: asset not supported");
        require(
            block.timestamp - data.lastUpdated <= MAX_PRICE_AGE,
            "PriceFeed: price data stale"
        );
        
        return data.price;
    }
    
    /**
     * @dev Update price from Chainlink oracle
     * @param asset Asset symbol
     */
    function updatePriceFromOracle(string memory asset) external {
        address feedAddress = priceFeeds[asset];
        require(feedAddress != address(0), "PriceFeed: oracle not set");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feedAddress);
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(answer > 0, "PriceFeed: invalid price from oracle");
        require(updatedAt > 0, "PriceFeed: price not updated");
        require(
            block.timestamp - updatedAt <= MAX_PRICE_AGE,
            "PriceFeed: oracle data stale"
        );
        
        uint8 feedDecimals = priceFeed.decimals();
        uint256 newPrice = _normalizePrice(uint256(answer), feedDecimals);
        
        // Circuit breaker check
        if (circuitBreakerEnabled && priceData[asset].isActive) {
            uint256 oldPrice = priceData[asset].price;
            uint256 deviation = _calculateDeviation(oldPrice, newPrice);
            
            if (deviation > PRICE_DEVIATION_THRESHOLD) {
                emit CircuitBreakerTriggered(asset, oldPrice, newPrice);
                return; // Don't update price if deviation is too high
            }
        }
        
        _setPriceData(asset, newPrice, 18);
        emit PriceUpdated(asset, newPrice, block.timestamp);
    }
    
    /**
     * @dev Manually set price (for testing or emergency)
     * @param asset Asset symbol
     * @param price New price with 18 decimals
     */
    function setPrice(string memory asset, uint256 price) external onlyOwner {
        require(price > 0, "PriceFeed: invalid price");
        
        _setPriceData(asset, price, 18);
        emit PriceUpdated(asset, price, block.timestamp);
    }
    
    /**
     * @dev Set multiple prices at once
     * @param assets Array of asset symbols
     * @param prices Array of prices (must match assets length)
     */
    function setPrices(string[] memory assets, uint256[] memory prices) external onlyOwner {
        require(assets.length == prices.length, "PriceFeed: arrays length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            require(prices[i] > 0, "PriceFeed: invalid price");
            _setPriceData(assets[i], prices[i], 18);
            emit PriceUpdated(assets[i], prices[i], block.timestamp);
        }
    }
    
    /**
     * @dev Set Chainlink oracle address for an asset
     * @param asset Asset symbol
     * @param feedAddress Chainlink aggregator address
     */
    function setPriceFeed(string memory asset, address feedAddress) external onlyOwner {
        priceFeeds[asset] = feedAddress;
        emit PriceFeedSet(asset, feedAddress);
    }
    
    /**
     * @dev Enable or disable circuit breaker
     * @param enabled Whether circuit breaker should be enabled
     */
    function setCircuitBreakerEnabled(bool enabled) external onlyOwner {
        circuitBreakerEnabled = enabled;
    }
    
    /**
     * @dev Internal function to set price data
     * @param asset Asset symbol
     * @param price Price with specified decimals
     * @param decimals Price decimals
     */
    function _setPriceData(string memory asset, uint256 price, uint8 decimals) internal {
        priceData[asset] = PriceData({
            price: price,
            lastUpdated: block.timestamp,
            decimals: decimals,
            isActive: true
        });
    }
    
    /**
     * @dev Normalize price to 18 decimals
     * @param price Original price
     * @param fromDecimals Original decimals
     * @return normalizedPrice Price with 18 decimals
     */
    function _normalizePrice(uint256 price, uint8 fromDecimals) internal pure returns (uint256 normalizedPrice) {
        if (fromDecimals == 18) {
            return price;
        } else if (fromDecimals < 18) {
            return price * (10 ** (18 - fromDecimals));
        } else {
            return price / (10 ** (fromDecimals - 18));
        }
    }
    
    /**
     * @dev Calculate percentage deviation between two prices
     * @param oldPrice Original price
     * @param newPrice New price
     * @return deviation Deviation in basis points (100 = 1%)
     */
    function _calculateDeviation(uint256 oldPrice, uint256 newPrice) internal pure returns (uint256 deviation) {
        if (oldPrice == 0) return 0;
        
        uint256 diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        return (diff * 10000) / oldPrice; // Return in basis points
    }
    
    /**
     * @dev Check if price data is valid and not stale
     * @param asset Asset symbol
     * @return isValid Whether price data is valid
     */
    function isPriceValid(string memory asset) external view returns (bool isValid) {
        PriceData memory data = priceData[asset];
        return data.isActive && (block.timestamp - data.lastUpdated <= MAX_PRICE_AGE);
    }
    
    /**
     * @dev Get price age in seconds
     * @param asset Asset symbol
     * @return age Price age in seconds
     */
    function getPriceAge(string memory asset) external view returns (uint256 age) {
        PriceData memory data = priceData[asset];
        if (!data.isActive) return type(uint256).max;
        return block.timestamp - data.lastUpdated;
    }
    
    /**
     * @dev Get all price data for an asset
     * @param asset Asset symbol
     * @return price Current price
     * @return lastUpdated Last update timestamp
     * @return decimals Price decimals
     * @return isActive Whether asset is active
     */
    function getPriceData(string memory asset) external view returns (
        uint256 price,
        uint256 lastUpdated,
        uint8 decimals,
        bool isActive
    ) {
        PriceData memory data = priceData[asset];
        return (data.price, data.lastUpdated, data.decimals, data.isActive);
    }
}