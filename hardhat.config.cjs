require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv/config");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-contract-sizer");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
      initialBaseFeePerGas: 0,
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337, // Anvil default chain ID
    },
    coreTestnet: {
      url: process.env.CORE_TESTNET_RPC_URL || "https://rpc.test.btcs.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1115,
    },
    coreTestnet2: {
      url: process.env.CORE_TESTNET2_RPC_URL || "https://rpc.test2.btcs.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1114,
    },
  },
  etherscan: {
    apiKey: {
      // Add your API keys here when needed
      // ethereum: process.env.ETHERSCAN_KEY,
      // sepolia: process.env.ETHERSCAN_KEY,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.CMC_KEY || undefined,
    excludeContracts: ["mocks/"],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  solcover: {
    skipFiles: ['testing/mocks/', 'testing/helpers/'],
    measureStatementCoverage: false,
    measureFunctionCoverage: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000, // Higher runs for smaller bytecode
          },
          viaIR: true,
          evmVersion: "paris",
        },
      }
    ],
  },
};