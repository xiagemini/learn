import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Setup mocks before importing
vi.mock('../generated/client.js', () => ({
  PrismaClient: vi.fn()
}))

vi.mock('./assets.js', () => ({
  listAssetsForUnit: vi.fn()
}))

// Now import the service after mocks are set up
import {
  getLevelsWithStories,
  getStoriesByLevelId,
  getUnitsByStoryId,
  getUnitById,
  getDailyPlansForUser,
  getDailyPlanForUser
} from './courses.js'
import { PrismaClient } from '../generated/client.js'
import { listAssetsForUnit } from './assets.js'

describe('Courses Service', () => {
  let mockPrisma: any
  let mockListAssetsForUnit: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mockPrisma instance
    mockPrisma = {
      level: {
        findMany: vi.fn(),
        findUnique: vi.fn()
      },
      story: {
        findMany: vi.fn(),
        findUnique: vi.fn()
      },
      unit: {
        findMany: vi.fn(),
        findUnique: vi.fn()
      },
      dailyPlan: {
        findMany: vi.fn(),
        findUnique: vi.fn()
      }
    }

    const PrismaClientMock = vi.mocked(PrismaClient)
    PrismaClientMock.mockImplementation(() => mockPrisma)
    
    mockListAssetsForUnit = vi.mocked(listAssetsForUnit)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getLevelsWithStories', () => {
    it('should fetch levels with stories and units', async () => {
      const mockLevels = [
        {
          id: 'level1',
          name: 'Beginner',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          stories: [
            {
              id: 'story1',
              title: 'Basic Greetings',
              description: 'Learn basic greetings',
              order: 1,
              levelId: 'level1',
              createdAt: new Date(),
              updatedAt: new Date(),
              level: { name: 'Beginner' },
              units: [
                {
                  id: 'unit1',
                  title: 'Hello',
                  description: 'Learn to say hello',
                  order: 1,
                  storyId: 'story1',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  story: { title: 'Basic Greetings' },
                  _count: { assets: 3 }
                }
              ],
              _count: { units: 1 }
            }
          ],
          _count: { stories: 1 }
        }
      ]

      mockPrisma.level.findMany.mockResolvedValue(mockLevels)
      mockListAssetsForUnit.mockResolvedValue([])

      const result = await getLevelsWithStories()

      expect(mockPrisma.level.findMany).toHaveBeenCalledWith({
        include: {
          stories: {
            include: {
              level: { select: { name: true } },
              units: {
                include: {
                  story: { select: { title: true } },
                  _count: { select: { assets: true } }
                },
                orderBy: { order: 'asc' }
              },
              _count: { select: { units: true } }
            },
            orderBy: { order: 'asc' }
          },
          _count: { select: { stories: true } }
        },
        orderBy: { order: 'asc' }
      })

      expect(result).toEqual(mockLevels)
      expect(mockListAssetsForUnit).toHaveBeenCalledWith('unit1')
    })

    it('should handle errors', async () => {
      mockPrisma.level.findMany.mockRejectedValue(new Error('Database error'))

      try {
        await getLevelsWithStories()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Failed to fetch levels with stories: Database error')
      }
    })
  })

  describe('getStoriesByLevelId', () => {
    it('should fetch stories for a specific level', async () => {
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
          units: [
            {
              id: 'unit1',
              title: 'Hello',
              description: 'Learn to say hello',
              order: 1,
              storyId: 'story1',
              createdAt: new Date(),
              updatedAt: new Date(),
              story: { title: 'Basic Greetings' },
              _count: { assets: 3 }
            }
          ],
          _count: { units: 1 }
        }
      ]

      mockPrisma.story.findMany.mockResolvedValue(mockStories)
      mockListAssetsForUnit.mockResolvedValue([])

      const result = await getStoriesByLevelId('level1')

      expect(mockPrisma.story.findMany).toHaveBeenCalledWith({
        where: { levelId: 'level1' },
        include: {
          level: { select: { name: true } },
          units: {
            include: {
              story: { select: { title: true } },
              _count: { select: { assets: true } }
            },
            orderBy: { order: 'asc' }
          },
          _count: { select: { units: true } }
        },
        orderBy: { order: 'asc' }
      })

      expect(result).toEqual(mockStories)
    })

    it('should handle errors', async () => {
      mockPrisma.story.findMany.mockRejectedValue(new Error('Database error'))

      await expect(getStoriesByLevelId('level1')).rejects.toThrow('Failed to fetch stories for level level1: Database error')
    })
  })

  describe('getUnitsByStoryId', () => {
    it('should fetch units for a specific story', async () => {
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
          _count: { assets: 3 }
        }
      ]

      mockPrisma.unit.findMany.mockResolvedValue(mockUnits)
      mockListAssetsForUnit.mockResolvedValue([])

      const result = await getUnitsByStoryId('story1')

      expect(mockPrisma.unit.findMany).toHaveBeenCalledWith({
        where: { storyId: 'story1' },
        include: {
          story: { select: { title: true } },
          _count: { select: { assets: true } }
        },
        orderBy: { order: 'asc' }
      })

      expect(result).toEqual(mockUnits)
    })

    it('should handle errors', async () => {
      mockPrisma.unit.findMany.mockRejectedValue(new Error('Database error'))

      await expect(getUnitsByStoryId('story1')).rejects.toThrow('Failed to fetch units for story story1: Database error')
    })
  })

  describe('getUnitById', () => {
    it('should fetch a specific unit', async () => {
      const mockUnit = {
        id: 'unit1',
        title: 'Hello',
        description: 'Learn to say hello',
        order: 1,
        storyId: 'story1',
        createdAt: new Date(),
        updatedAt: new Date(),
        story: { title: 'Basic Greetings' },
        _count: { assets: 3 }
      }

      mockPrisma.unit.findUnique.mockResolvedValue(mockUnit)
      mockListAssetsForUnit.mockResolvedValue([])

      const result = await getUnitById('unit1')

      expect(mockPrisma.unit.findUnique).toHaveBeenCalledWith({
        where: { id: 'unit1' },
        include: {
          story: { select: { title: true } },
          _count: { select: { assets: true } }
        }
      })

      expect(result).toEqual(mockUnit)
    })

    it('should return null for non-existent unit', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue(null)

      const result = await getUnitById('nonexistent')

      expect(result).toBeNull()
    })

    it('should handle errors', async () => {
      mockPrisma.unit.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(getUnitById('unit1')).rejects.toThrow('Failed to fetch unit unit1: Database error')
    })
  })

  describe('getDailyPlansForUser', () => {
    const mockDate = new Date('2024-01-15')

    beforeEach(() => {
      vi.setSystemTime(mockDate)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should fetch daily plans for a user', async () => {
      const mockDailyPlans = [
        {
          id: 'plan1',
          userId: 'user1',
          plannedDate: new Date('2024-01-14'),
          createdAt: new Date(),
          updatedAt: new Date(),
          entries: [
            {
              id: 'entry1',
              dailyPlanId: 'plan1',
              unitId: 'unit1',
              completed: false,
              score: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              unit: {
                id: 'unit1',
                title: 'Hello',
                story: {
                  title: 'Basic Greetings',
                  level: { name: 'Beginner' }
                }
              }
            }
          ]
        }
      ]

      mockPrisma.dailyPlan.findMany.mockResolvedValue(mockDailyPlans)

      const result = await getDailyPlansForUser('user1')

      expect(mockPrisma.dailyPlan.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: {
          entries: {
            include: {
              unit: {
                include: {
                  story: {
                    include: {
                      level: { select: { name: true } }
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { plannedDate: 'asc' }
      })

      expect(result[0].isOverdue).toBe(true) // Jan 14 < Jan 15 and not completed
    })

    it('should filter by date range', async () => {
      mockPrisma.dailyPlan.findMany.mockResolvedValue([])

      await getDailyPlansForUser('user1', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      })

      expect(mockPrisma.dailyPlan.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          plannedDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        include: expect.any(Object),
        orderBy: { plannedDate: 'asc' }
      })
    })

    it('should filter overdue only', async () => {
      const mockDailyPlans = [
        {
          id: 'plan1',
          userId: 'user1',
          plannedDate: new Date('2024-01-14'),
          createdAt: new Date(),
          updatedAt: new Date(),
          entries: [
            {
              id: 'entry1',
              dailyPlanId: 'plan1',
              unitId: 'unit1',
              completed: false,
              score: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              unit: {
                id: 'unit1',
                title: 'Hello',
                story: {
                  title: 'Basic Greetings',
                  level: { name: 'Beginner' }
                }
              }
            }
          ]
        },
        {
          id: 'plan2',
          userId: 'user1',
          plannedDate: new Date('2024-01-16'),
          createdAt: new Date(),
          updatedAt: new Date(),
          entries: []
        }
      ]

      mockPrisma.dailyPlan.findMany.mockResolvedValue(mockDailyPlans)

      const result = await getDailyPlansForUser('user1', {
        includeOverdueOnly: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('plan1')
    })

    it('should handle errors', async () => {
      mockPrisma.dailyPlan.findMany.mockRejectedValue(new Error('Database error'))

      await expect(getDailyPlansForUser('user1')).rejects.toThrow('Failed to fetch daily plans for user user1: Database error')
    })
  })

  describe('getDailyPlanForUser', () => {
    it('should fetch a specific daily plan', async () => {
      const mockDailyPlan = {
        id: 'plan1',
        userId: 'user1',
        plannedDate: new Date('2024-01-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
        entries: []
      }

      mockPrisma.dailyPlan.findUnique.mockResolvedValue(mockDailyPlan)

      const result = await getDailyPlanForUser('user1', new Date('2024-01-15'))

      expect(mockPrisma.dailyPlan.findUnique).toHaveBeenCalledWith({
        where: {
          userId_plannedDate: {
            userId: 'user1',
            plannedDate: new Date('2024-01-15')
          }
        },
        include: {
          entries: {
            include: {
              unit: {
                include: {
                  story: {
                    include: {
                      level: { select: { name: true } }
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      expect(result).toEqual(mockDailyPlan)
    })

    it('should return null for non-existent plan', async () => {
      mockPrisma.dailyPlan.findUnique.mockResolvedValue(null)

      const result = await getDailyPlanForUser('user1', new Date('2024-01-15'))

      expect(result).toBeNull()
    })

    it('should handle errors', async () => {
      mockPrisma.dailyPlan.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(getDailyPlanForUser('user1', new Date('2024-01-15'))).rejects.toThrow('Failed to fetch daily plan for user user1: Database error')
    })
  })
})