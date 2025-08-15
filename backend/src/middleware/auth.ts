import { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Environment variables for security
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me'
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'default-api-key-change-me'

// User roles
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer'
}

export interface AuthUser {
  id: string
  role: UserRole
  address?: string
}

// JWT Authentication middleware
export async function jwtAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    
    c.set('user', decoded)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

// API Key Authentication middleware
export async function apiKeyAuth(c: Context, next: Next) {
  try {
    const apiKey = c.req.header('x-api-key')
    
    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401)
    }

    if (!isValidApiKey(apiKey)) {
      return c.json({ error: 'Invalid API key' }, 401)
    }

    await next()
  } catch (error) {
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

// Role-based authorization middleware
export function requireRole(requiredRole: UserRole) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser
    
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    if (!hasPermission(user.role, requiredRole)) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    await next()
  }
}

// Rate limiting middleware
const rateLimits = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const clientId = getClientId(c)
    const now = Date.now()
    const windowStart = now - windowMs
    
    const clientData = rateLimits.get(clientId)
    
    if (!clientData || clientData.resetTime < now) {
      rateLimits.set(clientId, { count: 1, resetTime: now + windowMs })
      await next()
      return
    }

    if (clientData.count >= maxRequests) {
      return c.json({ error: 'Rate limit exceeded' }, 429)
    }

    clientData.count++
    await next()
  }
}

// Helper functions
function isValidApiKey(apiKey: string): boolean {
  // In production, compare against hashed API keys stored in database
  const hashedKey = crypto.createHmac('sha256', API_SECRET_KEY).update(apiKey).digest('hex')
  return hashedKey === crypto.createHmac('sha256', API_SECRET_KEY).update(API_SECRET_KEY).digest('hex')
}

function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.VIEWER]: 1,
    [UserRole.OPERATOR]: 2,
    [UserRole.ADMIN]: 3
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

function getClientId(c: Context): string {
  // Use IP address or authenticated user ID
  return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
}

// Generate JWT token (for login endpoints)
export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

// Validate Ethereum address format
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}