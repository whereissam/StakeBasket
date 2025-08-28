import { test, expect } from '@playwright/test'
import { SELECTORS } from '../fixtures/test-data'

test.describe('Navigation and Route Tests', () => {
  
  test('should navigate to home page and show basic content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Home page should load
    await expect(page).toHaveURL('/')
    
    // Look for main heading or connect wallet button
    const hasContent = await Promise.race([
      page.locator('h1').isVisible(),
      page.locator(SELECTORS.connectWallet).isVisible(),
      page.locator('text=StakeBasket').isVisible()
    ])
    
    expect(hasContent).toBeTruthy()
  })

  test('should navigate to dashboard page', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Should show either dashboard content or wallet connection prompt
    const isDashboardVisible = await Promise.race([
      page.locator(SELECTORS.dashboardTitle).isVisible(),
      page.locator(SELECTORS.connectWallet).isVisible(),
      page.locator('text=Loading dashboard...').isVisible()
    ])
    
    expect(isDashboardVisible).toBeTruthy()
  })

  test('should navigate to BASKET staking page', async ({ page }) => {
    await page.goto('/staking')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/staking')
    await expect(page.locator(SELECTORS.basketStakingTitle)).toBeVisible()
    await expect(page.locator('text=Stake your BASKET tokens')).toBeVisible()
  })

  test('should navigate to dual staking page', async ({ page }) => {
    await page.goto('/dual-staking')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/dual-staking')
    
    // Should show dual staking interface
    const hasDualStakingContent = await Promise.race([
      page.locator(SELECTORS.dualStakingInterface).isVisible(),
      page.locator('text=CORE').isVisible(),
      page.locator('text=lstBTC').isVisible()
    ])
    
    expect(hasDualStakingContent).toBeTruthy()
  })

  test('should navigate to governance page', async ({ page }) => {
    await page.goto('/governance')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/governance')
    
    // Look for governance-related content
    const hasGovernanceContent = await Promise.race([
      page.locator('text=Governance').isVisible(),
      page.locator('text=Proposals').isVisible(),
      page.locator('text=Voting').isVisible()
    ])
    
    expect(hasGovernanceContent).toBeTruthy()
  })

  test('should navigate to faucet page', async ({ page }) => {
    await page.goto('/faucet')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/faucet')
    
    // Look for faucet-related content
    const hasFaucetContent = await Promise.race([
      page.locator('text=Faucet').isVisible(),
      page.locator('text=Test Tokens').isVisible(),
      page.locator('button').isVisible()
    ])
    
    expect(hasFaucetContent).toBeTruthy()
  })

  test('should navigate to contracts page', async ({ page }) => {
    await page.goto('/contracts')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/contracts')
    
    // Look for contracts-related content
    const hasContractsContent = await Promise.race([
      page.locator('text=Contract').isVisible(),
      page.locator('text=Address').isVisible(),
      page.locator('text=0x').isVisible()
    ])
    
    expect(hasContractsContent).toBeTruthy()
  })

  test('should navigate to sparks page', async ({ page }) => {
    await page.goto('/sparks')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/sparks')
    
    // Look for sparks-related content
    const hasSparksContent = await Promise.race([
      page.locator('text=Sparks').isVisible(),
      page.locator('text=Reward').isVisible(),
      page.locator('button').isVisible()
    ])
    
    expect(hasSparksContent).toBeTruthy()
  })

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/about')
    
    // Look for about page content
    const hasAboutContent = await Promise.race([
      page.locator('text=About').isVisible(),
      page.locator('text=StakeBasket').isVisible(),
      page.locator('h1, h2, h3').isVisible()
    ])
    
    expect(hasAboutContent).toBeTruthy()
  })

  test('should navigate to features page', async ({ page }) => {
    await page.goto('/features')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveURL('/features')
    
    // Look for features page content
    const hasFeaturesContent = await Promise.race([
      page.locator('text=Features').isVisible(),
      page.locator('text=Feature').isVisible(),
      page.locator('h1, h2, h3').isVisible()
    ])
    
    expect(hasFeaturesContent).toBeTruthy()
  })

  test('should handle navigation between pages', async ({ page }) => {
    // Start at home
    await page.goto('/')
    await expect(page).toHaveURL('/')
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    
    // Navigate to staking
    await page.goto('/staking')
    await expect(page).toHaveURL('/staking')
    
    // Navigate to dual-staking
    await page.goto('/dual-staking')
    await expect(page).toHaveURL('/dual-staking')
    
    // Each navigation should work without errors
    await page.waitForLoadState('networkidle')
  })

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Visit multiple pages
    await page.goto('/')
    await page.goto('/dashboard')
    await page.goto('/staking')
    
    // Go back
    await page.goBack()
    await expect(page).toHaveURL('/dashboard')
    
    // Go back again
    await page.goBack()
    await expect(page).toHaveURL('/')
    
    // Go forward
    await page.goForward()
    await expect(page).toHaveURL('/dashboard')
  })
})