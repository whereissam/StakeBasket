#!/bin/bash

# Start complete testing environment for simplified staking system
echo "🚀 Starting Simple Staking Testing Environment"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "hardhat.config.cjs" ]; then
    echo "❌ Please run this script from the staking project root"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo "🧹 Cleaning up processes..."
    jobs -p | xargs -r kill
    exit
}
trap cleanup EXIT

# Start Hardhat local node
echo "🔗 Starting Hardhat local node..."
npx hardhat node --hostname 127.0.0.1 &
HARDHAT_PID=$!

# Wait for Hardhat to start
echo "⏳ Waiting for Hardhat node to start..."
sleep 5

# Deploy contracts to local network
echo "🏗️ Deploying simplified contracts..."
npx hardhat run scripts/test-simple-system.cjs --network localhost

if [ $? -ne 0 ]; then
    echo "❌ Contract deployment failed"
    exit 1
fi

echo "✅ Contracts deployed successfully!"

# Start frontend development server
echo "🖥️ Starting frontend development server..."
echo "📖 Frontend will be available at: http://localhost:5173"
echo "🔗 Hardhat node running at: http://127.0.0.1:8545"
echo ""
echo "🧪 Test Instructions:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Navigate to /simple-staking route"
echo "3. Connect your wallet (use Hardhat account #0)"
echo "4. Try depositing CORE and BTC tokens"
echo "5. Test withdrawing shares"
echo ""
echo "💡 Test accounts have been pre-funded with mock BTC tokens"
echo "Press Ctrl+C to stop all services"
echo ""

# Start the frontend (this will run in foreground)
npm run dev

# If frontend exits, cleanup
cleanup