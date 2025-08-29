import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StakingInterface from '../../../src/components/StakingInterface';
import userEvent from '@testing-library/user-event';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ 
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true 
  })),
  useChainId: vi.fn(() => 1115),
  useBalance: vi.fn(() => ({ 
    data: { formatted: '100.0', symbol: 'CORE' },
    isLoading: false 
  })),
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    isPending: false,
    error: null
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isLoading: false,
    isSuccess: false,
    error: null
  }))
}));

// Mock contract hooks
vi.mock('../../../src/hooks/useContracts', () => ({
  default: vi.fn(() => ({
    StakeBasket: {
      address: '0x123456789',
      abi: []
    },
    DualStakingBasket: {
      address: '0x987654321',
      abi: []
    }
  }))
}));

vi.mock('../../../src/hooks/useStakeBasketTransactions', () => ({
  default: vi.fn(() => ({
    stake: vi.fn(),
    unstake: vi.fn(),
    claimRewards: vi.fn(),
    isLoading: false,
    error: null,
    lastTransaction: null
  }))
}));

describe('StakingInterface Component', () => {
  let queryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders staking interface correctly', () => {
    renderWithProviders(<StakingInterface />);
    
    expect(screen.getByText(/staking interface/i)).toBeInTheDocument();
    expect(screen.getByText(/stake basket/i)).toBeInTheDocument();
    expect(screen.getByText(/dual staking/i)).toBeInTheDocument();
  });

  it('displays wallet connection requirement when disconnected', () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: null,
        isConnected: false 
      })),
      useChainId: vi.fn(() => 1115),
      useBalance: vi.fn(() => ({ 
        data: null,
        isLoading: false 
      })),
      useWriteContract: vi.fn(() => ({
        writeContract: vi.fn(),
        isPending: false,
        error: null
      })),
      useWaitForTransactionReceipt: vi.fn(() => ({
        isLoading: false,
        isSuccess: false,
        error: null
      }))
    }));

    renderWithProviders(<StakingInterface />);
    
    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
  });

  it('shows tier selection options', () => {
    renderWithProviders(<StakingInterface />);
    
    expect(screen.getByText(/bronze tier/i)).toBeInTheDocument();
    expect(screen.getByText(/silver tier/i)).toBeInTheDocument();
    expect(screen.getByText(/gold tier/i)).toBeInTheDocument();
  });

  it('handles stake amount input', async () => {
    renderWithProviders(<StakingInterface />);
    
    const amountInput = screen.getByRole('textbox', { name: /stake amount/i });
    await user.type(amountInput, '100');
    
    expect(amountInput).toHaveValue('100');
  });

  it('validates minimum stake amount', async () => {
    renderWithProviders(<StakingInterface />);
    
    const amountInput = screen.getByRole('textbox', { name: /stake amount/i });
    const stakeButton = screen.getByRole('button', { name: /stake/i });
    
    await user.type(amountInput, '0.1');
    fireEvent.click(stakeButton);
    
    expect(screen.getByText(/minimum stake amount/i)).toBeInTheDocument();
  });

  it('displays insufficient balance error', async () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useChainId: vi.fn(() => 1115),
      useBalance: vi.fn(() => ({ 
        data: { formatted: '10.0', symbol: 'CORE' },
        isLoading: false 
      })),
      useWriteContract: vi.fn(() => ({
        writeContract: vi.fn(),
        isPending: false,
        error: null
      })),
      useWaitForTransactionReceipt: vi.fn(() => ({
        isLoading: false,
        isSuccess: false,
        error: null
      }))
    }));

    renderWithProviders(<StakingInterface />);
    
    const amountInput = screen.getByRole('textbox', { name: /stake amount/i });
    const stakeButton = screen.getByRole('button', { name: /stake/i });
    
    await user.type(amountInput, '100');
    fireEvent.click(stakeButton);
    
    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it('executes stake transaction', async () => {
    const mockStake = vi.fn();
    vi.doMock('../../../src/hooks/useStakeBasketTransactions', () => ({
      default: vi.fn(() => ({
        stake: mockStake,
        unstake: vi.fn(),
        claimRewards: vi.fn(),
        isLoading: false,
        error: null,
        lastTransaction: null
      }))
    }));

    renderWithProviders(<StakingInterface />);
    
    const amountInput = screen.getByRole('textbox', { name: /stake amount/i });
    const stakeButton = screen.getByRole('button', { name: /stake/i });
    
    await user.type(amountInput, '50');
    fireEvent.click(stakeButton);
    
    await waitFor(() => {
      expect(mockStake).toHaveBeenCalledWith('50', expect.any(Object));
    });
  });

  it('shows transaction loading state', () => {
    vi.doMock('../../../src/hooks/useStakeBasketTransactions', () => ({
      default: vi.fn(() => ({
        stake: vi.fn(),
        unstake: vi.fn(),
        claimRewards: vi.fn(),
        isLoading: true,
        error: null,
        lastTransaction: null
      }))
    }));

    renderWithProviders(<StakingInterface />);
    
    expect(screen.getByText(/processing transaction/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stake/i })).toBeDisabled();
  });

  it('displays transaction error', () => {
    vi.doMock('../../../src/hooks/useStakeBasketTransactions', () => ({
      default: vi.fn(() => ({
        stake: vi.fn(),
        unstake: vi.fn(),
        claimRewards: vi.fn(),
        isLoading: false,
        error: 'Transaction failed: insufficient gas',
        lastTransaction: null
      }))
    }));

    renderWithProviders(<StakingInterface />);
    
    expect(screen.getByText(/transaction failed: insufficient gas/i)).toBeInTheDocument();
  });

  it('handles tier selection change', async () => {
    renderWithProviders(<StakingInterface />);
    
    const silverTierButton = screen.getByRole('button', { name: /silver tier/i });
    fireEvent.click(silverTierButton);
    
    expect(silverTierButton).toHaveClass('selected');
    expect(screen.getByText(/minimum: 100 core/i)).toBeInTheDocument();
  });

  it('displays staking benefits information', () => {
    renderWithProviders(<StakingInterface />);
    
    expect(screen.getByText(/earn rewards/i)).toBeInTheDocument();
    expect(screen.getByText(/governance rights/i)).toBeInTheDocument();
    expect(screen.getByText(/tier benefits/i)).toBeInTheDocument();
  });

  it('shows dual staking option', () => {
    renderWithProviders(<StakingInterface />);
    
    const dualStakingTab = screen.getByRole('tab', { name: /dual staking/i });
    fireEvent.click(dualStakingTab);
    
    expect(screen.getByText(/stake core \+ btc/i)).toBeInTheDocument();
    expect(screen.getByText(/higher apy/i)).toBeInTheDocument();
  });

  it('handles unstaking flow', async () => {
    const mockUnstake = vi.fn();
    vi.doMock('../../../src/hooks/useStakeBasketTransactions', () => ({
      default: vi.fn(() => ({
        stake: vi.fn(),
        unstake: mockUnstake,
        claimRewards: vi.fn(),
        isLoading: false,
        error: null,
        lastTransaction: null
      }))
    }));

    renderWithProviders(<StakingInterface />);
    
    const unstakeTab = screen.getByRole('tab', { name: /unstake/i });
    fireEvent.click(unstakeTab);
    
    const amountInput = screen.getByRole('textbox', { name: /unstake amount/i });
    const unstakeButton = screen.getByRole('button', { name: /unstake/i });
    
    await user.type(amountInput, '25');
    fireEvent.click(unstakeButton);
    
    await waitFor(() => {
      expect(mockUnstake).toHaveBeenCalledWith('25', expect.any(Object));
    });
  });
});