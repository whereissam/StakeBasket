// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AccessControlManager
 * @dev Enhanced access control with role-based permissions and timelock functionality
 */
contract AccessControlManager is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    struct TimelockProposal {
        address target;
        bytes data;
        uint256 value;
        uint256 executeTime;
        bool executed;
        string description;
    }

    uint256 public constant TIMELOCK_DELAY = 24 hours; // 24 hour timelock for critical operations
    uint256 public constant EMERGENCY_DELAY = 1 hours; // 1 hour delay for emergency actions
    
    mapping(bytes32 => TimelockProposal) public proposals;
    mapping(address => uint256) public lastActionTime;
    uint256 public proposalNonce;

    event ProposalCreated(bytes32 indexed proposalId, address target, string description);
    event ProposalExecuted(bytes32 indexed proposalId, bool success);
    event EmergencyAction(address indexed executor, address target, string reason);

    modifier onlyWithDelay(uint256 delay) {
        require(
            block.timestamp >= lastActionTime[msg.sender] + delay,
            "AccessControlManager: action too soon"
        );
        _;
        lastActionTime[msg.sender] = block.timestamp;
    }

    modifier validProposal(bytes32 proposalId) {
        require(proposals[proposalId].target != address(0), "AccessControlManager: proposal does not exist");
        require(!proposals[proposalId].executed, "AccessControlManager: proposal already executed");
        require(
            block.timestamp >= proposals[proposalId].executeTime,
            "AccessControlManager: timelock not expired"
        );
        _;
    }

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _setRoleAdmin(OPERATOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ORACLE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(EMERGENCY_ROLE, ADMIN_ROLE);
    }

    /**
     * @dev Creates a timelock proposal for critical operations
     */
    function createProposal(
        address target,
        bytes calldata data,
        uint256 value,
        string calldata description
    ) external onlyRole(ADMIN_ROLE) returns (bytes32 proposalId) {
        proposalId = keccak256(abi.encodePacked(target, data, value, proposalNonce, block.timestamp));
        
        proposals[proposalId] = TimelockProposal({
            target: target,
            data: data,
            value: value,
            executeTime: block.timestamp + TIMELOCK_DELAY,
            executed: false,
            description: description
        });

        proposalNonce++;
        emit ProposalCreated(proposalId, target, description);
    }

    /**
     * @dev Executes a timelock proposal after delay
     */
    function executeProposal(bytes32 proposalId) 
        external 
        onlyRole(ADMIN_ROLE) 
        validProposal(proposalId)
        nonReentrant 
    {
        TimelockProposal storage proposal = proposals[proposalId];
        proposal.executed = true;

        (bool success, ) = proposal.target.call{value: proposal.value}(proposal.data);
        
        emit ProposalExecuted(proposalId, success);
        require(success, "AccessControlManager: proposal execution failed");
    }

    /**
     * @dev Emergency execution for critical security fixes
     */
    function emergencyExecute(
        address target,
        bytes calldata data,
        uint256 value,
        string calldata reason
    ) external onlyRole(EMERGENCY_ROLE) onlyWithDelay(EMERGENCY_DELAY) nonReentrant {
        (bool success, ) = target.call{value: value}(data);
        
        emit EmergencyAction(msg.sender, target, reason);
        require(success, "AccessControlManager: emergency execution failed");
    }

    /**
     * @dev Pause contract in emergency
     */
    function emergencyPause(string calldata reason) external onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyAction(msg.sender, address(this), reason);
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Cancel a pending proposal
     */
    function cancelProposal(bytes32 proposalId) external onlyRole(ADMIN_ROLE) {
        require(proposals[proposalId].target != address(0), "AccessControlManager: proposal does not exist");
        require(!proposals[proposalId].executed, "AccessControlManager: proposal already executed");
        
        delete proposals[proposalId];
    }

    /**
     * @dev Check if an address has any admin privileges
     */
    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account) || hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /**
     * @dev Check if an address can perform operator actions
     */
    function isOperator(address account) external view returns (bool) {
        return hasRole(OPERATOR_ROLE, account) || hasRole(ADMIN_ROLE, account);
    }

    /**
     * @dev Batch grant roles
     */
    function batchGrantRole(bytes32 role, address[] calldata accounts) external onlyRole(getRoleAdmin(role)) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _grantRole(role, accounts[i]);
        }
    }

    /**
     * @dev Batch revoke roles
     */
    function batchRevokeRole(bytes32 role, address[] calldata accounts) external onlyRole(getRoleAdmin(role)) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _revokeRole(role, accounts[i]);
        }
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(bytes32 proposalId) external view returns (
        address target,
        bytes memory data,
        uint256 value,
        uint256 executeTime,
        bool executed,
        string memory description
    ) {
        TimelockProposal memory proposal = proposals[proposalId];
        return (
            proposal.target,
            proposal.data,
            proposal.value,
            proposal.executeTime,
            proposal.executed,
            proposal.description
        );
    }

    /**
     * @dev Get time until proposal can be executed
     */
    function getTimeUntilExecution(bytes32 proposalId) external view returns (uint256) {
        TimelockProposal memory proposal = proposals[proposalId];
        if (proposal.executeTime <= block.timestamp) {
            return 0;
        }
        return proposal.executeTime - block.timestamp;
    }
}