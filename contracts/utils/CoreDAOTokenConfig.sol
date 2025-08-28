// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CoreDAOTokenConfig
 * @dev Configuration contract for CoreDAO native and bridged tokens
 */
contract CoreDAOTokenConfig {
    
    // Native token
    address public constant CORE_NATIVE = address(0); // Native CORE token (like ETH on Ethereum)
    
    // Bridged BTC tokens on CoreDAO
    address public constant SOLV_BTC_CORE = 0x0000000000000000000000000000000000000000; // SolvBTC.CORE
    address public constant CB_BTC_CORE = 0x0000000000000000000000000000000000000000;   // cbBTC Core
    address public constant CORE_BTC = 0x0000000000000000000000000000000000000000;      // coreBTC (if exists)
    
    // Bridged stablecoins on CoreDAO (wrapped from other chains)
    address public constant USDT_CORE = 0x900101d06A7426441Ae63e9AB3B9b0F63Be145F1; // Wrapped USDT
    address public constant USDC_CORE = 0xa4151B2B3e269645181dCcF2D426cE75fcbDeca9; // Wrapped USDC
    
    // LST (Liquid Staking Token) representations
    address public constant ST_CORE = 0x0000000000000000000000000000000000000000;     // stCORE (our liquid staking token)
    address public constant LST_BTC = 0x0000000000000000000000000000000000000000;     // Liquid staking BTC tokens
    
    // CoreDAO Bridge contract
    address public constant CORE_BRIDGE = 0x0000000000000000000000000000000000000000; // Official Core Bridge
    
    // Token metadata
    struct TokenInfo {
        string name;
        string symbol;
        uint8 decimals;
        bool isNative;
        bool isBridged;
        address originalChain; // Address on original chain if bridged
        string description;
    }
    
    mapping(address => TokenInfo) public tokenInfo;
    
    constructor() {
        // Initialize token information
        _initializeTokenInfo();
    }
    
    function _initializeTokenInfo() internal {
        // Native CORE token
        tokenInfo[CORE_NATIVE] = TokenInfo({
            name: "Core",
            symbol: "CORE",
            decimals: 18,
            isNative: true,
            isBridged: false,
            originalChain: address(0),
            description: "Native CORE token - gas and staking"
        });
        
        // Wrapped USDT
        tokenInfo[USDT_CORE] = TokenInfo({
            name: "Tether USD (Core)",
            symbol: "USDT",
            decimals: 6,
            isNative: false,
            isBridged: true,
            originalChain: 0xdAC17F958D2ee523a2206206994597C13D831ec7, // USDT on Ethereum
            description: "Bridged USDT from Ethereum"
        });
        
        // Wrapped USDC
        tokenInfo[USDC_CORE] = TokenInfo({
            name: "USD Coin (Core)",
            symbol: "USDC",
            decimals: 6,
            isNative: false,
            isBridged: true,
            originalChain: 0xa0B86A33e6441e68e9c9F3c5BF9bFE5FB5Cf3B59, // USDC on Ethereum
            description: "Bridged USDC from Ethereum"
        });
    }
    
    /**
     * @dev Get token information
     */
    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return tokenInfo[token];
    }
    
    /**
     * @dev Check if token is native to CoreDAO
     */
    function isNativeToken(address token) external pure returns (bool) {
        return token == CORE_NATIVE;
    }
    
    /**
     * @dev Check if token is bridged to CoreDAO
     */
    function isBridgedToken(address token) external view returns (bool) {
        return tokenInfo[token].isBridged;
    }
    
    /**
     * @dev Get all supported BTC tokens on CoreDAO
     */
    function getSupportedBTCTokens() external pure returns (address[] memory btcTokens) {
        btcTokens = new address[](3);
        btcTokens[0] = SOLV_BTC_CORE;
        btcTokens[1] = CB_BTC_CORE;
        btcTokens[2] = CORE_BTC;
        return btcTokens;
    }
    
    /**
     * @dev Get supported stablecoins on CoreDAO
     */
    function getSupportedStablecoins() external pure returns (address[] memory stablecoins) {
        stablecoins = new address[](2);
        stablecoins[0] = USDT_CORE;
        stablecoins[1] = USDC_CORE;
        return stablecoins;
    }
    
    /**
     * @dev Check if address is a supported BTC token
     */
    function isBTCToken(address token) external pure returns (bool) {
        return token == SOLV_BTC_CORE || 
               token == CB_BTC_CORE || 
               token == CORE_BTC;
    }
    
    /**
     * @dev Check if address is a supported stablecoin
     */
    function isStablecoin(address token) external pure returns (bool) {
        return token == USDT_CORE || token == USDC_CORE;
    }
    
    /**
     * @dev Get primary BTC token (SolvBTC.CORE as default)
     */
    function getPrimaryBTCToken() external pure returns (address) {
        return SOLV_BTC_CORE;
    }
    
    /**
     * @dev Get primary stablecoin (USDT as default)
     */
    function getPrimaryStablecoin() external pure returns (address) {
        return USDT_CORE;
    }
}