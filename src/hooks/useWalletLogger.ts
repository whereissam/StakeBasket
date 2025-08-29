import { useEffect, useCallback } from 'react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { logger, criticalLogger } from '../utils/logger';

export interface WalletLoggerConfig {
  enableBalanceLogging?: boolean;
  enableNetworkLogging?: boolean;
  enableConnectionLogging?: boolean;
  enableTransactionLogging?: boolean;
}

export function useWalletLogger(config: WalletLoggerConfig = {}) {
  const {
    enableBalanceLogging = true,
    enableNetworkLogging = true,
    enableConnectionLogging = true,
    enableTransactionLogging = true
  } = config;

  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });

  // Log connection state changes
  useEffect(() => {
    if (!enableConnectionLogging) return;

    if (isConnected && address) {
      logger.wallet.connection('Connected', {
        address,
        connector: connector?.name,
        timestamp: new Date().toISOString()
      });
    } else if (!isConnected && address) {
      logger.wallet.connection('Disconnected', {
        previousAddress: address,
        timestamp: new Date().toISOString()
      });
    }
  }, [isConnected, address, connector?.name, enableConnectionLogging]);

  // Log network changes
  useEffect(() => {
    if (!enableNetworkLogging || !chainId) return;

    const networkNames: Record<number, string> = {
      1115: 'Core Testnet',
      1116: 'Core Mainnet',
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet'
    };

    logger.wallet.network(chainId, networkNames[chainId] || `Chain ${chainId}`);
  }, [chainId, enableNetworkLogging]);

  // Log balance changes
  useEffect(() => {
    if (!enableBalanceLogging || !balance) return;

    logger.wallet.balance(balance.symbol, balance.formatted);
  }, [balance?.formatted, balance?.symbol, enableBalanceLogging]);

  // Transaction logging functions
  const logTransaction = useCallback((
    type: string,
    hash?: string,
    error?: any,
    additionalData?: any
  ) => {
    if (!enableTransactionLogging) return;

    if (error) {
      criticalLogger.walletError(`Transaction Failed: ${type}`, error, {
        hash,
        chainId,
        address,
        additionalData,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.wallet.transaction(type, hash, error);
    }
  }, [enableTransactionLogging, chainId, address]);

  const logTransactionStart = useCallback((type: string, params?: any) => {
    if (!enableTransactionLogging) return;
    
    logger.group(`🚀 Starting Transaction: ${type}`);
    logger.debug('Parameters:', params);
    logger.debug('Chain ID:', chainId);
    logger.debug('Address:', address);
    logger.groupEnd();
  }, [enableTransactionLogging, chainId, address]);

  const logTransactionSuccess = useCallback((type: string, hash: string, receipt?: any) => {
    if (!enableTransactionLogging) return;

    logger.group(`✅ Transaction Success: ${type}`);
    logger.info('Hash:', hash);
    if (receipt) {
      logger.debug('Gas used:', receipt.gasUsed?.toString());
      logger.debug('Block number:', receipt.blockNumber?.toString());
    }
    logger.groupEnd();
  }, [enableTransactionLogging]);

  const logTransactionError = useCallback((type: string, error: any, context?: any) => {
    criticalLogger.walletError(`Transaction Error: ${type}`, error, {
      context,
      chainId,
      address,
      timestamp: new Date().toISOString()
    });
  }, [chainId, address]);

  // Contract interaction logging
  const logContractCall = useCallback((
    contractName: string,
    method: string,
    params?: any,
    gasEstimate?: string
  ) => {
    if (!enableTransactionLogging) return;

    logger.group(`📋 Contract Call: ${contractName}.${method}`);
    if (params) logger.debug('Parameters:', params);
    if (gasEstimate) logger.debug('Gas estimate:', gasEstimate);
    logger.debug('Chain ID:', chainId);
    logger.groupEnd();
  }, [enableTransactionLogging, chainId]);

  // Approval logging
  const logApproval = useCallback((
    tokenSymbol: string,
    spender: string,
    amount: string,
    isUnlimited?: boolean
  ) => {
    if (!enableTransactionLogging) return;

    logger.group(`🔓 Token Approval: ${tokenSymbol}`);
    logger.debug('Spender:', spender);
    logger.debug('Amount:', isUnlimited ? 'Unlimited' : amount);
    logger.debug('Chain ID:', chainId);
    logger.groupEnd();
  }, [enableTransactionLogging, chainId]);

  // Error logging with context
  const logWalletError = useCallback((
    operation: string,
    error: any,
    context?: Record<string, any>
  ) => {
    criticalLogger.walletError(operation, error, {
      ...context,
      chainId,
      address,
      connector: connector?.name,
      timestamp: new Date().toISOString()
    });
  }, [chainId, address, connector?.name]);

  return {
    // Wallet state
    address,
    chainId,
    isConnected,
    balance: balance?.formatted,
    
    // Logging functions
    logTransaction,
    logTransactionStart,
    logTransactionSuccess,
    logTransactionError,
    logContractCall,
    logApproval,
    logWalletError,
    
    // Direct logger access
    logger: logger.wallet,
    criticalLogger
  };
}