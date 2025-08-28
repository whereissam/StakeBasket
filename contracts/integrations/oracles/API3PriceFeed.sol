// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// API3 dAPI Reader Proxy interface
interface IApi3ReaderProxy {
    function read() external view returns (int224 value, uint32 timestamp);
}

/**
 * @title API3PriceFeed
 * @dev Production-ready price feed using API3 dAPIs for Core blockchain
 * Supports both API3 dAPIs and fallback manual pricing
 */
contract API3PriceFeed is Ownable {
    
    struct PriceData {
        uint256 price;
        uint256 lastUpdated;
        bool isActive;
        address dAPIAddress; // API3 dAPI contract address
        bool useAPI3; // Use API3 or manual pricing
    }
    
    mapping(string => PriceData) public priceData;
    
    // Price staleness threshold (configurable for testing)
    uint256 public maxPriceAge = 24 hours;
    
    /**
     * @dev Set maximum price age (for testing environments)
     * @param _maxAge New maximum age in seconds
     */
    function setMaxPriceAge(uint256 _maxAge) external onlyOwner {
        require(_maxAge > 0, "API3PriceFeed: invalid max age");
        maxPriceAge = _maxAge;
    }
    
    // Events
    event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp, bool fromAPI3);
    event API3SourceSet(string indexed asset, address dAPIAddress);
    event FallbackPriceSet(string indexed asset, uint256 price);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        // Initialize with fallback prices for immediate functionality
        _setFallbackPrice("CORE", 150 * 10**8); // $1.50
        _setFallbackPrice("BTC", 95000 * 10**8); // $95,000
        _setFallbackPrice("lstBTC", 96000 * 10**8); // $96,000
    }
    
    /**
     * @dev Set API3 dAPI source for an asset
     * @param asset Asset symbol (e.g., "CORE", "BTC")
     * @param dAPIAddress API3 dAPI reader proxy contract address
     */
    function setAPI3Source(string memory asset, address dAPIAddress) external onlyOwner {
        require(dAPIAddress != address(0), "Invalid dAPI address");
        
        priceData[asset].dAPIAddress = dAPIAddress;
        priceData[asset].useAPI3 = true;
        priceData[asset].isActive = true;
        
        emit API3SourceSet(asset, dAPIAddress);
    }
    
    /**
     * @dev Set manual fallback price (for development or backup)
     * @param asset Asset symbol
     * @param price Price in 8 decimals (e.g., $1.50 = 150000000)
     */
    function setFallbackPrice(string memory asset, uint256 price) external onlyOwner {
        _setFallbackPrice(asset, price);
        emit FallbackPriceSet(asset, price);
    }
    
    function _setFallbackPrice(string memory asset, uint256 price) internal {
        priceData[asset].price = price;
        priceData[asset].lastUpdated = block.timestamp;
        priceData[asset].isActive = true;
        priceData[asset].useAPI3 = false; // Use manual price
    }
    
    /**
     * @dev Get current price for an asset
     * @param asset Asset symbol
     * @return price Price in 8 decimals
     */
    function getPrice(string memory asset) external view returns (uint256 price) {
        PriceData memory data = priceData[asset];
        require(data.isActive, "Asset not supported");
        
        if (data.useAPI3 && data.dAPIAddress != address(0)) {
            // Try to get price from API3 dAPI
            try IApi3ReaderProxy(data.dAPIAddress).read() returns (int224 value, uint32 timestamp) {
                require(value > 0, "Invalid API3 price");
                require(block.timestamp - timestamp <= maxPriceAge, "API3 price stale");
                
                // Convert from int224 to uint256 and adjust decimals if needed
                return uint256(uint224(value));
                
            } catch {
                // Fall back to manual price if API3 fails
                require(block.timestamp - data.lastUpdated <= maxPriceAge, "Fallback price stale");
                return data.price;
            }
        } else {
            // Use manual price
            require(block.timestamp - data.lastUpdated <= maxPriceAge, "Price data stale");
            return data.price;
        }
    }
    
    /**
     * @dev Check if price is fresh
     * @param asset Asset symbol
     * @return bool True if price is fresh
     */
    function isPriceFresh(string memory asset) external view returns (bool) {
        PriceData memory data = priceData[asset];
        
        if (!data.isActive) return false;
        
        if (data.useAPI3 && data.dAPIAddress != address(0)) {
            // Check API3 price freshness
            try IApi3ReaderProxy(data.dAPIAddress).read() returns (int224 value, uint32 timestamp) {
                return (value > 0 && block.timestamp - timestamp <= maxPriceAge);
            } catch {
                // Fall back to manual price freshness
                return (block.timestamp - data.lastUpdated <= maxPriceAge);
            }
        } else {
            // Check manual price freshness
            return (block.timestamp - data.lastUpdated <= maxPriceAge);
        }
    }
    
    /**
     * @dev Get price source information
     * @param asset Asset symbol
     * @return useAPI3 Whether using API3
     * @return dAPIAddress API3 contract address
     * @return lastUpdated Last update timestamp
     * @return isActive Whether asset is active
     */
    function getPriceSource(string memory asset) external view returns (
        bool useAPI3,
        address dAPIAddress,
        uint256 lastUpdated,
        bool isActive
    ) {
        PriceData memory data = priceData[asset];
        return (data.useAPI3, data.dAPIAddress, data.lastUpdated, data.isActive);
    }
    
    /**
     * @dev Emergency function to disable API3 and use fallback
     * @param asset Asset symbol
     */
    function disableAPI3(string memory asset) external onlyOwner {
        priceData[asset].useAPI3 = false;
    }
    
    /**
     * @dev Update price manually (for immediate fixes)
     * @param asset Asset symbol
     * @param price Price in 8 decimals
     */
    function updatePrice(string memory asset, uint256 price) external onlyOwner {
        priceData[asset].price = price;
        priceData[asset].lastUpdated = block.timestamp;
        priceData[asset].isActive = true;
        
        emit PriceUpdated(asset, price, block.timestamp, false);
    }
    
    /**
     * @dev Get last updated timestamp
     * @param asset Asset symbol
     * @return timestamp Last update time
     */
    function getLastUpdated(string memory asset) external view returns (uint256) {
        if (priceData[asset].useAPI3 && priceData[asset].dAPIAddress != address(0)) {
            try IApi3ReaderProxy(priceData[asset].dAPIAddress).read() returns (int224, uint32 timestamp) {
                return uint256(timestamp);
            } catch {
                return priceData[asset].lastUpdated;
            }
        }
        return priceData[asset].lastUpdated;
    }
    
    /**
     * @dev Batch update prices for multiple assets
     * @param assets Array of asset symbols
     * @param prices Array of prices (8 decimals)
     */
    function batchUpdatePrices(string[] memory assets, uint256[] memory prices) external onlyOwner {
        require(assets.length == prices.length, "Array length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            priceData[assets[i]].price = prices[i];
            priceData[assets[i]].lastUpdated = block.timestamp;
            priceData[assets[i]].isActive = true;
            
            emit PriceUpdated(assets[i], prices[i], block.timestamp, false);
        }
    }
}