// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title stCORE Token
 * @dev Liquid staking token representing staked CORE in the CoreDAO network
 * Users receive stCORE tokens when they stake CORE, which can be traded while underlying CORE remains staked
 */
contract StCoreToken is ERC20, Ownable, ReentrancyGuard {
    
    // Events
    event Minted(address indexed to, uint256 amount, uint256 coreAmount);
    event Burned(address indexed from, uint256 amount, uint256 coreAmount);
    event ConversionRateUpdated(uint256 newRate, uint256 totalStaked, uint256 totalSupply);
    
    // State variables
    address public liquidStakingManager;
    uint256 public totalStakedCore;
    
    // Conversion rate precision (1e18)
    uint256 public constant PRECISION = 1e18;
    
    modifier onlyLiquidStakingManager() {
        require(msg.sender == liquidStakingManager, "StCoreToken: caller is not liquid staking manager");
        _;
    }
    
    constructor(address initialOwner) ERC20("Staked CORE", "stCORE") Ownable(initialOwner) {
        // Initial conversion rate is 1:1
        totalStakedCore = 0;
    }
    
    /**
     * @dev Set the liquid staking manager contract address
     * @param _liquidStakingManager Address of the liquid staking manager
     */
    function setLiquidStakingManager(address _liquidStakingManager) external onlyOwner {
        require(_liquidStakingManager != address(0), "StCoreToken: invalid address");
        liquidStakingManager = _liquidStakingManager;
    }
    
    /**
     * @dev Mint stCORE tokens to user when they stake CORE
     * @param to Address to mint tokens to
     * @param coreAmount Amount of CORE being staked
     * @return stCoreAmount Amount of stCORE tokens minted
     */
    function mint(address to, uint256 coreAmount) 
        external 
        onlyLiquidStakingManager 
        nonReentrant 
        returns (uint256 stCoreAmount) 
    {
        require(to != address(0), "StCoreToken: mint to zero address");
        require(coreAmount > 0, "StCoreToken: mint amount must be positive");
        
        // Calculate stCORE amount based on current conversion rate
        stCoreAmount = coreToStCore(coreAmount);
        
        // Update total staked CORE
        totalStakedCore += coreAmount;
        
        // Mint stCORE tokens
        _mint(to, stCoreAmount);
        
        emit Minted(to, stCoreAmount, coreAmount);
        emit ConversionRateUpdated(getConversionRate(), totalStakedCore, totalSupply());
        
        return stCoreAmount;
    }
    
    /**
     * @dev Burn stCORE tokens when user unstakes
     * @param from Address to burn tokens from
     * @param stCoreAmount Amount of stCORE tokens to burn
     * @return coreAmount Amount of CORE to return to user
     */
    function burn(address from, uint256 stCoreAmount) 
        external 
        onlyLiquidStakingManager 
        nonReentrant 
        returns (uint256 coreAmount) 
    {
        require(from != address(0), "StCoreToken: burn from zero address");
        require(stCoreAmount > 0, "StCoreToken: burn amount must be positive");
        require(balanceOf(from) >= stCoreAmount, "StCoreToken: insufficient balance");
        
        // Calculate CORE amount based on current conversion rate
        coreAmount = stCoreToCore(stCoreAmount);
        
        // Update total staked CORE
        require(totalStakedCore >= coreAmount, "StCoreToken: insufficient staked CORE");
        totalStakedCore -= coreAmount;
        
        // Burn stCORE tokens
        _burn(from, stCoreAmount);
        
        emit Burned(from, stCoreAmount, coreAmount);
        emit ConversionRateUpdated(getConversionRate(), totalStakedCore, totalSupply());
        
        return coreAmount;
    }
    
    /**
     * @dev Update total staked CORE after rewards are collected
     * Called by liquid staking manager after reward compounding
     * @param newTotalStaked New total amount of staked CORE including rewards
     */
    function updateTotalStakedCore(uint256 newTotalStaked) external onlyLiquidStakingManager {
        require(newTotalStaked >= totalStakedCore, "StCoreToken: total staked cannot decrease without burns");
        totalStakedCore = newTotalStaked;
        emit ConversionRateUpdated(getConversionRate(), totalStakedCore, totalSupply());
    }
    
    /**
     * @dev Get current conversion rate (CORE per stCORE)
     * @return rate Conversion rate with PRECISION decimals
     */
    function getConversionRate() public view returns (uint256 rate) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return PRECISION; // 1:1 ratio when no tokens exist
        }
        return (totalStakedCore * PRECISION) / supply;
    }
    
    /**
     * @dev Convert CORE amount to stCORE amount
     * @param coreAmount Amount of CORE
     * @return stCoreAmount Equivalent amount of stCORE
     */
    function coreToStCore(uint256 coreAmount) public view returns (uint256 stCoreAmount) {
        uint256 rate = getConversionRate();
        return (coreAmount * PRECISION) / rate;
    }
    
    /**
     * @dev Convert stCORE amount to CORE amount
     * @param stCoreAmount Amount of stCORE
     * @return coreAmount Equivalent amount of CORE
     */
    function stCoreToCore(uint256 stCoreAmount) public view returns (uint256 coreAmount) {
        uint256 rate = getConversionRate();
        return (stCoreAmount * rate) / PRECISION;
    }
    
    /**
     * @dev Get token info for UI
     * @return name Token name
     * @return symbol Token symbol
     * @return decimals Token decimals
     * @return totalSupply Total supply of stCORE
     * @return totalStaked Total CORE staked
     * @return conversionRate Current conversion rate
     */
    function getTokenInfo() external view returns (
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply,
        uint256 totalStaked,
        uint256 conversionRate
    ) {
        return (
            super.name(),
            super.symbol(),
            super.decimals(),
            super.totalSupply(),
            totalStakedCore,
            getConversionRate()
        );
    }
}