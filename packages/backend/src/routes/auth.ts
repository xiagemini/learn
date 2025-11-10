import { Hono } from 'hono'
import { authMiddleware, requireAuth } from '../middleware/auth.js'
import { createUser, findUserByUsername, authenticateUser, findUserById, updateUserSelectedLevel } from '../services/auth.js'
import { PrismaClient } from '../generated/client.js'

const router = new Hono<{ Variables: { user?: { userId: string; username: string; email: string; iat?: number; exp?: number } } }>()
const prisma = new PrismaClient()

router.use('*', authMiddleware)

/**
 * POST /auth/register
 * Register a new user
 * 
 * Request body:
 * {
 *   "username": "string (unique, 3-50 chars)",
 *   "email": "string (unique, valid email)",
 *   "password": "string (min 8 chars)"
 * }
 * 
 * Response: 201 Created
 * {
 *   "user": {
 *     "id": "string",
 *     "username": "string",
 *     "email": "string",
 *     "createdAt": "ISO datetime"
 *   }
 * }
 * 
 * Response: 400 Bad Request - Validation errors or duplicate user
 * Response: 500 Internal Server Error
 */
router.post('/register', async (c) => {
  try {
    const body = await c.req.json() as { username?: string; email?: string; password?: string }
    
    // Validation
    if (!body.username || !body.email || !body.password) {
      return c.json(
        { error: 'Missing required fields: username, email, password' },
        400
      )
    }
    
    if (body.username.length < 3 || body.username.length > 50) {
      return c.json(
        { error: 'Username must be between 3 and 50 characters' },
        400
      )
    }
    
    if (body.password.length < 8) {
      return c.json(
        { error: 'Password must be at least 8 characters' },
        400
      )
    }
    
    // Check if username already exists
    const existingUser = await findUserByUsername(body.username)
    if (existingUser) {
      return c.json(
        { error: 'Username already taken' },
        400
      )
    }
    
    // Create user
    const user = await createUser(body.username, body.email, body.password)
    
    return c.json({ user }, 201)
  } catch (error) {
    console.error('Registration error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      500
    )
  }
})

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 * 
 * Request body:
 * {
 *   "username": "string",
 *   "password": "string"
 * }
 * 
 * Response: 200 OK
 * {
 *   "token": "string (JWT)",
 *   "user": {
 *     "id": "string",
 *     "username": "string",
 *     "email": "string",
 *     "firstName": "string|null",
 *     "lastName": "string|null",
 *     "selectedLevelId": "string|null",
 *     "createdAt": "ISO datetime"
 *   }
 * }
 * 
 * Response: 401 Unauthorized - Invalid credentials
 * Response: 400 Bad Request - Missing fields
 * Response: 500 Internal Server Error
 */
router.post('/login', async (c) => {
  try {
    const body = await c.req.json() as { username?: string; password?: string }
    
    if (!body.username || !body.password) {
      return c.json(
        { error: 'Missing required fields: username, password' },
        400
      )
    }
    
    const result = await authenticateUser(body.username, body.password)
    
    if (!result) {
      return c.json(
        { error: 'Invalid username or password' },
        401
      )
    }
    
    return c.json(result, 200)
  } catch (error) {
    console.error('Login error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      500
    )
  }
})

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 * 
 * Headers:
 * Authorization: Bearer <JWT token>
 * 
 * Response: 200 OK
 * {
 *   "user": {
 *     "id": "string",
 *     "username": "string",
 *     "email": "string",
 *     "firstName": "string|null",
 *     "lastName": "string|null",
 *     "profilePictureUrl": "string|null",
 *     "selectedLevelId": "string|null",
 *     "selectedLevel": {
 *       "id": "string",
 *       "name": "string",
 *       "order": "number"
 *     } | null,
 *     "createdAt": "ISO datetime"
 *   }
 * }
 * 
 * Response: 401 Unauthorized - No token or invalid token
 * Response: 404 Not Found - User not found
 * Response: 500 Internal Server Error
 */
router.get('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await findUserById(user.userId)
    
    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json({ user: userProfile }, 200)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user profile' },
      500
    )
  }
})

/**
 * PUT /auth/selected-level
 * Update user's selected level (requires authentication)
 * 
 * Headers:
 * Authorization: Bearer <JWT token>
 * 
 * Request body:
 * {
 *   "levelId": "string"
 * }
 * 
 * Response: 200 OK
 * {
 *   "user": {
 *     "id": "string",
 *     "username": "string",
 *     "email": "string",
 *     "selectedLevelId": "string",
 *     "selectedLevel": {
 *       "id": "string",
 *       "name": "string",
 *       "order": "number"
 *     }
 *   }
 * }
 * 
 * Response: 401 Unauthorized
 * Response: 400 Bad Request - Missing levelId
 * Response: 404 Not Found - Level not found
 * Response: 500 Internal Server Error
 */
router.put('/selected-level', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const body = await c.req.json() as { levelId?: string }
    
    if (!body.levelId) {
      return c.json(
        { error: 'Missing required field: levelId' },
        400
      )
    }
    
    // Verify level exists
    const level = await prisma.level.findUnique({
      where: { id: body.levelId },
    })
    
    if (!level) {
      return c.json(
        { error: 'Level not found' },
        404
      )
    }
    
    const updatedUser = await updateUserSelectedLevel(user.userId, body.levelId)
    
    return c.json({ user: updatedUser }, 200)
  } catch (error) {
    console.error('Error updating selected level:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update selected level' },
      500
    )
  }
})

export default router
