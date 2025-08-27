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
        <p><strong>Expected:</strong> 0x88BC8a4398a6364290933a93DcE03AAad616dC01</p>
        <p><strong>Match:</strong> {contracts.StakeBasket === '0x88BC8a4398a6364290933a93DcE03AAad616dC01' ? '✅' : '❌'}</p>
        <hr className="my-2 border-border" />
        <p><strong>StakeBasketToken:</strong> {contracts.StakeBasketToken}</p>
        <p><strong>Expected:</strong> 0xE0E0b66E661068Fd4311F6fbC34c0c1eb869784F</p>
        <p><strong>Match:</strong> {contracts.StakeBasketToken === '0xE0E0b66E661068Fd4311F6fbC34c0c1eb869784F' ? '✅' : '❌'}</p>
      </div>
    </div>
  )
}