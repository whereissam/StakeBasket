import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import useDashboardData from '../../../src/hooks/useDashboardData';

// Mock wagmi hooks
const mockReadContract = vi.fn();
const mockReadContracts = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ 
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true 
  })),
  useReadContract: vi.fn(() => mockReadContract()),
  useReadContracts: vi.fn(() => mockReadContracts()),
  useChainId: vi.fn(() => 1115)
}));

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

describe('useDashboardData Hook', () => {
  let queryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    return ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    mockReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    });

    mockReadContracts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  it('returns error state when contract read fails', async () => {
    const mockError = new Error('Contract read failed');
    
    mockReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError
    });

    mockReadContracts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Contract read failed');
      expect(result.current.data).toBe(null);
    });
  });

  it('returns formatted dashboard data when contracts load successfully', async () => {
    mockReadContract.mockReturnValue({
      data: '1000000000000000000000', // 1000 CORE
      isLoading: false,
      error: null
    });

    mockReadContracts.mockReturnValue({
      data: [
        '1500000000000000000000', // Total staked: 1500 CORE
        '75000000000000000000',   // Total rewards: 75 CORE
        '12.5',                   // APR: 12.5%
        5,                        // Active stakers count
        []                        // Unbonding requests (empty array)
      ],
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toEqual({
        totalStaked: '1500000000000000000000',
        totalRewards: '75000000000000000000',
        userBalance: '1000000000000000000000',
        stakingApr: '12.5',
        activeStakers: 5,
        unbondingRequests: []
      });
    });
  });

  it('handles disconnected wallet state', async () => {
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: null,
        isConnected: false 
      })),
      useReadContract: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null
      })),
      useReadContracts: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null
      })),
      useChainId: vi.fn(() => 1115)
    }));

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toEqual({
      totalStaked: '0',
      totalRewards: '0',
      userBalance: '0',
      stakingApr: '0',
      activeStakers: 0,
      unbondingRequests: []
    });
  });

  it('provides refetch functionality', async () => {
    const mockRefetch = vi.fn(() => Promise.resolve());
    
    mockReadContract.mockReturnValue({
      data: '1000000000000000000000',
      isLoading: false,
      error: null,
      refetch: mockRefetch
    });

    mockReadContracts.mockReturnValue({
      data: ['1500000000000000000000', '75000000000000000000', '12.5', 5, []],
      isLoading: false,
      error: null,
      refetch: mockRefetch
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    await result.current.refetch();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles partial contract data gracefully', async () => {
    mockReadContract.mockReturnValue({
      data: '1000000000000000000000',
      isLoading: false,
      error: null
    });

    // Simulate partial contract read results
    mockReadContracts.mockReturnValue({
      data: [
        '1500000000000000000000', // Total staked
        null,                     // Total rewards (missing)
        '12.5',                   // APR
        undefined,                // Active stakers (missing)
        []                        // Unbonding requests
      ],
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toEqual({
        totalStaked: '1500000000000000000000',
        totalRewards: '0', // Fallback value
        userBalance: '1000000000000000000000',
        stakingApr: '12.5',
        activeStakers: 0, // Fallback value
        unbondingRequests: []
      });
    });
  });

  it('formats large numbers correctly', async () => {
    mockReadContract.mockReturnValue({
      data: '999999999999999999999999', // Very large number
      isLoading: false,
      error: null
    });

    mockReadContracts.mockReturnValue({
      data: [
        '1000000000000000000000000', // 1 million CORE
        '50000000000000000000000',   // 50k CORE rewards
        '15.75',                     // APR: 15.75%
        1000,                        // 1000 active stakers
        []
      ],
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        totalStaked: '1000000000000000000000000',
        totalRewards: '50000000000000000000000',
        userBalance: '999999999999999999999999',
        stakingApr: '15.75',
        activeStakers: 1000,
        unbondingRequests: []
      });
    });
  });

  it('handles network changes correctly', async () => {
    let chainId = 1115;
    
    vi.doMock('wagmi', () => ({
      useAccount: vi.fn(() => ({ 
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true 
      })),
      useReadContract: vi.fn(() => mockReadContract()),
      useReadContracts: vi.fn(() => mockReadContracts()),
      useChainId: vi.fn(() => chainId)
    }));

    mockReadContract.mockReturnValue({
      data: '1000000000000000000000',
      isLoading: false,
      error: null
    });

    mockReadContracts.mockReturnValue({
      data: ['1500000000000000000000', '75000000000000000000', '12.5', 5, []],
      isLoading: false,
      error: null
    });

    const { result, rerender } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // Simulate network change
    chainId = 1;
    rerender();

    // Should trigger re-fetch for new network
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
  });

  it('caches data appropriately', async () => {
    mockReadContract.mockReturnValue({
      data: '1000000000000000000000',
      isLoading: false,
      error: null
    });

    mockReadContracts.mockReturnValue({
      data: ['1500000000000000000000', '75000000000000000000', '12.5', 5, []],
      isLoading: false,
      error: null
    });

    const { result: result1 } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    const { result: result2 } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result1.current.data).toEqual(result2.current.data);
    });

    // Both hooks should share the same cached data
    expect(result1.current.data).toBe(result2.current.data);
  });
});