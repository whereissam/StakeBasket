import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X, BarChart3, Coins, Zap, Vote, Info, FileCode, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { ConnectWallet } from '@/components/ConnectWallet'
import { NetworkSwitcher } from '@/components/NetworkSwitcher'
import { MobileNavSection } from '@/components/MobileNavSection'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div className="sm:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9"
      >
        {isOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Menu className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle menu</span>
      </Button>

      {isOpen && (
        <div className="fixed top-16 left-0 right-0 bg-background border-border shadow-xl z-50 border-b backdrop-blur-md">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary [&.active]:text-primary [&.active]:font-medium transition-colors py-3 cursor-pointer text-base min-h-[44px] flex items-center"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/dashboard" 
                className="text-foreground hover:text-primary [&.active]:text-primary [&.active]:font-medium transition-colors py-3 cursor-pointer text-base min-h-[44px] flex items-center"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              
              <MobileNavSection
                title="Staking"
                isDark={isDark}
                onItemClick={() => setIsOpen(false)}
                items={[
                  {
                    to: "/staking",
                    label: "BASKET Staking",
                    icon: <Coins className="h-4 w-4 text-blue-500" />,
                    description: "Single-token staking with tier benefits"
                  },
                  {
                    to: "/dual-staking",
                    label: "Dual Staking",
                    icon: <BarChart3 className="h-4 w-4 text-purple-500" />,
                    description: "CORE + BTC dual asset staking"
                  },
                  {
                    to: "/sparks",
                    label: "Sparks Rewards",
                    icon: <Zap className="h-4 w-4 text-yellow-500" />,
                    description: "Earn points and unlock benefits"
                  }
                ]}
              />

              <MobileNavSection
                title="Platform"
                isDark={isDark}
                onItemClick={() => setIsOpen(false)}
                items={[
                  {
                    to: "/governance",
                    label: "Governance",
                    icon: <Vote className="h-4 w-4 text-green-500" />,
                    description: "Vote on protocol proposals"
                  },
                  {
                    to: "/contracts",
                    label: "Contracts",
                    icon: <FileCode className="h-4 w-4 text-orange-500" />,
                    description: "Smart contract addresses"
                  },
                  {
                    to: "/about",
                    label: "About",
                    icon: <Info className="h-4 w-4 text-gray-500" />,
                    description: "Learn about StakeBasket"
                  },
                  {
                    to: "/features",
                    label: "Features",
                    icon: <LayoutDashboard className="h-4 w-4 text-blue-500" />,
                    description: "Platform features"
                  }
                ]}
              />
              <div className="pt-6 border-t border-border space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2 text-foreground">Network</p>
                  <NetworkSwitcher />
                </div>
                <ConnectWallet />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}