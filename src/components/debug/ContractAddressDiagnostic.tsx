import { useContractStore } from '../../store/useContractStore'
import { useChainId } from 'wagmi'
import { useRef, useEffect } from 'react'
import { Search } from 'lucide-react'

export function ContractAddressDiagnostic() {
  const chainId = useChainId()
  
  // Use specific selectors to avoid object reference issues
  const getAddress = useContractStore(state => state.getContractAddress)
  const stakeBasket = getAddress('StakeBasket')
  const stakeBasketToken = getAddress('StakeBasketToken')
  const priceFeed = getAddress('PriceFeed')
  const dualStakingBasket = getAddress('DualStakingBasket')
  
  // Track previous values to only log when they actually change
  const prevValuesRef = useRef({
    chainId: 0,
    StakeBasket: '',
    StakeBasketToken: '',
    PriceFeed: '',
    DualStakingBasket: ''
  })
  
  // Only log when values actually change (not object references)
  useEffect(() => {
    const currentValues = {
      chainId: chainId || 0,
      StakeBasket: stakeBasket,
      StakeBasketToken: stakeBasketToken,
      PriceFeed: priceFeed,
      DualStakingBasket: dualStakingBasket
    }
    
    // Check if any value actually changed
    const hasChanged = (
      prevValuesRef.current.chainId !== currentValues.chainId ||
      prevValuesRef.current.StakeBasket !== currentValues.StakeBasket ||
      prevValuesRef.current.StakeBasketToken !== currentValues.StakeBasketToken ||
      prevValuesRef.current.PriceFeed !== currentValues.PriceFeed ||
      prevValuesRef.current.DualStakingBasket !== currentValues.DualStakingBasket
    )
    
    if (hasChanged) {
      console.log('🔍 Contract Address Diagnostic:', {
        chainId: currentValues.chainId,
        contracts: {
          StakeBasket: currentValues.StakeBasket,
          StakeBasketToken: currentValues.StakeBasketToken,
          PriceFeed: currentValues.PriceFeed,
          DualStakingBasket: currentValues.DualStakingBasket
        }
      })
      prevValuesRef.current = currentValues
    }
  }, [chainId, stakeBasket, stakeBasketToken, priceFeed, dualStakingBasket])
  
  return (
    <div className="bg-muted/50 border border-muted rounded-lg p-4 mb-4">
      <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
        <Search className="h-4 w-4" />
        Contract Address Diagnostic
      </h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p><strong>Chain ID:</strong> {chainId}</p>
        <p><strong>StakeBasket:</strong> {stakeBasket}</p>
        <p><strong>Expected:</strong> 0x88BC8a4398a6364290933a93DcE03AAad616dC01</p>
        <p><strong>Match:</strong> {stakeBasket === '0x88BC8a4398a6364290933a93DcE03AAad616dC01' ? '✅' : '❌'}</p>
        <hr className="my-2 border-border" />
        <p><strong>StakeBasketToken:</strong> {stakeBasketToken}</p>
        <p><strong>Expected:</strong> 0xE0E0b66E661068Fd4311F6fbC34c0c1eb869784F</p>
        <p><strong>Match:</strong> {stakeBasketToken === '0xE0E0b66E661068Fd4311F6fbC34c0c1eb869784F' ? '✅' : '❌'}</p>
      </div>
    </div>
  )
}