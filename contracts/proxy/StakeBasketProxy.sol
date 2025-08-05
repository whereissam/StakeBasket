// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakeBasketProxy
 * @dev Transparent upgradeable proxy for StakeBasket contract
 * 
 * UPGRADEABILITY STRATEGY:
 * - Uses OpenZeppelin's TransparentUpgradeableProxy pattern
 * - Separates admin functions from user functions to prevent storage collisions
 * - Implements timelock for critical upgrades
 * - Emergency pause functionality for security incidents
 * - Multi-signature governance for upgrade approvals
 */
contract StakeBasketProxy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, admin_, _data) {}
}

/**
 * @title StakeBasketProxyAdmin
 * @dev Enhanced proxy admin with governance controls
 */
contract StakeBasketProxyAdmin is ProxyAdmin, Ownable {
    
    // Timelock parameters
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant MAX_DELAY = 30 days;
    uint256 public upgradeDelay = 7 days; // Default 7-day timelock
    
    // Governance parameters
    address public governance;
    address public pendingGovernance;
    bool public emergencyPaused;
    
    // Upgrade tracking
    struct PendingUpgrade {
        address proxy;
        address newImplementation;
        bytes data;
        uint256 executeTime;
        bool executed;
        string reason;
    }
    
    mapping(bytes32 => PendingUpgrade) public pendingUpgrades;
    bytes32[] public pendingUpgradeIds;
    
    // Events
    event UpgradeScheduled(
        bytes32 indexed upgradeId,
        address indexed proxy,
        address newImplementation,
        uint256 executeTime,
        string reason
    );
    event UpgradeExecuted(bytes32 indexed upgradeId, address proxy, address newImplementation);
    event UpgradeCancelled(bytes32 indexed upgradeId);
    event EmergencyPause(bool paused);
    event GovernanceTransferred(address indexed previousGovernance, address indexed newGovernance);
    
    modifier onlyGovernance() {
        require(msg.sender == governance || msg.sender == owner(), "ProxyAdmin: caller is not governance");
        _;
    }
    
    modifier notEmergencyPaused() {
        require(!emergencyPaused, "ProxyAdmin: emergency paused");
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {
        governance = initialOwner;
    }
    
    /**
     * @dev Schedule an upgrade with timelock
     */
    function scheduleUpgrade(
        address proxy,
        address newImplementation,
        bytes calldata data,
        string calldata reason
    ) external onlyGovernance notEmergencyPaused returns (bytes32 upgradeId) {
        require(newImplementation != address(0), "ProxyAdmin: invalid implementation");
        
        upgradeId = keccak256(abi.encodePacked(proxy, newImplementation, data, block.timestamp));
        require(pendingUpgrades[upgradeId].proxy == address(0), "ProxyAdmin: upgrade already scheduled");
        
        uint256 executeTime = block.timestamp + upgradeDelay;
        
        pendingUpgrades[upgradeId] = PendingUpgrade({
            proxy: proxy,
            newImplementation: newImplementation,
            data: data,
            executeTime: executeTime,
            executed: false,
            reason: reason
        });
        
        pendingUpgradeIds.push(upgradeId);
        
        emit UpgradeScheduled(upgradeId, proxy, newImplementation, executeTime, reason);
        
        return upgradeId;
    }
    
    /**
     * @dev Execute a scheduled upgrade
     */
    function executeUpgrade(bytes32 upgradeId) external onlyGovernance notEmergencyPaused {
        PendingUpgrade storage upgrade = pendingUpgrades[upgradeId];
        require(upgrade.proxy != address(0), "ProxyAdmin: upgrade not found");
        require(!upgrade.executed, "ProxyAdmin: upgrade already executed");
        require(block.timestamp >= upgrade.executeTime, "ProxyAdmin: upgrade not ready");
        
        upgrade.executed = true;
        
        if (upgrade.data.length > 0) {
            upgradeAndCall(
                ITransparentUpgradeableProxy(upgrade.proxy),
                upgrade.newImplementation,
                upgrade.data
            );
        } else {
            upgrade(ITransparentUpgradeableProxy(upgrade.proxy), upgrade.newImplementation);
        }
        
        emit UpgradeExecuted(upgradeId, upgrade.proxy, upgrade.newImplementation);
    }
    
    /**
     * @dev Cancel a scheduled upgrade
     */
    function cancelUpgrade(bytes32 upgradeId) external onlyGovernance {
        PendingUpgrade storage upgrade = pendingUpgrades[upgradeId];
        require(upgrade.proxy != address(0), "ProxyAdmin: upgrade not found");
        require(!upgrade.executed, "ProxyAdmin: upgrade already executed");
        
        delete pendingUpgrades[upgradeId];
        
        // Remove from array
        for (uint256 i = 0; i < pendingUpgradeIds.length; i++) {
            if (pendingUpgradeIds[i] == upgradeId) {
                pendingUpgradeIds[i] = pendingUpgradeIds[pendingUpgradeIds.length - 1];
                pendingUpgradeIds.pop();
                break;
            }
        }
        
        emit UpgradeCancelled(upgradeId);
    }
    
    /**
     * @dev Emergency upgrade (bypasses timelock) - only for critical security issues
     */
    function emergencyUpgrade(
        address proxy,
        address newImplementation,
        bytes calldata data,
        string calldata reason
    ) external onlyOwner {
        require(bytes(reason).length > 0, "ProxyAdmin: emergency reason required");
        
        if (data.length > 0) {
            upgradeAndCall(
                ITransparentUpgradeableProxy(proxy),
                newImplementation,
                data
            );
        } else {
            upgrade(ITransparentUpgradeableProxy(proxy), newImplementation);
        }
        
        // Log as immediate upgrade
        bytes32 upgradeId = keccak256(abi.encodePacked(proxy, newImplementation, data, block.timestamp));
        emit UpgradeExecuted(upgradeId, proxy, newImplementation);
    }
    
    /**
     * @dev Emergency pause all upgrades
     */
    function setEmergencyPause(bool paused) external onlyOwner {
        emergencyPaused = paused;
        emit EmergencyPause(paused);
    }
    
    /**
     * @dev Set upgrade delay
     */
    function setUpgradeDelay(uint256 delay) external onlyGovernance {
        require(delay >= MIN_DELAY && delay <= MAX_DELAY, "ProxyAdmin: invalid delay");
        upgradeDelay = delay;
    }
    
    /**
     * @dev Transfer governance
     */
    function transferGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "ProxyAdmin: invalid governance");
        pendingGovernance = newGovernance;
    }
    
    /**
     * @dev Accept governance transfer
     */
    function acceptGovernance() external {
        require(msg.sender == pendingGovernance, "ProxyAdmin: not pending governance");
        address previousGovernance = governance;
        governance = pendingGovernance;
        pendingGovernance = address(0);
        emit GovernanceTransferred(previousGovernance, governance);
    }
    
    /**
     * @dev Get all pending upgrades
     */
    function getPendingUpgrades() external view returns (bytes32[] memory) {
        return pendingUpgradeIds;
    }
    
    /**
     * @dev Get upgrade details
     */
    function getUpgradeDetails(bytes32 upgradeId) 
        external 
        view 
        returns (
            address proxy,
            address newImplementation,
            uint256 executeTime,
            bool executed,
            string memory reason
        )
    {
        PendingUpgrade memory upgrade = pendingUpgrades[upgradeId];
        return (
            upgrade.proxy,
            upgrade.newImplementation,
            upgrade.executeTime,
            upgrade.executed,
            upgrade.reason
        );
    }
    
    /**
     * @dev Check if upgrade is ready for execution
     */
    function isUpgradeReady(bytes32 upgradeId) external view returns (bool) {
        PendingUpgrade memory upgrade = pendingUpgrades[upgradeId];
        return upgrade.proxy != address(0) && 
               !upgrade.executed && 
               block.timestamp >= upgrade.executeTime;
    }
}