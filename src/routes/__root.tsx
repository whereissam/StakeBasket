import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import '@/index.css'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileNav } from '@/components/mobile-nav'
import { ConnectWallet } from '@/components/ConnectWallet'
import { NetworkSwitcher } from '@/components/NetworkSwitcher'
import { NavDropdown } from '@/components/NavDropdown'
import { NetworkSwitchModal } from '@/components/NetworkSwitchModal'
import { LogoIcon, LogoCompact } from '@/components/ui/logo'
import { BarChart3, Coins, Zap, Vote, Info, FileCode, LayoutDashboard } from 'lucide-react'
import { useNetworkDetection } from '@/hooks/useNetworkDetection'
import { ComponentErrorBoundary, RouteErrorBoundary } from '@/components/ErrorBoundary'

function RootComponent() {
  const networkDetection = useNetworkDetection()

  return (
    <>
      <nav className="sticky top-0 bg-background border-b border-border z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 md:space-x-8">
              <ComponentErrorBoundary>
                <Link 
                  to="/" 
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className="hidden sm:block">
                    <LogoCompact size="md" showText={true} />
                  </div>
                  <div className="sm:hidden">
                    <LogoIcon size="md" />
                  </div>
                </Link>
              </ComponentErrorBoundary>
              <div className="hidden sm:flex space-x-6">
                <Link 
                  to="/" 
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors cursor-pointer"
                >
                  Home
                </Link>
                <Link 
                  to="/dashboard" 
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors cursor-pointer"
                >
                  Dashboard
                </Link>
                
                <NavDropdown 
                  title="Staking"
                  items={[
                    {
                      to: "/staking",
                      label: "BASKET Staking",
                      icon: <Coins className="h-4 w-4 text-primary" />,
                      description: "Traditional single-token staking with tier benefits"
                    },
                    {
                      to: "/dual-staking",
                      label: "Dual Staking",
                      icon: <BarChart3 className="h-4 w-4 text-accent" />,
                      description: "CORE + BTC dual asset staking for optimal yields"
                    },
                    {
                      to: "/sparks",
                      label: "Sparks Rewards",
                      icon: <Zap className="h-4 w-4 text-chart-5" />,
                      description: "Earn points and unlock exclusive benefits"
                    }
                  ]}
                />

                <NavDropdown 
                  title="Platform"
                  items={[
                    {
                      to: "/governance",
                      label: "Governance",
                      icon: <Vote className="h-4 w-4 text-chart-2" />,
                      description: "Vote on protocol proposals and changes"
                    },
                    // {
                    //   to: "/faucet",
                    //   label: "Test Faucet",
                    //   icon: <Droplets className="h-4 w-4 text-cyan-500" />,
                    //   description: "Get test tokens for development"
                    // },
                    {
                      to: "/contracts",
                      label: "Contracts",
                      icon: <FileCode className="h-4 w-4 text-chart-1" />,
                      description: "Smart contract addresses and network details"
                    },
                    {
                      to: "/about",
                      label: "About",
                      icon: <Info className="h-4 w-4 text-muted-foreground" />,
                      description: "Learn more about StakeBasket"
                    },
                    {
                      to: "/features",
                      label: "Features",
                      icon: <LayoutDashboard className="h-4 w-4 text-primary" />,
                      description: "Explore all platform features"
                    }
                  ]}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ComponentErrorBoundary>
                <div className="hidden sm:block">
                  <NetworkSwitcher />
                </div>
                <div className="hidden sm:block">
                  <ConnectWallet />
                </div>
                <ThemeToggle />
                <MobileNav />
              </ComponentErrorBoundary>
            </div>
          </div>
        </div>
      </nav>
      <ComponentErrorBoundary>
        <Outlet />
      </ComponentErrorBoundary>
      
      {/* Global Network Switch Modal */}
      <ComponentErrorBoundary>
        <NetworkSwitchModal
          isOpen={networkDetection.showNetworkModal}
          onClose={networkDetection.dismissModal}
          validation={networkDetection.validation}
          currentChainId={networkDetection.chainId}
        />
      </ComponentErrorBoundary>
      
      <TanStackRouterDevtools />
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouteErrorBoundary,
})