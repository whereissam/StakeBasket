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

// Pyth Network interface for Core blockchain
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
    
    function getPrice(bytes32 id) external view returns (Price memory price);
    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
    function updatePriceFeeds(bytes[] calldata priceUpdateData) external payable;
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
    mapping(string => bytes32) public pythPriceIds; // Pyth price feed IDs
    IPyth public pythOracle; // Pyth contract address
    
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
    event PythPriceIdSet(string indexed asset, bytes32 indexed priceId);
    event PythOracleSet(address indexed pythOracle);
    event CircuitBreakerTriggered(string indexed asset, uint256 oldPrice, uint256 newPrice, string reason);
    event CircuitBreakerReset(string indexed asset);
    event EmergencyModeActivated(string reason);
    event EmergencyModeDeactivated();
    event GradualPriceUpdateStarted(string indexed asset, uint256 fromPrice, uint256 toPrice, uint256 steps);
    event BackupOracleUsed(string indexed asset, uint256 price);
    event OracleFailure(string indexed asset, string reason);
    
    constructor(address initialOwner, address _pythOracle) Ownable(initialOwner) {
        // Set Pyth oracle contract for Core blockchain
        pythOracle = IPyth(_pythOracle);
        
        // Assets will be activated via setPythPriceId() function
        // All prices come from Pyth Network in real-time - no manual initialization
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
     * @dev Update price from Pyth Network oracle
     * @param asset Asset symbol
     */
    function updatePriceFromPyth(string memory asset) external {
        bytes32 priceId = pythPriceIds[asset];
        require(priceId != bytes32(0), "PriceFeed: Pyth price ID not set");
        require(address(pythOracle) != address(0), "PriceFeed: Pyth oracle not set");
        
        // Store current price as last known good before attempting update
        if (priceData[asset].isActive && priceData[asset].price > 0) {
            lastKnownGoodPrice[asset] = priceData[asset].price;
        }
        
        IPyth.Price memory pythPrice = pythOracle.getPrice(priceId);
        require(pythPrice.price > 0, "PriceFeed: invalid Pyth price");
        require(
            block.timestamp - pythPrice.publishTime <= MAX_PRICE_AGE,
            "PriceFeed: Pyth price data stale"
        );
        
        // Convert Pyth price to uint256 with 18 decimals
        uint256 newPrice;
        if (pythPrice.expo >= 0) {
            // Positive exponent: multiply
            newPrice = uint256(uint64(pythPrice.price)) * (10 ** uint256(uint32(pythPrice.expo))) * 1e18;
        } else {
            // Negative exponent: divide
            uint256 divisor = 10 ** uint256(uint32(-pythPrice.expo));
            newPrice = (uint256(uint64(pythPrice.price)) * 1e18) / divisor;
        }
        
        priceUpdateCount[asset]++;
        
        // Enhanced circuit breaker check (same as before)
        if (circuitBreakerEnabled && priceData[asset].isActive && !emergencyMode) {
            uint256 oldPrice = priceData[asset].price;
            uint256 deviation = _calculateDeviation(oldPrice, newPrice);
            
            if (deviation > EXTREME_DEVIATION_THRESHOLD) {
                _startGradualPriceUpdate(asset, oldPrice, newPrice);
                emit CircuitBreakerTriggered(asset, oldPrice, newPrice, "Extreme deviation from Pyth oracle");
                return;
            } else if (deviation > PRICE_DEVIATION_THRESHOLD) {
                _triggerCircuitBreaker(asset, oldPrice, newPrice, "Price deviation exceeds threshold on Pyth oracle");
                return;
            }
        }
        
        _setPriceData(asset, newPrice, 18);
        emit PriceUpdated(asset, newPrice, block.timestamp);
    }
    
    /**
     * @dev Update price from Chainlink oracle with enhanced error handling
     * @param asset Asset symbol
     */
    function updatePriceFromOracle(string memory asset) external {
        address feedAddress = priceFeeds[asset];
        require(feedAddress != address(0), "PriceFeed: oracle not set");
        
        // Store current price as last known good before attempting update
        if (priceData[asset].isActive && priceData[asset].price > 0) {
            lastKnownGoodPrice[asset] = priceData[asset].price;
        }
        
        uint256 newPrice;
        bool updateSuccessful = false;
        
        // Try primary oracle
        try this._tryOracleUpdate(feedAddress) returns (uint256 price) {
            newPrice = price;
            updateSuccessful = true;
        } catch Error(string memory reason) {
            emit OracleFailure(asset, reason);
            // Try backup oracle
            address backupFeed = backupPriceFeeds[asset];
            if (backupFeed != address(0)) {
                try this._tryOracleUpdate(backupFeed) returns (uint256 backupPrice) {
                    newPrice = backupPrice;
                    updateSuccessful = true;
                    emit BackupOracleUsed(asset, backupPrice);
                } catch Error(string memory backupReason) {
                    emit OracleFailure(asset, string(abi.encodePacked("Both oracles failed: ", reason, " | ", backupReason)));
                }
            }
        }
        
        // If both oracles failed, revert
        require(updateSuccessful, "PriceFeed: all oracles failed");
        
        priceUpdateCount[asset]++;
        
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
                        // Both oracles show extreme deviation - use weighted average and trigger gradual update
                        uint256 weightedPrice = (newPrice + backupPrice) / 2;
                        _startGradualPriceUpdate(asset, oldPrice, weightedPrice);
                        emit CircuitBreakerTriggered(asset, oldPrice, newPrice, "Both oracles show extreme deviation - using gradual update");
                        return;
                    }
                } else {
                    // No backup oracle - start gradual update
                    _startGradualPriceUpdate(asset, oldPrice, newPrice);
                    emit CircuitBreakerTriggered(asset, oldPrice, newPrice, "No backup oracle - using gradual update");
                    return;
                }
            } else if (deviation > PRICE_DEVIATION_THRESHOLD) {
                // Moderate deviation - try backup oracle before triggering circuit breaker
                uint256 backupPrice = _tryBackupOracle(asset);
                if (backupPrice > 0) {
                    uint256 backupDeviation = _calculateDeviation(oldPrice, backupPrice);
                    if (backupDeviation <= PRICE_DEVIATION_THRESHOLD) {
                        newPrice = backupPrice;
                        emit BackupOracleUsed(asset, backupPrice);
                    } else {
                        // Both show deviation - trigger circuit breaker
                        _triggerCircuitBreaker(asset, oldPrice, newPrice, "Price deviation exceeds threshold on both oracles");
                        return;
                    }
                } else {
                    // No backup - trigger circuit breaker
                    _triggerCircuitBreaker(asset, oldPrice, newPrice, "Price deviation exceeds threshold");
                    return;
                }
            }
        }
        
        _setPriceData(asset, newPrice, 18);
        emit PriceUpdated(asset, newPrice, block.timestamp);
    }
    
    /**
     * @dev Helper function to try oracle update (external for try/catch)
     * @param feedAddress Oracle address to try
     * @return price Normalized price from oracle
     */
    function _tryOracleUpdate(address feedAddress) external view returns (uint256 price) {
        require(msg.sender == address(this), "PriceFeed: internal function");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feedAddress);
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(answer > 0, "Invalid price from oracle");
        require(updatedAt > 0, "Price not updated");
        require(
            block.timestamp - updatedAt <= MAX_PRICE_AGE,
            "Oracle data stale"
        );
        require(roundId > 0, "Invalid round");
        require(answeredInRound >= roundId, "Stale round");
        
        uint8 feedDecimals = priceFeed.decimals();
        return _normalizePrice(uint256(answer), feedDecimals);
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
     * @dev Set Pyth oracle contract address
     * @param _pythOracle Pyth contract address on Core blockchain
     */
    function setPythOracle(address _pythOracle) external onlyOwner {
        pythOracle = IPyth(_pythOracle);
        emit PythOracleSet(_pythOracle);
    }
    
    /**
     * @dev Set Pyth price ID for an asset
     * @param asset Asset symbol
     * @param priceId Pyth price feed ID
     */
    function setPythPriceId(string memory asset, bytes32 priceId) external onlyOwner {
        pythPriceIds[asset] = priceId;
        // Mark asset as active so it can be used
        if (!priceData[asset].isActive) {
            priceData[asset].isActive = true;
            priceData[asset].decimals = 18;
        }
        emit PythPriceIdSet(asset, priceId);
    }
    
    /**
     * @dev Set multiple Pyth price IDs at once for initialization
     * @param assets Array of asset symbols
     * @param priceIds Array of Pyth price IDs
     */
    function setPythPriceIds(
        string[] memory assets, 
        bytes32[] memory priceIds
    ) external onlyOwner {
        require(assets.length == priceIds.length, "PriceFeed: arrays length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            pythPriceIds[assets[i]] = priceIds[i];
            // Mark asset as active
            if (!priceData[assets[i]].isActive) {
                priceData[assets[i]].isActive = true;
                priceData[assets[i]].decimals = 18;
            }
            emit PythPriceIdSet(assets[i], priceIds[i]);
        }
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
     * @dev Emergency function to force reset circuit breaker and clear gradual updates
     */
    function emergencyResetAsset(string memory asset, string memory reason) external onlyOwner {
        require(emergencyMode, "PriceFeed: not in emergency mode");
        
        // Reset circuit breaker
        assetCircuitBreakerTriggered[asset] = false;
        circuitBreakerTriggerTime[asset] = 0;
        
        // Clear gradual update
        targetPrice[asset] = 0;
        priceUpdateStep[asset] = 0;
        
        emit CircuitBreakerReset(asset);
    }
    
    /**
     * @dev Emergency function to use last known good price when oracles fail
     */
    function useLastKnownGoodPrice(string memory asset) external onlyOwner {
        require(lastKnownGoodPrice[asset] > 0, "PriceFeed: no last known good price");
        require(
            !isPriceValid(asset) || assetCircuitBreakerTriggered[asset],
            "PriceFeed: current price is valid"
        );
        
        uint256 lastGoodPrice = lastKnownGoodPrice[asset];
        _setPriceData(asset, lastGoodPrice, 18);
        
        emit PriceUpdated(asset, lastGoodPrice, block.timestamp);
    }
    
    /**
     * @dev Fallback price getter that returns last known good price if current is stale
     */
    function getPriceWithFallback(string memory asset) external view returns (uint256 price, bool isStale) {
        PriceData memory data = priceData[asset];
        
        if (!data.isActive) {
            revert("PriceFeed: asset not supported");
        }
        
        bool priceIsStale = block.timestamp - data.lastUpdated > MAX_PRICE_AGE;
        
        if (!priceIsStale) {
            return (data.price, false);
        }
        
        // Price is stale - try to return last known good price
        if (lastKnownGoodPrice[asset] > 0) {
            return (lastKnownGoodPrice[asset], true);
        }
        
        // No fallback available
        revert("PriceFeed: no valid price available");
    }
    
    /**
     * @dev Internal function to set price data
     * @param asset Asset symbol
     * @param price Price with specified decimals
     * @param decimals Price decimals
     */
    function _setPriceData(string memory asset, uint256 price, uint8 decimals) internal {
        // Store previous price as last known good if it was valid
        if (priceData[asset].isActive && priceData[asset].price > 0) {
            lastKnownGoodPrice[asset] = priceData[asset].price;
        }
        
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
        require(price > 0, "PriceFeed: price cannot be zero");
        require(fromDecimals <= 77, "PriceFeed: decimal places too high"); // Prevent 10^x overflow
        
        if (fromDecimals == 18) {
            return price;
        } else if (fromDecimals < 18) {
            uint256 multiplier = 10 ** (18 - fromDecimals);
            // Check for overflow before multiplication
            require(price <= type(uint256).max / multiplier, "PriceFeed: price normalization overflow");
            return price * multiplier;
        } else {
            uint256 divisor = 10 ** (fromDecimals - 18);
            // Ensure we don't lose too much precision
            require(price >= divisor, "PriceFeed: price too small for normalization");
            return price / divisor;
        }
    }
    
    /**
     * @dev Calculate percentage deviation between two prices
     * @param oldPrice Original price
     * @param newPrice New price
     * @return deviation Deviation in basis points (100 = 1%)
     */
    function _calculateDeviation(uint256 oldPrice, uint256 newPrice) internal pure returns (uint256 deviation) {
        if (oldPrice == 0) {
            // For new assets with no previous price, return 0 to allow the first price
            require(newPrice > 0, "PriceFeed: invalid price for new asset");
            return 0; // Allow first price without circuit breaker
        }
        
        require(newPrice > 0, "PriceFeed: new price cannot be zero");
        
        uint256 diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        
        // Prevent overflow in multiplication by checking limits
        require(diff <= type(uint256).max / 10000, "PriceFeed: price difference too large");
        
        return (diff * 10000) / oldPrice; // Return in basis points
    }
    
    /**
     * @dev Check if price data is valid and not stale
     * @param asset Asset symbol
     * @return isValid Whether price data is valid
     */
    function isPriceValid(string memory asset) public view returns (bool isValid) {
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
        require(fromPrice > 0 && toPrice > 0, "PriceFeed: invalid prices for gradual update");
        
        targetPrice[asset] = toPrice;
        
        uint256 priceDiff = toPrice > fromPrice ? toPrice - fromPrice : fromPrice - toPrice;
        uint256 step = priceDiff / MAX_PRICE_UPDATE_STEPS;
        
        // Ensure minimum step size to guarantee progress
        if (step == 0) {
            step = priceDiff > 0 ? 1 : 0;
        }
        
        // If step is still 0, price difference is negligible - just set target price
        if (step == 0) {
            _setPriceData(asset, toPrice, 18);
            emit PriceUpdated(asset, toPrice, block.timestamp);
            return;
        }
        
        priceUpdateStep[asset] = step;
        
        emit GradualPriceUpdateStarted(asset, fromPrice, toPrice, MAX_PRICE_UPDATE_STEPS);
    }
    
    /**
     * @dev Execute next step in gradual price update
     */
    function executeGradualPriceUpdate(string memory asset) external {
        require(targetPrice[asset] > 0, "PriceFeed: no gradual update in progress");
        require(priceUpdateStep[asset] > 0, "PriceFeed: invalid update step");
        require(priceData[asset].isActive, "PriceFeed: asset not active");
        
        uint256 currentPrice = priceData[asset].price;
        uint256 target = targetPrice[asset];
        uint256 step = priceUpdateStep[asset];
        
        require(currentPrice > 0, "PriceFeed: invalid current price");
        
        uint256 newPrice;
        bool updateComplete = false;
        
        if (target > currentPrice) {
            // Moving price up
            if (currentPrice + step >= target || step >= target - currentPrice) {
                newPrice = target;
                updateComplete = true;
            } else {
                newPrice = currentPrice + step;
            }
        } else if (target < currentPrice) {
            // Moving price down
            if (currentPrice <= step || currentPrice - step <= target) {
                newPrice = target;
                updateComplete = true;
            } else {
                newPrice = currentPrice - step;
            }
        } else {
            // Prices are equal - complete immediately
            newPrice = target;
            updateComplete = true;
        }
        
        // Complete the gradual update
        if (updateComplete) {
            targetPrice[asset] = 0;
            priceUpdateStep[asset] = 0;
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
            bool isPriceValidResult,
            bool circuitBreakerTriggered,
            bool hasBackup,
            uint256 priceAge,
            uint256 updateCount
        )
    {
        PriceData memory data = priceData[asset];
        isActive = data.isActive;
        isPriceValidResult = data.isActive && (block.timestamp - data.lastUpdated <= MAX_PRICE_AGE);
        circuitBreakerTriggered = assetCircuitBreakerTriggered[asset];
        hasBackup = backupPriceFeeds[asset] != address(0);
        priceAge = block.timestamp - data.lastUpdated;
        updateCount = priceUpdateCount[asset];
    }
}