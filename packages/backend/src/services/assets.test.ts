import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as assetsService from './assets'

// Mock Prisma
vi.mock('../generated/client', () => ({
  PrismaClient: vi.fn(() => ({
    unitAsset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  })),
}))

// Mock MinIO service
vi.mock('./minio', () => ({
  listObjects: vi.fn(),
  getPresignedUrl: vi.fn(),
  checkMinIOHealth: vi.fn(),
}))

// Mock db module
vi.mock('../db', () => ({
  getMinIOConfig: vi.fn(() => ({
    endpoint: 'localhost',
    port: 9000,
    useSSL: false,
    rootUser: 'minioadmin',
    buckets: {
      assets: 'assets',
      uploads: 'uploads',
      temp: 'temp',
    },
  })),
}))

describe('Assets Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listAssetsForUnit', () => {
    it('should list all assets for a unit with presigned URLs', async () => {
      const { PrismaClient } = await import('../generated/client')
      const { getPresignedUrl } = await import('./minio')

      const mockPrisma = new PrismaClient()
      const mockAssets = [
        {
          id: 'asset-1',
          unitId: 'unit-1',
          type: 'VIDEO',
          minioKey: 'units/unit-1/video.mp4',
          duration: 300,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'asset-2',
          unitId: 'unit-1',
          type: 'AUDIO',
          minioKey: 'units/unit-1/audio.mp3',
          duration: 200,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(mockPrisma.unitAsset.findMany as any).mockResolvedValue(mockAssets)
      ;(getPresignedUrl as any)
        .mockResolvedValueOnce('http://minio:9000/video.mp4?token=1')
        .mockResolvedValueOnce('http://minio:9000/audio.mp3?token=2')

      const assets = await assetsService.listAssetsForUnit('unit-1')

      expect(assets).toHaveLength(2)
      expect(assets[0].presignedUrl).toBe('http://minio:9000/video.mp4?token=1')
      expect(assets[1].presignedUrl).toBe('http://minio:9000/audio.mp3?token=2')
      expect((mockPrisma.unitAsset.findMany as any)).toHaveBeenCalledWith({
        where: { unitId: 'unit-1' },
        orderBy: { createdAt: 'asc' },
      })
    })

    it('should handle presigned URL generation errors gracefully', async () => {
      const { PrismaClient } = await import('../generated/client')
      const { getPresignedUrl } = await import('./minio')

      const mockPrisma = new PrismaClient()
      const mockAssets = [
        {
          id: 'asset-1',
          unitId: 'unit-1',
          type: 'VIDEO',
          minioKey: 'units/unit-1/video.mp4',
          duration: 300,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(mockPrisma.unitAsset.findMany as any).mockResolvedValue(mockAssets)
      ;(getPresignedUrl as any).mockRejectedValue(new Error('Connection failed'))

      const assets = await assetsService.listAssetsForUnit('unit-1')

      expect(assets).toHaveLength(1)
      expect(assets[0].presignedUrl).toBe('')
    })

    it('should return empty array for unit with no assets', async () => {
      const { PrismaClient } = await import('../generated/client')

      const mockPrisma = new PrismaClient()
      ;(mockPrisma.unitAsset.findMany as any).mockResolvedValue([])

      const assets = await assetsService.listAssetsForUnit('unit-1')

      expect(assets).toHaveLength(0)
    })

    it('should throw error if database query fails', async () => {
      const { PrismaClient } = await import('../generated/client')

      const mockPrisma = new PrismaClient()
      ;(mockPrisma.unitAsset.findMany as any).mockRejectedValue(new Error('Database error'))

      await expect(assetsService.listAssetsForUnit('unit-1')).rejects.toThrow(
        'Failed to list assets for unit',
      )
    })
  })

  describe('listAssetsPerUnit', () => {
    it('should list assets for multiple units', async () => {
      const { PrismaClient } = await import('../generated/client')
      const { getPresignedUrl } = await import('./minio')

      const mockPrisma = new PrismaClient()

      const mockUnit1Assets = [
        {
          id: 'asset-1',
          unitId: 'unit-1',
          type: 'VIDEO',
          minioKey: 'units/unit-1/video.mp4',
          duration: 300,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const mockUnit2Assets = [
        {
          id: 'asset-2',
          unitId: 'unit-2',
          type: 'AUDIO',
          minioKey: 'units/unit-2/audio.mp3',
          duration: 200,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(mockPrisma.unitAsset.findMany as any)
        .mockResolvedValueOnce(mockUnit1Assets)
        .mockResolvedValueOnce(mockUnit2Assets)

      ;(getPresignedUrl as any)
        .mockResolvedValueOnce('http://minio:9000/video.mp4?token=1')
        .mockResolvedValueOnce('http://minio:9000/audio.mp3?token=2')

      const result = await assetsService.listAssetsPerUnit(['unit-1', 'unit-2'])

      expect(result.size).toBe(2)
      expect(result.get('unit-1')).toHaveLength(1)
      expect(result.get('unit-2')).toHaveLength(1)
    })
  })

  describe('getAssetWithUrl', () => {
    it('should return asset with presigned URL', async () => {
      const { PrismaClient } = await import('../generated/client')
      const { getPresignedUrl } = await import('./minio')

      const mockPrisma = new PrismaClient()
      const mockAsset = {
        id: 'asset-1',
        unitId: 'unit-1',
        type: 'VIDEO',
        minioKey: 'units/unit-1/video.mp4',
        duration: 300,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrisma.unitAsset.findUnique as any).mockResolvedValue(mockAsset)
      ;(getPresignedUrl as any).mockResolvedValue('http://minio:9000/video.mp4?token=1')

      const asset = await assetsService.getAssetWithUrl('asset-1')

      expect(asset).not.toBeNull()
      expect(asset?.id).toBe('asset-1')
      expect(asset?.presignedUrl).toBe('http://minio:9000/video.mp4?token=1')
    })

    it('should return null if asset not found', async () => {
      const { PrismaClient } = await import('../generated/client')

      const mockPrisma = new PrismaClient()
      ;(mockPrisma.unitAsset.findUnique as any).mockResolvedValue(null)

      const asset = await assetsService.getAssetWithUrl('missing-asset')

      expect(asset).toBeNull()
    })
  })

  describe('syncAssetsFromMinIO', () => {
    it('should sync assets from MinIO bucket', async () => {
      const { listObjects } = await import('./minio')
      const { PrismaClient } = await import('../generated/client')

      const mockPrisma = new PrismaClient()

      const mockObjects = [
        {
          name: 'units/unit-1/video.mp4',
          size: 1024000,
          etag: 'etag1',
          lastModified: new Date(),
        },
        {
          name: 'units/unit-1/audio.mp3',
          size: 512000,
          etag: 'etag2',
          lastModified: new Date(),
        },
      ]

      ;(listObjects as any).mockResolvedValue(mockObjects)
      ;(mockPrisma.unitAsset.findUnique as any).mockResolvedValue(null)
      ;(mockPrisma.unitAsset.create as any).mockResolvedValue({})

      const result = await assetsService.syncAssetsFromMinIO()

      expect(result.synced).toBe(2)
      expect(mockPrisma.unitAsset.create as any).toHaveBeenCalledTimes(2)
    })

    it('should skip existing assets', async () => {
      const { listObjects } = await import('./minio')
      const { PrismaClient } = await import('../generated/client')

      const mockPrisma = new PrismaClient()

      const mockObjects = [
        {
          name: 'units/unit-1/video.mp4',
          size: 1024000,
          etag: 'etag1',
          lastModified: new Date(),
        },
      ]

      const existingAsset = {
        id: 'asset-1',
        unitId: 'unit-1',
        type: 'VIDEO',
        minioKey: 'units/unit-1/video.mp4',
        duration: 300,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(listObjects as any).mockResolvedValue(mockObjects)
      ;(mockPrisma.unitAsset.findUnique as any).mockResolvedValue(existingAsset)

      const result = await assetsService.syncAssetsFromMinIO()

      expect(result.synced).toBe(0)
      expect(mockPrisma.unitAsset.create as any).not.toHaveBeenCalled()
    })

    it('should detect asset type from file extension', async () => {
      const { listObjects } = await import('./minio')
      const { PrismaClient } = await import('../generated/client')

      const mockPrisma = new PrismaClient()

      const mockObjects = [
        {
          name: 'units/unit-1/video.mp4',
          size: 1024000,
          etag: 'etag1',
          lastModified: new Date(),
        },
        {
          name: 'units/unit-1/subtitle.vtt',
          size: 10000,
          etag: 'etag2',
          lastModified: new Date(),
        },
      ]

      ;(listObjects as any).mockResolvedValue(mockObjects)
      ;(mockPrisma.unitAsset.findUnique as any).mockResolvedValue(null)
      ;(mockPrisma.unitAsset.create as any).mockResolvedValue({})

      await assetsService.syncAssetsFromMinIO()

      const calls = (mockPrisma.unitAsset.create as any).mock.calls
      expect(calls[0][0].data.type).toBe('VIDEO')
      expect(calls[1][0].data.type).toBe('SUBTITLE')
    })
  })
})
