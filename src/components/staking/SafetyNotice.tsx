import { Card, CardContent } from '../ui/card'

export function SafetyNotice() {
  return (
    <Card className="bg-muted/20 border-muted">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <h3 className="font-semibold text-foreground">Built for Safety & Transparency</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-chart-2/10 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-chart-2 rounded-full"></div>
              </div>
              <div className="text-center">
                <div className="font-medium">Audited Smart Contracts</div>
                <div className="text-muted-foreground text-xs">Code reviewed for security vulnerabilities</div>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-primary rounded-full"></div>
              </div>
              <div className="text-center">
                <div className="font-medium">Open Source</div>
                <div className="text-muted-foreground text-xs">All contract code publicly verifiable</div>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-chart-3/10 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-chart-3 rounded-full"></div>
              </div>
              <div className="text-center">
                <div className="font-medium">Non-Custodial</div>
                <div className="text-muted-foreground text-xs">You maintain full control of your assets</div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
              This is an experimental DeFi protocol built on CoreDAO. While contracts are audited, 
              cryptocurrency investments carry inherent risks. Only invest what you can afford to lose. 
              Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}