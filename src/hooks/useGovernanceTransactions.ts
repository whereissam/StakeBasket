import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { getNetworkByChainId } from '../config/contracts'
import { useChainId } from 'wagmi'
import { useEffect, useRef } from 'react'
import { handleTransactionError, createTransactionStateManager, TransactionErrorType } from '../utils/transactionErrorHandler'
import { validateNetworkForTransaction, NetworkValidationError } from '../utils/networkValidation'

// Governance Contract ABI
const GOVERNANCE_ABI = [
  {
    name: 'propose',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address[]', name: 'targets' },
      { type: 'uint256[]', name: 'values' },
      { type: 'bytes[]', name: 'calldatas' },
      { type: 'string', name: 'description' }
    ],
    outputs: [{ type: 'uint256', name: 'proposalId' }]
  },
  {
    name: 'castVote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256', name: 'proposalId' },
      { type: 'uint8', name: 'support' }
    ],
    outputs: [{ type: 'uint256', name: 'weight' }]
  },
  {
    name: 'castVoteWithReason',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256', name: 'proposalId' },
      { type: 'uint8', name: 'support' },
      { type: 'string', name: 'reason' }
    ],
    outputs: [{ type: 'uint256', name: 'weight' }]
  },
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { type: 'address[]', name: 'targets' },
      { type: 'uint256[]', name: 'values' },
      { type: 'bytes[]', name: 'calldatas' },
      { type: 'bytes32', name: 'descriptionHash' }
    ],
    outputs: [{ type: 'uint256', name: 'proposalId' }]
  }
] as const

