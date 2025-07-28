import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect } from 'react'
import { Vote, Clock, CheckCircle, XCircle, Timer, Users, TrendingUp } from 'lucide-react'
import { useAccount } from 'wagmi'

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
  ContractUpgrade
}

export function GovernanceInterface() {
  const { address } = useAccount()
  
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [votingPower, setVotingPower] = useState('0')
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null)
  const [isVoting, setIsVoting] = useState(false)
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
    'Contract Upgrade'
  ]

  const getProposalStateText = (state: number) => {
    const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed']
    return stateNames[state] || 'Unknown'
  }

  const getProposalStateColor = (state: number) => {
    switch (state) {
      case ProposalState.Active: return 'text-blue-600 bg-blue-100'
      case ProposalState.Succeeded: return 'text-green-600 bg-green-100'
      case ProposalState.Queued: return 'text-yellow-600 bg-yellow-100'
      case ProposalState.Executed: return 'text-purple-600 bg-purple-100'
      case ProposalState.Defeated: return 'text-red-600 bg-red-100'
      case ProposalState.Canceled: return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleVote = async (proposalId: number, support: number) => {
    if (!address) return
    
    setIsVoting(true)
    try {
      // TODO: Integrate with wagmi/viem to call governance contract
      console.log(`Voting ${support} on proposal ${proposalId}`)
      
      // Simulate vote transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh proposals after voting
      // await loadProposals()
    } catch (error) {
      console.error('Voting failed:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const handleCreateProposal = async () => {
    if (!address) return
    
    try {
      // TODO: Integrate with wagmi/viem to call governance contract
      console.log('Creating proposal:', newProposal)
      
      // Simulate proposal creation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Reset form and hide modal
      setNewProposal({
        title: '',
        description: '',
        proposalType: 0,
        target: '',
        callData: '',
        value: '0'
      })
      setShowCreateProposal(false)
      
      // Refresh proposals
      // await loadProposals()
    } catch (error) {
      console.error('Proposal creation failed:', error)
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

  // Mock data for demonstration
  useEffect(() => {
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
  }, [])

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
                className="w-full p-2 border rounded-md"
                rows={4}
                value={newProposal.description}
                onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                placeholder="Detailed description of the proposal"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Proposal Type</label>
              <select
                className="w-full p-2 border rounded-md"
                value={newProposal.proposalType}
                onChange={(e) => setNewProposal({...newProposal, proposalType: Number(e.target.value)})}
              >
                {proposalTypeNames.map((name, index) => (
                  <option key={index} value={index}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleCreateProposal}>
                Create Proposal
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
        {proposals.map((proposal) => {
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
                  
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                    <div 
                      className="bg-green-500"
                      style={{ width: `${percentages.for}%` }}
                    />
                    <div 
                      className="bg-red-500"
                      style={{ width: `${percentages.against}%` }}
                    />
                    <div 
                      className="bg-gray-400"
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
                
                {/* Voting Buttons */}
                {isActive && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleVote(proposal.id, 1)}
                      disabled={isVoting}
                      className="bg-green-600 hover:bg-green-700"
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
        })}
      </div>
    </div>
  )
}