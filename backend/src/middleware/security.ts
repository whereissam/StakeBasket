import { Context, Next } from 'hono'
import { cors } from 'hono/cors'

// Security headers middleware
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next()
    
    // Set security headers
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    // HSTS (only in production with HTTPS)
    if (process.env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
    
    c.header('Content-Security-Policy', csp)
  }
}

// CORS configuration
export function corsConfig() {
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://app.yourdomain.com']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174']

  return cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposeHeaders: ['X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset']
  })
}

// Request size limiter
export function requestSizeLimit(maxSizeBytes: number = 1024 * 1024) { // 1MB default
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('content-length')
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return c.json({ error: 'Request too large' }, 413)
    }
    
    await next()
  }
}

// IP whitelisting for sensitive endpoints
export function ipWhitelist(allowedIPs: string[]) {
  return async (c: Context, next: Next) => {
    const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    
    if (!allowedIPs.includes(clientIP) && allowedIPs.length > 0) {
      return c.json({ error: 'Access denied from this IP' }, 403)
    }
    
    await next()
  }
}

// Request logging middleware
export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now()
    const method = c.req.method
    const url = c.req.url
    const userAgent = c.req.header('user-agent') || 'unknown'
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    
    await next()
    
    const end = Date.now()
    const duration = end - start
    const status = c.res.status
    
    // Log request (in production, use proper logging service)
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method,
      url,
      status,
      duration: `${duration}ms`,
      ip,
      userAgent: userAgent.substring(0, 100), // Truncate long user agents
      level: status >= 400 ? 'error' : 'info'
    }))
  }
}

// Error handling middleware
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      console.error('Unhandled error:', error)
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        return c.json({ error: 'Internal server error' }, 500)
      } else {
        return c.json({ 
          error: 'Internal server error', 
          details: error instanceof Error ? error.message : 'Unknown error'
        }, 500)
      }
    }
  }
}