// CoreDAO Governance Proxy ABI
const COREDAO_GOVERNANCE_PROXY_ABI = [
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

export function useGovernanceTransactions() {
  const chainId = useChainId()
  const { address } = useAccount()
  const { contracts } = getNetworkByChainId(chainId)
  
  // Create transaction state managers for each operation
  const createProposalStateManager = createTransactionStateManager('Create Proposal')
  const voteStateManager = createTransactionStateManager('Vote')
  const coreDAOProposalStateManager = createTransactionStateManager('CoreDAO Proposal')
  const validatorDelegationStateManager = createTransactionStateManager('Validator Delegation')
  
  // Track retry attempts to prevent infinite loops
  const retryAttempts = useRef<{
    createProposal: number
    vote: number
    createCoreDAOProposal: number
    createValidatorDelegation: number
  }>({
    createProposal: 0,
    vote: 0,
    createCoreDAOProposal: 0,
    createValidatorDelegation: 0
  })
  
  // Refs to track handled errors and prevent loops
  const handledErrors = useRef<{
    createProposalWrite: any
    voteWrite: any
    createCoreDAOProposalWrite: any
    createValidatorDelegationWrite: any
    createProposalReceipt: any
    voteReceipt: any
    createCoreDAOProposalReceipt: any
    createValidatorDelegationReceipt: any
  }>({
    createProposalWrite: null,
    voteWrite: null,
    createCoreDAOProposalWrite: null,
    createValidatorDelegationWrite: null,
    createProposalReceipt: null,
    voteReceipt: null,
    createCoreDAOProposalReceipt: null,
    createValidatorDelegationReceipt: null
  })
  
  // Get contract addresses
  const governanceAddress = contracts.BasketGovernance
  const coreDAOGovernanceProxyAddress = contracts.CoreDAOGovernanceProxy
  
  // Write contract hooks for standard governance
  const { writeContract: createProposal, data: createProposalHash, error: createProposalWriteError } = useWriteContract()
  const { writeContract: castVote, data: voteHash, error: voteWriteError } = useWriteContract()
  
  // Write contract hooks for CoreDAO governance
  const { writeContract: createCoreDAOProposal, data: createCoreDAOHash, error: createCoreDAOWriteError } = useWriteContract()
  const { writeContract: createValidatorDelegation, data: createValidatorHash } = useWriteContract()
  
  // Transaction receipt hooks for standard governance
  const { isLoading: isCreatingProposal, isSuccess: createProposalSuccess, error: createProposalError } = useWaitForTransactionReceipt({
    hash: createProposalHash,
  })
  
  const { isLoading: isVoting, isSuccess: voteSuccess, error: voteError } = useWaitForTransactionReceipt({
    hash: voteHash,
  })
  
  // Transaction receipt hooks for CoreDAO governance
  const { isLoading: isCreatingCoreDAOProposal, isSuccess: createCoreDAOSuccess, error: createCoreDAOError } = useWaitForTransactionReceipt({
    hash: createCoreDAOHash,
  })
  
  const { isLoading: isCreatingValidatorDelegation, isSuccess: createValidatorSuccess } = useWaitForTransactionReceipt({
    hash: createValidatorHash,
  })
  
  // Enhanced error handling - Vote transactions
  useEffect(() => {
    if (voteHash && isVoting) {
      voteStateManager.showLoadingToast('Confirming your vote on blockchain...')
    }
  }, [voteHash, isVoting])

  useEffect(() => {
    if (voteSuccess) {
      voteStateManager.showSuccessToast('Vote cast successfully! Your voice has been heard.')
    }
  }, [voteSuccess])

  useEffect(() => {
    if (voteError && handledErrors.current.voteReceipt !== voteError) {
      handledErrors.current.voteReceipt = voteError
      voteStateManager.handleError(voteError)
    }
  }, [voteError])

  useEffect(() => {
    if (voteWriteError && handledErrors.current.voteWrite !== voteWriteError) {
      handledErrors.current.voteWrite = voteWriteError
      voteStateManager.handleError(voteWriteError)
    }
  }, [voteWriteError])
  
  // Enhanced error handling - Create Proposal transactions
  useEffect(() => {
    if (createProposalHash && isCreatingProposal) {
      createProposalStateManager.showLoadingToast('Confirming proposal creation on blockchain...')
    }
  }, [createProposalHash, isCreatingProposal])

  useEffect(() => {
    if (createProposalSuccess) {
      createProposalStateManager.showSuccessToast('Proposal created successfully! Community voting can begin.')
    }
  }, [createProposalSuccess])

  useEffect(() => {
    if (createProposalError && handledErrors.current.createProposalReceipt !== createProposalError) {
      handledErrors.current.createProposalReceipt = createProposalError
      createProposalStateManager.handleError(createProposalError)
    }
  }, [createProposalError])

  useEffect(() => {
    if (createProposalWriteError && handledErrors.current.createProposalWrite !== createProposalWriteError) {
      handledErrors.current.createProposalWrite = createProposalWriteError
      createProposalStateManager.handleError(createProposalWriteError)
    }
  }, [createProposalWriteError])
  
  // Enhanced error handling - CoreDAO Proposal transactions
  useEffect(() => {
    if (createCoreDAOHash && isCreatingCoreDAOProposal) {
      coreDAOProposalStateManager.showLoadingToast('Confirming CoreDAO proposal creation on blockchain...')
    }
  }, [createCoreDAOHash, isCreatingCoreDAOProposal])

  useEffect(() => {
    if (createCoreDAOSuccess) {
      coreDAOProposalStateManager.showSuccessToast('CoreDAO proposal created successfully!')
    }
  }, [createCoreDAOSuccess])

  useEffect(() => {
    if (createCoreDAOError && handledErrors.current.createCoreDAOProposalReceipt !== createCoreDAOError) {
      handledErrors.current.createCoreDAOProposalReceipt = createCoreDAOError
      coreDAOProposalStateManager.handleError(createCoreDAOError)
    }
  }, [createCoreDAOError])

  useEffect(() => {
    if (createCoreDAOWriteError && handledErrors.current.createCoreDAOProposalWrite !== createCoreDAOWriteError) {
      handledErrors.current.createCoreDAOProposalWrite = createCoreDAOWriteError
      coreDAOProposalStateManager.handleError(createCoreDAOWriteError)
    }
  }, [createCoreDAOWriteError])
  
  const createGovernanceProposal = async (title: string, description: string, targets: string[], values: string[], calldatas: string[]) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.createProposal === 0) {
        handledErrors.current.createProposalWrite = null
        handledErrors.current.createProposalReceipt = null
      }
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!governanceAddress) {
        throw new Error(`Governance contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 Create Proposal Transaction details:', {
        contractAddress: governanceAddress,
        title,
        description,
        targets,
        values,
        calldatas,
        chainId,
        address
      })

      // Show wallet confirmation toast
      createProposalStateManager.showLoadingToast('Please confirm proposal creation in your wallet...')
      
      createProposal({
        address: governanceAddress as `0x${string}`,
        abi: GOVERNANCE_ABI,
        functionName: 'propose',
        args: [
          targets as `0x${string}`[],
          values.map(v => parseEther(v)),
          calldatas as `0x${string}`[],
          description
        ],
        gas: BigInt(500000), // Higher gas limit for proposal creation
        account: address as `0x${string}`,
      })
      
      // Reset retry attempts on successful submission
      retryAttempts.current.createProposal = 0
      console.log('✅ Create proposal transaction submitted to wallet')
    } catch (error) {
      console.error('Create proposal error:', error)
      
      // Apply retry logic
      const analyzedError = handleTransactionError(error, 'Create Proposal', { showToast: false })
      const isRetryableError = [
        TransactionErrorType.NETWORK_ERROR,
        TransactionErrorType.NONCE_ERROR,
        TransactionErrorType.INSUFFICIENT_GAS
      ].includes(analyzedError.type)
      
      const isNonRetryableError = [
        TransactionErrorType.USER_REJECTED,
        TransactionErrorType.PERMANENT_FAILURE,
        TransactionErrorType.CONTRACT_ERROR,
        TransactionErrorType.INSUFFICIENT_FUNDS,
        TransactionErrorType.ALLOWANCE_ERROR
      ].includes(analyzedError.type)
      
      const maxRetries = 2
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.createProposal < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.createProposal += 1
        console.log(`🔄 Retrying create proposal (attempt ${retryAttempts.current.createProposal}/${maxRetries})`)
        
        handleTransactionError(error, 'Create Proposal', {
          showToast: true,
          onRetry: () => createGovernanceProposal(title, description, targets, values, calldatas)
        })
      } else {
        retryAttempts.current.createProposal = 0
        handleTransactionError(error, 'Create Proposal', {
          showToast: true,
          onRetry: undefined
        })
        
        if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
          throw error
        }
      }
    }
  }
  
  const castGovernanceVote = async (proposalId: number, support: number, reason?: string) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.vote === 0) {
        handledErrors.current.voteWrite = null
        handledErrors.current.voteReceipt = null
      }
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!governanceAddress) {
        throw new Error(`Governance contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 Vote Transaction details:', {
        contractAddress: governanceAddress,
        proposalId,
        support,
        reason,
        chainId,
        address
      })

      // Show wallet confirmation toast
      voteStateManager.showLoadingToast('Please confirm your vote in your wallet...')
      
      if (reason) {
        castVote({
          address: governanceAddress as `0x${string}`,
          abi: GOVERNANCE_ABI,
          functionName: 'castVoteWithReason',
          args: [BigInt(proposalId), support, reason],
          gas: BigInt(250000),
          account: address as `0x${string}`,
        })
      } else {
        castVote({
          address: governanceAddress as `0x${string}`,
          abi: GOVERNANCE_ABI,
          functionName: 'castVote',
          args: [BigInt(proposalId), support],
          gas: BigInt(200000),
          account: address as `0x${string}`,
        })
      }
      
      // Reset retry attempts on successful submission
      retryAttempts.current.vote = 0
      console.log('✅ Vote transaction submitted to wallet')
    } catch (error) {
      console.error('Vote error:', error)
      
      // Apply retry logic
      const analyzedError = handleTransactionError(error, 'Vote', { showToast: false })
      const isRetryableError = [
        TransactionErrorType.NETWORK_ERROR,
        TransactionErrorType.NONCE_ERROR,
        TransactionErrorType.INSUFFICIENT_GAS
      ].includes(analyzedError.type)
      
      const isNonRetryableError = [
        TransactionErrorType.USER_REJECTED,
        TransactionErrorType.PERMANENT_FAILURE,
        TransactionErrorType.CONTRACT_ERROR,
        TransactionErrorType.INSUFFICIENT_FUNDS,
        TransactionErrorType.ALLOWANCE_ERROR
      ].includes(analyzedError.type)
      
      const maxRetries = 2
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.vote < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.vote += 1
        console.log(`🔄 Retrying vote (attempt ${retryAttempts.current.vote}/${maxRetries})`)
        
        handleTransactionError(error, 'Vote', {
          showToast: true,
          onRetry: () => castGovernanceVote(proposalId, support, reason)
        })
      } else {
        retryAttempts.current.vote = 0
        handleTransactionError(error, 'Vote', {
          showToast: true,
          onRetry: undefined
        })
        
        if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
          throw error
        }
      }
    }
  }
  
  const createCoreDAOGovernanceProposal = async (title: string, description: string, snapshotId: string) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.createCoreDAOProposal === 0) {
        handledErrors.current.createCoreDAOProposalWrite = null
        handledErrors.current.createCoreDAOProposalReceipt = null
      }
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!coreDAOGovernanceProxyAddress) {
        throw new Error(`CoreDAO Governance Proxy contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 CoreDAO Proposal Transaction details:', {
        contractAddress: coreDAOGovernanceProxyAddress,
        title,
        description,
        snapshotId,
        chainId,
        address
      })

      // Show wallet confirmation toast
      coreDAOProposalStateManager.showLoadingToast('Please confirm CoreDAO proposal creation in your wallet...')
      
      createCoreDAOProposal({
        address: coreDAOGovernanceProxyAddress as `0x${string}`,
        abi: COREDAO_GOVERNANCE_PROXY_ABI,
        functionName: 'createCoreDAOProposal',
        args: [title, description, snapshotId],
        gas: BigInt(300000),
        account: address as `0x${string}`,
      })
      
      // Reset retry attempts on successful submission
      retryAttempts.current.createCoreDAOProposal = 0
      console.log('✅ CoreDAO proposal transaction submitted to wallet')
    } catch (error) {
      console.error('CoreDAO proposal error:', error)
      
      // Apply retry logic
      const analyzedError = handleTransactionError(error, 'CoreDAO Proposal', { showToast: false })
      const isRetryableError = [
        TransactionErrorType.NETWORK_ERROR,
        TransactionErrorType.NONCE_ERROR,
        TransactionErrorType.INSUFFICIENT_GAS
      ].includes(analyzedError.type)
      
      const isNonRetryableError = [
        TransactionErrorType.USER_REJECTED,
        TransactionErrorType.PERMANENT_FAILURE,
        TransactionErrorType.CONTRACT_ERROR,
        TransactionErrorType.INSUFFICIENT_FUNDS,
        TransactionErrorType.ALLOWANCE_ERROR
      ].includes(analyzedError.type)
      
      const maxRetries = 2
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.createCoreDAOProposal < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.createCoreDAOProposal += 1
        console.log(`🔄 Retrying CoreDAO proposal (attempt ${retryAttempts.current.createCoreDAOProposal}/${maxRetries})`)
        
        handleTransactionError(error, 'CoreDAO Proposal', {
          showToast: true,
          onRetry: () => createCoreDAOGovernanceProposal(title, description, snapshotId)
        })
      } else {
        retryAttempts.current.createCoreDAOProposal = 0
        handleTransactionError(error, 'CoreDAO Proposal', {
          showToast: true,
          onRetry: undefined
        })
        
        if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
          throw error
        }
      }
    }
  }
  
  const createValidatorDelegationProposal = async (validator: string, amount: string) => {
    try {
      // Reset error tracking for new transaction (but only if not retrying)
      if (retryAttempts.current.createValidatorDelegation === 0) {
        handledErrors.current.createValidatorDelegationWrite = null
        handledErrors.current.createValidatorDelegationReceipt = null
      }
      
      const amountWei = parseEther(amount)
      
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      if (!coreDAOGovernanceProxyAddress) {
        throw new Error(`CoreDAO Governance Proxy contract not deployed on chain ${chainId}`)
      }
      
      // Validate network before transaction
      const networkValidation = validateNetworkForTransaction(chainId)
      if (!networkValidation.isValid) {
        throw new NetworkValidationError(networkValidation.error || 'Invalid network', chainId)
      }
      
      console.log('📋 Validator Delegation Transaction details:', {
        contractAddress: coreDAOGovernanceProxyAddress,
        validator,
        amount,
        amountWei: amountWei.toString(),
        chainId,
        address
      })

      // Show wallet confirmation toast
      validatorDelegationStateManager.showLoadingToast('Please confirm validator delegation in your wallet...')
      
      createValidatorDelegation({
        address: coreDAOGovernanceProxyAddress as `0x${string}`,
        abi: COREDAO_GOVERNANCE_PROXY_ABI,
        functionName: 'createValidatorDelegation',
        args: [validator as `0x${string}`, amountWei],
        gas: BigInt(250000),
        account: address as `0x${string}`,
      })
      
      // Reset retry attempts on successful submission
      retryAttempts.current.createValidatorDelegation = 0
      console.log('✅ Validator delegation transaction submitted to wallet')
    } catch (error) {
      console.error('Validator delegation error:', error)
      
      // Apply retry logic similar to other functions
      const analyzedError = handleTransactionError(error, 'Validator Delegation', { showToast: false })
      const isRetryableError = [
        TransactionErrorType.NETWORK_ERROR,
        TransactionErrorType.NONCE_ERROR,
        TransactionErrorType.INSUFFICIENT_GAS
      ].includes(analyzedError.type)
      
      const isNonRetryableError = [
        TransactionErrorType.USER_REJECTED,
        TransactionErrorType.PERMANENT_FAILURE,
        TransactionErrorType.CONTRACT_ERROR,
        TransactionErrorType.INSUFFICIENT_FUNDS,
        TransactionErrorType.ALLOWANCE_ERROR
      ].includes(analyzedError.type)
      
      const maxRetries = 2
      const shouldRetry = isRetryableError && !isNonRetryableError && retryAttempts.current.createValidatorDelegation < maxRetries
      
      if (shouldRetry) {
        retryAttempts.current.createValidatorDelegation += 1
        console.log(`🔄 Retrying validator delegation (attempt ${retryAttempts.current.createValidatorDelegation}/${maxRetries})`)
        
        handleTransactionError(error, 'Validator Delegation', {
          showToast: true,
          onRetry: () => createValidatorDelegationProposal(validator, amount)
        })
      } else {
        retryAttempts.current.createValidatorDelegation = 0
        handleTransactionError(error, 'Validator Delegation', {
          showToast: true,
          onRetry: undefined
        })
        
        if (analyzedError.type !== TransactionErrorType.USER_REJECTED) {
          throw error
        }
      }
    }
  }

  return {
    // Actions
    createGovernanceProposal,
    castGovernanceVote,
    createCoreDAOGovernanceProposal,
    createValidatorDelegationProposal,
    
    // States
    isCreatingProposal,
    isVoting,
    isCreatingCoreDAOProposal,
    isCreatingValidatorDelegation,
    
    // Success states
    createProposalSuccess,
    voteSuccess,
    createCoreDAOSuccess,
    createValidatorSuccess,
    
    // Transaction hashes
    createProposalHash,
    voteHash,
    createCoreDAOHash,
    createValidatorHash,
  }
}