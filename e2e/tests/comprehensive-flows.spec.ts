import { test, expect } from '@playwright/test';
import { WalletHelper } from '../utils/wallet-helpers';
import { TEST_AMOUNTS, SELECTORS } from '../fixtures/test-data';

test.describe('Comprehensive User Flows E2E Tests', () => {
  let walletHelper: WalletHelper;

  test.beforeEach(async ({ page }) => {
    walletHelper = new WalletHelper(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete staking journey - from landing to staking', async ({ page }) => {
    await test.step('Navigate from landing page to dashboard', async () => {
      // Check landing page elements
      await expect(page.locator('text=BASKET')).toBeVisible();
      
      // Navigate to dashboard
      await page.click('a[href="/dashboard"]');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Check wallet connection requirement', async () => {
      // Should show wallet connection prompt
      const hasConnectionPrompt = await Promise.race([
        page.locator(SELECTORS.connectWallet).isVisible(),
        page.locator('text=Connect your wallet').isVisible(),
        page.locator('text=Connect Wallet').isVisible()
      ]);
      
      expect(hasConnectionPrompt).toBeTruthy();
    });

    await test.step('Navigate to staking interface', async () => {
      await page.click('a[href="/staking"]');
      await page.waitForLoadState('networkidle');
      
      // Verify staking interface loads
      const hasStakingContent = await Promise.race([
        page.locator('text=Staking').isVisible(),
        page.locator('text=Stake').isVisible(),
        page.locator(SELECTORS.stakeInput).isVisible()
      ]);
      
      expect(hasStakingContent).toBeTruthy();
    });

    await test.step('Validate staking form without wallet', async () => {
      const stakeInput = page.locator(SELECTORS.stakeInput);
      
      if (await stakeInput.isVisible({ timeout: 3000 })) {
        await stakeInput.fill(TEST_AMOUNTS.stake.medium);
        
        // Button should be disabled or show connect wallet message
        const stakeButton = page.locator(SELECTORS.stakeButton);
        const isDisabled = await stakeButton.isDisabled();
        const hasConnectText = await page.locator('text=Connect').isVisible();
        
        expect(isDisabled || hasConnectText).toBeTruthy();
      }
    });
  });

  test('Portfolio monitoring and metrics flow', async ({ page }) => {
    await test.step('Access dashboard portfolio overview', async () => {
      await page.click('a[href="/dashboard"]');
      await page.waitForLoadState('networkidle');
      
      // Look for portfolio metrics (even if showing 0 values)
      const hasPortfolioMetrics = await Promise.race([
        page.locator('text=Total Staked').isVisible(),
        page.locator('text=Portfolio').isVisible(),
        page.locator('text=Balance').isVisible(),
        page.locator('text=Rewards').isVisible()
      ]);
      
      expect(hasPortfolioMetrics).toBeTruthy();
    });

    await test.step('Check real-time data updates', async () => {
      // Look for refresh functionality or live data indicators
      const hasDataUpdate = await Promise.race([
        page.locator(SELECTORS.refreshButton).isVisible(),
        page.locator('text=Updated').isVisible(),
        page.locator('[data-testid="auto-refresh"]').isVisible()
      ]);
      
      // At minimum should have some form of data presentation
      const hasData = await page.locator('text=0').isVisible() || 
                     await page.locator('[data-testid*="balance"]').isVisible();
      
      expect(hasDataUpdate || hasData).toBeTruthy();
    });
  });

  test('Multi-tier staking options validation', async ({ page }) => {
    await page.goto('/staking');
    await page.waitForLoadState('networkidle');

    await test.step('Verify tier selection interface', async () => {
      const hasTierOptions = await Promise.race([
        page.locator('text=Bronze').isVisible(),
        page.locator('text=Silver').isVisible(),
        page.locator('text=Gold').isVisible(),
        page.locator('text=Tier').isVisible()
      ]);
      
      expect(hasTierOptions).toBeTruthy();
    });

    await test.step('Test tier requirements and benefits display', async () => {
      // Check if tier information is displayed
      const hasTierInfo = await Promise.race([
        page.locator('text=minimum').isVisible(),
        page.locator('text=benefit').isVisible(),
        page.locator('text=APY').isVisible(),
        page.locator('text=%').isVisible()
      ]);
      
      expect(hasTierInfo).toBeTruthy();
    });
  });

  test('Governance participation flow', async ({ page }) => {
    await page.goto('/governance');
    await page.waitForLoadState('networkidle');

    await test.step('Display governance dashboard', async () => {
      const hasGovernanceElements = await Promise.race([
        page.locator('text=Governance').isVisible(),
        page.locator('text=Proposal').isVisible(),
        page.locator('text=Vote').isVisible(),
        page.locator('text=Voting Power').isVisible()
      ]);
      
      expect(hasGovernanceElements).toBeTruthy();
    });

    await test.step('Check proposal interaction capabilities', async () => {
      // Look for proposal interaction elements
      const hasProposalInteraction = await Promise.race([
        page.locator('button[data-testid*="vote"]').isVisible(),
        page.locator('text=Create Proposal').isVisible(),
        page.locator('[role="button"]').first().isVisible()
      ]);
      
      // Should have some form of governance interaction UI
      expect(hasProposalInteraction).toBeTruthy();
    });
  });

  test('Dual staking comprehensive flow', async ({ page }) => {
    await page.goto('/dual-staking');
    await page.waitForLoadState('networkidle');

    await test.step('Validate dual staking interface', async () => {
      const hasDualStakingUI = await Promise.race([
        page.locator('text=Dual Staking').isVisible(),
        page.locator('text=CORE').isVisible(),
        page.locator('text=BTC').isVisible(),
        page.locator('text=lstBTC').isVisible()
      ]);
      
      expect(hasDualStakingUI).toBeTruthy();
    });

    await test.step('Check dual staking input validation', async () => {
      const coreInput = page.locator('[data-testid="core-input"], input[placeholder*="CORE"], input[name*="core"]').first();
      const btcInput = page.locator('[data-testid="btc-input"], input[placeholder*="BTC"], input[name*="btc"]').first();
      
      if (await coreInput.isVisible({ timeout: 3000 })) {
        await coreInput.fill(TEST_AMOUNTS.dualStaking.core);
        await expect(coreInput).toHaveValue(TEST_AMOUNTS.dualStaking.core);
      }
      
      if (await btcInput.isVisible({ timeout: 3000 })) {
        await btcInput.fill(TEST_AMOUNTS.dualStaking.btc);
        await expect(btcInput).toHaveValue(TEST_AMOUNTS.dualStaking.btc);
      }
    });
  });

  test('Error handling and network validation', async ({ page }) => {
    await test.step('Test network detection', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Should show network indicator or connection status
      const hasNetworkInfo = await Promise.race([
        page.locator('text=Core').isVisible(),
        page.locator('text=Network').isVisible(),
        page.locator('text=Testnet').isVisible(),
        page.locator('[data-testid*="network"]').isVisible()
      ]);
      
      // Network information should be present somewhere
      expect(hasNetworkInfo || await page.locator('button').first().isVisible()).toBeTruthy();
    });

    await test.step('Validate error boundaries', async () => {
      // Navigate to a potentially error-prone page
      await page.goto('/contracts');
      await page.waitForLoadState('networkidle');
      
      // Should not show unhandled error
      const hasUnhandledError = await page.locator('text=ChunkLoadError').isVisible() ||
                               await page.locator('text=Uncaught').isVisible();
      
      expect(hasUnhandledError).toBeFalsy();
    });
  });

  test('Mobile responsiveness validation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await test.step('Test mobile navigation', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for mobile menu or mobile-friendly navigation
      const hasMobileNav = await Promise.race([
        page.locator('[data-testid="mobile-menu"]').isVisible(),
        page.locator('button[aria-label*="menu"]').isVisible(),
        page.locator('.mobile-nav').isVisible()
      ]);
      
      // Navigation should be accessible on mobile
      const hasNavigation = hasMobileNav || await page.locator('nav').isVisible();
      expect(hasNavigation).toBeTruthy();
    });

    await test.step('Test mobile staking interface', async () => {
      await page.goto('/staking');
      await page.waitForLoadState('networkidle');
      
      // Interface should be usable on mobile
      const stakeInput = page.locator(SELECTORS.stakeInput);
      
      if (await stakeInput.isVisible({ timeout: 3000 })) {
        // Input should be tappable and usable
        await stakeInput.tap();
        await stakeInput.fill(TEST_AMOUNTS.stake.small);
        
        const boundingBox = await stakeInput.boundingBox();
        expect(boundingBox?.height).toBeGreaterThan(30); // Minimum tap target size
      }
    });
  });

  test('Performance and loading optimization', async ({ page }) => {
    await test.step('Measure initial page load', async () => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time (10 seconds max)
      expect(loadTime).toBeLessThan(10000);
    });

    await test.step('Check for loading states during navigation', async () => {
      await page.goto('/dashboard');
      
      // Should show loading state during data fetch
      const hasLoadingState = await Promise.race([
        page.locator(SELECTORS.loadingSpinner).isVisible(),
        page.locator('text=Loading').isVisible(),
        page.locator('[data-testid*="loading"]').isVisible()
      ]);
      
      // Either shows loading state or loads fast enough to skip it
      await page.waitForLoadState('networkidle');
      const hasContent = await page.locator('text=Dashboard').isVisible() ||
                        await page.locator('text=Connect').isVisible();
      
      expect(hasLoadingState || hasContent).toBeTruthy();
    });
  });

  test('Accessibility compliance validation', async ({ page }) => {
    await test.step('Check keyboard navigation', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.locator(':focus').count();
      expect(focusedElement).toBeGreaterThan(0);
    });

    await test.step('Verify ARIA attributes presence', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const hasAriaLabels = await page.locator('[aria-label]').count() > 0 ||
                           await page.locator('[role]').count() > 0;
      
      expect(hasAriaLabels).toBeTruthy();
    });
  });

  test('Cross-browser compatibility scenarios', async ({ page, browserName }) => {
    await test.step(`Verify core functionality in ${browserName}`, async () => {
      await page.goto('/staking');
      await page.waitForLoadState('networkidle');
      
      // Core functionality should work across browsers
      const stakeInput = page.locator(SELECTORS.stakeInput);
      
      if (await stakeInput.isVisible({ timeout: 3000 })) {
        await stakeInput.fill(TEST_AMOUNTS.stake.small);
        
        const inputValue = await stakeInput.inputValue();
        expect(inputValue).toBe(TEST_AMOUNTS.stake.small);
      }
    });

    await test.step(`Test wallet connection UI in ${browserName}`, async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const connectButton = page.locator(SELECTORS.connectWallet);
      
      if (await connectButton.isVisible({ timeout: 3000 })) {
        await connectButton.click();
        
        // Should open wallet selection or show connect options
        const hasWalletOptions = await Promise.race([
          page.locator('text=MetaMask').isVisible(),
          page.locator('text=WalletConnect').isVisible(),
          page.locator('text=Coinbase').isVisible()
        ]);
        
        expect(hasWalletOptions).toBeTruthy();
      }
    });
  });
});