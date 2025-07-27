export function About() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">About StakeBasket</h1>
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          StakeBasket is a multi-asset staking ETF platform built on the Core blockchain that optimizes yield for CORE and lstBTC tokens.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
            <p className="text-muted-foreground">
              To democratize access to professional-grade staking strategies by providing a simple, secure, and efficient way 
              to earn yield on Core blockchain assets through automated portfolio management.
            </p>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-3">How It Works</h2>
            <p className="text-muted-foreground">
              StakeBasket automatically allocates your deposits across high-performing CORE validators and liquid staked Bitcoin (lstBTC) 
              to maximize returns while maintaining liquidity and minimizing risk.
            </p>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Key Features</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Professional validator selection and management</li>
            <li>Automatic reward compounding</li>
            <li>Instant liquidity with BASKET token redemption</li>
            <li>Transparent on-chain operations</li>
            <li>Low management fees (0.5% annually)</li>
            <li>Multi-asset exposure (CORE + lstBTC)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
