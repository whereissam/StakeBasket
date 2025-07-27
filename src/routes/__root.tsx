import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileNav } from '@/components/mobile-nav'
import { ConnectWallet } from '@/components/ConnectWallet'

export const Route = createRootRoute({
  component: () => (
    <>
      <nav className="bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Link 
                to="/" 
                className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                StakeBasket
              </Link>
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
                <Link 
                  to="/about" 
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors cursor-pointer"
                >
                  About
                </Link>
                <Link 
                  to="/features" 
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors cursor-pointer"
                >
                  Features
                </Link>
                <Link 
                  to="/contracts" 
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors cursor-pointer"
                >
                  Contracts
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="hidden sm:block">
                <ConnectWallet />
              </div>
              <ThemeToggle />
              <MobileNav />
            </div>
          </div>
        </div>
      </nav>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})