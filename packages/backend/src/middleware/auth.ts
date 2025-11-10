import { Context, Next } from 'hono'
import { verifyToken } from '../services/auth.js'

/**
 * Auth middleware for verifying JWT tokens
 * Extracts token from Authorization header (Bearer <token>)
 * Injects user information into context if valid
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await next()
    return
  }
  
  const token = authHeader.slice(7)
  const payload = await verifyToken(token)
  
  if (payload) {
    c.set('user', payload)
  }
  
  await next()
}

/**
 * Guard middleware - requires valid authentication
 * Returns 401 if no valid token is provided
 */
export async function requireAuth(c: Context, next: Next) {
  const user = c.get('user')
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  await next()
}
