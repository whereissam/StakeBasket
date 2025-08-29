import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect } from 'react'
import { Vote, Clock, CheckCircle, XCircle, Timer, Users, TrendingUp } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { useNetworkStore } from '../store/useNetworkStore'
import { NetworkIndicator } from './NetworkIndicator'
import { useGovernanceTransactions } from '../hooks/useGovernanceTransactions'
import { useWalletLogger } from '../hooks/useWalletLogger'

interface Proposal {
  id: number
  title: string
  description: string
  proposer: string
  proposalType: number
  startTime: number
  endTime: number
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  executed: boolean
  state: number
}

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

export function GovernanceInterface() {
  const { address } = useAccount()
  const { networkStatus, getCurrentContracts } = useNetworkStore()
  
  // Enhanced wallet logging
  const {
    logTransactionStart,
    logTransactionSuccess,
    logTransactionError,
    logContractCall,
    logWalletError
  } = useWalletLogger()
  
  // Use unified governance transaction system
  const {
    createGovernanceProposal,
    castGovernanceVote,
    isCreatingProposal,
    isVoting
  } = useGovernanceTransactions()
  
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [votingPower, setVotingPower] = useState('0')
  const [showCreateProposal, setShowCreateProposal] = useState(false)
  
  // Create proposal form state
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    proposalType: 0,
    target: '',
    callData: '',
    value: '0'
  })

  const proposalTypeNames = [
    'Parameter Change',
    'Strategy Addition', 
    'Strategy Removal',
    'Fee Adjustment',
    'Treasury Allocation',
    'Contract Upgrade',
    'CoreDAO Validator Delegation',
    'CoreDAO Hash Power Delegation',
    'CoreDAO Governance Vote'
  ]

  const getProposalStateText = (state: number) => {
    const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed']
    return stateNames[state] || 'Unknown'
  }

  const getProposalStateColor = (state: number) => {
    switch (state) {
      case ProposalState.Active: return 'text-primary bg-primary/10'
      case ProposalState.Succeeded: return 'text-chart-2 bg-chart-2/10'
      case ProposalState.Queued: return 'text-chart-4 bg-chart-4/10'
      case ProposalState.Executed: return 'text-accent bg-accent/10'
      case ProposalState.Defeated: return 'text-destructive bg-destructive/10'
      case ProposalState.Canceled: return 'text-muted-foreground bg-muted'
      default: return 'text-muted-foreground bg-muted'
    }
  }

  const handleVote = async (proposalId: number, support: number) => {
    if (!address) {
      logWalletError('Wallet Not Connected', {
        action: 'vote',
        proposalId,
        support
      })
      return
    }
    
    const voteTypes = ['Against', 'For', 'Abstain']
    const voteType = voteTypes[support] || 'Unknown'
    
    logTransactionStart('Governance Vote', {
      proposalId,
      voteType,
      support,
      address,
      votingPower
    })
    
    try {
      logContractCall('BasketGovernance', 'castVote', {
        proposalId,
        support,
        voteType
      })
      
      await castGovernanceVote(proposalId, support)
      
      logTransactionSuccess('Governance Vote Success', '')
      
      // Refresh proposals after voting if successful
      // Note: Success handling is done in the hook with toast notifications
    } catch (error) {
      logTransactionError('Governance Vote', error, {
        proposalId,
        voteType,
        support,
        votingPower
      })
    }
  }

  const handleCreateProposal = async () => {
    if (!address) {
      logWalletError('Wallet Not Connected', {
        action: 'createProposal',
        proposal: newProposal
      })
      return
    }
    
    logTransactionStart('Create Governance Proposal', {
      title: newProposal.title,
      description: newProposal.description,
      proposalType: newProposal.proposalType,
      proposalTypeName: proposalTypeNames[newProposal.proposalType],
      address,
      votingPower
    })
    
    try {
      // Create arrays for the proposal parameters
      const targets = newProposal.target ? [newProposal.target] : []
      const values = newProposal.value ? [newProposal.value] : ['0']
      const calldatas = newProposal.callData ? [newProposal.callData] : ['0x']
      
      logContractCall('BasketGovernance', 'createProposal', {
        title: newProposal.title,
        proposalType: proposalTypeNames[newProposal.proposalType],
        targets,
        values,
        calldatas
      })
      
      await createGovernanceProposal(
        newProposal.title,
        newProposal.description,
        targets,
        values,
        calldatas
      )
      
      logTransactionSuccess('Governance Proposal Created', '')
      
      // Reset form and hide modal on success
      // Note: Success handling is done in the hook
      setNewProposal({
        title: '',
        description: '',
        proposalType: 0,
        target: '',
        callData: '',
        value: '0'
      })
      setShowCreateProposal(false)
      
    } catch (error) {
      logTransactionError('Create Governance Proposal', error, {
        title: newProposal.title,
        proposalType: proposalTypeNames[newProposal.proposalType],
        votingPower
      })
    }
  }

  const calculateVotePercentages = (proposal: Proposal) => {
    const totalVotes = Number(proposal.forVotes + proposal.againstVotes + proposal.abstainVotes)
    if (totalVotes === 0) return { for: 0, against: 0, abstain: 0 }
    
    return {
      for: (Number(proposal.forVotes) / totalVotes) * 100,
      against: (Number(proposal.againstVotes) / totalVotes) * 100,
      abstain: (Number(proposal.abstainVotes) / totalVotes) * 100
    }
  }

  const formatNumber = (value: bigint) => {
    return (Number(value) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  // Get current network contracts
  const contracts = getCurrentContracts()
  const GOVERNANCE_CONTRACT_ADDRESS = contracts.governance
  
  // Governance contract ABI (simplified)
  const governanceABI = [
    {
      name: 'proposalCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }]
    },
    {
      name: 'proposals',
      type: 'function', 
      stateMutability: 'view',
      inputs: [{ type: 'uint256' }],
      outputs: [
        { type: 'uint256' },
        { type: 'address' },
        { type: 'string' },
        { type: 'string' },
        { type: 'uint8' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bool' },
        { type: 'uint8' }
      ]
    },
    {
      name: 'getVotes',
      type: 'function',
      stateMutability: 'view', 
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }]
    }
  ] as const
  
  // Read proposal count from contract
  const { data: proposalCount } = useReadContract({
    address: GOVERNANCE_CONTRACT_ADDRESS as `0x${string}`,
    abi: governanceABI,
    functionName: 'proposalCount',
    query: {
      enabled: !!GOVERNANCE_CONTRACT_ADDRESS && networkStatus !== 'unknown'
    }
  })
  
  // Read user voting power
  const { data: userVotes } = useReadContract({
    address: GOVERNANCE_CONTRACT_ADDRESS as `0x${string}`,
    abi: governanceABI,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!GOVERNANCE_CONTRACT_ADDRESS && networkStatus !== 'unknown'
    }
  })
  
  // Load proposals from contract
  useEffect(() => {
    const loadProposals = async () => {
      if (!GOVERNANCE_CONTRACT_ADDRESS) {
        // No contract deployed - show empty state
        setProposals([])
        setVotingPower("0")
        return
      }
      
      if (!proposalCount) {
        // Contract deployed but no proposals yet - show mock data for demo
        const mockProposals: Proposal[] = [
          {
            id: 1,
            title: "Increase Management Fee to 0.75%",
            description: "Proposal to increase the management fee from 0.5% to 0.75% to fund additional development and security audits.",
            proposer: "0x1234...5678",
            proposalType: ProposalType.FeeAdjustment,
            startTime: Date.now() - 86400000, // 1 day ago
            endTime: Date.now() + 172800000, // 2 days from now
            forVotes: BigInt("125000000000000000000000"), // 125,000 tokens
            againstVotes: BigInt("75000000000000000000000"),  // 75,000 tokens
            abstainVotes: BigInt("25000000000000000000000"),   // 25,000 tokens
            executed: false,
            state: ProposalState.Active
          },
          {
            id: 2,
            title: "Add Liquid Staking Derivative Strategy",
            description: "Proposal to add support for additional liquid staking derivatives to diversify yield sources.",
            proposer: "0x9876...4321",
            proposalType: ProposalType.StrategyAddition,
            startTime: Date.now() - 259200000, // 3 days ago
            endTime: Date.now() - 86400000, // 1 day ago (ended)
            forVotes: BigInt("200000000000000000000000"), // 200,000 tokens
            againstVotes: BigInt("50000000000000000000000"),  // 50,000 tokens
            abstainVotes: BigInt("10000000000000000000000"),   // 10,000 tokens
            executed: false,
            state: ProposalState.Succeeded
          }
        ]
        setProposals(mockProposals)
        setVotingPower("10000") // Mock voting power
        return
      }
      
      // Load real proposals from deployed contract
      try {
        const loadedProposals: Proposal[] = []
        const count = Number(proposalCount)
        
        for (let i = 1; i <= count; i++) {
          // Note: You'll need to implement contract.proposals(i) call
          // This is a simplified example - you'd use wagmi's useContractRead
          // or ethers to fetch each proposal
          const proposalData = await fetchProposalFromContract(i)
          if (proposalData) {
            loadedProposals.push(proposalData)
          }
        }
        
        setProposals(loadedProposals)
      } catch (error) {
        console.error('Failed to load proposals:', error)
        // Fallback to mock data on error
        setProposals([])
      }
    }
    
    loadProposals()
  }, [proposalCount, GOVERNANCE_CONTRACT_ADDRESS])
  
  // Update voting power when user votes change
  useEffect(() => {
    if (userVotes) {
      setVotingPower(formatEther(userVotes))
    }
  }, [userVotes])
  
  // Helper function to fetch individual proposal (you'd implement this with wagmi)
  const fetchProposalFromContract = async (proposalId: number): Promise<Proposal | null> => {
    try {
      // This would be implemented using wagmi's useContractRead or ethers
      // const proposalData = await contract.proposals(proposalId)
      // return formatProposalData(proposalData)
      return null // Placeholder
    } catch (error) {
      console.error(`Failed to fetch proposal ${proposalId}:`, error)
      return null
    }
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Governance
          </CardTitle>
          <CardDescription>
            Connect your wallet to participate in governance
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Network Status Indicator */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Governance</h1>
        <NetworkIndicator 
          contractType="governance" 
          showContractStatus={true}
        />
      </div>

      {/* Governance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Your Voting Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(votingPower).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">BASKET tokens</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {proposals.filter(p => p.state === ProposalState.Active).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently voting</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposals.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Proposal Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Proposals</h2>
        <Button 
          onClick={() => setShowCreateProposal(true)}
          disabled={Number(votingPower) < 1000}
        >
          Create Proposal
        </Button>
      </div>

      {/* Create Proposal Modal */}
      {showCreateProposal && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Proposal</CardTitle>
            <CardDescription>
              Submit a new governance proposal for community voting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newProposal.title}
                onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                placeholder="Proposal title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
                value={newProposal.description}
                onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                placeholder="Detailed description of the proposal"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Proposal Type</label>
              <select
                className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={newProposal.proposalType}
                onChange={(e) => setNewProposal({...newProposal, proposalType: Number(e.target.value)})}
              >
                {proposalTypeNames.map((name, index) => (
                  <option key={index} value={index}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateProposal}
                disabled={isCreatingProposal || !newProposal.title || !newProposal.description}
              >
                {isCreatingProposal ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Proposal'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateProposal(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposals List */}
      <div className="space-y-4">
        {!GOVERNANCE_CONTRACT_ADDRESS ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Vote className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Governance Contract</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Governance contracts are not deployed on this network yet. 
                Switch to a network with deployed contracts to participate in governance.
              </p>
            </CardContent>
          </Card>
        ) : proposals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Vote className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Proposals Yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                No governance proposals have been created yet. 
                Be the first to propose changes to the protocol!
              </p>
            </CardContent>
          </Card>
        ) : (
          proposals.map((proposal) => {
            const percentages = calculateVotePercentages(proposal)
            const isActive = proposal.state === ProposalState.Active
            const timeLeft = isActive ? Math.max(0, proposal.endTime - Date.now()) : 0
            const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
          const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          
          return (
            <Card key={proposal.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{proposal.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {proposalTypeNames[proposal.proposalType]} • Proposed by {proposal.proposer}
                      {(proposal.proposalType === ProposalType.CoreDAOGovernanceVote || 
                        proposal.proposalType === ProposalType.CoreDAOValidatorDelegation || 
                        proposal.proposalType === ProposalType.CoreDAOHashPowerDelegation) && 
                        <span className="ml-2 px-1.5 py-0.5 bg-chart-1/10 text-chart-1 text-xs rounded-full font-medium">
                          CoreDAO
                        </span>
                      }
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getProposalStateColor(proposal.state)}`}>
                    {getProposalStateText(proposal.state)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{proposal.description}</p>
                
                {/* Voting Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>For: {formatNumber(proposal.forVotes)} ({percentages.for.toFixed(1)}%)</span>
                    <span>Against: {formatNumber(proposal.againstVotes)} ({percentages.against.toFixed(1)}%)</span>
                    <span>Abstain: {formatNumber(proposal.abstainVotes)} ({percentages.abstain.toFixed(1)}%)</span>
                  </div>
                  
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div 
                      className="bg-chart-2"
                      style={{ width: `${percentages.for}%` }}
                    />
                    <div 
                      className="bg-destructive"
                      style={{ width: `${percentages.against}%` }}
                    />
                    <div 
                      className="bg-muted-foreground"
                      style={{ width: `${percentages.abstain}%` }}
                    />
                  </div>
                </div>
                
                {/* Time Left */}
                {isActive && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`}
                  </div>
                )}
                
                {/* CoreDAO Proposal Info */}
                {(proposal.proposalType === ProposalType.CoreDAOGovernanceVote || 
                  proposal.proposalType === ProposalType.CoreDAOValidatorDelegation || 
                  proposal.proposalType === ProposalType.CoreDAOHashPowerDelegation) && (
                  <div className="bg-chart-1/5 border border-chart-1/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-chart-1 font-medium mb-1">
                      <span className="w-2 h-2 bg-chart-1 rounded-full"></span>
                      CoreDAO Network Proposal
                    </div>
                    <p className="text-xs text-chart-1/80">
                      This proposal affects CoreDAO network governance. Your BASKET token vote will be aggregated 
                      and cast on behalf of the community on CoreDAO's governance platform.
                    </p>
                  </div>
                )}

                {/* Voting Buttons */}
                {isActive && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleVote(proposal.id, 1)}
                      disabled={isVoting}
                      className="bg-chart-2 text-primary-foreground hover:bg-chart-2/80"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Vote For
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleVote(proposal.id, 0)}
                      disabled={isVoting}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Vote Against
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleVote(proposal.id, 2)}
                      disabled={isVoting}
                      variant="outline"
                    >
                      Abstain
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
        )}
      </div>
    </div>
  )
}