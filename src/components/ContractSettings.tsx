import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { useContractStore, ContractAddresses } from '../store/useContractStore'
import { useChainId } from 'wagmi'
import { Settings, Copy, Upload, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function ContractSettings() {
  const chainId = useChainId()
  const {
    useCustomAddresses,
    customAddresses,
    toggleCustomAddresses,
    setCustomAddress,
    resetToDefault,
    importConfiguration,
    exportConfiguration,
    getAllAddresses,
    isValidAddress
  } = useContractStore()

  const [editingContract, setEditingContract] = useState<string | null>(null)
  const [tempAddress, setTempAddress] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const allAddresses = getAllAddresses()

  const handleEditContract = (contractName: string, currentAddress: string) => {
    setEditingContract(contractName)
    setTempAddress(currentAddress)
  }

  const handleSaveContract = () => {
    if (!editingContract) return
    
    if (!isValidAddress(tempAddress)) {
      toast.error('Invalid address format')
      return
    }
    
    setCustomAddress(editingContract as keyof ContractAddresses, tempAddress)
    setEditingContract(null)
    setTempAddress('')
    toast.success(`Updated ${editingContract} address`)
  }

  const handleCancelEdit = () => {
    setEditingContract(null)
    setTempAddress('')
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied to clipboard')
  }

  const handleExportConfig = () => {
    const config = exportConfiguration()
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contract-config-chain-${chainId}.json`
    link.click()
    toast.success('Configuration exported')
  }

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string)
        importConfiguration(config)
        toast.success('Configuration imported successfully')
      } catch (error) {
        toast.error('Invalid configuration file')
      }
    }
    reader.readAsText(file)
  }

  const contractGroups = [
    {
      title: 'Core Contracts',
      contracts: ['StakeBasket', 'StakeBasketToken', 'PriceFeed', 'StakingManager', 'CoreOracle']
    },
    {
      title: 'Dual Staking',
      contracts: ['MockDualStaking', 'DualStakingBasket', 'SatoshiTierBasket']
    },
    {
      title: 'Mock Tokens',
      contracts: ['MockCORE', 'MockCoreBTC', 'MockLstBTC']
    },
    {
      title: 'Governance & Liquid Staking',
      contracts: ['BasketGovernance', 'BasketToken', 'CoreLiquidStakingManager', 'StCoreToken']
    },
    {
      title: 'Additional',
      contracts: ['BasketStaking', 'UnbondingQueue', 'SparksManager', 'StakeBasketWithSparks']
    }
  ]

  const getAddressStatus = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return { status: 'empty', color: 'bg-gray-500', icon: AlertCircle }
    }
    if (isValidAddress(address)) {
      return { status: 'valid', color: 'bg-green-500', icon: CheckCircle }
    }
    return { status: 'invalid', color: 'bg-red-500', icon: AlertCircle }
  }

  if (!showSettings) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Contract Settings
        </Button>
      </div>
    )
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Contract Configuration
            </CardTitle>
            <CardDescription>
              Manage contract addresses for Chain ID: {chainId}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(false)}
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Custom Addresses */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <div className="font-medium">Use Custom Addresses</div>
            <div className="text-sm text-muted-foreground">
              Override default contract addresses with custom ones
            </div>
          </div>
          <Switch
            checked={useCustomAddresses}
            onCheckedChange={toggleCustomAddresses}
          />
        </div>

        {/* Import/Export Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              Import Config
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="hidden"
              />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>

        {/* Contract Address Groups */}
        <div className="space-y-4">
          {contractGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="font-semibold text-lg">{group.title}</h3>
              <div className="grid gap-3">
                {group.contracts.map((contractName) => {
                  const address = allAddresses[contractName as keyof ContractAddresses]
                  const isCustom = customAddresses[contractName as keyof ContractAddresses]
                  const addressStatus = getAddressStatus(address)
                  
                  return (
                    <div
                      key={contractName}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{contractName}</span>
                          {isCustom && (
                            <Badge variant="secondary" className="text-xs">
                              Custom
                            </Badge>
                          )}
                          <div className={`w-2 h-2 rounded-full ${addressStatus.color}`} />
                        </div>
                        
                        {editingContract === contractName ? (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={tempAddress}
                              onChange={(e) => setTempAddress(e.target.value)}
                              placeholder="0x..."
                              className="font-mono text-sm"
                            />
                            <Button size="sm" onClick={handleSaveContract}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {address || 'Not set'}
                            </code>
                            {address && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyAddress(address)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditContract(contractName, address)}
                        disabled={editingContract === contractName}
                      >
                        Edit
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Environment Variables Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Environment Variables
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            You can also override addresses using environment variables:
          </p>
          <code className="text-xs block bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
            VITE_STAKE_BASKET_ADDRESS=0x...<br />
            VITE_DUAL_STAKING_ADDRESS=0x...<br />
            VITE_CORE_ORACLE_ADDRESS=0x...
          </code>
        </div>
      </CardContent>
    </Card>
  )
}