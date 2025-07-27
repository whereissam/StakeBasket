// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CoreOracle
 * @dev Oracle contract that integrates with Core's official APIs for real-time price feeds
 * Can be upgraded later to use Chainlink or other decentralized oracles when available
 */
contract CoreOracle is Ownable {
    struct PriceData {
        uint256 price;          // Price in USD with 8 decimals
        uint256 lastUpdated;    // Timestamp of last update
        bool isActive;          // Whether this feed is active
    }
    
    mapping(string => PriceData) public priceFeeds;
    mapping(address => bool) public authorizedUpdaters;
    
    // Core API data structure
    struct CorePriceResponse {
        uint256 corebtc;           // CORE price in BTC
        uint256 corebtc_timestamp;
        uint256 coreusd;           // CORE price in USD  
        uint256 coreusd_timestamp;
    }
    
    uint256 public constant STALENESS_THRESHOLD = 1 hours;
    uint256 public constant PRICE_DECIMALS = 8;
    
    event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp);
    event UpdaterAuthorized(address indexed updater, bool authorized);
    event OracleConfigured(string indexed asset, bool active);
    
    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {
        // Authorize owner as default updater
        authorizedUpdaters[initialOwner] = true;
        
        // Initialize price feeds for main assets
        _initializePriceFeed("CORE");
        _initializePriceFeed("BTC");
        _initializePriceFeed("lstBTC");
        _initializePriceFeed("coreBTC");
    }
    
    /**
     * @dev Update price for an asset (called by authorized updaters or backend)
     */
    function updatePrice(string memory asset, uint256 price) external onlyAuthorized {
        require(price > 0, "Invalid price");
        require(priceFeeds[asset].isActive, "Asset not supported");
        
        priceFeeds[asset].price = price;
        priceFeeds[asset].lastUpdated = block.timestamp;
        
        emit PriceUpdated(asset, price, block.timestamp);
    }
    
    /**
     * @dev Batch update multiple prices (more gas efficient)
     */
    function updatePrices(
        string[] memory assets, 
        uint256[] memory prices
    ) external onlyAuthorized {
        require(assets.length == prices.length, "Array length mismatch");
        
        for (uint i = 0; i < assets.length; i++) {
            require(prices[i] > 0, "Invalid price");
            require(priceFeeds[assets[i]].isActive, "Asset not supported");
            
            priceFeeds[assets[i]].price = prices[i];
            priceFeeds[assets[i]].lastUpdated = block.timestamp;
            
            emit PriceUpdated(assets[i], prices[i], block.timestamp);
        }
    }
    
    /**
     * @dev Get latest price for an asset
     */
    function getPrice(string memory asset) external view returns (uint256) {
        PriceData memory feed = priceFeeds[asset];
        require(feed.isActive, "Asset not supported");
        require(feed.lastUpdated > 0, "Price not available");
        require(
            block.timestamp - feed.lastUpdated <= STALENESS_THRESHOLD, 
            "Price data stale"
        );
        
        return feed.price;
    }
    
    /**
     * @dev Get price with timestamp (for more detailed queries)
     */
    function getPriceWithTimestamp(string memory asset) external view returns (uint256 price, uint256 timestamp) {
        PriceData memory feed = priceFeeds[asset];
        require(feed.isActive, "Asset not supported");
        require(feed.lastUpdated > 0, "Price not available");
        
        return (feed.price, feed.lastUpdated);
    }
    
    /**
     * @dev Check if price data is fresh
     */
    function isPriceFresh(string memory asset) external view returns (bool) {
        PriceData memory feed = priceFeeds[asset];
        if (!feed.isActive || feed.lastUpdated == 0) return false;
        
        return (block.timestamp - feed.lastUpdated <= STALENESS_THRESHOLD);
    }
    
    /**
     * @dev Add/configure a new price feed
     */
    function configurePriceFeed(string memory asset, bool active) external onlyOwner {
        priceFeeds[asset].isActive = active;
        emit OracleConfigured(asset, active);
    }
    
    /**
     * @dev Authorize/deauthorize price updater
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
        emit UpdaterAuthorized(updater, authorized);
    }
    
    /**
     * @dev Emergency function to force update stale price
     */
    function emergencyUpdatePrice(string memory asset, uint256 price) external onlyOwner {
        require(price > 0, "Invalid price");
        
        priceFeeds[asset].price = price;
        priceFeeds[asset].lastUpdated = block.timestamp;
        
        emit PriceUpdated(asset, price, block.timestamp);
    }
    
    /**
     * @dev Get all supported assets
     */
    function getSupportedAssets() external pure returns (string[] memory) {
        string[] memory assets = new string[](4);
        assets[0] = "CORE";
        assets[1] = "BTC";
        assets[2] = "lstBTC";
        assets[3] = "coreBTC";
        return assets;
    }
    
    function _initializePriceFeed(string memory asset) internal {
        priceFeeds[asset].isActive = true;
        priceFeeds[asset].lastUpdated = 0;
        priceFeeds[asset].price = 0;
    }
}