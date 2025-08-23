import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ContractAddress } from '../ui/contract-address'

interface ContractInfoProps {
  config: { 
    name: string 
    explorer: string 
  }
  contractAddresses: {
    StakeBasket: string
    StakeBasketToken: string
    CoreOracle?: string
    StakingManager: string
  }
}

export function ContractInfo({ config, contractAddresses }: ContractInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Information</CardTitle>
        <CardDescription>
          Your ETF is deployed on {config.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContractAddress
            label="StakeBasket Contract"
            address={contractAddresses.StakeBasket}
            explorerUrl={`${config.explorer}/address/${contractAddresses.StakeBasket}`}
          />
          <ContractAddress
            label="BASKET Token"
            address={contractAddresses.StakeBasketToken}
            explorerUrl={`${config.explorer}/address/${contractAddresses.StakeBasketToken}`}
          />
          {contractAddresses.CoreOracle && (
            <ContractAddress
              label="Core Oracle"
              address={contractAddresses.CoreOracle}
              explorerUrl={`${config.explorer}/address/${contractAddresses.CoreOracle}`}
            />
          )}
          <ContractAddress
            label="Staking Manager"
            address={contractAddresses.StakingManager}
            explorerUrl={`${config.explorer}/address/${contractAddresses.StakingManager}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}