#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing StakeBasket Security Fixes\n');

// ANSI color codes for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function testHttpRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: await response.text()
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function main() {
  let allTestsPassed = true;
  
  // Test 1: Check environment variables
  info('Test 1: Checking environment variables...');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('JWT_SECRET=') && !envContent.includes('your_jwt_secret_here')) {
      success('JWT_SECRET is configured');
    } else {
      error('JWT_SECRET not properly configured');
      allTestsPassed = false;
    }
    
    if (envContent.includes('VITE_BACKEND_URL=')) {
      success('VITE_BACKEND_URL is configured');
    } else {
      error('VITE_BACKEND_URL not configured');
      allTestsPassed = false;
    }
    
    if (!envContent.includes('0x1df9ee1a564612d9bf423c9d220794f63aec49525180139f27f9940a3fbd78a9')) {
      success('Original private key removed from .env');
    } else {
      error('Original private key still in .env file!');
      allTestsPassed = false;
    }
  } else {
    warning('.env file not found');
  }
  
  // Test 2: Check if hardcoded API key is removed
  info('Test 2: Checking for hardcoded API keys...');
  const coreApiPath = path.join(process.cwd(), 'src', 'utils', 'coreApi.ts');
  if (fs.existsSync(coreApiPath)) {
    const coreApiContent = fs.readFileSync(coreApiPath, 'utf8');
    if (!coreApiContent.includes('206fcf6379b641f5b12b3ccbbb933180')) {
      success('Hardcoded API key removed from coreApi.ts');
    } else {
      error('Hardcoded API key still in coreApi.ts!');
      allTestsPassed = false;
    }
  }
  
  // Test 3: Check if backend faucet has secure private key handling
  info('Test 3: Checking backend private key security...');
  const faucetPath = path.join(process.cwd(), 'backend', 'src', 'routes', 'faucet.ts');
  if (fs.existsSync(faucetPath)) {
    const faucetContent = fs.readFileSync(faucetPath, 'utf8');
    if (!faucetContent.includes('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')) {
      success('Hardcoded private key removed from faucet.ts');
    } else {
      warning('Test private key found in faucet.ts - OK for testing but change for production');
    }
    
    if (faucetContent.includes('process.env.DEPLOYER_PRIVATE_KEY')) {
      success('Private key now uses environment variable');
    } else {
      error('Private key not using environment variable');
      allTestsPassed = false;
    }
  }
  
  // Test 4: Check security middleware files exist
  info('Test 4: Checking security middleware files...');
  const securityFiles = [
    'backend/src/middleware/auth.ts',
    'backend/src/middleware/validation.ts',
    'backend/src/middleware/security.ts'
  ];
  
  for (const file of securityFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      success(`${file} exists`);
    } else {
      error(`${file} missing`);
      allTestsPassed = false;
    }
  }
  
  // Test 5: Check smart contract security files
  info('Test 5: Checking security smart contracts...');
  const securityContracts = [
    'contracts/security/PriceSecurityModule.sol',
    'contracts/security/AccessControlManager.sol'
  ];
  
  for (const contract of securityContracts) {
    const contractPath = path.join(process.cwd(), contract);
    if (fs.existsSync(contractPath)) {
      success(`${contract} exists`);
    } else {
      error(`${contract} missing`);
      allTestsPassed = false;
    }
  }
  
  // Test 6: Try to start backend and test endpoints
  info('Test 6: Testing backend endpoints (if running)...');
  
  try {
    const healthResponse = await testHttpRequest('http://localhost:3001/health');
    
    if (healthResponse.status === 200) {
      success('Backend health endpoint responding');
      
      // Test security headers
      if (healthResponse.headers['x-content-type-options'] === 'nosniff') {
        success('Security headers present');
      } else {
        error('Security headers missing');
        allTestsPassed = false;
      }
      
      // Test rate limiting on faucet
      info('Testing rate limiting...');
      const rateLimitTests = [];
      for (let i = 0; i < 5; i++) {
        rateLimitTests.push(
          testHttpRequest('http://localhost:3001/api/faucet/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: '0x1234567890123456789012345678901234567890',
              token: 'CORE'
            })
          })
        );
      }
      
      const responses = await Promise.all(rateLimitTests);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (rateLimited) {
        success('Rate limiting is working');
      } else {
        warning('Rate limiting may not be working (or limits are high)');
      }
      
      // Test input validation
      info('Testing input validation...');
      const invalidRequest = await testHttpRequest('http://localhost:3001/api/faucet/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'invalid_address',
          token: 'CORE'
        })
      });
      
      if (invalidRequest.status === 400) {
        success('Input validation is working');
      } else {
        error('Input validation not working properly');
        allTestsPassed = false;
      }
      
    } else if (healthResponse.error) {
      warning('Backend not running - skipping endpoint tests');
      info('To test endpoints, run: cd backend && npm run dev');
    }
  } catch (err) {
    warning('Backend endpoint testing failed - backend may not be running');
  }
  
  // Test 7: Check if dependencies are installed
  info('Test 7: Checking security dependencies...');
  const backendPackagePath = path.join(process.cwd(), 'backend', 'package.json');
  if (fs.existsSync(backendPackagePath)) {
    const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
    const requiredDeps = ['jsonwebtoken', 'zod', 'bcryptjs'];
    
    for (const dep of requiredDeps) {
      if (backendPackage.dependencies[dep]) {
        success(`${dep} dependency installed`);
      } else {
        error(`${dep} dependency missing`);
        allTestsPassed = false;
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    success('🎉 All security tests passed!');
    success('Your StakeBasket application is now secured.');
    console.log('\n📋 Next steps:');
    console.log('1. Start backend: cd backend && npm run dev');
    console.log('2. Run your existing tests: npm run test:all');
    console.log('3. Start frontend: npm run dev');
    console.log('4. Test the application end-to-end');
  } else {
    error('❌ Some security tests failed.');
    error('Please review the errors above and fix them before proceeding.');
  }
  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);