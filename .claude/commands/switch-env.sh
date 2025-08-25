#!/bin/bash

# Easy environment switcher for StakeBasket
# Usage: ./switch-env.sh [local|testnet|mainnet]

ENV=${1:-local}

case $ENV in
  "local")
    echo "🏠 Switching to LOCAL environment..."
    export NETWORK=hardhat
    export NODE_ENV=development
    echo "✅ Environment: LOCAL"
    echo "🌐 Network: Hardhat (31337)"
    echo "📁 Config: deployment-data/local-deployment.json"
    ;;
  "testnet")
    echo "🧪 Switching to TESTNET environment..."
    export NETWORK=coreTestnet2
    export NODE_ENV=staging
    echo "✅ Environment: TESTNET"
    echo "🌐 Network: Core Testnet2 (1114)"
    echo "📁 Config: deployment-data/testnet-deployment.json"
    ;;
  "mainnet")
    echo "🚀 Switching to MAINNET environment..."
    export NETWORK=coreMainnet
    export NODE_ENV=production
    echo "✅ Environment: MAINNET"
    echo "🌐 Network: Core Mainnet (1116)"
    echo "📁 Config: deployment-data/mainnet-deployment.json"
    ;;
  *)
    echo "❌ Invalid environment. Use: local, testnet, or mainnet"
    exit 1
    ;;
esac

echo "📝 To make this permanent, add these to your .env file:"
echo "NETWORK=$NETWORK"
echo "NODE_ENV=$NODE_ENV"