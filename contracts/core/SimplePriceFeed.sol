// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@switchboard-xyz/on-demand-solidity/surge/interfaces/ISwitchboard.sol";
import "@switchboard-xyz/on-demand-solidity/surge/libraries/SwitchboardTypes.sol";

/**
 * @title SimplePriceFeed
 * @dev Clean, minimal price feed using Switchboard for real-time prices
 * No circuit breakers, no multiple oracles, no complexity - just prices
 */
contract SimplePriceFeed is Ownable {
    struct Price {
        uint256 value;      // Price with 18 decimals
        uint256 timestamp;  // When price was last updated
    }
    
    mapping(bytes32 => Price) public prices;
    mapping(bytes32 => bytes32) public feedIds; // asset hash => switchboard feed ID
    
    ISwitchboard public switchboard;
    uint256 public constant STALE_THRESHOLD = 1 hours;
    
    event PriceUpdated(bytes32 indexed asset, uint256 price, uint256 timestamp);
    
    constructor(address _switchboard, address initialOwner) Ownable(initialOwner) {
        switchboard = ISwitchboard(_switchboard);
    }
    
    /**
     * @dev Update price from Switchboard oracle
     */
    function updatePrice(bytes32 asset, bytes[] calldata updates) external payable {
        bytes32 feedId = feedIds[asset];
        require(feedId != bytes32(0), "Asset not configured");
        
        uint256 fee = switchboard.getFee(updates);
        require(msg.value >= fee, "Insufficient fee");
        
        switchboard.updateFeeds{value: fee}(updates);
        
        SwitchboardTypes.Update memory latestUpdate = switchboard.latestUpdate(feedId);
        require(latestUpdate.result > 0, "Invalid price");
        
        uint256 newPrice = uint256(uint128(latestUpdate.result));
        
        prices[asset] = Price({
            value: newPrice,
            timestamp: block.timestamp
        });
        
        emit PriceUpdated(asset, newPrice, block.timestamp);
        
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @dev Get current price for asset
     */
    function getPrice(bytes32 asset) external view returns (uint256) {
        Price memory price = prices[asset];
        require(price.value > 0, "Price not set");
        require(block.timestamp - price.timestamp <= STALE_THRESHOLD, "Price stale");
        return price.value;
    }
    
    /**
     * @dev Get price without staleness check (for internal use)
     */
    function getPriceUnsafe(bytes32 asset) external view returns (uint256) {
        return prices[asset].value;
    }
    
    /**
     * @dev Configure asset feed ID
     */
    function setFeedId(bytes32 asset, bytes32 feedId) external onlyOwner {
        feedIds[asset] = feedId;
    }
    
    /**
     * @dev Emergency price override
     */
    function setPrice(bytes32 asset, uint256 price) external onlyOwner {
        prices[asset] = Price({
            value: price,
            timestamp: block.timestamp
        });
        emit PriceUpdated(asset, price, block.timestamp);
    }
    
    /**
     * @dev Helper functions for common assets
     */
    function getCorePrice() external view returns (uint256) {
        return this.getPrice(keccak256("CORE"));
    }
    
    function getBtcPrice() external view returns (uint256) {
        return this.getPrice(keccak256("BTC"));
    }
}