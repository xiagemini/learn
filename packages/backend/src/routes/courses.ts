import { Hono } from 'hono'
import { authMiddleware, requireAuth } from '../middleware/auth.js'
import {
  getLevelsWithStories,
  getStoriesByLevelId,
  getUnitsByStoryId,
  getUnitById,
  getDailyPlansForUser,
  getDailyPlanForUser,
  getStoriesByLevel
} from '../services/courses.js'

const router = new Hono<{
  Variables: {
    user?: {
      userId: string
      username: string
      email: string
      iat?: number
      exp?: number
    }
  }
}>()

// Apply auth middleware to all routes
router.use('*', authMiddleware)

/**
 * GET /courses/levels
 * Get all levels with their stories and units
 * 
 * Response: 200 OK
 * {
 *   "levels": [
 *     {
 *       "id": "string",
 *       "name": "string",
 *       "order": 1,
 *       "createdAt": "ISO datetime",
 *       "updatedAt": "ISO datetime",
 *       "_count": { "stories": 3 },
 *       "stories": [...]
 *     }
 *   ]
 * }
 */
router.get('/levels', async (c) => {
  try {
    const levels = await getLevelsWithStories()
    return c.json({ levels })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: errorMessage }, 500)
  }
})

/**
 * GET /courses/stories
 * Get all stories grouped by level
 * 
 * Response: 200 OK
 * {
 *   "levels": [
 *     {
 *       "id": "string",
 *       "name": "string",
 *       "order": 1,
 *       "stories": [...]
 *     }
 *   ]
 * }
 */
router.get('/stories', async (c) => {
  try {
    const levels = await getStoriesByLevel()
    return c.json({ levels })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: errorMessage }, 500)
  }
})

/**
 * GET /courses/levels/:levelId/stories
 * Get stories for a specific level
 * 
 * Response: 200 OK
 * {
 *   "stories": [
 *     {
 *       "id": "string",
 *       "title": "string",
 *       "description": "string",
 *       "order": 1,
 *       "levelId": "string",
 *       "createdAt": "ISO datetime",
 *       "updatedAt": "ISO datetime",
 *       "level": { "name": "string" },
 *       "_count": { "units": 5 },
 *       "units": [...]
 *     }
 *   ]
 * }
 */
router.get('/levels/:levelId/stories', async (c) => {
  try {
    const levelId = c.req.param('levelId')
    const stories = await getStoriesByLevelId(levelId)
    return c.json({ stories })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: errorMessage }, 500)
  }
})

/**
 * GET /courses/stories/:storyId/units
 * Get units for a specific story
 * 
 * Response: 200 OK
 * {
 *   "units": [
 *     {
 *       "id": "string",
 *       "title": "string",
 *       "description": "string",
 *       "order": 1,
 *       "storyId": "string",
 *       "createdAt": "ISO datetime",
 *       "updatedAt": "ISO datetime",
 *       "story": { "title": "string" },
 *       "_count": { "assets": 8 },
 *       "assets": [
 *         {
 *           "id": "string",
 *           "unitId": "string",
 *           "type": "VIDEO|AUDIO|SUBTITLE|SCREENSHOT|METADATA",
 *           "minioKey": "string",
 *           "duration": 120,
 *           "metadata": "string",
 *           "createdAt": "ISO datetime",
 *           "updatedAt": "ISO datetime",
 *           "presignedUrl": "string"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/stories/:storyId/units', async (c) => {
  try {
    const storyId = c.req.param('storyId')
    const units = await getUnitsByStoryId(storyId)
    return c.json({ units })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: errorMessage }, 500)
  }
})

/**
 * GET /courses/units/:unitId
 * Get a specific unit with its assets
 * 
 * Response: 200 OK
 * {
 *   "unit": {
 *     "id": "string",
 *     "title": "string",
 *     "description": "string",
 *     "order": 1,
 *     "storyId": "string",
 *     "createdAt": "ISO datetime",
 *     "updatedAt": "ISO datetime",
 *     "story": { "title": "string" },
 *     "_count": { "assets": 8 },
 *     "assets": [...]
 *   }
 * }
 * 
 * Response: 404 Not Found - Unit not found
 */
router.get('/units/:unitId', async (c) => {
  try {
    const unitId = c.req.param('unitId')
    const unit = await getUnitById(unitId)
    
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }
    
    return c.json({ unit })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: errorMessage }, 500)
  }
})

/**
 * GET /courses/daily-plans
 * Get daily plans for the authenticated user
 * 
 * Query parameters:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - overdueOnly: boolean (optional, default: false)
 * 
 * Response: 200 OK
 * {
 *   "dailyPlans": [
 *     {
 *       "id": "string",
 *       "userId": "string",
 *       "plannedDate": "ISO datetime",
 *       "createdAt": "ISO datetime",
 *       "updatedAt": "ISO datetime",
 *       "isOverdue": false,
 *       "entries": [
 *         {
 *           "id": "string",
 *           "dailyPlanId": "string",
 *           "unitId": "string",
 *           "completed": false,
 *           "score": 0,
 *           "createdAt": "ISO datetime",
 *           "updatedAt": "ISO datetime",
 *           "unit": {
 *             "id": "string",
 *             "title": "string",
 *             "story": {
 *               "title": "string",
 *               "level": { "name": "string" }
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/daily-plans', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'User not authenticated' }, 401)
    }

    const startDate = c.req.query('startDate') ? new Date(c.req.query('startDate')!) : undefined
    const endDate = c.req.query('endDate') ? new Date(c.req.query('endDate')!) : undefined
    const overdueOnly = c.req.query('overdueOnly') === 'true'

    const dailyPlans = await getDailyPlansForUser(user.userId, {
      startDate,
      endDate,
      includeOverdueOnly: overdueOnly
    })

    return c.json({ dailyPlans })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: errorMessage }, 500)
  }
})

/**
 * GET /courses/daily-plans/:date
 * Get a specific daily plan for the authenticated user
 * 
 * Path parameter:
 * - date: ISO date string (YYYY-MM-DD)
 * 
 * Response: 200 OK
 * {
 *   "dailyPlan": {
 *     "id": "string",
 *     "userId": "string",
 *     "plannedDate": "ISO datetime",
 *     "createdAt": "ISO datetime",
 *     "updatedAt": "ISO datetime",
 *     "isOverdue": false,
 *     "entries": [...]
 *   }
 * }
 * 
 * Response: 404 Not Found - Daily plan not found
 */
router.get('/daily-plans/:date', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'User not authenticated' }, 401)
    }

    const dateStr = c.req.param('date')
    const plannedDate = new Date(dateStr)
    
    // Validate date format
    if (isNaN(plannedDate.getTime())) {
      return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400)
    }

    const dailyPlan = await getDailyPlanForUser(user.userId, plannedDate)
    
    if (!dailyPlan) {
      return c.json({ error: 'Daily plan not found' }, 404)
    }
    
    return c.json({ dailyPlan })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: errorMessage }, 500)
  }
})

export default router