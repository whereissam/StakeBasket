/**
 * Environment detection utilities
 */

export const isDevelopment = () => {
  // Check if we're in development mode
  return import.meta.env.DEV || import.meta.env.MODE === 'development'
}

export const isProduction = () => {
  return import.meta.env.PROD || import.meta.env.MODE === 'production'
}

export const isLocalNetwork = (chainId: number) => {
  // Local development networks
  return chainId === 31337 || chainId === 1337
}

export const shouldShowDebugComponents = (chainId?: number) => {
  // Show debug components only in development or on local networks
  return isDevelopment() || (chainId && isLocalNetwork(chainId))
}