import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ContractAddressProps {
  address: string
  label: string
  explorerUrl?: string
  className?: string
}

export function ContractAddress({ address, label, explorerUrl, className }: ContractAddressProps) {
  const [copied, setCopied] = useState(false)

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      
      {/* Mobile layout */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="font-mono text-sm text-foreground">
            {truncateAddress(address)}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            {explorerUrl && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 w-8 p-0"
              >
                <a 
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
        {copied && (
          <p className="text-xs text-green-600 text-center">Copied to clipboard!</p>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
          <div className="flex-1 min-w-0">
            {explorerUrl ? (
              <a 
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs break-all text-primary hover:underline"
              >
                {address}
              </a>
            ) : (
              <span className="font-mono text-xs break-all text-foreground">
                {address}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="ml-2 h-8 w-8 p-0 flex-shrink-0"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        {copied && (
          <p className="text-xs text-green-600">Copied to clipboard!</p>
        )}
      </div>
    </div>
  )
}