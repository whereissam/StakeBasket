// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SimplePriceFeed.sol";

interface ISimpleToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

interface IDEXRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
    
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

/**
 * @title SimpleStaking
 * @dev Clean dual staking with automatic ratio maintenance
 * One job: maintain optimal CORE:BTC ratio for maximum rewards
 */
contract SimpleStaking is ReentrancyGuard, Ownable {
    
    ISimpleToken public immutable basketToken;
    SimplePriceFeed public immutable priceFeed;
    IERC20 public immutable btcToken;
    IDEXRouter public dexRouter;
    
    uint256 public totalCorePooled;
    uint256 public totalBtcPooled;
    uint256 public targetRatio = 10000; // 10,000 CORE per 1 BTC
    
    bytes32 public constant CORE_ASSET = keccak256("CORE");
    bytes32 public constant BTC_ASSET = keccak256("BTC");
    
    event Deposited(address indexed user, uint256 coreAmount, uint256 btcAmount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 coreAmount, uint256 btcAmount);
    event Rebalanced(uint256 coreSwapped, uint256 btcSwapped);
    
    constructor(
        address _basketToken,
        address _priceFeed,
        address _btcToken,
        address _dexRouter,
        address initialOwner
    ) Ownable(initialOwner) {
        basketToken = ISimpleToken(_basketToken);
        priceFeed = SimplePriceFeed(_priceFeed);
        btcToken = IERC20(_btcToken);
        dexRouter = IDEXRouter(_dexRouter);
    }
    
    /**
     * @dev Deposit CORE and BTC tokens
     */
    function deposit(uint256 btcAmount) external payable nonReentrant {
        uint256 coreAmount = msg.value;
        require(coreAmount > 0 && btcAmount > 0, "Both assets required");
        
        btcToken.transferFrom(msg.sender, address(this), btcAmount);
        
        uint256 shares = _calculateShares(coreAmount, btcAmount);
        
        totalCorePooled += coreAmount;
        totalBtcPooled += btcAmount;
        
        _rebalanceIfNeeded();
        
        basketToken.mint(msg.sender, shares);
        
        emit Deposited(msg.sender, coreAmount, btcAmount, shares);
    }
    
    /**
     * @dev Withdraw proportional assets
     */
    function withdraw(uint256 shares) external nonReentrant {
        require(shares > 0, "Invalid shares");
        require(basketToken.balanceOf(msg.sender) >= shares, "Insufficient shares");
        
        uint256 totalShares = basketToken.totalSupply();
        uint256 coreAmount = (totalCorePooled * shares) / totalShares;
        uint256 btcAmount = (totalBtcPooled * shares) / totalShares;
        
        totalCorePooled -= coreAmount;
        totalBtcPooled -= btcAmount;
        
        basketToken.burn(msg.sender, shares);
        
        payable(msg.sender).transfer(coreAmount);
        btcToken.transfer(msg.sender, btcAmount);
        
        emit Withdrawn(msg.sender, shares, coreAmount, btcAmount);
    }
    
    /**
     * @dev Calculate shares for deposit
     */
    function _calculateShares(uint256 coreAmount, uint256 btcAmount) internal view returns (uint256) {
        if (basketToken.totalSupply() == 0) {
            uint256 coreValue = coreAmount * priceFeed.getPriceUnsafe(CORE_ASSET) / 1e18;
            uint256 btcValue = btcAmount * priceFeed.getPriceUnsafe(BTC_ASSET) / 1e8;
            return coreValue + btcValue;
        }
        
        uint256 totalValue = _getTotalValue();
        uint256 depositValue = (coreAmount * priceFeed.getPriceUnsafe(CORE_ASSET) / 1e18) + 
                              (btcAmount * priceFeed.getPriceUnsafe(BTC_ASSET) / 1e8);
        
        return (depositValue * basketToken.totalSupply()) / totalValue;
    }
    
    /**
     * @dev Get total portfolio value in USD
     */
    function _getTotalValue() internal view returns (uint256) {
        uint256 coreValue = totalCorePooled * priceFeed.getPriceUnsafe(CORE_ASSET) / 1e18;
        uint256 btcValue = totalBtcPooled * priceFeed.getPriceUnsafe(BTC_ASSET) / 1e8;
        return coreValue + btcValue;
    }
    
    /**
     * @dev Check if rebalancing needed
     */
    function needsRebalancing() public view returns (bool) {
        if (totalBtcPooled == 0 || targetRatio == 0) return false;
        
        uint256 currentRatio = (totalCorePooled / 1e18) * 1e8 / totalBtcPooled; // Normalize both to whole numbers
        uint256 deviation = currentRatio > targetRatio ? 
            ((currentRatio - targetRatio) * 10000) / targetRatio :
            ((targetRatio - currentRatio) * 10000) / targetRatio;
        
        return deviation > 500; // 5% threshold
    }
    
    /**
     * @dev Rebalance if needed
     */
    function _rebalanceIfNeeded() internal {
        if (!needsRebalancing() || address(dexRouter) == address(0)) return;
        
        uint256 currentRatio = (totalCorePooled / 1e18) * 1e8 / totalBtcPooled; // Normalize both to whole numbers
        
        if (currentRatio < targetRatio) {
            // Need more CORE - swap some BTC
            uint256 requiredCore = (totalBtcPooled * 1e10) * targetRatio;
            uint256 coreNeeded = requiredCore - totalCorePooled;
            uint256 btcToSwap = (coreNeeded * priceFeed.getPriceUnsafe(CORE_ASSET)) / 
                               priceFeed.getPriceUnsafe(BTC_ASSET);
            
            if (btcToSwap > 0 && btcToSwap <= totalBtcPooled / 4) { // Max 25% swap
                _swapBtcForCore(btcToSwap);
            }
        } else {
            // Need more BTC - swap some CORE  
            uint256 excessCore = totalCorePooled - ((totalBtcPooled * 1e10) * targetRatio);
            uint256 coreToSwap = excessCore / 2; // Conservative
            
            if (coreToSwap > 0 && coreToSwap <= totalCorePooled / 4) { // Max 25% swap
                _swapCoreForBtc(coreToSwap);
            }
        }
    }
    
    /**
     * @dev Swap BTC for CORE
     */
    function _swapBtcForCore(uint256 btcAmount) internal {
        btcToken.approve(address(dexRouter), btcAmount);
        
        address[] memory path = new address[](2);
        path[0] = address(btcToken);
        path[1] = address(0); // Native CORE (WCORE in actual DEX)
        
        uint256 balanceBefore = address(this).balance;
        
        try dexRouter.swapExactTokensForETH(
            btcAmount,
            0, // Accept any amount
            path,
            address(this),
            block.timestamp + 300
        ) {
            uint256 coreReceived = address(this).balance - balanceBefore;
            totalBtcPooled -= btcAmount;
            totalCorePooled += coreReceived;
            emit Rebalanced(coreReceived, btcAmount);
        } catch {
            // Reset approval and continue
            btcToken.approve(address(dexRouter), 0);
        }
    }
    
    /**
     * @dev Swap CORE for BTC
     */
    function _swapCoreForBtc(uint256 coreAmount) internal {
        address[] memory path = new address[](2);
        path[0] = address(0); // Native CORE (WCORE in actual DEX)
        path[1] = address(btcToken);
        
        uint256 balanceBefore = btcToken.balanceOf(address(this));
        
        try dexRouter.swapExactETHForTokens{value: coreAmount}(
            0, // Accept any amount
            path,
            address(this),
            block.timestamp + 300
        ) {
            uint256 btcReceived = btcToken.balanceOf(address(this)) - balanceBefore;
            totalCorePooled -= coreAmount;
            totalBtcPooled += btcReceived;
            emit Rebalanced(coreAmount, btcReceived);
        } catch {
            // Continue without rebalancing
        }
    }
    
    /**
     * @dev Public rebalance function
     */
    function rebalance() external {
        require(needsRebalancing(), "No rebalancing needed");
        _rebalanceIfNeeded();
    }
    
    /**
     * @dev Set target ratio
     */
    function setTargetRatio(uint256 _ratio) external onlyOwner {
        targetRatio = _ratio;
    }
    
    /**
     * @dev Set DEX router
     */
    function setDexRouter(address _router) external onlyOwner {
        dexRouter = IDEXRouter(_router);
    }
    
    /**
     * @dev Get pool info
     */
    function getPoolInfo() external view returns (
        uint256 totalCore,
        uint256 totalBtc,
        uint256 totalShares,
        uint256 sharePrice,
        uint256 currentRatio
    ) {
        totalCore = totalCorePooled;
        totalBtc = totalBtcPooled;
        totalShares = basketToken.totalSupply();
        
        if (totalShares > 0) {
            sharePrice = _getTotalValue() * 1e18 / totalShares;
        } else {
            sharePrice = 1e18;
        }
        
        if (totalBtcPooled > 0) {
            currentRatio = (totalCorePooled / 1e18) * 1e8 / totalBtcPooled; // Normalize both to whole numbers
        }
    }
    
    receive() external payable {}
}