import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect } from 'react'
import { Vote, Clock, CheckCircle, XCircle, Timer, Users, TrendingUp, AlertTriangle, Shield, Zap } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { useNetworkStore } from '../store/useNetworkStore'
import { NetworkIndicator } from './NetworkIndicator'

interface CoreDAOProposal {
  id: number
  title: string
  description: string
  snapshotId: string
  basketProposalId: number
  startTime: number
  endTime: number
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  executed: boolean
}

interface ValidatorDelegation {
  id: number
  validator: string
  amount: bigint
  basketProposalId: number
  executed: boolean
}

interface HashPowerDelegation {
  id: number
  validator: string
  hashPower: bigint
  basketProposalId: number
  executed: boolean
}

enum GovernanceType {
  CoreDAOProposal = 'coredao',
  ValidatorDelegation = 'validator',
  HashPowerDelegation = 'hashpower'
}

export function CoreDAOGovernanceInterface() {
  const { address } = useAccount()
  const { networkStatus, getCurrentContracts } = useNetworkStore()
  
  const [activeTab, setActiveTab] = useState<GovernanceType>(GovernanceType.CoreDAOProposal)
  const [coreDAOProposals, setCoreDAOProposals] = useState<CoreDAOProposal[]>([])
  const [validatorDelegations, setValidatorDelegations] = useState<ValidatorDelegation[]>([])
  const [hashPowerDelegations, setHashPowerDelegations] = useState<HashPowerDelegation[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentValidator, setCurrentValidator] = useState<string>('')
  const [totalDelegated, setTotalDelegated] = useState<string>('0')
  const [emergencyPaused, setEmergencyPaused] = useState(false)

  // Create form states
  const [newCoreDAOProposal, setNewCoreDAOProposal] = useState({
    title: '',
    description: '',
    snapshotId: ''
  })
  
  const [newValidatorDelegation, setNewValidatorDelegation] = useState({
    validator: '',
    amount: ''
  })
  
  const [newHashPowerDelegation, setNewHashPowerDelegation] = useState({
    validator: '',
    hashPower: ''
  })

  // Get current network contracts
  const contracts = getCurrentContracts()
  const GOVERNANCE_PROXY_ADDRESS = contracts.governanceProxy
  
  // CoreDAO Governance Proxy ABI
  const governanceProxyABI = [
    {
      name: 'coreDAOProposalCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }]
    },
    {
      name: 'validatorDelegationCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }]
    },
    {
      name: 'hashPowerDelegationCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }]
    },
    {
      name: 'currentValidator',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'address' }]
    },
    {
      name: 'totalDelegatedAmount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }]
    },
    {
      name: 'emergencyPaused',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'bool' }]
    },
    {
      name: 'getCoreDAOProposal',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'uint256' }],
      outputs: [
        { type: 'uint256' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bool' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' }
      ]
    },
    {
      name: 'getValidatorDelegation',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'uint256' }],
      outputs: [
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bool' }
      ]
    },
    {
      name: 'getHashPowerDelegation',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'uint256' }],
      outputs: [
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bool' }
      ]
    },
    {
      name: 'createCoreDAOProposal',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { type: 'string', name: 'title' },
        { type: 'string', name: 'description' },
        { type: 'string', name: 'snapshotId' }
      ],
      outputs: [{ type: 'uint256' }]
    },
    {
      name: 'createValidatorDelegation',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { type: 'address', name: 'validator' },
        { type: 'uint256', name: 'amount' }
      ],
      outputs: [{ type: 'uint256' }]
    },
    {
      name: 'createHashPowerDelegation',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { type: 'address', name: 'validator' },
        { type: 'uint256', name: 'hashPower' }
      ],
      outputs: [{ type: 'uint256' }]
    }
  ] as const

  // Contract reads
  const { data: coreDAOProposalCount } = useReadContract({
    address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
    abi: governanceProxyABI,
    functionName: 'coreDAOProposalCount',
    query: { enabled: !!GOVERNANCE_PROXY_ADDRESS && networkStatus !== 'unknown' }
  })

  const { data: validatorDelegationCount } = useReadContract({
    address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
    abi: governanceProxyABI,
    functionName: 'validatorDelegationCount',
    query: { enabled: !!GOVERNANCE_PROXY_ADDRESS && networkStatus !== 'unknown' }
  })

  const { data: currentValidatorAddress } = useReadContract({
    address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
    abi: governanceProxyABI,
    functionName: 'currentValidator',
    query: { enabled: !!GOVERNANCE_PROXY_ADDRESS && networkStatus !== 'unknown' }
  })

  const { data: totalDelegatedAmount } = useReadContract({
    address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
    abi: governanceProxyABI,
    functionName: 'totalDelegatedAmount',
    query: { enabled: !!GOVERNANCE_PROXY_ADDRESS && networkStatus !== 'unknown' }
  })

  const { data: isEmergencyPaused } = useReadContract({
    address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
    abi: governanceProxyABI,
    functionName: 'emergencyPaused',
    query: { enabled: !!GOVERNANCE_PROXY_ADDRESS && networkStatus !== 'unknown' }
  })

  // Contract writes
  const { writeContract: writeCreateCoreDAOProposal, data: createCoreDAOHash } = useWriteContract()
  const { writeContract: writeCreateValidatorDelegation, data: createValidatorHash } = useWriteContract()
  const { writeContract: writeCreateHashPowerDelegation, data: createHashPowerHash } = useWriteContract()

  // Wait for transactions
  const { isLoading: isCreatingCoreDAO } = useWaitForTransactionReceipt({ hash: createCoreDAOHash })
  const { isLoading: isCreatingValidator } = useWaitForTransactionReceipt({ hash: createValidatorHash })
  const { isLoading: isCreatingHashPower } = useWaitForTransactionReceipt({ hash: createHashPowerHash })

  // Load data from contracts
  useEffect(() => {
    if (currentValidatorAddress) {
      setCurrentValidator(currentValidatorAddress)
    }
    if (totalDelegatedAmount) {
      setTotalDelegated(formatEther(totalDelegatedAmount))
    }
    if (isEmergencyPaused !== undefined) {
      setEmergencyPaused(isEmergencyPaused)
    }
  }, [currentValidatorAddress, totalDelegatedAmount, isEmergencyPaused])

  // Load proposals
  useEffect(() => {
    const loadData = async () => {
      if (!GOVERNANCE_PROXY_ADDRESS) return

      // Mock data for demo - in production, you'd load from the contract
      if (!coreDAOProposalCount) {
        const mockCoreDAOProposals: CoreDAOProposal[] = [
          {
            id: 1,
            title: "Increase Block Gas Limit",
            description: "Proposal to increase the block gas limit from 30M to 40M to support more complex transactions.",
            snapshotId: "QmHashExample123",
            basketProposalId: 101,
            startTime: Date.now() - 86400000,
            endTime: Date.now() + 172800000,
            forVotes: BigInt("500000000000000000000000"),
            againstVotes: BigInt("200000000000000000000000"),
            abstainVotes: BigInt("50000000000000000000000"),
            executed: false
          }
        ]
        setCoreDAOProposals(mockCoreDAOProposals)
        
        const mockValidatorDelegations: ValidatorDelegation[] = [
          {
            id: 1,
            validator: "0x1234567890123456789012345678901234567890",
            amount: BigInt("1000000000000000000000"),
            basketProposalId: 102,
            executed: false
          }
        ]
        setValidatorDelegations(mockValidatorDelegations)
      }
    }

    loadData()
  }, [coreDAOProposalCount, GOVERNANCE_PROXY_ADDRESS])

  const handleCreateCoreDAOProposal = async () => {
    if (!newCoreDAOProposal.title || !newCoreDAOProposal.description || !newCoreDAOProposal.snapshotId) return

    try {
      writeCreateCoreDAOProposal({
        address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
        abi: governanceProxyABI,
        functionName: 'createCoreDAOProposal',
        args: [
          newCoreDAOProposal.title,
          newCoreDAOProposal.description,
          newCoreDAOProposal.snapshotId
        ]
      })
      
      setNewCoreDAOProposal({ title: '', description: '', snapshotId: '' })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create CoreDAO proposal:', error)
    }
  }

  const handleCreateValidatorDelegation = async () => {
    if (!newValidatorDelegation.validator || !newValidatorDelegation.amount) return

    try {
      writeCreateValidatorDelegation({
        address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
        abi: governanceProxyABI,
        functionName: 'createValidatorDelegation',
        args: [
          newValidatorDelegation.validator as `0x${string}`,
          parseEther(newValidatorDelegation.amount)
        ]
      })
      
      setNewValidatorDelegation({ validator: '', amount: '' })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create validator delegation:', error)
    }
  }

  const handleCreateHashPowerDelegation = async () => {
    if (!newHashPowerDelegation.validator || !newHashPowerDelegation.hashPower) return

    try {
      writeCreateHashPowerDelegation({
        address: GOVERNANCE_PROXY_ADDRESS as `0x${string}`,
        abi: governanceProxyABI,
        functionName: 'createHashPowerDelegation',
        args: [
          newHashPowerDelegation.validator as `0x${string}`,
          BigInt(newHashPowerDelegation.hashPower)
        ]
      })
      
      setNewHashPowerDelegation({ validator: '', hashPower: '' })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create hash power delegation:', error)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            CoreDAO Governance
          </CardTitle>
          <CardDescription>
            Connect your wallet to participate in CoreDAO governance
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!GOVERNANCE_PROXY_ADDRESS) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Governance Proxy</h3>
          <p className="text-muted-foreground text-center max-w-md">
            CoreDAO governance proxy is not deployed on this network yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CoreDAO Governance</h1>
          <p className="text-muted-foreground">
            Participate in CoreDAO network governance through BASKET token voting
          </p>
        </div>
        <NetworkIndicator contractType="governanceProxy" showContractStatus={true} />
      </div>

      {/* Emergency Pause Warning */}
      {emergencyPaused && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="font-medium text-destructive">Emergency Pause Active</h3>
              <p className="text-sm text-destructive/80">
                Governance operations are currently paused due to an emergency. New proposals cannot be created.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Delegation Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Current Validator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {currentValidator ? formatAddress(currentValidator) : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">Delegated validator</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total Delegated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{Number(totalDelegated).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">CORE tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Governance Type Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab(GovernanceType.CoreDAOProposal)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === GovernanceType.CoreDAOProposal
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          CoreDAO Proposals
        </button>
        <button
          onClick={() => setActiveTab(GovernanceType.ValidatorDelegation)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === GovernanceType.ValidatorDelegation
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Validator Delegation
        </button>
        <button
          onClick={() => setActiveTab(GovernanceType.HashPowerDelegation)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === GovernanceType.HashPowerDelegation
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Hash Power Delegation
        </button>
      </div>

      {/* Create Proposal/Delegation Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {activeTab === GovernanceType.CoreDAOProposal && 'CoreDAO Proposals'}
          {activeTab === GovernanceType.ValidatorDelegation && 'Validator Delegations'}
          {activeTab === GovernanceType.HashPowerDelegation && 'Hash Power Delegations'}
        </h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          disabled={emergencyPaused}
        >
          Create {activeTab === GovernanceType.CoreDAOProposal ? 'Proposal' : 'Delegation'}
        </Button>
      </div>

      {/* Create Forms */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              Create New {activeTab === GovernanceType.CoreDAOProposal ? 'CoreDAO Proposal' : 'Delegation'}
            </CardTitle>
            <CardDescription>
              {activeTab === GovernanceType.CoreDAOProposal && 'Submit a proposal for CoreDAO network governance'}
              {activeTab === GovernanceType.ValidatorDelegation && 'Propose validator delegation changes'}
              {activeTab === GovernanceType.HashPowerDelegation && 'Propose hash power delegation changes'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTab === GovernanceType.CoreDAOProposal && (
              <>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newCoreDAOProposal.title}
                    onChange={(e) => setNewCoreDAOProposal({...newCoreDAOProposal, title: e.target.value})}
                    placeholder="CoreDAO proposal title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={4}
                    value={newCoreDAOProposal.description}
                    onChange={(e) => setNewCoreDAOProposal({...newCoreDAOProposal, description: e.target.value})}
                    placeholder="Detailed description of the CoreDAO proposal"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Snapshot ID</label>
                  <Input
                    value={newCoreDAOProposal.snapshotId}
                    onChange={(e) => setNewCoreDAOProposal({...newCoreDAOProposal, snapshotId: e.target.value})}
                    placeholder="Snapshot governance proposal ID (e.g., QmHash...)"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateCoreDAOProposal}
                    disabled={isCreatingCoreDAO}
                  >
                    {isCreatingCoreDAO ? 'Creating...' : 'Create Proposal'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {activeTab === GovernanceType.ValidatorDelegation && (
              <>
                <div>
                  <label className="text-sm font-medium">Validator Address</label>
                  <Input
                    value={newValidatorDelegation.validator}
                    onChange={(e) => setNewValidatorDelegation({...newValidatorDelegation, validator: e.target.value})}
                    placeholder="0x..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Amount (CORE)</label>
                  <Input
                    type="number"
                    value={newValidatorDelegation.amount}
                    onChange={(e) => setNewValidatorDelegation({...newValidatorDelegation, amount: e.target.value})}
                    placeholder="1000"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateValidatorDelegation}
                    disabled={isCreatingValidator}
                  >
                    {isCreatingValidator ? 'Creating...' : 'Create Delegation'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {activeTab === GovernanceType.HashPowerDelegation && (
              <>
                <div>
                  <label className="text-sm font-medium">Validator Address</label>
                  <Input
                    value={newHashPowerDelegation.validator}
                    onChange={(e) => setNewHashPowerDelegation({...newHashPowerDelegation, validator: e.target.value})}
                    placeholder="0x..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Hash Power</label>
                  <Input
                    type="number"
                    value={newHashPowerDelegation.hashPower}
                    onChange={(e) => setNewHashPowerDelegation({...newHashPowerDelegation, hashPower: e.target.value})}
                    placeholder="1000000"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateHashPowerDelegation}
                    disabled={isCreatingHashPower}
                  >
                    {isCreatingHashPower ? 'Creating...' : 'Create Delegation'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content based on active tab */}
      <div className="space-y-4">
        {activeTab === GovernanceType.CoreDAOProposal && (
          <>
            {coreDAOProposals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Vote className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No CoreDAO Proposals</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    No CoreDAO governance proposals have been created yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              coreDAOProposals.map((proposal) => (
                <Card key={proposal.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Snapshot: {proposal.snapshotId} • Basket Proposal: #{proposal.basketProposalId}
                        </CardDescription>
                      </div>
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-chart-1/10 text-chart-1">
                        CoreDAO Network
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{proposal.description}</p>
                    <div className="text-sm text-muted-foreground">
                      Voting delegated to BasketGovernance proposal #{proposal.basketProposalId}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === GovernanceType.ValidatorDelegation && (
          <>
            {validatorDelegations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Validator Delegations</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    No validator delegation proposals have been created yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              validatorDelegations.map((delegation) => (
                <Card key={delegation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Delegate to {formatAddress(delegation.validator)}
                        </CardTitle>
                        <CardDescription>
                          Amount: {formatEther(delegation.amount)} CORE
                        </CardDescription>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        delegation.executed 
                          ? 'bg-chart-2/10 text-chart-2' 
                          : 'bg-chart-4/10 text-chart-4'
                      }`}>
                        {delegation.executed ? 'Executed' : 'Pending'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Linked to BasketGovernance proposal #{delegation.basketProposalId}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === GovernanceType.HashPowerDelegation && (
          <>
            {hashPowerDelegations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Hash Power Delegations</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    No hash power delegation proposals have been created yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              hashPowerDelegations.map((delegation) => (
                <Card key={delegation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Delegate Hash Power to {formatAddress(delegation.validator)}
                        </CardTitle>
                        <CardDescription>
                          Hash Power: {delegation.hashPower.toString()} H/s
                        </CardDescription>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        delegation.executed 
                          ? 'bg-chart-2/10 text-chart-2' 
                          : 'bg-chart-4/10 text-chart-4'
                      }`}>
                        {delegation.executed ? 'Executed' : 'Pending'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Linked to BasketGovernance proposal #{delegation.basketProposalId}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}