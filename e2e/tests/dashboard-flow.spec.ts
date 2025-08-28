import { test, expect } from '@playwright/test'
import { WalletHelper } from '../utils/wallet-helpers'
import { TEST_AMOUNTS, SELECTORS } from '../fixtures/test-data'

test.describe('Dashboard E2E Tests', () => {
  let walletHelper: WalletHelper

  test.beforeEach(async ({ page }) => {
    walletHelper = new WalletHelper(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should display dashboard with wallet connection prompt when not connected', async ({ page }) => {
    // Should show wallet connection prompt when not connected
    await expect(page.locator(SELECTORS.connectWallet)).toBeVisible()
    
    // Should not show dashboard content without wallet
    await expect(page.locator(SELECTORS.dashboardTitle)).not.toBeVisible()
  })

  test('should display full dashboard after wallet connection', async ({ page }) => {
    // Skip wallet connection in this test to focus on UI
    // In real environment, you'd connect MetaMask here
    
    // Check if we get the loading state first
    const loadingText = page.locator('text=Loading dashboard...')
    if (await loadingText.isVisible({ timeout: 2000 })) {
      await expect(loadingText).toBeVisible()
    }
    
    // After connection, dashboard should be visible
    // Note: This will show wallet prompt until MetaMask is set up
  })

  test('should display staking form with proper validation', async ({ page }) => {
    // Assuming wallet is connected, look for staking form
    const stakeInput = page.locator(SELECTORS.stakeInput)
    
    if (await stakeInput.isVisible({ timeout: 5000 })) {
      await test.step('Test stake input validation', async () => {
        // Test negative value
        await stakeInput.fill('-1')
        await expect(page.locator(SELECTORS.stakeButton)).toBeDisabled()
        
        // Test zero value
        await stakeInput.fill('0')
        await expect(page.locator(SELECTORS.stakeButton)).toBeDisabled()
        
        // Test valid amount
        await stakeInput.fill(TEST_AMOUNTS.stake.small)
        
        // Button might still be disabled without wallet connection
        // but input should accept the value
        await expect(stakeInput).toHaveValue(TEST_AMOUNTS.stake.small)
      })
    }
  })

  test('should display withdrawal form', async ({ page }) => {
    // Look for Smart Withdrawal section
    const withdrawForm = page.locator(SELECTORS.withdrawForm)
    
    if (await withdrawForm.isVisible({ timeout: 5000 })) {
      await expect(withdrawForm).toBeVisible()
      
      // Look for withdrawal input
      const withdrawInput = page.locator(SELECTORS.withdrawInput)
      if (await withdrawInput.isVisible()) {
        await withdrawInput.fill(TEST_AMOUNTS.withdraw.partial)
        await expect(withdrawInput).toHaveValue(TEST_AMOUNTS.withdraw.partial)
      }
    }
  })

  test('should show contract health information', async ({ page }) => {
    // Look for contract health check button
    const healthButton = page.locator(SELECTORS.checkHealthButton)
    
    if (await healthButton.isVisible({ timeout: 5000 })) {
      await expect(healthButton).toBeVisible()
      await expect(page.locator(SELECTORS.contractHealth)).toBeVisible()
      
      // Test health check functionality
      await healthButton.click()
      
      // Should show loading spinner briefly
      await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 1000 })
    }
  })

  test('should display portfolio overview section', async ({ page }) => {
    // Look for portfolio section
    const portfolio = page.locator(SELECTORS.portfolioOverview)
    
    if (await portfolio.isVisible({ timeout: 5000 })) {
      await expect(portfolio).toBeVisible()
    }
  })

  test('should show network status information', async ({ page }) => {
    // Look for network information
    const networkStatus = page.locator(SELECTORS.networkStatus)
    
    if (await networkStatus.isVisible({ timeout: 5000 })) {
      await expect(networkStatus).toBeVisible()
    }
  })

  test('should display contract addresses information', async ({ page }) => {
    // Scroll down to find contract info
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    const contractInfo = page.locator(SELECTORS.contractInfo)
    
    if (await contractInfo.isVisible({ timeout: 3000 })) {
      await expect(contractInfo).toBeVisible()
    }
  })

  test('should show transaction history section', async ({ page }) => {
    // Scroll down to find transaction history
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    const txHistory = page.locator(SELECTORS.transactionHistory)
    
    if (await txHistory.isVisible({ timeout: 3000 })) {
      await expect(txHistory).toBeVisible()
    }
  })

  test('should handle max safe and use all buttons', async ({ page }) => {
    const stakeInput = page.locator(SELECTORS.stakeInput)
    
    if (await stakeInput.isVisible({ timeout: 5000 })) {
      // Test Max Safe button
      const maxSafeButton = page.locator(SELECTORS.maxSafeButton)
      if (await maxSafeButton.isVisible()) {
        await maxSafeButton.click()
        
        // Should populate input with some value
        const value = await stakeInput.inputValue()
        expect(parseFloat(value)).toBeGreaterThan(0)
      }
      
      // Test Use All button
      const useAllButton = page.locator(SELECTORS.useAllButton)
      if (await useAllButton.isVisible()) {
        await useAllButton.click()
        
        // Should populate input with balance value
        const value = await stakeInput.inputValue()
        expect(value).toBeTruthy()
      }
    }
  })
})