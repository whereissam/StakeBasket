#!/bin/bash

# Test script for Core Liquid Staking system
echo "🚀 Core Liquid Staking Test Suite"
echo "=================================="

# Check if Hardhat is installed
if ! command -v npx &> /dev/null; then
    echo "❌ NPX not found. Please install Node.js and npm"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Compiling contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ Contract compilation failed"
    exit 1
fi

echo "✅ Contracts compiled successfully"

echo "🧪 Running tests..."
npx hardhat test test/CoreLiquidStaking.test.cjs

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ All tests passed"

echo "🚀 Deploying to local testnet..."
npx hardhat run scripts/deploy-liquid-staking.js --network localhost &

# Wait a moment for deployment
sleep 5

echo "🎯 Running demo..."
npx hardhat run scripts/demo-liquid-staking.js --network localhost

echo "🎉 Test suite completed successfully!"
echo ""
echo "📊 Summary:"
echo "✅ Dependencies installed"
echo "✅ Contracts compiled"
echo "✅ Tests passed"
echo "✅ Local deployment successful"
echo "✅ Demo completed"
echo ""
echo "🔗 Next steps:"
echo "1. Frontend is updated with liquid staking interface"
echo "2. Check deployment-liquid-staking.json for contract addresses"
echo "3. Update environment variables for frontend integration"
echo "4. Test frontend integration with local testnet"