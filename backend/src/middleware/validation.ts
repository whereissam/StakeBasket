import { Context, Next } from 'hono'
import { z, ZodError } from 'zod'

// Common validation schemas
export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
export const amountSchema = z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format')
export const positiveNumberSchema = z.number().positive('Must be a positive number')

// Request validation middleware
export function validateBody(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validatedBody = schema.parse(body)
      c.set('validatedBody', validatedBody)
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json({ 
          error: 'Validation failed', 
          details: error.errors 
        }, 400)
      }
      return c.json({ error: 'Invalid request body' }, 400)
    }
  }
}

export function validateQuery(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query()
      const validatedQuery = schema.parse(query)
      c.set('validatedQuery', validatedQuery)
      await next()
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json({ 
          error: 'Invalid query parameters', 
          details: error.errors 
        }, 400)
      }
      return c.json({ error: 'Invalid query parameters' }, 400)
    }
  }
}

// Sanitization functions
export function sanitizeInput(input: string): string {
  return input.replace(/[<>\"']/g, '')
}

export function sanitizeAddress(address: string): string {
  return address.toLowerCase().trim()
}

// Common validation schemas for different endpoints
export const faucetRequestSchema = z.object({
  address: addressSchema,
  token: z.enum(['CORE', 'coreBTC', 'BASKET']).optional(),
  amount: amountSchema.optional()
})

export const oracleUpdateSchema = z.object({
  price: positiveNumberSchema,
  asset: z.string().min(1).max(10),
  timestamp: z.number().positive().optional()
})

export const automationTaskSchema = z.object({
  taskId: z.string().min(1),
  parameters: z.record(z.any()).optional()
})

export const alertSchema = z.object({
  type: z.enum(['price', 'system', 'security']),
  message: z.string().min(1).max(500),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  metadata: z.record(z.any()).optional()
})