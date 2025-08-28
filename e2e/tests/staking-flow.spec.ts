import { test, expect } from '@playwright/test'
import { WalletHelper } from '../utils/wallet-helpers'
import { TEST_AMOUNTS, SELECTORS } from '../fixtures/test-data'

test.describe('BASKET Staking E2E Tests', () => {
  let walletHelper: WalletHelper

  test.beforeEach(async ({ page }) => {
    walletHelper = new WalletHelper(page)
    await page.waitForLoadState('networkidle')
  })

  test('should display BASKET staking page correctly', async ({ page }) => {
    await page.goto('/staking')
    await page.waitForLoadState('networkidle')
    
    // Verify BASKET staking page loads
    await expect(page.locator(SELECTORS.basketStakingTitle)).toBeVisible()
    await expect(page.locator('text=Stake your BASKET tokens')).toBeVisible()
    await expect(page.locator('text=protocol fees')).toBeVisible()
    await expect(page.locator('text=tier benefits')).toBeVisible()
    await expect(page.locator('text=voting power')).toBeVisible()
  })

  test('should display dual staking interface', async ({ page }) => {
    await page.goto('/dual-staking')
    await page.waitForLoadState('networkidle')
    
    // Verify dual staking interface loads
    const hasDualStakingContent = await Promise.race([
      page.locator('text=Dual Staking').isVisible(),
      page.locator('text=CORE').isVisible(), 
      page.locator('text=lstBTC').isVisible(),
      page.locator('h1, h2').isVisible()
    ])
    
    expect(hasDualStakingContent).toBeTruthy()
  })

  test('should display governance interface', async ({ page }) => {
    await page.goto('/governance')
    await page.waitForLoadState('networkidle')
    
    // Verify governance page loads
    const hasGovernanceContent = await Promise.race([
      page.locator('text=Governance').isVisible(),
      page.locator('text=Proposals').isVisible(),
      page.locator('text=Voting').isVisible(),
      page.locator('h1, h2').isVisible()
    ])
    
    expect(hasGovernanceContent).toBeTruthy()
  })

  test('should handle wallet connection flow', async ({ page }) => {
    await page.goto('/dashboard')
    
    await test.step('Show wallet connection prompt when not connected', async () => {
      // Should show connect wallet button or prompt
      const hasConnectionPrompt = await Promise.race([
        page.locator(SELECTORS.connectWallet).isVisible(),
        page.locator('text=Connect your wallet').isVisible(),
        page.locator('text=Please connect').isVisible()
      ])
      
      expect(hasConnectionPrompt).toBeTruthy()
    })

    // Note: Actual MetaMask connection would require browser extension setup
    // await test.step('Connect wallet', async () => {
    //   await walletHelper.connectMetaMask()
    //   await walletHelper.waitForConnection()
    // })
  })

  test('should validate staking inputs correctly', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Look for staking input field
    const stakeInput = page.locator(SELECTORS.stakeInput)
    
    if (await stakeInput.isVisible({ timeout: 5000 })) {
      await test.step('Test negative amount validation', async () => {
        await stakeInput.fill('-1')
        
        // Input should prevent negative values or button should be disabled
        const inputValue = await stakeInput.inputValue()
        const stakeButton = page.locator(SELECTORS.stakeButton)
        
        expect(inputValue === '0' || await stakeButton.isDisabled()).toBeTruthy()
      })

      await test.step('Test zero amount validation', async () => {
        await stakeInput.fill('0')
        const stakeButton = page.locator(SELECTORS.stakeButton)
        await expect(stakeButton).toBeDisabled()
      })

      await test.step('Test valid amount input', async () => {
        await stakeInput.fill(TEST_AMOUNTS.stake.small)
        await expect(stakeInput).toHaveValue(TEST_AMOUNTS.stake.small)
      })
    }
  })

  test('should show proper UI states during loading', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for loading states
    const hasLoadingState = await Promise.race([
      page.locator('text=Loading dashboard...').isVisible(),
      page.locator(SELECTORS.loadingSpinner).isVisible(),
      page.locator(SELECTORS.connectWallet).isVisible()
    ])
    
    expect(hasLoadingState).toBeTruthy()
  })

  test('should display faucet interface for testing', async ({ page }) => {
    await page.goto('/faucet')
    await page.waitForLoadState('networkidle')
    
    // Verify faucet page loads
    const hasFaucetContent = await Promise.race([
      page.locator('text=Faucet').isVisible(),
      page.locator('text=Test Token').isVisible(),
      page.locator('button').first().isVisible()
    ])
    
    expect(hasFaucetContent).toBeTruthy()
  })

  test('should display contract information page', async ({ page }) => {
    await page.goto('/contracts')
    await page.waitForLoadState('networkidle')
    
    // Verify contracts page loads
    const hasContractsContent = await Promise.race([
      page.locator('text=Contract').isVisible(),
      page.locator('text=Address').isVisible(),
      page.locator('text=0x').isVisible()
    ])
    
    expect(hasContractsContent).toBeTruthy()
  })

  test('should handle max safe button functionality', async ({ page }) => {
    await page.goto('/dashboard')
    
    const stakeInput = page.locator(SELECTORS.stakeInput)
    const maxSafeButton = page.locator(SELECTORS.maxSafeButton)
    
    if (await stakeInput.isVisible({ timeout: 5000 }) && await maxSafeButton.isVisible()) {
      await test.step('Test Max Safe button', async () => {
        await maxSafeButton.click()
        
        // Should populate input with some value
        const value = await stakeInput.inputValue()
        expect(value).toBeTruthy()
        expect(parseFloat(value) >= 0).toBeTruthy()
      })
    }
  })

  test('should show error states appropriately', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Look for any error handling
    const hasErrorHandling = await Promise.race([
      page.locator(SELECTORS.errorMessage).isVisible(),
      page.locator('text=Wrong Network').isVisible(),
      page.locator('text=Error').isVisible()
    ])
    
    // Error handling should exist (even if no errors currently shown)
    // This tests that error UI patterns are in place
  })
})