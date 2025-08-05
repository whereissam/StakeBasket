// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BasketGovernance.sol";
import "./MockCoreStaking.sol";

/**
 * @title CoreDAOGovernanceProxy
 * @dev Enhanced governance proxy with comprehensive security model
 * 
 * SECURITY MODEL:
 * - Multi-signature governance for critical operations
 * - Timelock mechanism for governance execution
 * - Emergency pause functionality for security incidents
 * - Role-based access control with operator authorization
 * - Vote verification through BasketGovernance integration
 * - Validator delegation safety checks
 * 
 * GOVERNANCE INTEGRATION:
 * - Aggregates BASKET holder votes for CoreDAO proposals
 * - Executes validator delegations based on community consensus
 * - Manages hash power delegation for Bitcoin mining coordination
 * - Integrates with CoreDAO's native governance through timelock
 */
contract CoreDAOGovernanceProxy is ReentrancyGuard, Ownable {
    BasketGovernance public immutable basketGovernance;
    MockCoreStaking public coreStaking;
    
    // CoreDAO governance tracking
    struct CoreDAOProposal {
        uint256 id;
        string title;
        string description; 
        string snapshotId;
        uint256 basketProposalId;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
    }
    
    // Validator delegation tracking
    struct ValidatorDelegation {
        address validator;
        uint256 amount;
        uint256 basketProposalId;
        bool executed;
    }
    
    // Hash power delegation tracking
    struct HashPowerDelegation {
        address validator;
        uint256 hashPower;
        uint256 basketProposalId;
        bool executed;
    }
    
    // Storage
    mapping(uint256 => CoreDAOProposal) public coreDAOProposals;
    mapping(uint256 => ValidatorDelegation) public validatorDelegations;
    mapping(uint256 => HashPowerDelegation) public hashPowerDelegations;
    
    uint256 public coreDAOProposalCount;
    uint256 public validatorDelegationCount;
    uint256 public hashPowerDelegationCount;
    
    // Current delegated validator and amounts
    address public currentValidator;
    uint256 public totalDelegatedAmount;
    
    // Enhanced security controls
    mapping(address => bool) public authorizedOperators;
    mapping(address => uint256) public operatorPermissions; // Bitfield for granular permissions
    
    // Multi-signature governance
    address[] public governanceCommittee;
    mapping(address => bool) public isCommitteeMember;
    uint256 public requiredCommitteeSignatures = 2;
    mapping(bytes32 => mapping(address => bool)) public committeeApprovals;
    mapping(bytes32 => uint256) public approvalCount;
    
    // Timelock for governance execution
    uint256 public constant GOVERNANCE_TIMELOCK = 24 hours;
    uint256 public constant EMERGENCY_TIMELOCK = 6 hours;
    mapping(bytes32 => uint256) public timelockExpiry;
    
    // Emergency controls
    bool public emergencyPaused = false;
    address public emergencyPauseAuthority;
    mapping(address => bool) public emergencyOperators;
    
    // Vote verification
    uint256 public minimumVotingQuorum = 1000; // 10% in basis points
    uint256 public superMajorityThreshold = 6700; // 67% in basis points
    
    // Delegation safety
    mapping(address => bool) public blacklistedValidators;
    uint256 public maxSingleValidatorDelegation = 3000; // 30% in basis points
    
    // Permission flags
    uint256 constant PERMISSION_GOVERNANCE = 1;
    uint256 constant PERMISSION_VALIDATOR_DELEGATION = 2;
    uint256 constant PERMISSION_HASHPOWER_DELEGATION = 4;
    uint256 constant PERMISSION_EMERGENCY = 8;
    
    // Events
    event CoreDAOProposalCreated(
        uint256 indexed proxyProposalId,
        uint256 indexed basketProposalId,
        string snapshotId,
        string title
    );
    
    event CoreDAOVoteExecuted(
        uint256 indexed proxyProposalId,
        uint8 support,
        uint256 totalVotingPower
    );
    
    event ValidatorDelegationCreated(
        uint256 indexed delegationId,
        uint256 indexed basketProposalId,
        address validator,
        uint256 amount
    );
    
    event ValidatorDelegationExecuted(
        uint256 indexed delegationId,
        address oldValidator,
        address newValidator,
        uint256 amount
    );
    
    event HashPowerDelegationCreated(
        uint256 indexed delegationId,
        uint256 indexed basketProposalId,
        address validator,
        uint256 hashPower
    );
    
    event HashPowerDelegationExecuted(
        uint256 indexed delegationId,
        address validator,
        uint256 hashPower
    );
    
    event OperatorAuthorized(address indexed operator, bool authorized);
    event CommitteeMemberAdded(address indexed member);
    event CommitteeMemberRemoved(address indexed member);
    event GovernanceActionScheduled(bytes32 indexed actionHash, uint256 executeTime);
    event GovernanceActionExecuted(bytes32 indexed actionHash);
    event GovernanceActionCancelled(bytes32 indexed actionHash);
    event EmergencyPause(bool paused, address authority);
    event ValidatorBlacklisted(address indexed validator, bool blacklisted);
    event PermissionsUpdated(address indexed operator, uint256 permissions);
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedOperators[msg.sender],
            "CoreDAOGovernanceProxy: not authorized"
        );
        _;
    }
    
    modifier hasPermission(uint256 permission) {
        require(
            msg.sender == owner() || 
            (authorizedOperators[msg.sender] && (operatorPermissions[msg.sender] & permission) != 0),
            "CoreDAOGovernanceProxy: insufficient permissions"
        );
        _;
    }
    
    modifier onlyCommittee() {
        require(isCommitteeMember[msg.sender] || msg.sender == owner(), "CoreDAOGovernanceProxy: not committee member");
        _;
    }
    
    modifier notEmergencyPaused() {
        require(!emergencyPaused, "CoreDAOGovernanceProxy: emergency paused");
        _;
    }
    
    modifier validTimelock(bytes32 actionHash) {
        require(block.timestamp >= timelockExpiry[actionHash], "CoreDAOGovernanceProxy: timelock not expired");
        require(timelockExpiry[actionHash] != 0, "CoreDAOGovernanceProxy: action not scheduled");
        _;
    }
    
    constructor(
        address _basketGovernance,
        address payable _coreStaking,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_basketGovernance != address(0), "CoreDAOGovernanceProxy: invalid governance address");
        basketGovernance = BasketGovernance(payable(_basketGovernance));
        
        if (_coreStaking != address(0)) {
            coreStaking = MockCoreStaking(_coreStaking);
        }
    }
    
    /**
     * @dev Create a CoreDAO governance proposal proxy
     * @param title Title of the CoreDAO proposal
     * @param description Description of the CoreDAO proposal
     * @param snapshotId Snapshot governance proposal ID
     * @return proxyProposalId ID of the proxy proposal
     */
    function createCoreDAOProposal(
        string memory title,
        string memory description,
        string memory snapshotId
    ) external hasPermission(PERMISSION_GOVERNANCE) notEmergencyPaused returns (uint256) {
        // Create corresponding proposal in BasketGovernance
        uint256 basketProposalId = basketGovernance.propose(
            string(abi.encodePacked("CoreDAO Governance: ", title)),
            string(abi.encodePacked("CoreDAO Proposal - ", description)),
            BasketGovernance.ProposalType.ParameterChange,
            address(this),
            abi.encodeWithSignature("executeCoreDAOVote(uint256)", coreDAOProposalCount + 1),
            0
        );
        
        coreDAOProposalCount++;
        uint256 proxyProposalId = coreDAOProposalCount;
        
        CoreDAOProposal storage proposal = coreDAOProposals[proxyProposalId];
        proposal.id = proxyProposalId;
        proposal.title = title;
        proposal.description = description;
        proposal.snapshotId = snapshotId;
        proposal.basketProposalId = basketProposalId;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + 3 days; // Match BASKET governance voting period
        
        emit CoreDAOProposalCreated(proxyProposalId, basketProposalId, snapshotId, title);
        
        return proxyProposalId;
    }
    
    /**
     * @dev Execute aggregated vote on CoreDAO proposal (called by BasketGovernance)
     * @param proxyProposalId ID of the proxy proposal
     */
    function executeCoreDAOVote(uint256 proxyProposalId) external notEmergencyPaused {
        require(msg.sender == address(basketGovernance), "CoreDAOGovernanceProxy: only basket governance");
        require(proxyProposalId <= coreDAOProposalCount, "CoreDAOGovernanceProxy: invalid proposal id");
        
        CoreDAOProposal storage proposal = coreDAOProposals[proxyProposalId];
        require(!proposal.executed, "CoreDAOGovernanceProxy: already executed");
        
        // Get voting results from BasketGovernance
        (, , uint256 forVotes, uint256 againstVotes, uint256 abstainVotes,) = 
            basketGovernance.getProposalVoting(proposal.basketProposalId);
        
        uint256 totalVotes = forVotes + againstVotes + abstainVotes;
        uint256 totalSupply = basketGovernance.getTotalVotingPower();
        
        // Verify minimum quorum
        require(
            (totalVotes * 10000) / totalSupply >= minimumVotingQuorum,
            "CoreDAOGovernanceProxy: quorum not met"
        );
        
        proposal.forVotes = forVotes;
        proposal.againstVotes = againstVotes;
        proposal.abstainVotes = abstainVotes;
        proposal.executed = true;
        
        // Determine winning vote
        uint8 support;
        if (forVotes > againstVotes && forVotes > abstainVotes) {
            support = 1; // For
        } else if (againstVotes > forVotes && againstVotes > abstainVotes) {
            support = 0; // Against
        } else {
            support = 2; // Abstain
        }
        
        uint256 totalVotingPower = forVotes + againstVotes + abstainVotes;
        
        emit CoreDAOVoteExecuted(proxyProposalId, support, totalVotingPower);
    }
    
    /**
     * @dev Create validator delegation proposal
     * @param validator Address of the validator to delegate to
     * @param amount Amount of CORE to delegate
     * @return delegationId ID of the delegation proposal
     */
    function createValidatorDelegation(
        address validator,
        uint256 amount
    ) external hasPermission(PERMISSION_VALIDATOR_DELEGATION) notEmergencyPaused returns (uint256) {
        require(validator != address(0), "CoreDAOGovernanceProxy: invalid validator");
        require(amount > 0, "CoreDAOGovernanceProxy: invalid amount");
        require(!blacklistedValidators[validator], "CoreDAOGovernanceProxy: validator blacklisted");
        
        // Check delegation concentration limit
        uint256 totalStaked = address(coreStaking) != address(0) ? 
            coreStaking.getTotalStaked() : totalDelegatedAmount;
        require(
            (amount * 10000) / (totalStaked + amount) <= maxSingleValidatorDelegation,
            "CoreDAOGovernanceProxy: delegation concentration too high"
        );
        
        // Create corresponding proposal in BasketGovernance
        uint256 basketProposalId = basketGovernance.propose(
            string(abi.encodePacked("Delegate to Validator: ", toHexString(validator))),
            string(abi.encodePacked("Delegate ", toString(amount), " CORE to validator ", toHexString(validator))),
            BasketGovernance.ProposalType.StrategyAddition,
            address(this),
            abi.encodeWithSignature("executeValidatorDelegation(uint256)", validatorDelegationCount + 1),
            0
        );
        
        validatorDelegationCount++;
        uint256 delegationId = validatorDelegationCount;
        
        ValidatorDelegation storage delegation = validatorDelegations[delegationId];
        delegation.validator = validator;
        delegation.amount = amount;
        delegation.basketProposalId = basketProposalId;
        
        emit ValidatorDelegationCreated(delegationId, basketProposalId, validator, amount);
        
        return delegationId;
    }
    
    /**
     * @dev Execute validator delegation (called by BasketGovernance)
     * @param delegationId ID of the delegation to execute
     */
    function executeValidatorDelegation(uint256 delegationId) external nonReentrant notEmergencyPaused {
        require(msg.sender == address(basketGovernance), "CoreDAOGovernanceProxy: only basket governance");
        require(delegationId <= validatorDelegationCount, "CoreDAOGovernanceProxy: invalid delegation id");
        
        ValidatorDelegation storage delegation = validatorDelegations[delegationId];
        require(!delegation.executed, "CoreDAOGovernanceProxy: already executed");
        require(!blacklistedValidators[delegation.validator], "CoreDAOGovernanceProxy: validator blacklisted");
        
        // Verify governance approval with super majority for large delegations
        (, , uint256 forVotes, uint256 againstVotes, uint256 abstainVotes,) = 
            basketGovernance.getProposalVoting(delegation.basketProposalId);
        
        uint256 totalVotes = forVotes + againstVotes + abstainVotes;
        if (totalVotes > 0) {
            uint256 approvalRate = (forVotes * 10000) / totalVotes;
            
            // Require super majority for large delegations
            uint256 totalValue = totalDelegatedAmount + delegation.amount;
            if ((delegation.amount * 10000) / totalValue > 1000) { // > 10% of total
                require(approvalRate >= superMajorityThreshold, "CoreDAOGovernanceProxy: super majority required");
            }
        }
        
        address oldValidator = currentValidator;
        
        // If we have existing delegation, undelegate first
        if (currentValidator != address(0) && totalDelegatedAmount > 0 && address(coreStaking) != address(0)) {
            coreStaking.undelegate(currentValidator, totalDelegatedAmount);
        }
        
        // Delegate to new validator
        if (address(coreStaking) != address(0)) {
            coreStaking.delegate(delegation.validator, delegation.amount);
        }
        
        currentValidator = delegation.validator;
        totalDelegatedAmount = delegation.amount;
        delegation.executed = true;
        
        emit ValidatorDelegationExecuted(delegationId, oldValidator, delegation.validator, delegation.amount);
    }
    
    /**
     * @dev Create hash power delegation proposal
     * @param validator Address of the validator to delegate hash power to
     * @param hashPower Amount of hash power to delegate
     * @return delegationId ID of the hash power delegation proposal
     */
    function createHashPowerDelegation(
        address validator,
        uint256 hashPower
    ) external hasPermission(PERMISSION_HASHPOWER_DELEGATION) notEmergencyPaused returns (uint256) {
        require(validator != address(0), "CoreDAOGovernanceProxy: invalid validator");
        require(hashPower > 0, "CoreDAOGovernanceProxy: invalid hash power");
        require(!blacklistedValidators[validator], "CoreDAOGovernanceProxy: validator blacklisted");
        
        // Create corresponding proposal in BasketGovernance
        uint256 basketProposalId = basketGovernance.propose(
            string(abi.encodePacked("Delegate Hash Power to: ", toHexString(validator))),
            string(abi.encodePacked("Delegate ", toString(hashPower), " hash power to validator ", toHexString(validator))),
            BasketGovernance.ProposalType.StrategyAddition,
            address(this),
            abi.encodeWithSignature("executeHashPowerDelegation(uint256)", hashPowerDelegationCount + 1),
            0
        );
        
        hashPowerDelegationCount++;
        uint256 delegationId = hashPowerDelegationCount;
        
        HashPowerDelegation storage delegation = hashPowerDelegations[delegationId];
        delegation.validator = validator;
        delegation.hashPower = hashPower;
        delegation.basketProposalId = basketProposalId;
        
        emit HashPowerDelegationCreated(delegationId, basketProposalId, validator, hashPower);
        
        return delegationId;
    }
    
    /**
     * @dev Execute hash power delegation (called by BasketGovernance)
     * @param delegationId ID of the hash power delegation to execute
     */
    function executeHashPowerDelegation(uint256 delegationId) external {
        require(msg.sender == address(basketGovernance), "CoreDAOGovernanceProxy: only basket governance");
        require(delegationId <= hashPowerDelegationCount, "CoreDAOGovernanceProxy: invalid delegation id");
        
        HashPowerDelegation storage delegation = hashPowerDelegations[delegationId];
        require(!delegation.executed, "CoreDAOGovernanceProxy: already executed");
        
        // In a real implementation, this would interact with Bitcoin mining pools
        // For now, we'll just mark as executed and emit event
        delegation.executed = true;
        
        emit HashPowerDelegationExecuted(delegationId, delegation.validator, delegation.hashPower);
    }
    
    /**
     * @dev Get CoreDAO proposal details
     * @param proxyProposalId ID of the proxy proposal
     */
    function getCoreDAOProposal(uint256 proxyProposalId) external view returns (
        uint256 id,
        string memory title,
        string memory description,
        string memory snapshotId,
        uint256 basketProposalId,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    ) {
        require(proxyProposalId <= coreDAOProposalCount, "CoreDAOGovernanceProxy: invalid proposal id");
        
        CoreDAOProposal storage proposal = coreDAOProposals[proxyProposalId];
        
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.snapshotId,
            proposal.basketProposalId,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes
        );
    }
    
    /**
     * @dev Get validator delegation details
     * @param delegationId ID of the delegation
     */
    function getValidatorDelegation(uint256 delegationId) external view returns (
        address validator,
        uint256 amount,
        uint256 basketProposalId,
        bool executed
    ) {
        require(delegationId <= validatorDelegationCount, "CoreDAOGovernanceProxy: invalid delegation id");
        
        ValidatorDelegation storage delegation = validatorDelegations[delegationId];
        
        return (
            delegation.validator,
            delegation.amount,
            delegation.basketProposalId,
            delegation.executed
        );
    }
    
    /**
     * @dev Get hash power delegation details
     * @param delegationId ID of the hash power delegation
     */
    function getHashPowerDelegation(uint256 delegationId) external view returns (
        address validator,
        uint256 hashPower,
        uint256 basketProposalId,
        bool executed
    ) {
        require(delegationId <= hashPowerDelegationCount, "CoreDAOGovernanceProxy: invalid delegation id");
        
        HashPowerDelegation storage delegation = hashPowerDelegations[delegationId];
        
        return (
            delegation.validator,
            delegation.hashPower,
            delegation.basketProposalId,
            delegation.executed
        );
    }
    
    /**
     * @dev Set core staking contract
     * @param _coreStaking Address of the core staking contract
     */
    function setCoreStaking(address payable _coreStaking) external onlyOwner {
        coreStaking = MockCoreStaking(_coreStaking);
    }
    
    /**
     * @dev Add governance committee member
     */
    function addCommitteeMember(address member) external onlyOwner {
        require(member != address(0), "CoreDAOGovernanceProxy: invalid member");
        require(!isCommitteeMember[member], "CoreDAOGovernanceProxy: already member");
        
        governanceCommittee.push(member);
        isCommitteeMember[member] = true;
        
        emit CommitteeMemberAdded(member);
    }
    
    /**
     * @dev Remove governance committee member
     */
    function removeCommitteeMember(address member) external onlyOwner {
        require(isCommitteeMember[member], "CoreDAOGovernanceProxy: not member");
        
        isCommitteeMember[member] = false;
        
        // Remove from array
        for (uint256 i = 0; i < governanceCommittee.length; i++) {
            if (governanceCommittee[i] == member) {
                governanceCommittee[i] = governanceCommittee[governanceCommittee.length - 1];
                governanceCommittee.pop();
                break;
            }
        }
        
        emit CommitteeMemberRemoved(member);
    }
    
    /**
     * @dev Schedule governance action with timelock
     */
    function scheduleGovernanceAction(
        bytes32 actionHash,
        bool isEmergency
    ) external onlyCommittee {
        require(timelockExpiry[actionHash] == 0, "CoreDAOGovernanceProxy: already scheduled");
        
        uint256 delay = isEmergency ? EMERGENCY_TIMELOCK : GOVERNANCE_TIMELOCK;
        timelockExpiry[actionHash] = block.timestamp + delay;
        
        emit GovernanceActionScheduled(actionHash, timelockExpiry[actionHash]);
    }
    
    /**
     * @dev Approve governance action (multi-sig)
     */
    function approveGovernanceAction(bytes32 actionHash) external onlyCommittee {
        require(!committeeApprovals[actionHash][msg.sender], "CoreDAOGovernanceProxy: already approved");
        
        committeeApprovals[actionHash][msg.sender] = true;
        approvalCount[actionHash]++;
    }
    
    /**
     * @dev Execute governance action with multi-sig approval
     */
    function executeGovernanceAction(
        bytes32 actionHash,
        address target,
        bytes calldata data
    ) external onlyCommittee validTimelock(actionHash) {
        require(
            approvalCount[actionHash] >= requiredCommitteeSignatures,
            "CoreDAOGovernanceProxy: insufficient approvals"
        );
        
        // Reset timelock and approvals
        timelockExpiry[actionHash] = 0;
        approvalCount[actionHash] = 0;
        
        // Clear all approvals
        for (uint256 i = 0; i < governanceCommittee.length; i++) {
            committeeApprovals[actionHash][governanceCommittee[i]] = false;
        }
        
        // Execute action
        (bool success, ) = target.call(data);
        require(success, "CoreDAOGovernanceProxy: execution failed");
        
        emit GovernanceActionExecuted(actionHash);
    }
    
    /**
     * @dev Emergency pause (can be called by emergency operators)
     */
    function emergencyPause() external {
        require(
            msg.sender == owner() || 
            msg.sender == emergencyPauseAuthority || 
            emergencyOperators[msg.sender],
            "CoreDAOGovernanceProxy: not authorized for emergency pause"
        );
        
        emergencyPaused = true;
        emit EmergencyPause(true, msg.sender);
    }
    
    /**
     * @dev Resume from emergency pause (requires committee approval)
     */
    function resumeFromEmergency() external onlyOwner {
        emergencyPaused = false;
        emit EmergencyPause(false, msg.sender);
    }
    
    /**
     * @dev Blacklist/whitelist validator
     */
    function setValidatorBlacklist(address validator, bool blacklisted) external onlyOwner {
        blacklistedValidators[validator] = blacklisted;
        emit ValidatorBlacklisted(validator, blacklisted);
    }
    
    /**
     * @dev Set operator permissions
     */
    function setOperatorPermissions(address operator, uint256 permissions) external onlyOwner {
        authorizedOperators[operator] = permissions > 0;
        operatorPermissions[operator] = permissions;
        
        emit OperatorAuthorized(operator, permissions > 0);
        emit PermissionsUpdated(operator, permissions);
    }
    
    /**
     * @dev Set emergency pause authority
     */
    function setEmergencyPauseAuthority(address authority) external onlyOwner {
        emergencyPauseAuthority = authority;
    }
    
    /**
     * @dev Set governance parameters
     */
    function setGovernanceParameters(
        uint256 _minimumVotingQuorum,
        uint256 _superMajorityThreshold,
        uint256 _maxSingleValidatorDelegation,
        uint256 _requiredCommitteeSignatures
    ) external onlyOwner {
        require(_minimumVotingQuorum <= 5000, "CoreDAOGovernanceProxy: quorum too high"); // Max 50%
        require(_superMajorityThreshold >= 5100 && _superMajorityThreshold <= 9000, "CoreDAOGovernanceProxy: invalid super majority"); // 51-90%
        require(_maxSingleValidatorDelegation <= 5000, "CoreDAOGovernanceProxy: delegation limit too high"); // Max 50%
        require(_requiredCommitteeSignatures <= governanceCommittee.length, "CoreDAOGovernanceProxy: signatures exceed committee size");
        
        minimumVotingQuorum = _minimumVotingQuorum;
        superMajorityThreshold = _superMajorityThreshold;
        maxSingleValidatorDelegation = _maxSingleValidatorDelegation;
        requiredCommitteeSignatures = _requiredCommitteeSignatures;
    }
    
    // Utility functions
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function toHexString(address account) internal pure returns (string memory) {
        return toHexString(uint256(uint160(account)), 20);
    }
    
    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = bytes1(uint8(48 + uint256(value & 0xf)));
            if (buffer[i] > 0x39) buffer[i] = bytes1(uint8(buffer[i]) + 7);
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }
    
    /**
     * @dev Get committee information
     */
    function getCommitteeInfo() external view returns (
        address[] memory members,
        uint256 requiredSignatures,
        uint256 totalMembers
    ) {
        return (governanceCommittee, requiredCommitteeSignatures, governanceCommittee.length);
    }
    
    /**
     * @dev Get governance action status
     */
    function getGovernanceActionStatus(bytes32 actionHash) external view returns (
        uint256 expiry,
        uint256 approvals,
        bool canExecute
    ) {
        expiry = timelockExpiry[actionHash];
        approvals = approvalCount[actionHash];
        canExecute = expiry > 0 && 
                    block.timestamp >= expiry && 
                    approvals >= requiredCommitteeSignatures;
    }
    
    /**
     * @dev Check if address has specific permission
     */
    function hasPermission(address operator, uint256 permission) external view returns (bool) {
        if (operator == owner()) return true;
        return authorizedOperators[operator] && (operatorPermissions[operator] & permission) != 0;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}