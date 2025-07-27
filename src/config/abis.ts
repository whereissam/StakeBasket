// Contract ABIs for frontend interaction

export const STAKEBASKET_ABI = [
  // Read functions
  'function getTotalAUM() public view returns (uint256)',
  'function totalPooledCore() public view returns (uint256)',
  'function totalPooledLstBTC() public view returns (uint256)',
  'function managementFeeBasisPoints() public view returns (uint256)',
  'function performanceFeeBasisPoints() public view returns (uint256)',
  'function owner() public view returns (address)',
  
  // Write functions
  'function deposit(uint256 amount) external payable',
  'function redeem(uint256 shares) external',
  'function pause() external',
  'function unpause() external',
  
  // Events
  'event Deposited(address indexed user, uint256 amount, uint256 shares)',
  'event Redeemed(address indexed user, uint256 shares, uint256 amount)',
] as const;

export const STAKEBASKET_TOKEN_ABI = [
  // ERC20 standard functions
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) public returns (bool)',
  
  // Custom functions
  'function stakeBasketContract() public view returns (address)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const MOCK_CORE_ABI = [
  // ERC20 functions
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transfer(address to, uint256 amount) public returns (bool)',
  
  // Faucet function
  'function faucet() external',
  'function mint(address to, uint256 amount) external',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const MOCK_CORE_BTC_ABI = [
  // ERC20 functions  
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transfer(address to, uint256 amount) public returns (bool)',
  
  // Faucet function
  'function faucet() external',
  'function mint(address to, uint256 amount) external',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const MOCK_LSTBTC_ABI = [
  // ERC20 functions
  'function name() public view returns (string)',
  'function symbol() public view returns (string)', 
  'function decimals() public view returns (uint8)',
  'function totalSupply() public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  
  // lstBTC specific functions
  'function mint(uint256 coreBTCAmount) external returns (uint256)',
  'function redeem(uint256 lstBTCAmount) external returns (uint256)',
  'function getExchangeRate() external view returns (uint256)',
  'function lstBTCToCoreBTC(uint256 lstBTCAmount) external view returns (uint256)',
  'function coreBTCToLstBTC(uint256 coreBTCAmount) external view returns (uint256)',
  'function getTotalValueLocked() external view returns (uint256)',
  'function getAPY() external pure returns (uint256)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Minted(address indexed user, uint256 coreBTCAmount, uint256 lstBTCAmount)',
  'event Redeemed(address indexed user, uint256 lstBTCAmount, uint256 coreBTCAmount)',
] as const;

export const PRICE_FEED_ABI = [
  // Price functions
  'function getCorePrice() external view returns (uint256)',
  'function getLstBTCPrice() external view returns (uint256)',
  'function setPrices(string[] memory assets, uint256[] memory prices) external',
  
  // Events
  'event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp)',
] as const;