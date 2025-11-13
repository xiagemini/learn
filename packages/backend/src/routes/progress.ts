import { Hono } from 'hono'
import { authMiddleware, requireAuth } from '../middleware/auth.js'
import {
  startUnit,
  updateAssetProgress,
  recordPronunciationAttempt,
  completeUnit,
  getUnitProgress,
  getUserProgressSummary,
  getStoryProgress,
  getPronunciationAttempts,
  getAssetProgress,
} from '../services/progress.js'
import { PrismaClient } from '../generated/client.js'

const router = new Hono<{
  Variables: { user?: { userId: string; username: string; email: string } }
}>()
const prisma = new PrismaClient()

router.use('*', authMiddleware)

/**
 * POST /progress/units/:unitId/start
 * Start a unit (records startedAt timestamp)
 * 
 * Response: 200 OK
 * {
 *   "progress": {
 *     "id": "string",
 *     "userId": "string",
 *     "unitId": "string",
 *     "completed": false,
 *     "score": 0,
 *     "startedAt": "ISO datetime",
 *     "completedAt": null,
 *     "createdAt": "ISO datetime",
 *     "updatedAt": "ISO datetime"
 *   }
 * }
 */
router.post('/units/:unitId/start', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const unitId = c.req.param('unitId')

    const unit = await prisma.unit.findUnique({ where: { id: unitId } })
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }

    const progress = await startUnit(user.userId, unitId)

    return c.json({ progress }, 200)
  } catch (error) {
    console.error('Error starting unit:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to start unit' },
      500
    )
  }
})

/**
 * POST /progress/assets/:assetId/update
 * Update progress for a specific asset (video, audio, screenshot)
 * 
 * Request body:
 * {
 *   "secondsWatched": number,
 *   "progressPercentage": number,
 *   "durationSeconds": number (optional),
 *   "completed": boolean (optional)
 * }
 * 
 * Response: 200 OK
 * {
 *   "assetProgress": {
 *     "id": "string",
 *     "userId": "string",
 *     "unitId": "string",
 *     "assetId": "string",
 *     "completed": boolean,
 *     "progressPercentage": number,
 *     "secondsWatched": number,
 *     "durationSeconds": number,
 *     "completedAt": "ISO datetime | null",
 *     "createdAt": "ISO datetime",
 *     "updatedAt": "ISO datetime"
 *   }
 * }
 */
router.post('/assets/:assetId/update', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const assetId = c.req.param('assetId')
    const body = await c.req.json() as {
      secondsWatched?: number
      progressPercentage?: number
      durationSeconds?: number
      completed?: boolean
    }

    if (body.secondsWatched === undefined || body.progressPercentage === undefined) {
      return c.json(
        { error: 'Missing required fields: secondsWatched, progressPercentage' },
        400
      )
    }

    const asset = await prisma.unitAsset.findUnique({ where: { id: assetId } })
    if (!asset) {
      return c.json({ error: 'Asset not found' }, 404)
    }

    const assetProgress = await updateAssetProgress(
      user.userId,
      asset.unitId,
      assetId,
      {
        secondsWatched: body.secondsWatched,
        progressPercentage: body.progressPercentage,
        durationSeconds: body.durationSeconds,
        completed: body.completed,
      }
    )

    return c.json({ assetProgress }, 200)
  } catch (error) {
    console.error('Error updating asset progress:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update asset progress' },
      500
    )
  }
})

/**
 * POST /progress/units/:unitId/pronunciation
 * Record a pronunciation attempt
 * 
 * Request body:
 * {
 *   "audioKey": "string",
 *   "score": number,
 *   "feedback": "string" (optional)
 * }
 * 
 * Response: 201 Created
 * {
 *   "attempt": {
 *     "id": "string",
 *     "userId": "string",
 *     "unitId": "string",
 *     "audioKey": "string",
 *     "score": number,
 *     "feedback": "string | null",
 *     "createdAt": "ISO datetime"
 *   },
 *   "averageScore": number,
 *   "attemptCount": number
 * }
 */
router.post('/units/:unitId/pronunciation', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const unitId = c.req.param('unitId')
    const body = await c.req.json() as {
      audioKey?: string
      score?: number
      feedback?: string
    }

    if (!body.audioKey || body.score === undefined) {
      return c.json(
        { error: 'Missing required fields: audioKey, score' },
        400
      )
    }

    if (body.score < 0 || body.score > 100) {
      return c.json(
        { error: 'Score must be between 0 and 100' },
        400
      )
    }

    const unit = await prisma.unit.findUnique({ where: { id: unitId } })
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }

    const result = await recordPronunciationAttempt(
      user.userId,
      unitId,
      body.audioKey,
      body.score,
      body.feedback
    )

    return c.json(result, 201)
  } catch (error) {
    console.error('Error recording pronunciation attempt:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to record pronunciation attempt' },
      500
    )
  }
})

