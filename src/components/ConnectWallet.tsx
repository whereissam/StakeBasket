import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect } from 'react'
import { logger, criticalLogger } from '../utils/logger'

export function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated')

        // Log wallet connection state changes
        useEffect(() => {
          if (ready) {
            if (connected && account && chain) {
              logger.wallet.connection('Connected', {
                address: account.address,
                displayName: account.displayName,
                chainId: chain.id,
                chainName: chain.name,
                balance: account.displayBalance
              });
            } else if (mounted && !connected) {
              logger.wallet.connection('Disconnected');
            }
          }
        }, [ready, connected, account?.address, chain?.id]);

        // Log network changes
        useEffect(() => {
          if (chain) {
            logger.wallet.network(chain.id, chain.name);
            if (chain.unsupported) {
              criticalLogger.walletError('Unsupported Network', {
                chainId: chain.id,
                chainName: chain.name
              });
            }
          }
        }, [chain?.id, chain?.unsupported]);

        // Log authentication status changes
        useEffect(() => {
          if (authenticationStatus) {
            logger.debug('🔐 Auth Status:', authenticationStatus);
          }
        }, [authenticationStatus]);

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={() => {
                      logger.debug('🔗 Opening connect modal');
                      openConnectModal();
                    }}
                    type="button"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={() => {
                      logger.warn('🌐 Opening chain modal - wrong network');
                      criticalLogger.walletError('User on wrong network', {
                        currentChain: chain.id,
                        currentChainName: chain.name
                      });
                      openChainModal();
                    }}
                    type="button"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className="flex gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}