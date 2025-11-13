import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import progressRouter from './progress.js'
import * as progressService from '../services/progress.js'

vi.mock('../services/progress.js', () => ({
  startUnit: vi.fn(),
  updateAssetProgress: vi.fn(),
  recordPronunciationAttempt: vi.fn(),
  completeUnit: vi.fn(),
  getUnitProgress: vi.fn(),
  getUserProgressSummary: vi.fn(),
  getStoryProgress: vi.fn(),
  getPronunciationAttempts: vi.fn(),
  getAssetProgress: vi.fn(),
}))

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((c, next) => next()),
  requireAuth: vi.fn((c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    c.set('user', { userId: 'test-user-id', username: 'testuser', email: 'test@example.com' })
    return next()
  }),
}))

vi.mock('../generated/client.js', () => ({
  PrismaClient: vi.fn(() => ({
    unit: {
      findUnique: vi.fn(),
    },
    story: {
      findUnique: vi.fn(),
    },
    unitAsset: {
      findUnique: vi.fn(),
    },
  })),
}))

describe('Progress Router', () => {
  let app: Hono
  let mockPrisma: any

  beforeEach(async () => {
    vi.clearAllMocks()
    app = new Hono()
    app.route('/progress', progressRouter)

    const { PrismaClient } = await import('../generated/client.js')
    mockPrisma = new PrismaClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /progress/units/:unitId/start', () => {
    it('should start a unit and return progress', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'test-user-id',
        unitId: 'unit-1',
        completed: false,
        score: 0,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', title: 'Unit 1' })
      vi.mocked(progressService.startUnit).mockResolvedValue(mockProgress)

      const res = await app.request('/progress/units/unit-1/start', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ progress: mockProgress })
      expect(progressService.startUnit).toHaveBeenCalledWith('test-user-id', 'unit-1')
    })

    it('should return 401 if not authenticated', async () => {
      const res = await app.request('/progress/units/unit-1/start', {
        method: 'POST',
      })

      expect(res.status).toBe(401)
    })

    it('should return 404 if unit not found', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue(null)

      const res = await app.request('/progress/units/unit-1/start', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Unit not found')
    })
  })

  describe('POST /progress/assets/:assetId/update', () => {
    it('should update asset progress', async () => {
      const mockAssetProgress = {
        id: 'asset-progress-1',
        userId: 'test-user-id',
        unitId: 'unit-1',
        assetId: 'asset-1',
        completed: false,
        progressPercentage: 50,
        secondsWatched: 150,
        durationSeconds: 300,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.unitAsset.findUnique.mockResolvedValue({
        id: 'asset-1',
        unitId: 'unit-1',
        type: 'VIDEO',
      })
      vi.mocked(progressService.updateAssetProgress).mockResolvedValue(mockAssetProgress)

      const res = await app.request('/progress/assets/asset-1/update', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secondsWatched: 150,
          progressPercentage: 50,
          durationSeconds: 300,
        }),
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ assetProgress: mockAssetProgress })
      expect(progressService.updateAssetProgress).toHaveBeenCalledWith(
        'test-user-id',
        'unit-1',
        'asset-1',
        {
          secondsWatched: 150,
          progressPercentage: 50,
          durationSeconds: 300,
        }
      )
    })

    it('should return 400 if required fields are missing', async () => {
      mockPrisma.unitAsset.findUnique.mockResolvedValue({
        id: 'asset-1',
        unitId: 'unit-1',
      })

      const res = await app.request('/progress/assets/asset-1/update', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secondsWatched: 150 }),
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })
  })

  describe('POST /progress/units/:unitId/pronunciation', () => {
    it('should record a pronunciation attempt', async () => {
      const mockResult = {
        attempt: {
          id: 'attempt-1',
          userId: 'test-user-id',
          unitId: 'unit-1',
          audioKey: 'audio/pronunciation-1.mp3',
          score: 85,
          feedback: 'Good job',
          createdAt: new Date(),
        },
        averageScore: 87.5,
        attemptCount: 2,
      }

      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', title: 'Unit 1' })
      vi.mocked(progressService.recordPronunciationAttempt).mockResolvedValue(mockResult)

      const res = await app.request('/progress/units/unit-1/pronunciation', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioKey: 'audio/pronunciation-1.mp3',
          score: 85,
          feedback: 'Good job',
        }),
      })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toEqual(mockResult)
    })

    it('should return 400 if score is out of range', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1' })

      const res = await app.request('/progress/units/unit-1/pronunciation', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioKey: 'audio/pronunciation-1.mp3',
          score: 150,
        }),
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('Score must be between 0 and 100')
    })
  })

  describe('POST /progress/units/:unitId/complete', () => {
    it('should complete a unit', async () => {
      const mockResult = {
        progress: {
          id: 'progress-1',
          userId: 'test-user-id',
          unitId: 'unit-1',
          completed: true,
          score: 88,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        dailyPlanUpdated: true,
      }

      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', title: 'Unit 1' })
      vi.mocked(progressService.completeUnit).mockResolvedValue(mockResult)

      const res = await app.request('/progress/units/unit-1/complete', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(mockResult)
      expect(progressService.completeUnit).toHaveBeenCalledWith('test-user-id', 'unit-1', undefined)
    })

    it('should accept a final score', async () => {
      const mockResult = {
        progress: {
          id: 'progress-1',
          userId: 'test-user-id',
          unitId: 'unit-1',
          completed: true,
          score: 95,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        dailyPlanUpdated: false,
      }

      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', title: 'Unit 1' })
      vi.mocked(progressService.completeUnit).mockResolvedValue(mockResult)

      const res = await app.request('/progress/units/unit-1/complete', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ finalScore: 95 }),
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.progress.score).toBe(95)
      expect(progressService.completeUnit).toHaveBeenCalledWith('test-user-id', 'unit-1', 95)
    })
  })

  describe('GET /progress/units/:unitId', () => {
    it('should return unit progress details', async () => {
      const mockResult = {
        progress: {
          id: 'progress-1',
          userId: 'test-user-id',
          unitId: 'unit-1',
          completed: false,
          score: 0,
          startedAt: new Date(),
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        pronunciationAttempts: [],
        assetProgress: [],
      }

      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', title: 'Unit 1' })
      vi.mocked(progressService.getUnitProgress).mockResolvedValue(mockResult)

      const res = await app.request('/progress/units/unit-1', {
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(mockResult)
    })
  })

  describe('GET /progress/summary', () => {
    it('should return user progress summary', async () => {
      const mockSummary = {
        userId: 'test-user-id',
        totalUnits: 10,
        completedUnits: 5,
        inProgressUnits: 3,
        averageScore: 85,
        totalPronunciationAttempts: 20,
        averagePronunciationScore: 87.5,
        recentActivity: [],
        stories: [],
      }

      vi.mocked(progressService.getUserProgressSummary).mockResolvedValue(mockSummary)

      const res = await app.request('/progress/summary', {
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(mockSummary)
    })
  })

  describe('GET /progress/stories/:storyId', () => {
    it('should return story progress', async () => {
      const mockStoryProgress = {
        storyId: 'story-1',
        storyTitle: 'Story 1',
        levelName: 'Beginner',
        totalUnits: 5,
        completedUnits: 3,
        averageScore: 88,
        units: [],
      }

      mockPrisma.story.findUnique.mockResolvedValue({ id: 'story-1', title: 'Story 1' })
      vi.mocked(progressService.getStoryProgress).mockResolvedValue(mockStoryProgress)

      const res = await app.request('/progress/stories/story-1', {
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(mockStoryProgress)
    })

    it('should return 404 if story not found', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(null)

      const res = await app.request('/progress/stories/story-1', {
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Story not found')
    })
  })

  describe('GET /progress/units/:unitId/pronunciation', () => {
    it('should return pronunciation attempts for a unit', async () => {
      const mockResult = {
        attempts: [
          {
            id: 'attempt-1',
            userId: 'test-user-id',
            unitId: 'unit-1',
            audioKey: 'audio-1',
            score: 85,
            feedback: 'Good',
            createdAt: new Date(),
          },
        ],
        averageScore: 85,
        count: 1,
      }

      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', title: 'Unit 1' })
      vi.mocked(progressService.getPronunciationAttempts).mockResolvedValue(mockResult)

      const res = await app.request('/progress/units/unit-1/pronunciation', {
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(mockResult)
    })
  })

  describe('GET /progress/units/:unitId/assets', () => {
    it('should return asset progress for a unit', async () => {
      const mockAssetProgress = [
        {
          id: 'asset-progress-1',
          userId: 'test-user-id',
          unitId: 'unit-1',
          assetId: 'asset-1',
          completed: true,
          progressPercentage: 100,
          secondsWatched: 300,
          durationSeconds: 300,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          asset: {
            id: 'asset-1',
            type: 'VIDEO',
            minioKey: 'video-1',
            duration: 300,
          },
        },
      ]

      mockPrisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', title: 'Unit 1' })
      vi.mocked(progressService.getAssetProgress).mockResolvedValue(mockAssetProgress)

      const res = await app.request('/progress/units/unit-1/assets', {
        headers: { Authorization: 'Bearer test-token' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ assetProgress: mockAssetProgress })
    })
  })
})
