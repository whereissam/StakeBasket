// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/StakeBasketToken.sol";

interface IBasketStaking {
    function getVotingMultiplier(address user) external view returns (uint256);
    function getUserStakeInfo(address user) external view returns (uint256, uint256, uint256, Tier);
    function getFeeReduction(address user) external view returns (uint256);
    
    enum Tier {
        None,
        Bronze,
        Silver,
        Gold,
        Platinum
    }
}

/**
 * @title BasketGovernance
 * @dev Decentralized governance system for BASKET token holders
 * Allows proposal submission, voting, and execution of protocol changes
 */
contract BasketGovernance is ReentrancyGuard, Ownable {
    StakeBasketToken public immutable basketToken;
    IBasketStaking public basketStaking;
    
    // Governance parameters
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant EXECUTION_DELAY = 1 days;
    uint256 public proposalThreshold = 100e18; // 100 BASKET tokens required to propose
    uint256 public quorumPercentage = 10; // 10% of total supply needed for quorum
    uint256 public majorityPercentage = 51; // 51% majority required
    
    // Proposal counter
    uint256 public proposalCount;
    
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    enum ProposalType {
        ParameterChange,
        StrategyAddition,
        StrategyRemoval,
        FeeAdjustment,
        TreasuryAllocation,
        ContractUpgrade,
        CoreDAOValidatorDelegation,
        CoreDAOHashPowerDelegation,
        CoreDAOGovernanceVote
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        ProposalType proposalType;
        address target;
        bytes callData;
        uint256 value;
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        mapping(address => bool) hasVoted;
        mapping(address => uint8) votes; // 0 = against, 1 = for, 2 = abstain
    }
    
    // Storage
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    mapping(address => uint256) public delegatedVotes;
    mapping(address => address) public delegates;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string description,
        ProposalType proposalType,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight
    );
    
    event ProposalQueued(uint256 indexed proposalId, uint256 executionTime);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    
    constructor(
        address _basketToken,
        address _basketStaking,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_basketToken != address(0), "BasketGovernance: invalid token address");
        basketToken = StakeBasketToken(_basketToken);
        if (_basketStaking != address(0)) {
            basketStaking = IBasketStaking(_basketStaking);
        }
    }
    
    /**
     * @dev Submit a new governance proposal
     * @param title Title of the proposal
     * @param description Detailed description of the proposal
     * @param proposalType Type of proposal
     * @param target Target contract address (if applicable)
     * @param callData Call data for execution (if applicable)
     * @param value ETH value to send (if applicable)
     */
    function propose(
        string memory title,
        string memory description,
        ProposalType proposalType,
        address target,
        bytes memory callData,
        uint256 value
    ) external returns (uint256) {
        require(
            getVotingPower(msg.sender) >= proposalThreshold,
            "BasketGovernance: insufficient tokens to propose"
        );
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.proposalType = proposalType;
        newProposal.target = target;
        newProposal.callData = callData;
        newProposal.value = value;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + VOTING_PERIOD;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            description,
            proposalType,
            newProposal.startTime,
            newProposal.endTime
        );
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     * @param proposalId ID of the proposal
     * @param support Vote direction (0=against, 1=for, 2=abstain)
     */
    function castVote(uint256 proposalId, uint8 support) external {
        require(support <= 2, "BasketGovernance: invalid vote type");
        return _castVote(proposalId, msg.sender, support);
    }
    
    /**
     * @dev Internal function to cast a vote
     */
    function _castVote(uint256 proposalId, address voter, uint8 support) internal {
        require(state(proposalId) == ProposalState.Active, "BasketGovernance: voting is closed");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[voter], "BasketGovernance: voter already voted");
        
        uint256 weight = getVotingPower(voter);
        require(weight > 0, "BasketGovernance: no voting power");
        
        proposal.hasVoted[voter] = true;
        proposal.votes[voter] = support;
        
        if (support == 0) {
            proposal.againstVotes += weight;
        } else if (support == 1) {
            proposal.forVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }
        
        emit VoteCast(voter, proposalId, support, weight);
    }
    
    /**
     * @dev Queue a successful proposal for execution
     * @param proposalId ID of the proposal to queue
     */
    function queue(uint256 proposalId) external {
        require(state(proposalId) == ProposalState.Succeeded, "BasketGovernance: proposal not succeeded");
        
        Proposal storage proposal = proposals[proposalId];
        proposal.executionTime = block.timestamp + EXECUTION_DELAY;
        
        emit ProposalQueued(proposalId, proposal.executionTime);
    }
    
    /**
     * @dev Execute a queued proposal
     * @param proposalId ID of the proposal to execute
     */
    function execute(uint256 proposalId) external payable nonReentrant {
        require(state(proposalId) == ProposalState.Queued, "BasketGovernance: proposal not queued");
        
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.executionTime, "BasketGovernance: execution delay not met");
        
        proposal.executed = true;
        
        if (proposal.target != address(0) && proposal.callData.length > 0) {
            (bool success, ) = proposal.target.call{value: proposal.value}(proposal.callData);
            require(success, "BasketGovernance: execution failed");
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal (only by proposer or owner)
     * @param proposalId ID of the proposal to cancel
     */
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "BasketGovernance: unauthorized"
        );
        require(state(proposalId) != ProposalState.Executed, "BasketGovernance: cannot cancel executed proposal");
        
        // Mark as canceled by setting end time to past
        proposal.endTime = block.timestamp - 1;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Get the current state of a proposal
     * @param proposalId ID of the proposal
     * @return Current state of the proposal
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        require(proposalId > 0 && proposalId <= proposalCount, "BasketGovernance: invalid proposal id");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        
        if (proposal.endTime < block.timestamp) {
            // Voting ended, check if canceled
            if (proposal.endTime == block.timestamp - 1) {
                return ProposalState.Canceled;
            }
            
            // Check if proposal succeeded
            uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
            uint256 quorum = (basketToken.totalSupply() * quorumPercentage) / 100;
            
            if (totalVotes < quorum) {
                return ProposalState.Defeated;
            }
            
            if (proposal.forVotes * 100 > (proposal.forVotes + proposal.againstVotes) * majorityPercentage) {
                if (proposal.executionTime > 0) {
                    if (block.timestamp > proposal.executionTime + 7 days) {
                        return ProposalState.Expired;
                    }
                    return ProposalState.Queued;
                }
                return ProposalState.Succeeded;
            } else {
                return ProposalState.Defeated;
            }
        }
        
        if (block.timestamp >= proposal.startTime) {
            return ProposalState.Active;
        }
        
        return ProposalState.Pending;
    }
    
    /**
     * @dev Get voting power of an address (including delegated votes and staking multiplier)
     * @param account Address to check voting power for
     * @return Voting power amount
     */
    function getVotingPower(address account) public view returns (uint256) {
        uint256 baseVotingPower = basketToken.balanceOf(account) + delegatedVotes[account];
        
        // Apply staking multiplier if BasketStaking is set
        if (address(basketStaking) != address(0)) {
            uint256 multiplier = basketStaking.getVotingMultiplier(account);
            return (baseVotingPower * multiplier) / 10000;
        }
        
        return baseVotingPower;
    }
    
    /**
     * @dev Delegate voting power to another address
     * @param delegatee Address to delegate votes to
     */
    function delegate(address delegatee) external {
        address currentDelegate = delegates[msg.sender];
        
        if (currentDelegate != address(0)) {
            delegatedVotes[currentDelegate] -= basketToken.balanceOf(msg.sender);
        }
        
        delegates[msg.sender] = delegatee;
        
        if (delegatee != address(0)) {
            delegatedVotes[delegatee] += basketToken.balanceOf(msg.sender);
        }
        
        emit DelegateChanged(msg.sender, currentDelegate, delegatee);
    }
    
    /**
     * @dev Get proposal basic details
     * @param proposalId ID of the proposal
     * @return id Proposal ID
     * @return proposer Address of proposer
     * @return title Proposal title
     * @return description Proposal description
     * @return proposalType Type of proposal
     */
    function getProposalDetails(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory description,
        ProposalType proposalType
    ) {
        require(proposalId > 0 && proposalId <= proposalCount, "BasketGovernance: invalid proposal id");
        
        Proposal storage p = proposals[proposalId];
        
        return (
            p.id,
            p.proposer,
            p.title,
            p.description,
            p.proposalType
        );
    }
    
    /**
     * @dev Get proposal voting data
     * @param proposalId ID of the proposal
     * @return startTime Voting start time
     * @return endTime Voting end time
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return abstainVotes Abstain votes
     * @return executed Whether proposal was executed
     */
    function getProposalVoting(uint256 proposalId) external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed
    ) {
        require(proposalId > 0 && proposalId <= proposalCount, "BasketGovernance: invalid proposal id");
        
        Proposal storage p = proposals[proposalId];
        
        return (
            p.startTime,
            p.endTime,
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            p.executed
        );
    }
    
    /**
     * @dev Check if an address has voted on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address to check
     * @return hasVoted Whether the voter has voted
     * @return vote The vote cast (0=against, 1=for, 2=abstain)
     */
    function getVote(uint256 proposalId, address voter) external view returns (bool hasVoted, uint8 vote) {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.hasVoted[voter], proposal.votes[voter]);
    }
    
    // Admin functions
    
    /**
     * @dev Set proposal threshold
     * @param _threshold New proposal threshold
     */
    function setProposalThreshold(uint256 _threshold) external onlyOwner {
        proposalThreshold = _threshold;
    }
    
    /**
     * @dev Set quorum percentage
     * @param _percentage New quorum percentage (1-100)
     */
    function setQuorumPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage > 0 && _percentage <= 100, "BasketGovernance: invalid percentage");
        quorumPercentage = _percentage;
    }
    
    /**
     * @dev Set majority percentage
     * @param _percentage New majority percentage (51-100)
     */
    function setMajorityPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage >= 51 && _percentage <= 100, "BasketGovernance: invalid percentage");
        majorityPercentage = _percentage;
    }
    
    /**
     * @dev Set BasketStaking contract address
     * @param _basketStaking New BasketStaking contract address
     */
    function setBasketStaking(address _basketStaking) external onlyOwner {
        basketStaking = IBasketStaking(_basketStaking);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}