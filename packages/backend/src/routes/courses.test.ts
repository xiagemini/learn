import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import coursesRouter from './courses.js'
import {
  getLevelsWithStories,
  getStoriesByLevelId,
  getUnitsByStoryId,
  getUnitById,
  getDailyPlansForUser,
  getDailyPlanForUser
} from '../services/courses.js'

// Mock the courses service
vi.mock('../services/courses.js', () => ({
  getLevelsWithStories: vi.fn(),
  getStoriesByLevelId: vi.fn(),
  getUnitsByStoryId: vi.fn(),
  getUnitById: vi.fn(),
  getDailyPlansForUser: vi.fn(),
  getDailyPlanForUser: vi.fn()
}))

// Mock the auth middleware
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((c, next) => next()),
  requireAuth: vi.fn((c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401)
    }
    c.set('user', { userId: 'test-user-id', username: 'testuser', email: 'test@example.com' })
    return next()
  })
}))

describe('Courses Router', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
    app.route('/courses', coursesRouter)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /courses/levels', () => {
    it('should return levels with stories and units', async () => {
      const mockLevels = [
        {
          id: 'level1',
          name: 'Beginner',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { stories: 1 },
          stories: []
        }
      ]

      vi.mocked(getLevelsWithStories).mockResolvedValue(mockLevels)

      const res = await app.request('/courses/levels')
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ levels: mockLevels })
      expect(getLevelsWithStories).toHaveBeenCalledOnce()
    })

    it('should handle errors', async () => {
      vi.mocked(getLevelsWithStories).mockRejectedValue(new Error('Service error'))

      const res = await app.request('/courses/levels')
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Service error' })
    })
  })

  describe('GET /courses/stories', () => {
    it('should return stories grouped by level', async () => {
      const mockLevels = [
        {
          id: 'level1',
          name: 'Beginner',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          stories: []
        }
      ]

      vi.mocked(getStoriesByLevelId).mockResolvedValue([])

      const res = await app.request('/courses/stories')
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ levels: expect.any(Array) })
    })

    it('should handle errors', async () => {
      vi.mocked(getStoriesByLevelId).mockRejectedValue(new Error('Service error'))

      const res = await app.request('/courses/stories')
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Service error' })
    })
  })

  describe('GET /courses/levels/:levelId/stories', () => {
    it('should return stories for a specific level', async () => {
      const mockStories = [
        {
          id: 'story1',
          title: 'Basic Greetings',
          description: 'Learn basic greetings',
          order: 1,
          levelId: 'level1',
          createdAt: new Date(),
          updatedAt: new Date(),
          level: { name: 'Beginner' },
          _count: { units: 1 },
          units: []
        }
      ]

      vi.mocked(getStoriesByLevelId).mockResolvedValue(mockStories)

      const res = await app.request('/courses/levels/level1/stories')
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ stories: mockStories })
      expect(getStoriesByLevelId).toHaveBeenCalledWith('level1')
    })

    it('should handle errors', async () => {
      vi.mocked(getStoriesByLevelId).mockRejectedValue(new Error('Service error'))

      const res = await app.request('/courses/levels/level1/stories')
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Service error' })
    })
  })

  describe('GET /courses/stories/:storyId/units', () => {
    it('should return units for a specific story', async () => {
      const mockUnits = [
        {
          id: 'unit1',
          title: 'Hello',
          description: 'Learn to say hello',
          order: 1,
          storyId: 'story1',
          createdAt: new Date(),
          updatedAt: new Date(),
          story: { title: 'Basic Greetings' },
          _count: { assets: 3 },
          assets: []
        }
      ]

      vi.mocked(getUnitsByStoryId).mockResolvedValue(mockUnits)

      const res = await app.request('/courses/stories/story1/units')
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ units: mockUnits })
      expect(getUnitsByStoryId).toHaveBeenCalledWith('story1')
    })

    it('should handle errors', async () => {
      vi.mocked(getUnitsByStoryId).mockRejectedValue(new Error('Service error'))

      const res = await app.request('/courses/stories/story1/units')
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Service error' })
    })
  })

  describe('GET /courses/units/:unitId', () => {
    it('should return a specific unit', async () => {
      const mockUnit = {
        id: 'unit1',
        title: 'Hello',
        description: 'Learn to say hello',
        order: 1,
        storyId: 'story1',
        createdAt: new Date(),
        updatedAt: new Date(),
        story: { title: 'Basic Greetings' },
        _count: { assets: 3 },
        assets: []
      }

      vi.mocked(getUnitById).mockResolvedValue(mockUnit)

      const res = await app.request('/courses/units/unit1')
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ unit: mockUnit })
      expect(getUnitById).toHaveBeenCalledWith('unit1')
    })

    it('should return 404 for non-existent unit', async () => {
      vi.mocked(getUnitById).mockResolvedValue(null)

      const res = await app.request('/courses/units/nonexistent')
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Unit not found' })
    })

    it('should handle errors', async () => {
      vi.mocked(getUnitById).mockRejectedValue(new Error('Service error'))

      const res = await app.request('/courses/units/unit1')
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Service error' })
    })
  })

  describe('GET /courses/daily-plans', () => {
    it('should return daily plans for authenticated user', async () => {
      const mockDailyPlans = [
        {
          id: 'plan1',
          userId: 'test-user-id',
          plannedDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          isOverdue: false,
          entries: []
        }
      ]

      vi.mocked(getDailyPlansForUser).mockResolvedValue(mockDailyPlans)

      const res = await app.request('/courses/daily-plans', {
        headers: { Authorization: 'Bearer token' }
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ dailyPlans: mockDailyPlans })
      expect(getDailyPlansForUser).toHaveBeenCalledWith('test-user-id', {})
    })

    it('should handle query parameters', async () => {
      vi.mocked(getDailyPlansForUser).mockResolvedValue([])

      const startDate = '2024-01-01'
      const endDate = '2024-01-31'

      await app.request('/courses/daily-plans?startDate=2024-01-01&endDate=2024-01-31&overdueOnly=true', {
        headers: { Authorization: 'Bearer token' }
      })

      expect(getDailyPlansForUser).toHaveBeenCalledWith('test-user-id', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        includeOverdueOnly: true
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      const res = await app.request('/courses/daily-plans')
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'No authorization header' })
    })

    it('should handle errors', async () => {
      vi.mocked(getDailyPlansForUser).mockRejectedValue(new Error('Service error'))

      const res = await app.request('/courses/daily-plans', {
        headers: { Authorization: 'Bearer token' }
      })
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Service error' })
    })
  })

  describe('GET /courses/daily-plans/:date', () => {
    it('should return a specific daily plan', async () => {
      const mockDailyPlan = {
        id: 'plan1',
        userId: 'test-user-id',
        plannedDate: new Date('2024-01-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
        isOverdue: false,
        entries: []
      }

      vi.mocked(getDailyPlanForUser).mockResolvedValue(mockDailyPlan)

      const res = await app.request('/courses/daily-plans/2024-01-15', {
        headers: { Authorization: 'Bearer token' }
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ dailyPlan: mockDailyPlan })
      expect(getDailyPlanForUser).toHaveBeenCalledWith('test-user-id', new Date('2024-01-15'))
    })

    it('should return 404 for non-existent daily plan', async () => {
      vi.mocked(getDailyPlanForUser).mockResolvedValue(null)

      const res = await app.request('/courses/daily-plans/2024-01-15', {
        headers: { Authorization: 'Bearer token' }
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Daily plan not found' })
    })

    it('should return 400 for invalid date format', async () => {
      const res = await app.request('/courses/daily-plans/invalid-date', {
        headers: { Authorization: 'Bearer token' }
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid date format. Use YYYY-MM-DD' })
    })

    it('should return 401 for unauthenticated user', async () => {
      const res = await app.request('/courses/daily-plans/2024-01-15')
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'No authorization header' })
    })

    it('should handle errors', async () => {
      vi.mocked(getDailyPlanForUser).mockRejectedValue(new Error('Service error'))

      const res = await app.request('/courses/daily-plans/2024-01-15', {
        headers: { Authorization: 'Bearer token' }
      })
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Service error' })
    })
  })
})