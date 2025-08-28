import { Page } from '@playwright/test'

export class WalletHelper {
  constructor(private page: Page) {}

  // Connect to MetaMask wallet
  async connectMetaMask() {
    // Look for connect wallet button
    await this.page.click('[data-testid="connect-wallet"], button:has-text("Connect Wallet")')
    
    // Wait for wallet selection modal
    await this.page.waitForSelector('text=MetaMask', { timeout: 10000 })
    
    // Click MetaMask option
    await this.page.click('button:has-text("MetaMask")')
    
    console.log('MetaMask connection initiated')
  }

  // Switch to a specific network
  async switchNetwork(networkName: string) {
    // Look for network switcher
    await this.page.click('[data-testid="network-switcher"], button:has-text("Core Testnet")')
    
    // Select the desired network
    await this.page.click(`button:has-text("${networkName}")`)
    
    console.log(`Switched to ${networkName}`)
  }

  // Wait for wallet connection to be established
  async waitForConnection() {
    await this.page.waitForSelector('[data-testid="wallet-connected"], text=0x', { timeout: 15000 })
    console.log('Wallet connected successfully')
  }

  // Get connected wallet address
  async getConnectedAddress(): Promise<string> {
    const addressElement = await this.page.locator('[data-testid="wallet-address"], text=/0x[a-fA-F0-9]{40}/')
    return await addressElement.textContent() || ''
  }
}