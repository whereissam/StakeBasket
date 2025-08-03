import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { Logger } from '../utils/logger';

interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  start: number;
  end: number;
  state: string;
  scores: number[];
  choices: string[];
  space: {
    id: string;
    name: string;
  };
}

interface BasketGovernanceVote {
  proposalId: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  totalVotes: string;
}

interface CoreDAOGovernanceConfig {
  snapshotSpaceId: string;
  snapshotApiUrl: string;
  governanceProxyAddress: string;
  basketGovernanceAddress: string;
  operatorPrivateKey: string;
  rpcUrl: string;
}

export class CoreDAOGovernanceService {
  private config: CoreDAOGovernanceConfig;
  private provider: ethers.JsonRpcProvider;
  private operatorWallet: ethers.Wallet;
  private logger: Logger;

  constructor(config: CoreDAOGovernanceConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.operatorWallet = new ethers.Wallet(config.operatorPrivateKey, this.provider);
    this.logger = new Logger('CoreDAOGovernanceService');
  }

  /**
   * Fetch active CoreDAO proposals from Snapshot
   */
  async fetchCoreDAOProposals(): Promise<SnapshotProposal[]> {
    try {
      const query = `
        query {
          proposals(
            where: {
              space: "${this.config.snapshotSpaceId}",
              state: "active"
            },
            orderBy: "created",
            orderDirection: desc
          ) {
            id
            title
            body
            start
            end
            state
            scores
            choices
            space {
              id
              name
            }
          }
        }
      `;

      const response = await fetch(this.config.snapshotApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json() as any;
      
      if (data.errors) {
        throw new Error(`Snapshot API error: ${JSON.stringify(data.errors)}`);
      }

      this.logger.info(`Fetched ${data.data.proposals.length} active CoreDAO proposals`);
      return data.data.proposals;
    } catch (error) {
      this.logger.error('Failed to fetch CoreDAO proposals:', error);
      throw error;
    }
  }

  /**
   * Create a proxy proposal in the CoreDAO Governance Proxy contract
   */
  async createProxyProposal(
    title: string,
    description: string,
    snapshotId: string
  ): Promise<string> {
    try {
      const governanceProxyAbi = [
        'function createCoreDAOProposal(string memory title, string memory description, string memory snapshotId) external returns (uint256)',
      ];

      const governanceProxy = new ethers.Contract(
        this.config.governanceProxyAddress,
        governanceProxyAbi,
        this.operatorWallet
      );

      this.logger.info(`Creating proxy proposal: ${title}`);
      
      const tx = await governanceProxy.createCoreDAOProposal(title, description, snapshotId);
      const receipt = await tx.wait();

      this.logger.info(`Proxy proposal created. Transaction: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to create proxy proposal:', error);
      throw error;
    }
  }

  /**
   * Monitor BASKET governance votes for CoreDAO proposals
   */
  async monitorBasketGovernanceVotes(): Promise<BasketGovernanceVote[]> {
    try {
      const basketGovernanceAbi = [
        'function proposalCount() external view returns (uint256)',
        'function getProposalVoting(uint256 proposalId) external view returns (uint256, uint256, uint256, uint256, uint256, bool)',
        'function getProposalDetails(uint256 proposalId) external view returns (uint256, address, string, string, uint8)',
        'function state(uint256 proposalId) external view returns (uint8)',
      ];

      const basketGovernance = new ethers.Contract(
        this.config.basketGovernanceAddress,
        basketGovernanceAbi,
        this.provider
      );

      const proposalCount = await basketGovernance.proposalCount();
      const votes: BasketGovernanceVote[] = [];

      // Check recent proposals (last 10)
      const startId = Math.max(1, Number(proposalCount) - 9);
      
      for (let i = startId; i <= Number(proposalCount); i++) {
        try {
          const [, , title, description, proposalType] = await basketGovernance.getProposalDetails(i);
          
          // Only process CoreDAO governance proposals
          if (title.includes('CoreDAO Governance:') || Number(proposalType) === 8) { // CoreDAOGovernanceVote
            const [startTime, endTime, forVotes, againstVotes, abstainVotes, executed] = 
              await basketGovernance.getProposalVoting(i);
            
            const state = await basketGovernance.state(i);
            
            // State 4 = Succeeded, State 7 = Executed
            if (Number(state) >= 4) {
              votes.push({
                proposalId: i,
                forVotes: forVotes.toString(),
                againstVotes: againstVotes.toString(),
                abstainVotes: abstainVotes.toString(),
                totalVotes: (BigInt(forVotes) + BigInt(againstVotes) + BigInt(abstainVotes)).toString(),
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to process proposal ${i}:`, error);
        }
      }

      this.logger.info(`Found ${votes.length} CoreDAO governance votes to process`);
      return votes;
    } catch (error) {
      this.logger.error('Failed to monitor BASKET governance votes:', error);
      throw error;
    }
  }

  /**
   * Cast aggregated vote on Snapshot (mock implementation)
   * In a real implementation, this would use the Snapshot API with proper authentication
   */
  async castAggregatedVote(
    snapshotId: string,
    choice: number, // 1 = For, 2 = Against, 3 = Abstain
    votingPower: string,
    reason?: string
  ): Promise<boolean> {
    try {
      this.logger.info(`Casting aggregated vote on Snapshot proposal ${snapshotId}`);
      this.logger.info(`Choice: ${choice}, Voting Power: ${votingPower}`);
      
      // Mock implementation - in reality, this would:
      // 1. Sign a vote message with the operator's private key
      // 2. Submit to Snapshot API with proper authentication
      // 3. Include voting power and rationale
      
      const voteData = {
        space: this.config.snapshotSpaceId,
        proposal: snapshotId,
        type: 'single-choice',
        choice: choice,
        reason: reason || `Aggregated vote from BASKET token holders. Total voting power: ${votingPower}`,
        app: 'StakeBasket-CoreDAO-Proxy',
        timestamp: Math.floor(Date.now() / 1000),
      };

      this.logger.info('Vote data prepared:', voteData);
      
      // For now, just log the action - real implementation would submit to Snapshot
      this.logger.info(`Vote would be cast on Snapshot with data: ${JSON.stringify(voteData)}`);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to cast aggregated vote:', error);
      throw error;
    }
  }

  /**
   * Process pending CoreDAO governance actions
   */
  async processPendingGovernanceActions(): Promise<void> {
    try {
      this.logger.info('Processing pending CoreDAO governance actions...');

      // 1. Fetch active CoreDAO proposals
      const activeProposals = await this.fetchCoreDAOProposals();
      
      // 2. Create proxy proposals for new CoreDAO proposals
      for (const proposal of activeProposals) {
        // Check if we already have a proxy proposal for this Snapshot proposal
        // This would require additional contract state tracking in a real implementation
        await this.createProxyProposal(
          proposal.title,
          proposal.body,
          proposal.id
        );
      }

      // 3. Monitor and execute completed BASKET governance votes
      const completedVotes = await this.monitorBasketGovernanceVotes();
      
      for (const vote of completedVotes) {
        // Determine winning choice
        const forVotes = BigInt(vote.forVotes);
        const againstVotes = BigInt(vote.againstVotes);
        const abstainVotes = BigInt(vote.abstainVotes);
        
        let choice: number;
        if (forVotes > againstVotes && forVotes > abstainVotes) {
          choice = 1; // For
        } else if (againstVotes > forVotes && againstVotes > abstainVotes) {
          choice = 2; // Against
        } else {
          choice = 3; // Abstain
        }

        // Cast aggregated vote (mock implementation)
        await this.castAggregatedVote(
          `snapshot-id-${vote.proposalId}`, // This would be the actual Snapshot ID
          choice,
          vote.totalVotes,
          `BASKET token holders voted: For: ${vote.forVotes}, Against: ${vote.againstVotes}, Abstain: ${vote.abstainVotes}`
        );
      }

      this.logger.info('Completed processing governance actions');
    } catch (error) {
      this.logger.error('Failed to process governance actions:', error);
      throw error;
    }
  }

  /**
   * Get governance statistics
   */
  async getGovernanceStats(): Promise<{
    activeProposals: number;
    completedVotes: number;
    totalVotingPower: string;
  }> {
    try {
      const activeProposals = await this.fetchCoreDAOProposals();
      const completedVotes = await this.monitorBasketGovernanceVotes();
      
      const totalVotingPower = completedVotes.reduce((sum, vote) => 
        sum + BigInt(vote.totalVotes), BigInt(0)
      ).toString();

      return {
        activeProposals: activeProposals.length,
        completedVotes: completedVotes.length,
        totalVotingPower,
      };
    } catch (error) {
      this.logger.error('Failed to get governance stats:', error);
      throw error;
    }
  }

  /**
   * Create validator delegation proposal
   */
  async createValidatorDelegationProposal(
    validatorAddress: string,
    amount: string
  ): Promise<string> {
    try {
      const governanceProxyAbi = [
        'function createValidatorDelegation(address validator, uint256 amount) external returns (uint256)',
      ];

      const governanceProxy = new ethers.Contract(
        this.config.governanceProxyAddress,
        governanceProxyAbi,
        this.operatorWallet
      );

      this.logger.info(`Creating validator delegation proposal for ${validatorAddress}, amount: ${amount}`);
      
      const tx = await governanceProxy.createValidatorDelegation(validatorAddress, amount);
      const receipt = await tx.wait();

      this.logger.info(`Validator delegation proposal created. Transaction: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to create validator delegation proposal:', error);
      throw error;
    }
  }

  /**
   * Create hash power delegation proposal
   */
  async createHashPowerDelegationProposal(
    validatorAddress: string,
    hashPower: string
  ): Promise<string> {
    try {
      const governanceProxyAbi = [
        'function createHashPowerDelegation(address validator, uint256 hashPower) external returns (uint256)',
      ];

      const governanceProxy = new ethers.Contract(
        this.config.governanceProxyAddress,
        governanceProxyAbi,
        this.operatorWallet
      );

      this.logger.info(`Creating hash power delegation proposal for ${validatorAddress}, hash power: ${hashPower}`);
      
      const tx = await governanceProxy.createHashPowerDelegation(validatorAddress, hashPower);
      const receipt = await tx.wait();

      this.logger.info(`Hash power delegation proposal created. Transaction: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to create hash power delegation proposal:', error);
      throw error;
    }
  }
}