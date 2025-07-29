import { Link, useLocation } from '@tanstack/react-router'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from './ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon?: ReactNode
  description?: string
}

interface NavDropdownProps {
  title: string
  items: NavItem[]
  className?: string
}

export function NavDropdown({ title, items, className = '' }: NavDropdownProps) {
  const location = useLocation()
  const isActive = items.some(item => location.pathname === item.to)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`flex items-center gap-1 transition-colors cursor-pointer ${
        isActive 
          ? 'text-primary font-medium' 
          : 'text-muted-foreground hover:text-foreground'
      } ${className}`}>
        {title}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {items.map((item, index) => (
          <DropdownMenuItem key={index} asChild>
            <Link 
              to={item.to}
              className="dropdown-menu-item flex items-center gap-3 cursor-pointer w-full"
            >
              {item.icon && (
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
              )}
              <div className="flex-1">
                <div className="dropdown-menu-item-title">
                  {item.label}
                </div>
                {item.description && (
                  <div className="dropdown-menu-item-description">
                    {item.description}
                  </div>
                )}
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}