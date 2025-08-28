// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockDEXRouter
 * @dev Mock DEX router for testing dual staking basket swaps
 * Simulates token swaps with realistic slippage and price impact
 */
contract MockDEXRouter {
    
    uint256 public constant SLIPPAGE_FACTOR = 9950; // 0.5% slippage
    uint256 public constant PRICE_IMPACT_THRESHOLD = 10000; // 1% price impact threshold
    
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    event Swap(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed to
    );
    
    constructor() {
        // Initialize some default exchange rates (can be updated)
        // These would normally come from price oracles or AMM pools
    }
    
    /**
     * @dev Set exchange rate between two tokens
     * @param tokenA First token
     * @param tokenB Second token  
     * @param rate Exchange rate (tokenA per tokenB, scaled by 1e18)
     */
    function setExchangeRate(address tokenA, address tokenB, uint256 rate) external {
        exchangeRates[tokenA][tokenB] = rate;
        if (rate > 0) {
            exchangeRates[tokenB][tokenA] = (1e36) / rate; // Inverse rate
        }
    }
    
    /**
     * @dev Swap exact tokens for tokens (simplified Uniswap V2 style)
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum amount of output tokens
     * @param path Array of token addresses (only supports 2-token paths)
     * @param to Recipient address
     * @param deadline Transaction deadline
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "MockDEX: expired");
        require(path.length == 2, "MockDEX: invalid path");
        require(amountIn > 0, "MockDEX: insufficient input amount");
        
        address tokenIn = path[0];
        address tokenOut = path[1];
        
        // Calculate output amount with slippage
        uint256 amountOut = _getAmountOut(amountIn, tokenIn, tokenOut);
        require(amountOut >= amountOutMin, "MockDEX: insufficient output amount");
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(to, amountOut);
        
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        
        emit Swap(tokenIn, tokenOut, amountIn, amountOut, to);
    }
    
    /**
     * @dev Get amount out for a given input
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256) {
        return _getAmountOut(amountIn, tokenIn, tokenOut);
    }
    
    /**
     * @dev Get amounts out for a path
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length == 2, "MockDEX: invalid path");
        
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = _getAmountOut(amountIn, path[0], path[1]);
    }
    
    /**
     * @dev Internal function to calculate output amount
     */
    function _getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) internal view returns (uint256) {
        uint256 rate = exchangeRates[tokenIn][tokenOut];
        require(rate > 0, "MockDEX: no exchange rate");
        
        // Calculate base output
        uint256 baseOutput = (amountIn * rate) / 1e18;
        
        // Apply slippage (0.5% reduction)
        uint256 amountOut = (baseOutput * SLIPPAGE_FACTOR) / 10000;
        
        return amountOut;
    }
    
    /**
     * @dev Add liquidity to fund the router (for testing)
     */
    function addLiquidity(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Emergency withdraw (for testing)
     */
    function emergencyWithdraw(address token, uint256 amount) external {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    /**
     * @dev Get token balance in router
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}