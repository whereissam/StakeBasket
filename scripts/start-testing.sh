#!/bin/bash

echo "🚀 StakeBasket Automated Rebalancing Testing Script"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "contracts/MockCoreStaking.sol" ]; then
    echo "❌ Error: Please run this script from the staking project root directory"
    exit 1
fi

echo "✅ Project structure verified"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

echo ""
echo "Step 1: Checking prerequisites..."

# Check if Hardhat node is running
if check_port 8545; then
    echo "✅ Hardhat node is running on port 8545"
else
    echo "❌ Hardhat node not detected. Please run 'npx hardhat node' in another terminal"
    echo "   Then rerun this script"
    exit 1
fi

echo ""
echo "Step 2: Deploying contracts..."
node scripts/debug-deploy.cjs

if [ $? -eq 0 ]; then
    echo "✅ Contracts deployed successfully"
else
    echo "❌ Contract deployment failed"
    exit 1
fi

echo ""
echo "Step 3: Setting up backend environment..."

cd backend

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Installing..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "✅ Installing dependencies..."
bun install

# Set environment variables
export AUTOMATION_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export CORE_PROVIDER_URL=http://127.0.0.1:8545

echo "✅ Environment configured"

echo ""
echo "Step 4: Starting backend services..."
echo "Backend will start on http://localhost:3000"
echo ""
echo "🧪 Once backend is running, you can test rebalancing with:"
echo ""
echo "# Check status:"
echo "curl http://localhost:3000/api/automation/rebalancing/status"
echo ""
echo "# Simulate validator going bad:"
echo 'curl -X POST http://localhost:3000/api/automation/validators/simulate -H "Content-Type: application/json" -d '"'"'[{"validatorAddress": "0x1111111111111111111111111111111111111111", "status": false}]'"'"''
echo ""
echo "# Trigger rebalancing:"
echo "curl -X POST http://localhost:3000/api/automation/rebalancing/trigger"
echo ""
echo "Press Ctrl+C to stop the backend when done testing"
echo ""

# Start the backend
bun run dev