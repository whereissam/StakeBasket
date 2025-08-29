import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ConnectWallet from '../../../src/components/ConnectWallet';

// Mock wagmi hooks
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ 
    address: null,
    isConnected: false 
  })),
  useConnect: vi.fn(() => ({
    connectors: [
      { id: 'metaMask', name: 'MetaMask', icon: 'metamask-icon' },
      { id: 'walletConnect', name: 'WalletConnect', icon: 'wc-icon' },
      { id: 'coinbaseWallet', name: 'Coinbase Wallet', icon: 'coinbase-icon' }
    ],
    connect: mockConnect,
    isPending: false,
    error: null
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: mockDisconnect
  })),
  useChainId: vi.fn(() => 1115)
}));

vi.mock('../../../src/hooks/useNetworkDetection', () => ({
  default: vi.fn(() => ({
    isCorrectNetwork: true,
    switchToCorrectNetwork: vi.fn()
  }))
}));

describe('ConnectWallet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders connect wallet button when disconnected', () => {
    render(<ConnectWallet />);
    
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('shows wallet options when connect button is clicked', async () => {
    render(<ConnectWallet />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(screen.getByText('MetaMask')).toBeInTheDocument();
      expect(screen.getByText('WalletConnect')).toBeInTheDocument();
      expect(screen.getByText('Coinbase Wallet')).toBeInTheDocument();
    });
  });

  it('calls connect function when wallet option is selected', async () => {
    render(<ConnectWallet />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      const metamaskOption = screen.getByText('MetaMask');
      fireEvent.click(metamaskOption);
    });
    
    expect(mockConnect).toHaveBeenCalledWith({ connector: expect.objectContaining({ id: 'metaMask' }) });
  });

  it('displays connected wallet address when connected', () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useConnect: vi.fn(() => ({
        connectors: [],
        connect: mockConnect,
        isPending: false,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1115)
    }));

    render(<ConnectWallet />);
    
    expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
  });

  it('shows disconnect option when wallet is connected', () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useConnect: vi.fn(() => ({
        connectors: [],
        connect: mockConnect,
        isPending: false,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1115)
    }));

    render(<ConnectWallet />);
    
    const walletButton = screen.getByText(/0x1234...7890/);
    fireEvent.click(walletButton);
    
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('calls disconnect function when disconnect is clicked', async () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useConnect: vi.fn(() => ({
        connectors: [],
        connect: mockConnect,
        isPending: false,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1115)
    }));

    render(<ConnectWallet />);
    
    const walletButton = screen.getByText(/0x1234...7890/);
    fireEvent.click(walletButton);
    
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);
    
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('shows loading state when connecting', () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: null,
        isConnected: false 
      })),
      useConnect: vi.fn(() => ({
        connectors: [
          { id: 'metaMask', name: 'MetaMask', icon: 'metamask-icon' }
        ],
        connect: mockConnect,
        isPending: true,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1115)
    }));

    render(<ConnectWallet />);
    
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('displays connection error when present', () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: null,
        isConnected: false 
      })),
      useConnect: vi.fn(() => ({
        connectors: [
          { id: 'metaMask', name: 'MetaMask', icon: 'metamask-icon' }
        ],
        connect: mockConnect,
        isPending: false,
        error: { message: 'User rejected the request' }
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1115)
    }));

    render(<ConnectWallet />);
    
    expect(screen.getByText(/user rejected the request/i)).toBeInTheDocument();
  });

  it('shows network warning when on wrong network', () => {
    vi.doMock('../../../src/hooks/useNetworkDetection', () => ({
      default: vi.fn(() => ({
        isCorrectNetwork: false,
        switchToCorrectNetwork: vi.fn()
      }))
    }));

    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useConnect: vi.fn(() => ({
        connectors: [],
        connect: mockConnect,
        isPending: false,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1) // Ethereum mainnet instead of Core
    }));

    render(<ConnectWallet />);
    
    expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch network/i })).toBeInTheDocument();
  });

  it('handles network switching', async () => {
    const mockSwitchToCorrectNetwork = vi.fn();
    vi.doMock('../../../src/hooks/useNetworkDetection', () => ({
      default: vi.fn(() => ({
        isCorrectNetwork: false,
        switchToCorrectNetwork: mockSwitchToCorrectNetwork
      }))
    }));

    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useConnect: vi.fn(() => ({
        connectors: [],
        connect: mockConnect,
        isPending: false,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1)
    }));

    render(<ConnectWallet />);
    
    const switchNetworkButton = screen.getByRole('button', { name: /switch network/i });
    fireEvent.click(switchNetworkButton);
    
    expect(mockSwitchToCorrectNetwork).toHaveBeenCalled();
  });

  it('displays wallet information tooltip', async () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useConnect: vi.fn(() => ({
        connectors: [],
        connect: mockConnect,
        isPending: false,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1115)
    }));

    render(<ConnectWallet />);
    
    const walletButton = screen.getByText(/0x1234...7890/);
    fireEvent.mouseEnter(walletButton);
    
    await waitFor(() => {
      expect(screen.getByText('0x1234567890123456789012345678901234567890')).toBeInTheDocument();
    });
  });

  it('handles copy address to clipboard', async () => {
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useConnect: vi.fn(() => ({
        connectors: [],
        connect: mockConnect,
        isPending: false,
        error: null
      })),
      useDisconnect: vi.fn(() => ({
        disconnect: mockDisconnect
      })),
      useChainId: vi.fn(() => 1115)
    }));

    render(<ConnectWallet />);
    
    const walletButton = screen.getByText(/0x1234...7890/);
    fireEvent.click(walletButton);
    
    const copyButton = screen.getByRole('button', { name: /copy address/i });
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
  });
});