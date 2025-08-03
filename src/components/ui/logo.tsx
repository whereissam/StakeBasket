import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'default' | 'compact'
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8', 
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg', 
  xl: 'text-xl'
}

export function Logo({ className, size = 'md', showText = false, variant = 'default' }: LogoProps) {
  const logoSrc = variant === 'compact' ? '/logo.png' : '/brand.png'
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src={logoSrc}
        alt="StakeBasket" 
        className={cn(sizeClasses[size], "object-contain")}
      />
      {showText && (
        <span className={cn("font-bold text-foreground", textSizeClasses[size])}>
          StakeBasket
        </span>
      )}
    </div>
  )
}

// Icon-only version for compact spaces (uses compact variant)
export function LogoIcon({ className, size = 'md' }: Omit<LogoProps, 'showText' | 'variant'>) {
  return <Logo className={className} size={size} showText={false} variant="compact" />
}

// Full logo with text for headers (uses default brand variant)
export function LogoFull({ className, size = 'lg' }: Omit<LogoProps, 'showText' | 'variant'>) {
  return <Logo className={className} size={size} showText={true} variant="default" />
}

// Compact logo for navigation
export function LogoCompact({ className, size = 'md', showText = true }: Omit<LogoProps, 'variant'>) {
  return <Logo className={className} size={size} showText={showText} variant="compact" />
}