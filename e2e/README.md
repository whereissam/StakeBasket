# E2E Testing with Synpress & Playwright

This directory contains End-to-End (E2E) tests for the StakeBasket dApp using [Synpress](https://synpress.io) and [Playwright](https://playwright.dev).

## Overview

Synpress is a Web3-focused E2E testing framework that extends Playwright with Web3 wallet integration capabilities, particularly MetaMask.

## Directory Structure

```
e2e/
├── fixtures/          # Test data and constants
│   └── test-data.ts   # Test wallets, amounts, selectors
├── setup/             # Global test setup
│   └── global-setup.ts
├── tests/             # Test files
│   ├── wallet-connection.spec.ts
│   └── staking-flow.spec.ts
├── utils/             # Helper utilities
│   └── wallet-helpers.ts
└── README.md
```

## Getting Started

### 1. Install Dependencies

Dependencies are already installed, but if needed:

```bash
bun install
bun run e2e:install  # Install Playwright browsers
```

### 2. Start Development Server

Make sure your dApp is running locally:

```bash
bun run dev  # Starts on http://localhost:5173
```

### 3. Run Tests

#### Basic test run:
```bash
bun run e2e
```

#### Debug mode (step through tests):
```bash
bun run e2e:debug
```

#### UI mode (interactive test runner):
```bash
bun run e2e:ui
```

#### Headed mode (see browser):
```bash
bun run e2e:headed
```

#### View test report:
```bash
bun run e2e:report
```

## Test Configuration

The tests are configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:5173`
- **Browsers**: Chrome (with MetaMask support)
- **Timeout**: 60 seconds per test
- **Retry**: 2 retries on CI
- **Workers**: 2 (local), 1 (CI)

## Available Tests

### 1. Wallet Connection Tests (`wallet-connection.spec.ts`)
- ✅ App loads without wallet connection
- ✅ Navigation between pages
- ✅ Mobile responsive behavior
- ✅ Theme switching
- ✅ Error state handling

### 2. Staking Flow Tests (`staking-flow.spec.ts`)
- ✅ Wallet connection flow
- ✅ Dashboard display
- ✅ Staking form interactions
- ✅ Dual staking interface
- ✅ Governance interface
- ✅ Form validation
- ✅ Transaction flow (requires wallet setup)

## MetaMask Integration

To test with MetaMask:

1. **Install MetaMask extension** in your test browser
2. **Set up test wallet** with the test mnemonic
3. **Configure test network** (localhost:8545 or Core Testnet)
4. **Fund test wallet** with test tokens

### Test Wallet Details

```typescript
// WARNING: These are well-known Hardhat/Anvil test values
// NEVER use on mainnet - they are public knowledge!
const TEST_WALLET = {
  mnemonic: 'test test test test test test test test test test test junk',
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  // Private keys should be loaded from environment variables
}
```

**Security Note**: These are the default test values from Hardhat/Anvil - they are publicly known and should only be used on local test networks.

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { WalletHelper } from '../utils/wallet-helpers'

test.describe('Your Test Suite', () => {
  test('should do something', async ({ page }) => {
    // Navigate to app
    await page.goto('/')
    
    // Your test logic here
    await expect(page.locator('h1')).toBeVisible()
  })
})
```

### With Wallet Integration

```typescript
test('should connect wallet and stake', async ({ page }) => {
  const walletHelper = new WalletHelper(page)
  
  // Connect MetaMask
  await walletHelper.connectMetaMask()
  await walletHelper.waitForConnection()
  
  // Perform staking actions
  await page.fill('[data-testid="stake-input"]', '1')
  await page.click('[data-testid="stake-button"]')
  
  // Verify transaction
  await expect(page.locator('text=Transaction Submitted')).toBeVisible()
})
```

## Test Data & Selectors

Update `fixtures/test-data.ts` to match your app's selectors:

```typescript
export const SELECTORS = {
  connectWallet: '[data-testid="connect-wallet"]',
  stakeInput: '[data-testid="stake-input"]',
  stakeButton: '[data-testid="stake-button"]',
  // Add more selectors as needed
}
```

## Best Practices

### 1. Use Data Test IDs
Add `data-testid` attributes to your components:

```tsx
<button data-testid="connect-wallet">Connect Wallet</button>
<input data-testid="stake-input" />
<button data-testid="stake-button">Stake</button>
```

### 2. Test Structure
- Group related tests in `describe` blocks
- Use descriptive test names
- Keep tests focused and independent
- Use `test.step()` for complex test flows

### 3. Wait Strategies
- Use `page.waitForLoadState('networkidle')` for dynamic content
- Use `expect().toBeVisible()` with timeouts for async elements
- Avoid `page.waitForTimeout()` unless absolutely necessary

### 4. Error Handling
- Test both success and error scenarios
- Verify proper error messages
- Test network disconnection scenarios

## CI/CD Integration

For GitHub Actions or similar CI:

```yaml
- name: Install dependencies
  run: bun install

- name: Install Playwright browsers
  run: bun run e2e:install

- name: Run E2E tests
  run: bun run e2e
```

## Troubleshooting

### Common Issues

1. **MetaMask not connecting**
   - Ensure MetaMask extension is installed
   - Check if test wallet is imported
   - Verify network configuration

2. **Tests timing out**
   - Increase timeout in `playwright.config.ts`
   - Check if app is running on correct port
   - Use `page.waitForLoadState()` appropriately

3. **Selector not found**
   - Add `data-testid` attributes
   - Use browser dev tools to verify selectors
   - Check if elements are in viewport

4. **Network issues**
   - Ensure local Hardhat node is running
   - Verify contract deployments
   - Check RPC connection

### Debugging

```bash
# Run specific test file
bun run e2e tests/wallet-connection.spec.ts

# Run in debug mode
bun run e2e:debug

# Run with browser visible
bun run e2e:headed

# Generate trace for failed tests
bun run e2e --trace on
```

## Resources

- [Synpress Documentation](https://docs.synpress.io)
- [Playwright Documentation](https://playwright.dev)
- [MetaMask Testing](https://docs.metamask.io/guide/testing.html)