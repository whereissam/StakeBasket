// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BasketGovernance.sol";
import "./MockCoreStaking.sol";

/**
 * @title CoreDAOGovernanceProxy
 * @dev Proxy contract that enables BASKET token holders to participate in CoreDAO governance
 * Aggregates BASKET holder preferences and executes them on CoreDAO network
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
    
    // Authorized operators for off-chain execution
    mapping(address => bool) public authorizedOperators;
    
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
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedOperators[msg.sender],
            "CoreDAOGovernanceProxy: not authorized"
        );
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
    ) external onlyAuthorized returns (uint256) {
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
    function executeCoreDAOVote(uint256 proxyProposalId) external {
        require(msg.sender == address(basketGovernance), "CoreDAOGovernanceProxy: only basket governance");
        require(proxyProposalId <= coreDAOProposalCount, "CoreDAOGovernanceProxy: invalid proposal id");
        
        CoreDAOProposal storage proposal = coreDAOProposals[proxyProposalId];
        require(!proposal.executed, "CoreDAOGovernanceProxy: already executed");
        
        // Get voting results from BasketGovernance
        (, , uint256 forVotes, uint256 againstVotes, uint256 abstainVotes,) = 
            basketGovernance.getProposalVoting(proposal.basketProposalId);
        
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
    ) external onlyAuthorized returns (uint256) {
        require(validator != address(0), "CoreDAOGovernanceProxy: invalid validator");
        require(amount > 0, "CoreDAOGovernanceProxy: invalid amount");
        
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
    function executeValidatorDelegation(uint256 delegationId) external nonReentrant {
        require(msg.sender == address(basketGovernance), "CoreDAOGovernanceProxy: only basket governance");
        require(delegationId <= validatorDelegationCount, "CoreDAOGovernanceProxy: invalid delegation id");
        
        ValidatorDelegation storage delegation = validatorDelegations[delegationId];
        require(!delegation.executed, "CoreDAOGovernanceProxy: already executed");
        
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
    ) external onlyAuthorized returns (uint256) {
        require(validator != address(0), "CoreDAOGovernanceProxy: invalid validator");
        require(hashPower > 0, "CoreDAOGovernanceProxy: invalid hash power");
        
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
     * @dev Authorize/deauthorize operator for off-chain execution
     * @param operator Address of the operator
     * @param authorized Whether to authorize or deauthorize
     */
    function setOperatorAuthorization(address operator, bool authorized) external onlyOwner {
        authorizedOperators[operator] = authorized;
        emit OperatorAuthorized(operator, authorized);
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
    
    // Allow contract to receive ETH
    receive() external payable {}
}