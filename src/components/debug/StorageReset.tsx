import { Button } from '../ui/button'
import { RotateCcw } from 'lucide-react'

export function StorageReset() {
  const clearStorage = () => {
    // Clear localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    // Force reload to reinitialize everything
    window.location.reload()
  }

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-destructive mb-2 flex items-center gap-2">
        <RotateCcw className="h-4 w-4" />
        Storage Reset
      </h3>
      <p className="text-sm text-destructive/80 mb-3">
        If you're seeing old contract addresses, click below to clear all cached data:
      </p>
      <Button 
        onClick={clearStorage}
        variant="destructive"
        size="sm"
      >
        Clear Cache & Reload
      </Button>
    </div>
  )
}