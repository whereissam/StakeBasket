// Logger utility that only logs in development mode
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  group: (...args: any[]) => {
    if (isDevelopment) {
      console.group(...args);
    }
  },
  
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  // Wallet interaction specific logging
  wallet: {
    connection: (status: string, details?: any) => {
      if (isDevelopment) {
        console.group(`🔗 Wallet Connection: ${status}`);
        if (details) console.log('Details:', details);
        console.groupEnd();
      }
    },

    transaction: (type: string, hash?: string, error?: any) => {
      if (isDevelopment) {
        console.group(`💸 Wallet Transaction: ${type}`);
        if (hash) console.log('Hash:', hash);
        if (error) console.error('Error:', error);
        console.groupEnd();
      }
    },

    network: (chainId: number, networkName?: string) => {
      if (isDevelopment) {
        console.log(`🌐 Network Change: Chain ID ${chainId}`, networkName || '');
      }
    },

    balance: (token: string, amount: string) => {
      if (isDevelopment) {
        console.log(`💰 Balance Update: ${amount} ${token}`);
      }
    }
  }
};

// For cases where we need to log errors even in production (critical errors)
export const criticalLogger = {
  error: (...args: any[]) => {
    console.error('[CRITICAL]', ...args);
  },

  walletError: (operation: string, error: any, context?: any) => {
    console.error('[CRITICAL WALLET ERROR]', {
      operation,
      error: error?.message || error,
      code: error?.code,
      context,
      timestamp: new Date().toISOString()
    });
  }
};