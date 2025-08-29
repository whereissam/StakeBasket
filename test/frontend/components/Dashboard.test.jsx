import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../../src/components/Dashboard';

// Mock dependencies
vi.mock('../../../src/hooks/useDashboardData', () => ({
  default: vi.fn(() => ({
    loading: false,
    error: null,
    data: {
      totalStaked: '1000000000000000000000',
      totalRewards: '50000000000000000000',
      userBalance: '500000000000000000000',
      stakingApr: '12.5',
      unbondingRequests: []
    },
    refetch: vi.fn()
  }))
}));

vi.mock('../../../src/hooks/useContractData', () => ({
  default: vi.fn(() => ({
    contracts: {
      StakeBasket: { address: '0x123...', abi: [] },
      DualStakingBasket: { address: '0x456...', abi: [] }
    },
    isLoading: false
  }))
}));

vi.mock('../../../src/components/NetworkGuard', () => ({
  default: ({ children }) => <div data-testid="network-guard">{children}</div>
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ 
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true 
  })),
  useChainId: vi.fn(() => 1115),
  useBalance: vi.fn(() => ({ 
    data: { formatted: '100.0', symbol: 'CORE' },
    isLoading: false 
  }))
}));

describe('Dashboard Component', () => {
  let queryClient;

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

  it('renders dashboard with loading state', () => {
    const mockUseDashboardData = vi.fn(() => ({
      loading: true,
      error: null,
      data: null
    }));
    
    vi.doMock('../../../src/hooks/useDashboardData', () => ({
      default: mockUseDashboardData
    }));

    renderWithProviders(<Dashboard />);
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('renders dashboard with error state', () => {
    const mockUseDashboardData = vi.fn(() => ({
      loading: false,
      error: 'Failed to load dashboard data',
      data: null
    }));
    
    vi.doMock('../../../src/hooks/useDashboardData', () => ({
      default: mockUseDashboardData
    }));

    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
  });

  it('renders dashboard with data successfully', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByTestId('network-guard')).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/1,000.00/)).toBeInTheDocument(); // Total staked
    expect(screen.getByText(/50.00/)).toBeInTheDocument(); // Total rewards
  });

  it('displays portfolio overview section', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/portfolio overview/i)).toBeInTheDocument();
    expect(screen.getByText(/total staked/i)).toBeInTheDocument();
    expect(screen.getByText(/total rewards/i)).toBeInTheDocument();
    expect(screen.getByText(/12.5%/)).toBeInTheDocument(); // APR
  });

  it('displays staking options', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/staking options/i)).toBeInTheDocument();
    expect(screen.getByText(/stake basket/i)).toBeInTheDocument();
    expect(screen.getByText(/dual staking/i)).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    const mockRefetch = vi.fn();
    const mockUseDashboardData = vi.fn(() => ({
      loading: false,
      error: null,
      data: {
        totalStaked: '1000000000000000000000',
        totalRewards: '50000000000000000000',
        userBalance: '500000000000000000000',
        stakingApr: '12.5',
        unbondingRequests: []
      },
      refetch: mockRefetch
    }));
    
    vi.doMock('../../../src/hooks/useDashboardData', () => ({
      default: mockUseDashboardData
    }));

    renderWithProviders(<Dashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('navigates to staking interface', async () => {
    const mockNavigate = vi.fn();
    vi.doMock('@tanstack/react-router', () => ({
      useNavigate: () => mockNavigate
    }));

    renderWithProviders(<Dashboard />);
    
    const stakeButton = screen.getByRole('button', { name: /start staking/i });
    fireEvent.click(stakeButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/staking' });
    });
  });

  it('displays wallet connection status', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
    expect(screen.getByText(/100.0 CORE/)).toBeInTheDocument();
  });

  it('handles disconnected wallet state', () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: null,
        isConnected: false 
      })),
      useChainId: vi.fn(() => 1115),
      useBalance: vi.fn(() => ({ 
        data: null,
        isLoading: false 
      }))
    }));

    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/connect wallet to view dashboard/i)).toBeInTheDocument();
  });
});