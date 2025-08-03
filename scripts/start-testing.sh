#!/bin/bash

# StakeBasket Interactive Testing Startup Script

echo "🧪 StakeBasket Interactive Testing Suite"
echo "========================================"
echo ""

# Check if hardhat is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm."
    exit 1
fi

# Function to check if hardhat node is running
check_hardhat_node() {
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://127.0.0.1:8545 > /dev/null 2>&1
    return $?
}

# Check if hardhat node is already running
if check_hardhat_node; then
    echo "✅ Hardhat node is already running on localhost:8545"
else
    echo "❌ Hardhat node is not running. Please start it first:"
    echo "   Terminal 1: npm run node:start"
    echo "   Then run this script again."
    exit 1
fi

echo "🔧 Compiling contracts..."
npm run contracts:compile

if [ $? -ne 0 ]; then
    echo "❌ Contract compilation failed!"
    exit 1
fi

echo "🚀 Deploying contracts to local network..."
npm run deploy:local

if [ $? -ne 0 ]; then
    echo "❌ Contract deployment failed!"
    exit 1
fi

echo ""
echo "✅ All contracts deployed successfully!"
echo ""
echo "🎯 Starting interactive testing suite..."
echo "   Use the menu to test different protocol features"
echo "   Type Ctrl+C to exit at any time"
echo ""

# Start interactive testing
npm run test:interactive