/**
 * POST /progress/units/:unitId/complete
 * Mark a unit as completed
 * 
 * Request body (optional):
 * {
 *   "finalScore": number (0-100)
 * }
 * 
 * Response: 200 OK
 * {
 *   "progress": {
 *     "id": "string",
 *     "userId": "string",
 *     "unitId": "string",
 *     "completed": true,
 *     "score": number,
 *     "startedAt": "ISO datetime",
 *     "completedAt": "ISO datetime",
 *     "createdAt": "ISO datetime",
 *     "updatedAt": "ISO datetime"
 *   },
 *   "dailyPlanUpdated": boolean
 * }
 */
router.post('/units/:unitId/complete', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const unitId = c.req.param('unitId')
    const body = await c.req.json().catch(() => ({})) as { finalScore?: number }

    if (body.finalScore !== undefined && (body.finalScore < 0 || body.finalScore > 100)) {
      return c.json(
        { error: 'Final score must be between 0 and 100' },
        400
      )
    }

    const unit = await prisma.unit.findUnique({ where: { id: unitId } })
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }

    const result = await completeUnit(user.userId, unitId, body.finalScore)

    return c.json(result, 200)
  } catch (error) {
    console.error('Error completing unit:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to complete unit' },
      500
    )
  }
})

/**
 * GET /progress/units/:unitId
 * Get progress for a specific unit
 * 
 * Response: 200 OK
 * {
 *   "progress": {
 *     "id": "string",
 *     "userId": "string",
 *     "unitId": "string",
 *     "completed": boolean,
 *     "score": number,
 *     "startedAt": "ISO datetime | null",
 *     "completedAt": "ISO datetime | null",
 *     "createdAt": "ISO datetime",
 *     "updatedAt": "ISO datetime"
 *   } | null,
 *   "pronunciationAttempts": [...],
 *   "assetProgress": [...]
 * }
 */
router.get('/units/:unitId', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const unitId = c.req.param('unitId')

    const unit = await prisma.unit.findUnique({ where: { id: unitId } })
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }

    const result = await getUnitProgress(user.userId, unitId)

    return c.json(result, 200)
  } catch (error) {
    console.error('Error getting unit progress:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get unit progress' },
      500
    )
  }
})

/**
 * GET /progress/summary
 * Get progress summary for the authenticated user
 * 
 * Response: 200 OK
 * {
 *   "userId": "string",
 *   "totalUnits": number,
 *   "completedUnits": number,
 *   "inProgressUnits": number,
 *   "averageScore": number,
 *   "totalPronunciationAttempts": number,
 *   "averagePronunciationScore": number,
 *   "recentActivity": [...],
 *   "stories": [...]
 * }
 */
router.get('/summary', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const summary = await getUserProgressSummary(user.userId)

    return c.json(summary, 200)
  } catch (error) {
    console.error('Error getting progress summary:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get progress summary' },
      500
    )
  }
})

/**
 * GET /progress/stories/:storyId
 * Get detailed progress for a specific story
 * 
 * Response: 200 OK
 * {
 *   "storyId": "string",
 *   "storyTitle": "string",
 *   "levelName": "string",
 *   "totalUnits": number,
 *   "completedUnits": number,
 *   "averageScore": number,
 *   "units": [...]
 * }
 */
router.get('/stories/:storyId', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const storyId = c.req.param('storyId')

    const story = await prisma.story.findUnique({ where: { id: storyId } })
    if (!story) {
      return c.json({ error: 'Story not found' }, 404)
    }

    const result = await getStoryProgress(user.userId, storyId)

    return c.json(result, 200)
  } catch (error) {
    console.error('Error getting story progress:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get story progress' },
      500
    )
  }
})

/**
 * GET /progress/units/:unitId/pronunciation
 * Get all pronunciation attempts for a unit
 * 
 * Response: 200 OK
 * {
 *   "attempts": [...],
 *   "averageScore": number,
 *   "count": number
 * }
 */
router.get('/units/:unitId/pronunciation', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const unitId = c.req.param('unitId')

    const unit = await prisma.unit.findUnique({ where: { id: unitId } })
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }

    const result = await getPronunciationAttempts(user.userId, unitId)

    return c.json(result, 200)
  } catch (error) {
    console.error('Error getting pronunciation attempts:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get pronunciation attempts' },
      500
    )
  }
})

/**
 * GET /progress/units/:unitId/assets
 * Get asset progress for a unit
 * 
 * Response: 200 OK
 * {
 *   "assetProgress": [...]
 * }
 */
router.get('/units/:unitId/assets', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const unitId = c.req.param('unitId')

    const unit = await prisma.unit.findUnique({ where: { id: unitId } })
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }

    const assetProgress = await getAssetProgress(user.userId, unitId)

    return c.json({ assetProgress }, 200)
  } catch (error) {
    console.error('Error getting asset progress:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get asset progress' },
      500
    )
  }
})

export default router
