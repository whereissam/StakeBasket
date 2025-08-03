import { CronJob } from 'cron';
import { CoreDAOGovernanceService } from './CoreDAOGovernanceService';
import { Logger } from '../utils/logger';

interface AutomationConfig {
  enabled: boolean;
  cronSchedule: string; // e.g., '*/30 * * * *' for every 30 minutes
  snapshotSpaceId: string;
  governanceProxyAddress: string;
  basketGovernanceAddress: string;
  operatorPrivateKey: string;
  rpcUrl: string;
  snapshotApiUrl: string;
}

export class GovernanceAutomationService {
  private config: AutomationConfig;
  private coreDAOService: CoreDAOGovernanceService;
  private cronJob: CronJob | null = null;
  private logger: Logger;
  private isRunning = false;

  constructor(config: AutomationConfig) {
    this.config = config;
    this.logger = new Logger('GovernanceAutomationService');
    
    this.coreDAOService = new CoreDAOGovernanceService({
      snapshotSpaceId: config.snapshotSpaceId,
      snapshotApiUrl: config.snapshotApiUrl,
      governanceProxyAddress: config.governanceProxyAddress,
      basketGovernanceAddress: config.basketGovernanceAddress,
      operatorPrivateKey: config.operatorPrivateKey,
      rpcUrl: config.rpcUrl,
    });
  }

  /**
   * Start the automated governance service
   */
  start(): void {
    if (!this.config.enabled) {
      this.logger.info('Governance automation is disabled');
      return;
    }

    if (this.cronJob) {
      this.logger.warn('Governance automation is already running');
      return;
    }

    this.logger.info(`Starting governance automation with schedule: ${this.config.cronSchedule}`);
    
    this.cronJob = new CronJob(
      this.config.cronSchedule,
      () => this.executeAutomationCycle(),
      null,
      true,
      'UTC'
    );

    this.logger.info('Governance automation started successfully');
  }

  /**
   * Stop the automated governance service
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.logger.info('Governance automation stopped');
    }
  }

  /**
   * Execute a complete automation cycle
   */
  private async executeAutomationCycle(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Automation cycle already in progress, skipping');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting governance automation cycle');

