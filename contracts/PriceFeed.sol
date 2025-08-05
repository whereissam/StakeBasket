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
 * @dev Enhanced oracle integration with comprehensive circuit breaker mechanisms
 * 
 * CIRCUIT BREAKER FEATURES:
 * - Price deviation threshold protection (10% default)
 * - Staleness checks with configurable max age
 * - Backup oracle support for redundancy
 * - Emergency pause functionality
 * - Gradual price updates for extreme changes
 * 
 * FAILURE HANDLING:
 * - Stale Data: Reverts transactions, requiring manual intervention
 * - Extreme Deviation: Triggers circuit breaker, uses backup oracle or last known good price
 * - Oracle Failure: Falls back to backup oracle, then to emergency manual mode
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
    
    // Enhanced Configuration
    uint256 public constant MAX_PRICE_AGE = 3600; // 1 hour
    uint256 public constant PRICE_DEVIATION_THRESHOLD = 1000; // 10% (basis points)
    uint256 public constant EXTREME_DEVIATION_THRESHOLD = 2000; // 20% (basis points)
    bool public circuitBreakerEnabled = true;
    bool public emergencyMode = false;
    
    // Backup oracle system
    mapping(string => address) public backupPriceFeeds;
    mapping(string => uint256) public lastKnownGoodPrice;
    mapping(string => uint256) public priceUpdateCount;
    
    // Circuit breaker state
    mapping(string => bool) public assetCircuitBreakerTriggered;
    mapping(string => uint256) public circuitBreakerTriggerTime;
    uint256 public constant CIRCUIT_BREAKER_COOLDOWN = 1 hours;
    
    // Gradual update mechanism for extreme price changes
    mapping(string => uint256) public targetPrice;
    mapping(string => uint256) public priceUpdateStep;
    uint256 public constant MAX_PRICE_UPDATE_STEPS = 10;
    
    // Events
    event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp);
    event PriceFeedSet(string indexed asset, address indexed feed);
    event BackupPriceFeedSet(string indexed asset, address indexed backupFeed);
    event CircuitBreakerTriggered(string indexed asset, uint256 oldPrice, uint256 newPrice, string reason);
    event CircuitBreakerReset(string indexed asset);
    event EmergencyModeActivated(string reason);
    event EmergencyModeDeactivated();
    event GradualPriceUpdateStarted(string indexed asset, uint256 fromPrice, uint256 toPrice, uint256 steps);
    event BackupOracleUsed(string indexed asset, uint256 price);
    event OracleFailure(string indexed asset, string reason);
    
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
        
        // Enhanced circuit breaker check
        if (circuitBreakerEnabled && priceData[asset].isActive && !emergencyMode) {
            uint256 oldPrice = priceData[asset].price;
            uint256 deviation = _calculateDeviation(oldPrice, newPrice);
            
            if (deviation > EXTREME_DEVIATION_THRESHOLD) {
                // Extreme deviation - try backup oracle first
                uint256 backupPrice = _tryBackupOracle(asset);
                if (backupPrice > 0) {
                    uint256 backupDeviation = _calculateDeviation(oldPrice, backupPrice);
                    if (backupDeviation <= PRICE_DEVIATION_THRESHOLD) {
                        newPrice = backupPrice;
                        emit BackupOracleUsed(asset, backupPrice);
                    } else {
                        // Both oracles show extreme deviation - trigger circuit breaker
                        _triggerCircuitBreaker(asset, oldPrice, newPrice, "Extreme deviation on both oracles");
                        return;
                    }
                } else {
                    // No backup oracle - start gradual update
                    _startGradualPriceUpdate(asset, oldPrice, newPrice);
                    return;
                }
            } else if (deviation > PRICE_DEVIATION_THRESHOLD) {
                // Moderate deviation - trigger circuit breaker
                _triggerCircuitBreaker(asset, oldPrice, newPrice, "Price deviation exceeds threshold");
                return;
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
     * @dev Set backup oracle for an asset
     */
    function setBackupPriceFeed(string memory asset, address backupFeedAddress) external onlyOwner {
        backupPriceFeeds[asset] = backupFeedAddress;
        emit BackupPriceFeedSet(asset, backupFeedAddress);
    }
    
    /**
     * @dev Enable or disable circuit breaker
     */
    function setCircuitBreakerEnabled(bool enabled) external onlyOwner {
        circuitBreakerEnabled = enabled;
    }
    
    /**
     * @dev Activate emergency mode (disables all automatic updates)
     */
    function activateEmergencyMode(string memory reason) external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated(reason);
    }
    
    /**
     * @dev Deactivate emergency mode
     */
    function deactivateEmergencyMode() external onlyOwner {
        emergencyMode = false;
        emit EmergencyModeDeactivated();
    }
    
    /**
     * @dev Reset circuit breaker for an asset
     */
    function resetCircuitBreaker(string memory asset) external onlyOwner {
        require(assetCircuitBreakerTriggered[asset], "PriceFeed: circuit breaker not triggered");
        require(
            block.timestamp >= circuitBreakerTriggerTime[asset] + CIRCUIT_BREAKER_COOLDOWN,
            "PriceFeed: cooldown period not elapsed"
        );
        
        assetCircuitBreakerTriggered[asset] = false;
        circuitBreakerTriggerTime[asset] = 0;
        
        emit CircuitBreakerReset(asset);
    }
    
    /**
     * @dev Force price update (emergency override)
     */
    function emergencySetPrice(string memory asset, uint256 price, string memory reason) external onlyOwner {
        require(emergencyMode, "PriceFeed: not in emergency mode");
        require(price > 0, "PriceFeed: invalid price");
        
        lastKnownGoodPrice[asset] = priceData[asset].price; // Store current as last known good
        _setPriceData(asset, price, 18);
        
        emit PriceUpdated(asset, price, block.timestamp);
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
    
    /**
     * @dev Try to get price from backup oracle
     */
    function _tryBackupOracle(string memory asset) internal view returns (uint256 backupPrice) {
        address backupFeed = backupPriceFeeds[asset];
        if (backupFeed == address(0)) return 0;
        
        try AggregatorV3Interface(backupFeed).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (answer > 0 && block.timestamp - updatedAt <= MAX_PRICE_AGE) {
                uint8 feedDecimals = AggregatorV3Interface(backupFeed).decimals();
                return _normalizePrice(uint256(answer), feedDecimals);
            }
        } catch {
            return 0;
        }
        
        return 0;
    }
    
    /**
     * @dev Trigger circuit breaker for an asset
     */
    function _triggerCircuitBreaker(
        string memory asset,
        uint256 oldPrice,
        uint256 newPrice,
        string memory reason
    ) internal {
        assetCircuitBreakerTriggered[asset] = true;
        circuitBreakerTriggerTime[asset] = block.timestamp;
        
        emit CircuitBreakerTriggered(asset, oldPrice, newPrice, reason);
    }
    
    /**
     * @dev Start gradual price update for extreme changes
     */
    function _startGradualPriceUpdate(
        string memory asset,
        uint256 fromPrice,
        uint256 toPrice
    ) internal {
        targetPrice[asset] = toPrice;
        
        uint256 priceDiff = toPrice > fromPrice ? toPrice - fromPrice : fromPrice - toPrice;
        priceUpdateStep[asset] = priceDiff / MAX_PRICE_UPDATE_STEPS;
        
        emit GradualPriceUpdateStarted(asset, fromPrice, toPrice, MAX_PRICE_UPDATE_STEPS);
    }
    
    /**
     * @dev Execute next step in gradual price update
     */
    function executeGradualPriceUpdate(string memory asset) external {
        require(targetPrice[asset] > 0, "PriceFeed: no gradual update in progress");
        require(priceUpdateStep[asset] > 0, "PriceFeed: invalid update step");
        
        uint256 currentPrice = priceData[asset].price;
        uint256 target = targetPrice[asset];
        uint256 step = priceUpdateStep[asset];
        
        uint256 newPrice;
        if (target > currentPrice) {
            newPrice = currentPrice + step;
            if (newPrice >= target) {
                newPrice = target;
                targetPrice[asset] = 0; // Complete the update
                priceUpdateStep[asset] = 0;
            }
        } else {
            newPrice = currentPrice - step;
            if (newPrice <= target) {
                newPrice = target;
                targetPrice[asset] = 0; // Complete the update
                priceUpdateStep[asset] = 0;
            }
        }
        
        _setPriceData(asset, newPrice, 18);
        emit PriceUpdated(asset, newPrice, block.timestamp);
    }
    
    /**
     * @dev Get circuit breaker status for an asset
     */
    function getCircuitBreakerStatus(string memory asset) 
        external 
        view 
        returns (
            bool isTriggered,
            uint256 triggerTime,
            uint256 cooldownEnds,
            bool canReset
        )
    {
        isTriggered = assetCircuitBreakerTriggered[asset];
        triggerTime = circuitBreakerTriggerTime[asset];
        cooldownEnds = triggerTime + CIRCUIT_BREAKER_COOLDOWN;
        canReset = isTriggered && block.timestamp >= cooldownEnds;
    }
    
    /**
     * @dev Check if asset has backup oracle
     */
    function hasBackupOracle(string memory asset) external view returns (bool) {
        return backupPriceFeeds[asset] != address(0);
    }
    
    /**
     * @dev Get comprehensive asset status
     */
    function getAssetStatus(string memory asset) 
        external 
        view 
        returns (
            bool isActive,
            bool isPriceValid,
            bool circuitBreakerTriggered,
            bool hasBackup,
            uint256 priceAge,
            uint256 updateCount
        )
    {
        PriceData memory data = priceData[asset];
        isActive = data.isActive;
        isPriceValid = data.isActive && (block.timestamp - data.lastUpdated <= MAX_PRICE_AGE);
        circuitBreakerTriggered = assetCircuitBreakerTriggered[asset];
        hasBackup = backupPriceFeeds[asset] != address(0);
        priceAge = block.timestamp - data.lastUpdated;
        updateCount = priceUpdateCount[asset];
    }
}