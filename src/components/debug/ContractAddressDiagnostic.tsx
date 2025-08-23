import { useContracts } from '../../hooks/useContracts'
import { useChainId } from 'wagmi'
import { Search } from 'lucide-react'

export function ContractAddressDiagnostic() {
  const chainId = useChainId()
  const { contracts } = useContracts()
  
  console.log('🔍 Contract Address Diagnostic:', {
    chainId,
    contracts: {
      StakeBasket: contracts.StakeBasket,
      StakeBasketToken: contracts.StakeBasketToken,
      PriceFeed: contracts.PriceFeed,
      DualStakingBasket: contracts.DualStakingBasket
    }
  })
  
  return (
    <div className="bg-muted/50 border border-muted rounded-lg p-4 mb-4">
      <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
        <Search className="h-4 w-4" />
        Contract Address Diagnostic
      </h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p><strong>Chain ID:</strong> {chainId}</p>
        <p><strong>StakeBasket:</strong> {contracts.StakeBasket}</p>
        <p><strong>Expected:</strong> 0x976C214741b4657bd99DFD38a5c0E3ac5C99D903</p>
        <p><strong>Match:</strong> {contracts.StakeBasket === '0x976C214741b4657bd99DFD38a5c0E3ac5C99D903' ? '✅' : '❌'}</p>
        <hr className="my-2 border-border" />
        <p><strong>StakeBasketToken:</strong> {contracts.StakeBasketToken}</p>
        <p><strong>Expected:</strong> 0x114e375B6FCC6d6fCb68c7A1d407E652C54F25FB</p>
        <p><strong>Match:</strong> {contracts.StakeBasketToken === '0x114e375B6FCC6d6fCb68c7A1d407E652C54F25FB' ? '✅' : '❌'}</p>
      </div>
    </div>
  )
}