import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as progressService from './progress'
import { PrismaClient } from '../generated/client.js'

vi.mock('../generated/client.js', () => {
  const mockPrisma = {
    userProgress: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    unitAsset: {
      findMany: vi.fn(),
    },
    unitAssetProgress: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pronunciationAttempt: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    dailyPlanEntry: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    unit: {
      findMany: vi.fn(),
    },
  }
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  }
})

describe('Progress Service', () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = (PrismaClient as any)()
    vi.clearAllMocks()
  })

  describe('startUnit', () => {
    it('should create new progress if none exists', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        completed: false,
        score: 0,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.userProgress.findUnique.mockResolvedValue(null)
      mockPrisma.userProgress.create.mockResolvedValue(mockProgress)

      const result = await progressService.startUnit('user-1', 'unit-1')

      expect(result).toEqual(mockProgress)
      expect(mockPrisma.userProgress.findUnique).toHaveBeenCalledWith({
        where: { userId_unitId: { userId: 'user-1', unitId: 'unit-1' } },
      })
      expect(mockPrisma.userProgress.create).toHaveBeenCalled()
    })

    it('should return existing progress if already started', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        completed: false,
        score: 0,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.userProgress.findUnique.mockResolvedValue(mockProgress)

      const result = await progressService.startUnit('user-1', 'unit-1')

      expect(result).toEqual(mockProgress)
      expect(mockPrisma.userProgress.create).not.toHaveBeenCalled()
    })

    it('should set startedAt when existing progress has no timestamp', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        completed: false,
        score: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedProgress = {
        ...mockProgress,
        startedAt: new Date(),
      }

      mockPrisma.userProgress.findUnique.mockResolvedValue(mockProgress)
      mockPrisma.userProgress.update.mockResolvedValue(updatedProgress)

      const result = await progressService.startUnit('user-1', 'unit-1')

      expect(mockPrisma.userProgress.update).toHaveBeenCalled()
      expect(result.startedAt).toEqual(updatedProgress.startedAt)
    })
  })

  describe('updateAssetProgress', () => {
    it('should create new asset progress if none exists', async () => {
      const mockAssetProgress = {
        id: 'asset-progress-1',
        userId: 'user-1',
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

      mockPrisma.userProgress.findUnique.mockResolvedValue(null)
      mockPrisma.userProgress.create.mockResolvedValue({
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        startedAt: new Date(),
        completed: false,
        score: 0,
      })
      mockPrisma.unitAssetProgress.findUnique.mockResolvedValue(null)
      mockPrisma.unitAssetProgress.create.mockResolvedValue(mockAssetProgress)

      const result = await progressService.updateAssetProgress('user-1', 'unit-1', 'asset-1', {
        secondsWatched: 150,
        progressPercentage: 50,
        durationSeconds: 300,
      })

      expect(result).toEqual(mockAssetProgress)
      expect(mockPrisma.unitAssetProgress.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          unitId: 'unit-1',
          assetId: 'asset-1',
          secondsWatched: 150,
          progressPercentage: 50,
          durationSeconds: 300,
          completed: false,
          completedAt: null,
        },
      })
    })

    it('should mark asset as completed when progress >= 90%', async () => {
      mockPrisma.userProgress.findUnique.mockResolvedValue({ startedAt: new Date() })
      mockPrisma.unitAssetProgress.findUnique.mockResolvedValue(null)
      mockPrisma.unitAssetProgress.create.mockResolvedValue({
        id: 'asset-progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        assetId: 'asset-1',
        completed: true,
        progressPercentage: 95,
        secondsWatched: 285,
        durationSeconds: 300,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await progressService.updateAssetProgress('user-1', 'unit-1', 'asset-1', {
        secondsWatched: 285,
        progressPercentage: 95,
        durationSeconds: 300,
      })

      expect(result.completed).toBe(true)
      expect(result.completedAt).toBeDefined()
    })

    it('should update existing asset progress', async () => {
      const existingProgress = {
        id: 'asset-progress-1',
        userId: 'user-1',
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

      mockPrisma.userProgress.findUnique.mockResolvedValue({ startedAt: new Date() })
      mockPrisma.unitAssetProgress.findUnique.mockResolvedValue(existingProgress)
      mockPrisma.unitAssetProgress.update.mockResolvedValue({
        ...existingProgress,
        progressPercentage: 75,
        secondsWatched: 225,
      })

      const result = await progressService.updateAssetProgress('user-1', 'unit-1', 'asset-1', {
        secondsWatched: 225,
        progressPercentage: 75,
        durationSeconds: 300,
      })

      expect(mockPrisma.unitAssetProgress.update).toHaveBeenCalled()
      expect(result.progressPercentage).toBe(75)
      expect(result.secondsWatched).toBe(225)
    })
  })

  describe('recordPronunciationAttempt', () => {
    it('should record a pronunciation attempt and return average score', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        userId: 'user-1',
        unitId: 'unit-1',
        audioKey: 'audio/pronunciation-1.mp3',
        score: 85,
        feedback: 'Good pronunciation',
        createdAt: new Date(),
      }

      const mockAttempts = [
        { ...mockAttempt, id: 'attempt-1', score: 85 },
        { ...mockAttempt, id: 'attempt-2', score: 90 },
      ]

      mockPrisma.userProgress.findUnique.mockResolvedValue({ startedAt: new Date() })
      mockPrisma.pronunciationAttempt.create.mockResolvedValue(mockAttempt)
      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue(mockAttempts)

      const result = await progressService.recordPronunciationAttempt(
        'user-1',
        'unit-1',
        'audio/pronunciation-1.mp3',
        85,
        'Good pronunciation'
      )

      expect(result.attempt).toEqual(mockAttempt)
      expect(result.averageScore).toBe(87.5)
      expect(result.attemptCount).toBe(2)
    })
  })

  describe('calculateUnitScore', () => {
    it('should calculate average score from pronunciation attempts and assets', async () => {
      const mockAssets = [{ id: 'asset-1' }, { id: 'asset-2' }]
      const mockAssetProgress = [
        { assetId: 'asset-1', progressPercentage: 100 },
        { assetId: 'asset-2', progressPercentage: 80 },
      ]
      const mockAttempts = [
        { score: 80 },
        { score: 85 },
        { score: 90 },
        { score: 95 },
      ]

      mockPrisma.unitAsset.findMany.mockResolvedValue(mockAssets)
      mockPrisma.unitAssetProgress.findMany.mockResolvedValue(mockAssetProgress)
      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue(mockAttempts)

      const score = await progressService.calculateUnitScore('user-1', 'unit-1')

      expect(score).toBe(89)
    })

    it('should return 0 if no attempts or assets exist', async () => {
      mockPrisma.unitAsset.findMany.mockResolvedValue([])
      mockPrisma.unitAssetProgress.findMany.mockResolvedValue([])
      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue([])

      const score = await progressService.calculateUnitScore('user-1', 'unit-1')

      expect(score).toBe(0)
    })
  })

  describe('completeUnit', () => {
    it('should mark unit as completed and update daily plan', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        completed: true,
        score: 85,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockDailyPlanEntries = [
        {
          id: 'entry-1',
          dailyPlanId: 'plan-1',
          unitId: 'unit-1',
          completed: false,
          score: 0,
          dailyPlan: { userId: 'user-1' },
        },
      ]

      mockPrisma.userProgress.findUnique.mockResolvedValue({ id: 'progress-1', userId: 'user-1', unitId: 'unit-1', startedAt: new Date() })
      mockPrisma.unitAsset.findMany.mockResolvedValue([])
      mockPrisma.unitAssetProgress.findMany.mockResolvedValue([])
      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue([
        { score: 85 },
        { score: 85 },
      ])
      mockPrisma.userProgress.update.mockResolvedValue(mockProgress)
      mockPrisma.dailyPlanEntry.findMany.mockResolvedValue(mockDailyPlanEntries)
      mockPrisma.dailyPlanEntry.update.mockResolvedValue({ ...mockDailyPlanEntries[0], completed: true, score: 85 })

      const result = await progressService.completeUnit('user-1', 'unit-1')

      expect(result.progress.completed).toBe(true)
      expect(result.dailyPlanUpdated).toBe(true)
      expect(mockPrisma.dailyPlanEntry.update).toHaveBeenCalled()
    })

    it('should mark asset progress as completed when finishing unit', async () => {
      const asset = { id: 'asset-1', unitId: 'unit-1', duration: 300 }
      const existingAssetProgress = {
        id: 'asset-progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        assetId: 'asset-1',
        completed: false,
        progressPercentage: 80,
        secondsWatched: 240,
        durationSeconds: 300,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedAssetProgress = {
        ...existingAssetProgress,
        completed: true,
        progressPercentage: 100,
        completedAt: new Date(),
      }

      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        completed: true,
        score: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.userProgress.findUnique.mockResolvedValue({ id: 'progress-1', userId: 'user-1', unitId: 'unit-1', startedAt: new Date() })
      mockPrisma.unitAsset.findMany
        .mockResolvedValueOnce([asset])
        .mockResolvedValueOnce([asset])
      mockPrisma.unitAssetProgress.findUnique.mockResolvedValue(existingAssetProgress)
      mockPrisma.unitAssetProgress.update.mockResolvedValue(updatedAssetProgress)
      mockPrisma.unitAssetProgress.findMany.mockResolvedValue([{ assetId: 'asset-1', progressPercentage: 100 }])
      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue([])
      mockPrisma.userProgress.update.mockResolvedValue(mockProgress)
      mockPrisma.dailyPlanEntry.findMany.mockResolvedValue([])

      const result = await progressService.completeUnit('user-1', 'unit-1')

      expect(mockPrisma.unitAssetProgress.update).toHaveBeenCalled()
      expect(result.progress.score).toBe(100)
      expect(result.dailyPlanUpdated).toBe(false)
    })

    it('should use provided final score instead of calculating', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        completed: true,
        score: 95,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.userProgress.findUnique.mockResolvedValue({ id: 'progress-1', userId: 'user-1', unitId: 'unit-1', startedAt: new Date() })
      mockPrisma.unitAsset.findMany.mockResolvedValue([])
      mockPrisma.userProgress.update.mockResolvedValue(mockProgress)
      mockPrisma.dailyPlanEntry.findMany.mockResolvedValue([])

      const result = await progressService.completeUnit('user-1', 'unit-1', 95)

      expect(result.progress.score).toBe(95)
      expect(mockPrisma.unitAsset.findMany).toHaveBeenCalled()
    })
  })

  describe('getUserProgressSummary', () => {
    it('should return comprehensive progress summary', async () => {
      const mockProgress = [
        {
          id: 'progress-1',
          userId: 'user-1',
          unitId: 'unit-1',
          completed: true,
          score: 85,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          unit: {
            id: 'unit-1',
            title: 'Unit 1',
            storyId: 'story-1',
            story: {
              id: 'story-1',
              title: 'Story 1',
              level: { name: 'Beginner' },
            },
          },
        },
        {
          id: 'progress-2',
          userId: 'user-1',
          unitId: 'unit-2',
          completed: false,
          score: 0,
          startedAt: new Date(),
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          unit: {
            id: 'unit-2',
            title: 'Unit 2',
            storyId: 'story-1',
            story: {
              id: 'story-1',
              title: 'Story 1',
              level: { name: 'Beginner' },
            },
          },
        },
      ]

      const mockAttempts = [
        { score: 80 },
        { score: 90 },
      ]

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress)
      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue(mockAttempts)

      const result = await progressService.getUserProgressSummary('user-1')

      expect(result.userId).toBe('user-1')
      expect(result.totalUnits).toBe(2)
      expect(result.completedUnits).toBe(1)
      expect(result.inProgressUnits).toBe(1)
      expect(result.averageScore).toBe(85)
      expect(result.totalPronunciationAttempts).toBe(2)
      expect(result.averagePronunciationScore).toBe(85)
      expect(result.stories).toHaveLength(1)
      expect(result.stories[0].storyId).toBe('story-1')
    })
  })

  describe('getStoryProgress', () => {
    it('should return detailed progress for a story', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          title: 'Unit 1',
          storyId: 'story-1',
          order: 1,
          story: {
            id: 'story-1',
            title: 'Story 1',
            level: { name: 'Beginner' },
          },
        },
        {
          id: 'unit-2',
          title: 'Unit 2',
          storyId: 'story-1',
          order: 2,
          story: {
            id: 'story-1',
            title: 'Story 1',
            level: { name: 'Beginner' },
          },
        },
      ]

      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        unitId: 'unit-1',
        completed: true,
        score: 90,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.unit.findMany.mockResolvedValue(mockUnits)
      mockPrisma.userProgress.findUnique
        .mockResolvedValueOnce(mockProgress)
        .mockResolvedValueOnce(null)
      mockPrisma.pronunciationAttempt.findMany
        .mockResolvedValueOnce([{ score: 90 }])
        .mockResolvedValueOnce([])

      const result = await progressService.getStoryProgress('user-1', 'story-1')

      expect(result.storyId).toBe('story-1')
      expect(result.storyTitle).toBe('Story 1')
      expect(result.levelName).toBe('Beginner')
      expect(result.totalUnits).toBe(2)
      expect(result.completedUnits).toBe(1)
      expect(result.averageScore).toBe(90)
      expect(result.units).toHaveLength(2)
    })
  })

  describe('getPronunciationAttempts', () => {
    it('should return all attempts with average score', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          userId: 'user-1',
          unitId: 'unit-1',
          audioKey: 'audio-1',
          score: 85,
          feedback: 'Good',
          createdAt: new Date(),
        },
        {
          id: 'attempt-2',
          userId: 'user-1',
          unitId: 'unit-1',
          audioKey: 'audio-2',
          score: 90,
          feedback: 'Excellent',
          createdAt: new Date(),
        },
      ]

      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue(mockAttempts)

      const result = await progressService.getPronunciationAttempts('user-1', 'unit-1')

      expect(result.attempts).toEqual(mockAttempts)
      expect(result.averageScore).toBe(87.5)
      expect(result.count).toBe(2)
    })

    it('should return empty array and 0 average for no attempts', async () => {
      mockPrisma.pronunciationAttempt.findMany.mockResolvedValue([])

      const result = await progressService.getPronunciationAttempts('user-1', 'unit-1')

      expect(result.attempts).toEqual([])
      expect(result.averageScore).toBe(0)
      expect(result.count).toBe(0)
    })
  })
})
