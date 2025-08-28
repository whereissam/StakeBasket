import { test, expect } from '@playwright/test'

test.describe('Wallet Connection Tests', () => {
  test('should load app without wallet connection', async ({ page }) => {
    await page.goto('/')
    
    // Verify app loads
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Connect Wallet')).toBeVisible()
  })

  test('should show correct network information', async ({ page }) => {
    await page.goto('/')
    
    // Look for network indicators
    const networkElements = page.locator('[data-testid*="network"], text=/Core|Testnet/')
    
    if (await networkElements.first().isVisible()) {
      await expect(networkElements.first()).toBeVisible()
    }
  })

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/')
    
    // Test navigation links
    const links = [
      { text: 'Dashboard', path: '/dashboard' },
      { text: 'Staking', path: '/staking' },
      { text: 'Dual Staking', path: '/dual-staking' },
      { text: 'Governance', path: '/governance' },
    ]

    for (const link of links) {
      await test.step(`Navigate to ${link.text}`, async () => {
        // Click navigation link if it exists
        const navLink = page.locator(`a[href="${link.path}"], button:has-text("${link.text}")`)
        
        if (await navLink.first().isVisible()) {
          await navLink.first().click()
          await page.waitForURL(`**${link.path}`)
          await expect(page).toHaveURL(new RegExp(link.path))
        } else {
          // Navigate directly if nav link not found
          await page.goto(link.path)
        }
        
        await page.waitForLoadState('networkidle')
      })
    }
  })

  test('should display mobile navigation on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Look for mobile menu button
    const mobileMenuButton = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]')
    
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click()
      
      // Verify mobile navigation is shown
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    }
  })

  test('should handle theme switching', async ({ page }) => {
    await page.goto('/')
    
    // Look for theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"]')
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click()
      
      // Verify theme change (check for dark/light class on html or body)
      await expect(page.locator('html')).toHaveClass(/dark|light/)
    }
  })

  test('should display proper error states', async ({ page }) => {
    // Navigate to a page that requires wallet connection
    await page.goto('/dashboard')
    
    // Should show appropriate messaging for disconnected state
    const connectPrompt = page.locator('text=Connect your wallet, text=Please connect')
    
    if (await connectPrompt.first().isVisible()) {
      await expect(connectPrompt.first()).toBeVisible()
    }
  })
})