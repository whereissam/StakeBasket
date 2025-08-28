// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CoreDAOEcosystemConfig
 * @dev Configuration for actual CoreDAO ecosystem tokens and addresses
 */
contract CoreDAOEcosystemConfig {
    
    // ===== MAINNET TOKENS (Core Chain ID: 1116) =====
    
    // Native token
    address public constant CORE_NATIVE = address(0); // Native CORE token (gas token)
    
    // Bitcoin representations on Core
    address public constant SOLV_BTC = 0x0000000000000000000000000000000000000000; // SolvBTC.CORE
    address public constant CB_BTC = 0x0000000000000000000000000000000000000000;   // cbBTC Core
    
    // Liquid Staking Bitcoin (BTCfi)
    address public constant LST_BTC = 0x0000000000000000000000000000000000000000;    // lstBTC (Liquid Staked Bitcoin)
    
    // Bridged stablecoins (wrapped from other chains)
    address public constant USDT = 0x900101d06A7426441Ae63e9AB3B9b0F63Be145F1;     // Wrapped USDT
    address public constant USDC = 0xa4151B2B3e269645181dCcF2D426cE75fcbDeca9;     // Wrapped USDC
    
    // Core ecosystem tokens
    address public constant CORE_BRIDGE = 0x0000000000000000000000000000000000000000; // Official Core Bridge
    
    // ===== TESTNET TOKENS (Core Testnet2 ID: 1114) =====
    
    // Testnet native token
    address public constant TCORE2 = address(0); // Native tCORE2 token (testnet gas token)
    
    // Testnet faucet
    string public constant TESTNET_FAUCET = "https://scan.test2.btcs.network/faucet";
    
    // Token metadata
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
        bool isNative;
        bool isLiquidStaking;
        bool isBTCBacked;
        bool isStablecoin;
        address custodian; // For institutional tokens like lstBTC
        string description;
    }
    
    mapping(address => TokenConfig) public tokenConfigs;
    mapping(uint256 => address[]) public chainTokens; // chainId => supported tokens
    
    constructor() {
        _initializeMainnet();
        _initializeTestnet();
    }
    
    function _initializeMainnet() internal {
        uint256 mainnetId = 1116;
        
        // Native CORE
        tokenConfigs[CORE_NATIVE] = TokenConfig({
            name: "Core",
            symbol: "CORE",
            decimals: 18,
            isNative: true,
            isLiquidStaking: false,
            isBTCBacked: false,
            isStablecoin: false,
            custodian: address(0),
            description: "Native CORE token - Satoshi Plus consensus, gas, and staking"
        });
        chainTokens[mainnetId].push(CORE_NATIVE);
        
        // lstBTC - Liquid Staked Bitcoin
        tokenConfigs[LST_BTC] = TokenConfig({
            name: "Liquid Staked Bitcoin",
            symbol: "lstBTC",
            decimals: 18,
            isNative: false,
            isLiquidStaking: true,
            isBTCBacked: true,
            isStablecoin: false,
            custodian: address(0), // BitGo, Copper, Hex Trust (set separately)
            description: "Yield-bearing Bitcoin via Core Dual Staking, managed by Maple Finance"
        });
        chainTokens[mainnetId].push(LST_BTC);
        
        // SolvBTC.CORE
        tokenConfigs[SOLV_BTC] = TokenConfig({
            name: "Solv Protocol Bitcoin",
            symbol: "SolvBTC",
            decimals: 18,
            isNative: false,
            isLiquidStaking: false,
            isBTCBacked: true,
            isStablecoin: false,
            custodian: address(0),
            description: "Solv Protocol's Bitcoin representation on Core"
        });
        chainTokens[mainnetId].push(SOLV_BTC);
        
        // Bridged USDT
        tokenConfigs[USDT] = TokenConfig({
            name: "Tether USD",
            symbol: "USDT",
            decimals: 6,
            isNative: false,
            isLiquidStaking: false,
            isBTCBacked: false,
            isStablecoin: true,
            custodian: address(0),
            description: "Bridged USDT from Ethereum via Core Bridge"
        });
        chainTokens[mainnetId].push(USDT);
        
        // Bridged USDC
        tokenConfigs[USDC] = TokenConfig({
            name: "USD Coin",
            symbol: "USDC",
            decimals: 6,
            isNative: false,
            isLiquidStaking: false,
            isBTCBacked: false,
            isStablecoin: true,
            custodian: address(0),
            description: "Bridged USDC from Ethereum via Core Bridge"
        });
        chainTokens[mainnetId].push(USDC);
    }
    
    function _initializeTestnet() internal {
        uint256 testnetId = 1114;
        
        // Testnet CORE
        tokenConfigs[TCORE2] = TokenConfig({
            name: "Testnet Core",
            symbol: "tCORE2",
            decimals: 18,
            isNative: true,
            isLiquidStaking: false,
            isBTCBacked: false,
            isStablecoin: false,
            custodian: address(0),
            description: "Testnet CORE token - only for testing, no real value"
        });
        chainTokens[testnetId].push(TCORE2);
    }
    
    // ===== GETTER FUNCTIONS =====
    
    /**
     * @dev Get all Bitcoin-backed tokens on Core
     */
    function getBTCTokens() external pure returns (address[] memory) {
        address[] memory btcTokens = new address[](3);
        btcTokens[0] = LST_BTC;    // Primary: Liquid Staked Bitcoin
        btcTokens[1] = SOLV_BTC;  // SolvBTC.CORE
        btcTokens[2] = CB_BTC;    // cbBTC Core
        return btcTokens;
    }
    
    /**
     * @dev Get primary liquid staking Bitcoin token
     */
    function getPrimaryLSTBTC() external pure returns (address) {
        return LST_BTC;
    }
    
    /**
     * @dev Get supported stablecoins
     */
    function getStablecoins() external pure returns (address[] memory) {
        address[] memory stables = new address[](2);
        stables[0] = USDT;
        stables[1] = USDC;
        return stables;
    }
    
    /**
     * @dev Get testnet faucet URL
     */
    function getTestnetFaucet() external pure returns (string memory) {
        return TESTNET_FAUCET;
    }
    
    /**
     * @dev Check if token is Bitcoin-backed
     */
    function isBTCBacked(address token) external view returns (bool) {
        return tokenConfigs[token].isBTCBacked;
    }
    
    /**
     * @dev Check if token is liquid staking token
     */
    function isLiquidStaking(address token) external view returns (bool) {
        return tokenConfigs[token].isLiquidStaking;
    }
    
    /**
     * @dev Get token configuration
     */
    function getTokenConfig(address token) external view returns (TokenConfig memory) {
        return tokenConfigs[token];
    }
    
    /**
     * @dev Get supported tokens for chain
     */
    function getSupportedTokens(uint256 chainId) external view returns (address[] memory) {
        return chainTokens[chainId];
    }
    
    // ===== LSTBTC SPECIFIC FUNCTIONS =====
    
    /**
     * @dev Get lstBTC custodians (in real implementation)
     */
    function getLstBTCCustodians() external pure returns (string[] memory) {
        string[] memory custodians = new string[](3);
        custodians[0] = "BitGo";
        custodians[1] = "Copper";
        custodians[2] = "Hex Trust";
        return custodians;
    }
    
    /**
     * @dev Get lstBTC yield manager
     */
    function getLstBTCYieldManager() external pure returns (string memory) {
        return "Maple Finance";
    }
    
    /**
     * @dev Check if chain supports real lstBTC (mainnet only)
     */
    function supportsRealLstBTC(uint256 chainId) external pure returns (bool) {
        return chainId == 1116; // Only mainnet supports real lstBTC
    }
    
    /**
     * @dev Get optimal asset allocation for StakeBasket on CoreDAO
     * @return tokens Array of token addresses
     * @return allocations Array of allocation percentages (basis points)
     */
    function getOptimalAllocation() external pure returns (address[] memory tokens, uint256[] memory allocations) {
        tokens = new address[](4);
        allocations = new uint256[](4);
        
        // Optimized allocation for CoreDAO ecosystem
        tokens[0] = CORE_NATIVE;    // 40% - Native staking and gas utility
        tokens[1] = LST_BTC;        // 35% - Bitcoin yield via Dual Staking
        tokens[2] = USDT;           // 15% - Stability and liquidity
        tokens[3] = USDC;           // 10% - Additional stability
        
        allocations[0] = 4000;      // 40%
        allocations[1] = 3500;      // 35%
        allocations[2] = 1500;      // 15%
        allocations[3] = 1000;      // 10%
        
        return (tokens, allocations);
    }
}