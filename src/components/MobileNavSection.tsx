import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon?: ReactNode
  description?: string
}

interface MobileNavSectionProps {
  title: string
  items: NavItem[]
  isDark: boolean
  onItemClick: () => void
}

export function MobileNavSection({ title, items, isDark, onItemClick }: MobileNavSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between py-3 text-base font-medium transition-colors ${
          isDark ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
        }`}
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      
      {isExpanded && (
        <div className="ml-4 space-y-1">
          {items.map((item, index) => (
            <Link
              key={index}
              to={item.to}
              onClick={onItemClick}
              className={`flex items-center gap-3 py-2 px-3 rounded-md transition-colors ${
                isDark 
                  ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              {item.icon && (
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">{item.label}</div>
                {item.description && (
                  <div className="text-xs opacity-75 mt-0.5">
                    {item.description}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}