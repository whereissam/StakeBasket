// Security tests for StakeBasket backend
import { describe, test, expect, beforeAll, afterAll } from "bun:test"

const BASE_URL = 'http://localhost:3001'
let server: any

describe('Security Features Test Suite', () => {
  
  describe('🔒 Authentication Tests', () => {
    test('Should require authentication for protected endpoints', async () => {
      // Test without auth header
      const response = await fetch(`${BASE_URL}/api/oracle/start-updater`, {
        method: 'POST'
      })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    test('Should reject invalid JWT tokens', async () => {
      const response = await fetch(`${BASE_URL}/api/oracle/start-updater`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid_token_here'
        }
      })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid or expired token')
    })

    test('Should reject invalid API keys', async () => {
      const response = await fetch(`${BASE_URL}/api/oracle/start-updater`, {
        method: 'POST',
        headers: {
          'X-API-Key': 'invalid_api_key'
        }
      })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid API key')
    })
  })

  describe('🛡️ Rate Limiting Tests', () => {
    test('Should rate limit faucet requests', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890'
      const requestData = {
        address: testAddress,
        token: 'CORE'
      }

      // Make multiple requests quickly
      const requests = []
      for (let i = 0; i < 5; i++) {
        requests.push(
          fetch(`${BASE_URL}/api/faucet/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
          })
        )
      }

      const responses = await Promise.all(requests)
      
      // At least one should be rate limited (status 429)
      const rateLimited = responses.some(r => r.status === 429)
      expect(rateLimited).toBe(true)
    })

    test('Should rate limit balance check requests', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890'

      // Make many balance requests quickly
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(
          fetch(`${BASE_URL}/api/faucet/balances/${testAddress}`)
        )
      }

      const responses = await Promise.all(requests)
      
      // Should get rate limited after 10 requests per minute
      const rateLimited = responses.some(r => r.status === 429)
      expect(rateLimited).toBe(true)
    })
  })

  describe('✅ Input Validation Tests', () => {
    test('Should validate Ethereum addresses', async () => {
      const invalidAddresses = [
        'not_an_address',
        '0x123', // too short
        '0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', // invalid characters
        '', // empty
        null, // null
      ]

      for (const invalidAddress of invalidAddresses) {
        const response = await fetch(`${BASE_URL}/api/faucet/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: invalidAddress,
            token: 'CORE'
          })
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Validation failed')
      }
    })

    test('Should validate token types', async () => {
      const response = await fetch(`${BASE_URL}/api/faucet/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          token: 'INVALID_TOKEN'
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation failed')
    })

    test('Should sanitize address inputs', async () => {
      const addressWithSpaces = '  0x1234567890123456789012345678901234567890  '
      const response = await fetch(`${BASE_URL}/api/faucet/balances/${addressWithSpaces}`)
      
      // Should not crash and should handle sanitized address
      expect(response.status).not.toBe(500)
    })
  })

  describe('🔐 Security Headers Tests', () => {
    test('Should include security headers', async () => {
      const response = await fetch(`${BASE_URL}/health`)
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
      expect(response.headers.get('Referrer-Policy')).toBeTruthy()
    })

    test('Should have proper CORS configuration', async () => {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173'
        }
      })
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    })
  })

  describe('🚨 Error Handling Tests', () => {
    test('Should not expose internal errors', async () => {
      // Try to cause an internal error
      const response = await fetch(`${BASE_URL}/api/nonexistent/endpoint`)
      
      expect(response.status).toBe(404)
      const data = await response.text()
      
      // Should not contain stack traces or internal paths
      expect(data).not.toContain('/src/')
      expect(data).not.toContain('at ')
      expect(data).not.toContain('Error:')
    })

    test('Should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/faucet/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request body')
    })
  })

  describe('📊 Health Check Tests', () => {
    test('Health endpoint should work without auth', async () => {
      const response = await fetch(`${BASE_URL}/health`)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.services).toBeTruthy()
    })

    test('Health check should include service status', async () => {
      const response = await fetch(`${BASE_URL}/health`)
      const data = await response.json()
      
      expect(data.services.monitoring).toBe(true)
      expect(data.services.alerts).toBe(true)
      expect(data.services.faucet).toBe(true)
      expect(data.timestamp).toBeTruthy()
    })
  })
})