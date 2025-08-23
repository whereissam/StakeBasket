import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ReactNode } from 'react'

interface BalanceCardProps {
  title: string
  value: string | number
  subtitle: string
  icon?: ReactNode
  className?: string
  formatter?: (value: number) => string
}

export function BalanceCard({
  title,
  value,
  subtitle,
  icon,
  className = "",
  formatter
}: BalanceCardProps) {
  const displayValue = typeof value === 'number' && formatter 
    ? formatter(value)
    : typeof value === 'number' 
    ? value.toLocaleString()
    : value

  return (
    <Card className={`bg-card border-border shadow-md ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">{title}</CardTitle>
        {icon && <div className="text-primary">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-card-foreground">{displayValue}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}