    try {
      // 1. Process pending governance actions
      await this.coreDAOService.processPendingGovernanceActions();

      // 2. Check for new CoreDAO proposals and create proxy proposals
      await this.checkForNewProposals();

      // 3. Process completed BASKET votes and cast aggregated votes
      await this.processCompletedVotes();

      // 4. Monitor validator delegations and execute if needed
      await this.processValidatorDelegations();

      // 5. Monitor hash power delegations and execute if needed
      await this.processHashPowerDelegations();

      // 6. Generate and log governance statistics
      await this.logGovernanceStats();

      this.logger.info('Governance automation cycle completed successfully');
    } catch (error) {
      this.logger.error('Error during governance automation cycle:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check for new CoreDAO proposals and create proxy proposals
   */
  private async checkForNewProposals(): Promise<void> {
    try {
      this.logger.info('Checking for new CoreDAO proposals...');
      
      const activeProposals = await this.coreDAOService.fetchCoreDAOProposals();
      
      for (const proposal of activeProposals) {
        // In a real implementation, you'd check if a proxy proposal already exists
        // for this Snapshot proposal ID to avoid duplicates
        
        try {
          await this.coreDAOService.createProxyProposal(
            proposal.title,
            proposal.body,
            proposal.id
          );
          
          this.logger.info(`Created proxy proposal for CoreDAO proposal: ${proposal.title}`);
        } catch (error) {
          // Proposal might already exist or creation failed for other reasons
          this.logger.debug(`Skipped proposal creation for ${proposal.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check for new proposals:', error);
    }
  }

  /**
   * Process completed BASKET votes and cast aggregated votes
   */
  private async processCompletedVotes(): Promise<void> {
    try {
      this.logger.info('Processing completed BASKET governance votes...');
      
      const completedVotes = await this.coreDAOService.monitorBasketGovernanceVotes();
      
      for (const vote of completedVotes) {
        // Determine winning choice
        const forVotes = BigInt(vote.forVotes);
        const againstVotes = BigInt(vote.againstVotes);
        const abstainVotes = BigInt(vote.abstainVotes);
        
        let choice: number;
        let choiceText: string;
        
        if (forVotes > againstVotes && forVotes > abstainVotes) {
          choice = 1;
          choiceText = 'For';
        } else if (againstVotes > forVotes && againstVotes > abstainVotes) {
          choice = 2;
          choiceText = 'Against';
        } else {
          choice = 3;
          choiceText = 'Abstain';
        }

        const reason = `BASKET Community Vote - ${choiceText}: ${vote.forVotes} For, ${vote.againstVotes} Against, ${vote.abstainVotes} Abstain. Total voting power: ${vote.totalVotes}`;

        try {
          await this.coreDAOService.castAggregatedVote(
            `snapshot-${vote.proposalId}`, // This would map to actual Snapshot ID
            choice,
            vote.totalVotes,
            reason
          );
          
          this.logger.info(`Cast aggregated vote for proposal ${vote.proposalId}: ${choiceText}`);
        } catch (error) {
          this.logger.error(`Failed to cast vote for proposal ${vote.proposalId}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process completed votes:', error);
    }
  }

  /**
   * Process validator delegations that need to be executed
   */
  private async processValidatorDelegations(): Promise<void> {
    try {
      this.logger.info('Processing validator delegations...');
      
      // This would check for completed validator delegation proposals
      // and execute them by calling the governance proxy contract
      
      // For now, this is a placeholder - in a real implementation, you'd:
      // 1. Query the governance proxy contract for pending validator delegations
      // 2. Check if the corresponding BASKET governance proposal has passed
      // 3. Execute the delegation if approved
      
      this.logger.debug('Validator delegation processing completed');
    } catch (error) {
      this.logger.error('Failed to process validator delegations:', error);
    }
  }

  /**
   * Process hash power delegations that need to be executed
   */
  private async processHashPowerDelegations(): Promise<void> {
    try {
      this.logger.info('Processing hash power delegations...');
      
      // This would check for completed hash power delegation proposals
      // and execute them by interfacing with mining pools or other mechanisms
      
      // For now, this is a placeholder - in a real implementation, you'd:
      // 1. Query the governance proxy contract for pending hash power delegations
      // 2. Check if the corresponding BASKET governance proposal has passed
      // 3. Execute the delegation if approved
      
      this.logger.debug('Hash power delegation processing completed');
    } catch (error) {
      this.logger.error('Failed to process hash power delegations:', error);
    }
  }

  /**
   * Log governance statistics for monitoring
   */
  private async logGovernanceStats(): Promise<void> {
    try {
      const stats = await this.coreDAOService.getGovernanceStats();
      
      this.logger.info('Governance Statistics:', {
        activeProposals: stats.activeProposals,
        completedVotes: stats.completedVotes,
        totalVotingPower: stats.totalVotingPower,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to log governance stats:', error);
    }
  }

  /**
   * Manual trigger for automation cycle (for testing or emergency use)
   */
  async triggerManualCycle(): Promise<void> {
    this.logger.info('Manually triggering governance automation cycle');
    await this.executeAutomationCycle();
  }

  /**
   * Get current automation status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    nextRun: Date | null;
    schedule: string;
  } {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      nextRun: this.cronJob?.nextDate()?.toDate() || null,
      schedule: this.config.cronSchedule,
    };
  }

  /**
   * Update automation configuration
   */
  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.cronSchedule && this.cronJob) {
      // Restart with new schedule
      this.stop();
      this.start();
    }
    
    this.logger.info('Automation configuration updated');
  }

  /**
   * Create a new validator delegation proposal programmatically
   */
  async createValidatorDelegationProposal(
    validatorAddress: string,
    amount: string,
    reason?: string
  ): Promise<string> {
    try {
      this.logger.info(`Creating validator delegation proposal for ${validatorAddress}`);
      
      const txHash = await this.coreDAOService.createValidatorDelegationProposal(
        validatorAddress,
        amount
      );
      
      this.logger.info(`Validator delegation proposal created with tx: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error('Failed to create validator delegation proposal:', error);
      throw error;
    }
  }

  /**
   * Create a new hash power delegation proposal programmatically
   */
  async createHashPowerDelegationProposal(
    validatorAddress: string,
    hashPower: string,
    reason?: string
  ): Promise<string> {
    try {
      this.logger.info(`Creating hash power delegation proposal for ${validatorAddress}`);
      
      const txHash = await this.coreDAOService.createHashPowerDelegationProposal(
        validatorAddress,
        hashPower
      );
      
      this.logger.info(`Hash power delegation proposal created with tx: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error('Failed to create hash power delegation proposal:', error);
      throw error;
    }
  }

  /**
   * Emergency stop and cleanup
   */
  async emergencyStop(): Promise<void> {
    this.logger.warn('Emergency stop initiated');
    
    this.stop();
    this.isRunning = false;
    
    this.logger.info('Emergency stop completed');
  }
}