// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PriceSecurityModule
 * @dev Enhanced security module for price feed validation and TWAP protection
 */
contract PriceSecurityModule is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    struct TWAPData {
        uint256[] prices;
        uint256[] timestamps;
        uint256 currentIndex;
        uint256 windowSize;
        bool initialized;
    }

    struct SecurityConfig {
        uint256 maxDeviationBps;           // Maximum allowed deviation in basis points
        uint256 minUpdateInterval;         // Minimum time between updates
        uint256 twapWindow;               // TWAP window in seconds
        uint256 minSources;               // Minimum number of oracle sources
        uint256 emergencyCooldown;        // Emergency mode cooldown period
    }

    mapping(string => TWAPData) private assetTWAP;
    mapping(string => uint256) private lastUpdateTime;
    mapping(string => address[]) private oracleSources;
    
    SecurityConfig public securityConfig;
    bool public emergencyMode;
    uint256 public emergencyModeStart;
    
    // Events
    event PriceUpdated(string indexed asset, uint256 price, uint256 twapPrice);
    event EmergencyModeActivated(string reason);
    event EmergencyModeDeactivated();
    event SecurityConfigUpdated();

    // Errors
    error PriceDeviationTooHigh(uint256 deviation, uint256 maxAllowed);
    error InsufficientTimeBetweenUpdates(uint256 timeSinceLastUpdate, uint256 minRequired);
    error InsufficientOracleSources(uint256 sources, uint256 minRequired);
    error EmergencyModeActive();
    error TWAPNotReady();

    constructor(address initialOwner) Ownable(initialOwner) {
        securityConfig = SecurityConfig({
            maxDeviationBps: 1000,        // 10% maximum deviation
            minUpdateInterval: 300,        // 5 minutes minimum between updates
            twapWindow: 3600,             // 1 hour TWAP window
            minSources: 2,                // Minimum 2 oracle sources
            emergencyCooldown: 86400      // 24 hour emergency cooldown
        });
    }

    /**
     * @dev Validates a price update with TWAP and security checks
     * @param asset The asset symbol
     * @param newPrice The new price to validate
     * @param sources Array of oracle sources used
     * @return isValid Whether the price update is valid
     * @return twapPrice The current TWAP price
     */
    function validatePriceUpdate(
        string memory asset,
        uint256 newPrice,
        address[] memory sources
    ) external view returns (bool isValid, uint256 twapPrice) {
        require(!emergencyMode, "EmergencyModeActive");
        require(newPrice > 0, "Invalid price");
        
        // Check minimum oracle sources
        if (sources.length < securityConfig.minSources) {
            revert InsufficientOracleSources(sources.length, securityConfig.minSources);
        }

        // Check time constraints
        uint256 timeSinceLastUpdate = block.timestamp - lastUpdateTime[asset];
        if (timeSinceLastUpdate < securityConfig.minUpdateInterval) {
            revert InsufficientTimeBetweenUpdates(timeSinceLastUpdate, securityConfig.minUpdateInterval);
        }

        // Calculate TWAP if available
        TWAPData storage twapData = assetTWAP[asset];
        if (!twapData.initialized || twapData.prices.length == 0) {
            // First update, allow but mark as not ready for TWAP validation
            return (true, newPrice);
        }

        twapPrice = calculateTWAP(asset);
        
        // Check deviation from TWAP
        uint256 deviation = calculateDeviation(newPrice, twapPrice);
        if (deviation > securityConfig.maxDeviationBps) {
            return (false, twapPrice);
        }

        return (true, twapPrice);
    }

    /**
     * @dev Updates TWAP data after successful price validation
     * @param asset The asset symbol
     * @param price The validated price
     */
    function updateTWAPData(string memory asset, uint256 price) external onlyOwner {
        TWAPData storage twapData = assetTWAP[asset];
        
        if (!twapData.initialized) {
            twapData.prices = new uint256[](20); // 20 data points window
            twapData.timestamps = new uint256[](20);
            twapData.windowSize = 20;
            twapData.initialized = true;
        }

        twapData.prices[twapData.currentIndex] = price;
        twapData.timestamps[twapData.currentIndex] = block.timestamp;
        twapData.currentIndex = (twapData.currentIndex + 1) % twapData.windowSize;
        
        lastUpdateTime[asset] = block.timestamp;
        
        emit PriceUpdated(asset, price, calculateTWAP(asset));
    }

    /**
     * @dev Calculates Time-Weighted Average Price
     * @param asset The asset symbol
     * @return The TWAP price
     */
    function calculateTWAP(string memory asset) public view returns (uint256) {
        TWAPData storage twapData = assetTWAP[asset];
        require(twapData.initialized, "TWAP not initialized");

        uint256 weightedSum = 0;
        uint256 totalWeight = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < twapData.windowSize; i++) {
            if (twapData.timestamps[i] == 0) continue; // Skip empty slots
            
            // Calculate time weight (more recent = higher weight)
            uint256 age = currentTime - twapData.timestamps[i];
            if (age > securityConfig.twapWindow) continue; // Skip stale data
            
            uint256 weight = securityConfig.twapWindow - age;
            weightedSum += twapData.prices[i] * weight;
            totalWeight += weight;
        }

        require(totalWeight > 0, "No valid TWAP data");
        return weightedSum / totalWeight;
    }

    /**
     * @dev Calculates percentage deviation between two prices
     * @param price1 First price
     * @param price2 Second price
     * @return Deviation in basis points
     */
    function calculateDeviation(uint256 price1, uint256 price2) public pure returns (uint256) {
        if (price1 == price2) return 0;
        
        uint256 diff = price1 > price2 ? price1 - price2 : price2 - price1;
        uint256 average = (price1 + price2) / 2;
        
        return (diff * 10000) / average; // Return in basis points
    }

    /**
     * @dev Activates emergency mode to halt all price updates
     * @param reason The reason for activation
     */
    function activateEmergencyMode(string memory reason) external onlyOwner {
        emergencyMode = true;
        emergencyModeStart = block.timestamp;
        _pause();
        
        emit EmergencyModeActivated(reason);
    }

    /**
     * @dev Deactivates emergency mode after cooldown period
     */
    function deactivateEmergencyMode() external onlyOwner {
        require(emergencyMode, "Emergency mode not active");
        require(
            block.timestamp >= emergencyModeStart + securityConfig.emergencyCooldown,
            "Cooldown period not elapsed"
        );
        
        emergencyMode = false;
        emergencyModeStart = 0;
        _unpause();
        
        emit EmergencyModeDeactivated();
    }

    /**
     * @dev Updates security configuration
     */
    function updateSecurityConfig(
        uint256 maxDeviationBps,
        uint256 minUpdateInterval,
        uint256 twapWindow,
        uint256 minSources,
        uint256 emergencyCooldown
    ) external onlyOwner {
        require(maxDeviationBps <= 5000, "Max deviation too high"); // Max 50%
        require(minUpdateInterval >= 60, "Update interval too short"); // Min 1 minute
        require(twapWindow >= 300, "TWAP window too short"); // Min 5 minutes
        require(minSources >= 1, "Must have at least 1 source");
        require(emergencyCooldown >= 3600, "Cooldown too short"); // Min 1 hour

        securityConfig = SecurityConfig({
            maxDeviationBps: maxDeviationBps,
            minUpdateInterval: minUpdateInterval,
            twapWindow: twapWindow,
            minSources: minSources,
            emergencyCooldown: emergencyCooldown
        });

        emit SecurityConfigUpdated();
    }

    /**
     * @dev Adds an oracle source for an asset
     */
    function addOracleSource(string memory asset, address source) external onlyOwner {
        require(source != address(0), "Invalid source address");
        oracleSources[asset].push(source);
    }

    /**
     * @dev Removes an oracle source for an asset
     */
    function removeOracleSource(string memory asset, address source) external onlyOwner {
        address[] storage sources = oracleSources[asset];
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i] == source) {
                sources[i] = sources[sources.length - 1];
                sources.pop();
                break;
            }
        }
    }

    /**
     * @dev Gets oracle sources for an asset
     */
    function getOracleSources(string memory asset) external view returns (address[] memory) {
        return oracleSources[asset];
    }

    /**
     * @dev Gets TWAP data for an asset
     */
    function getTWAPData(string memory asset) external view returns (
        uint256[] memory prices,
        uint256[] memory timestamps,
        uint256 currentIndex,
        bool initialized
    ) {
        TWAPData storage twapData = assetTWAP[asset];
        return (twapData.prices, twapData.timestamps, twapData.currentIndex, twapData.initialized);
    }
}

// SafeMath library (if not already imported)
library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }
}