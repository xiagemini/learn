import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Client } from 'minio'
import * as minioService from './minio'

// Mock the db module
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

// Mock process.env
process.env.MINIO_ROOT_PASSWORD = 'minioadmin123'

describe('MinIO Service', () => {
  beforeEach(() => {
    // Reset the minio client before each test
    vi.resetModules()
  })

  describe('getMinioClient', () => {
    it('should return a Client instance', () => {
      const client = minioService.getMinioClient()
      expect(client).toBeInstanceOf(Client)
    })

    it('should return the same client instance on subsequent calls', () => {
      const client1 = minioService.getMinioClient()
      const client2 = minioService.getMinioClient()
      expect(client1).toBe(client2)
    })
  })

  describe('getPresignedUrl', () => {
    it('should generate a presigned GET URL', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockPresignedGetObject = vi.fn().mockResolvedValue('http://minio:9000/bucket/object?token=xyz')

      const clientMock = {
        presignedGetObject: mockPresignedGetObject,
      } as any

      mockClient.mockReturnValue(clientMock)

      const url = await minioService.getPresignedUrl({
        bucketName: 'assets',
        objectName: 'units/unit-1/video.mp4',
      })

      expect(url).toBe('http://minio:9000/bucket/object?token=xyz')
      expect(mockPresignedGetObject).toHaveBeenCalledWith('assets', 'units/unit-1/video.mp4', 3600)

      mockClient.mockRestore()
    })

    it('should use custom expiry time if provided', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockPresignedGetObject = vi.fn().mockResolvedValue('http://minio:9000/bucket/object?token=xyz')

      const clientMock = {
        presignedGetObject: mockPresignedGetObject,
      } as any

      mockClient.mockReturnValue(clientMock)

      await minioService.getPresignedUrl({
        bucketName: 'assets',
        objectName: 'units/unit-1/audio.mp3',
        expirySeconds: 7200,
      })

      expect(mockPresignedGetObject).toHaveBeenCalledWith('assets', 'units/unit-1/audio.mp3', 7200)

      mockClient.mockRestore()
    })

    it('should throw error if presigned URL generation fails', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockPresignedGetObject = vi.fn().mockRejectedValue(new Error('Connection failed'))

      const clientMock = {
        presignedGetObject: mockPresignedGetObject,
      } as any

      mockClient.mockReturnValue(clientMock)

      await expect(
        minioService.getPresignedUrl({
          bucketName: 'assets',
          objectName: 'units/unit-1/missing.mp4',
        }),
      ).rejects.toThrow('Failed to generate presigned URL')

      mockClient.mockRestore()
    })
  })

  describe('getPresignedPutUrl', () => {
    it('should generate a presigned PUT URL', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockPresignedPutObject = vi.fn().mockResolvedValue('http://minio:9000/bucket/object?token=put')

      const clientMock = {
        presignedPutObject: mockPresignedPutObject,
      } as any

      mockClient.mockReturnValue(clientMock)

      const url = await minioService.getPresignedPutUrl({
        bucketName: 'uploads',
        objectName: 'units/unit-1/upload.mp4',
      })

      expect(url).toBe('http://minio:9000/bucket/object?token=put')
      expect(mockPresignedPutObject).toHaveBeenCalledWith('uploads', 'units/unit-1/upload.mp4', 3600)

      mockClient.mockRestore()
    })
  })

  describe('listObjects', () => {
    it('should list objects in a bucket with prefix', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')

      const mockObjects = [
        { name: 'units/unit-1/video.mp4', size: 1024000, etag: 'etag1', lastModified: new Date() },
        { name: 'units/unit-1/audio.mp3', size: 512000, etag: 'etag2', lastModified: new Date() },
      ]

      const callbacks: Record<string, unknown> = {}

      const mockStream: Record<string, unknown> = {
        on: vi.fn((event: string, callback: unknown) => {
          callbacks[event] = callback
          return mockStream
        }),
      }

      const mockListObjects = vi.fn().mockReturnValue(mockStream)

      const clientMock = {
        listObjects: mockListObjects,
      } as any

      mockClient.mockReturnValue(clientMock)

      const listPromise = minioService.listObjects('assets', 'units/unit-1/')

      // Simulate stream events
      if (callbacks.data && typeof callbacks.data === 'function') {
        mockObjects.forEach((obj) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (callbacks.data as any)(obj)
        })
      }

      if (callbacks.end && typeof callbacks.end === 'function') {
        (callbacks.end as () => void)()
      }

      const objects = await listPromise

      expect(objects).toHaveLength(2)
      expect(objects[0].name).toBe('units/unit-1/video.mp4')
      expect(objects[1].name).toBe('units/unit-1/audio.mp3')

      mockClient.mockRestore()
    })

    it('should handle stream errors', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')

      const callbacks: Record<string, unknown> = {}

      const mockStream: Record<string, unknown> = {
        on: vi.fn((event: string, callback: unknown) => {
          callbacks[event] = callback
          return mockStream
        }),
      }

      const mockListObjects = vi.fn().mockReturnValue(mockStream)

      const clientMock = {
        listObjects: mockListObjects,
      } as any

      mockClient.mockReturnValue(clientMock)

      const listPromise = minioService.listObjects('assets', 'units/')

      if (callbacks.error && typeof callbacks.error === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callbacks.error as any)(new Error('Stream error'))
      }

      await expect(listPromise).rejects.toThrow('Failed to list objects')

      mockClient.mockRestore()
    })
  })

  describe('checkMinIOHealth', () => {
    it('should return true if MinIO is accessible', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockListBuckets = vi.fn().mockResolvedValue([{ name: 'assets' }, { name: 'uploads' }])

      const clientMock = {
        listBuckets: mockListBuckets,
      } as any

      mockClient.mockReturnValue(clientMock)

      const health = await minioService.checkMinIOHealth()

      expect(health).toBe(true)
      expect(mockListBuckets).toHaveBeenCalled()

      mockClient.mockRestore()
    })

    it('should return false if MinIO is not accessible', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockListBuckets = vi.fn().mockRejectedValue(new Error('Connection refused'))

      const clientMock = {
        listBuckets: mockListBuckets,
      } as any

      mockClient.mockReturnValue(clientMock)

      const health = await minioService.checkMinIOHealth()

      expect(health).toBe(false)

      mockClient.mockRestore()
    })
  })

  describe('getObjectMetadata', () => {
    it('should return object metadata', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockDate = new Date()
      const mockStatObject = vi.fn().mockResolvedValue({
        size: 1024000,
        etag: 'etag123',
        lastModified: mockDate,
        metaData: { 'Content-Type': 'video/mp4' },
      })

      const clientMock = {
        statObject: mockStatObject,
      } as any

      mockClient.mockReturnValue(clientMock)

      const metadata = await minioService.getObjectMetadata('assets', 'units/unit-1/video.mp4')

      expect(metadata.size).toBe(1024000)
      expect(metadata.etag).toBe('etag123')
      expect(metadata.lastModified).toBe(mockDate)
      expect(mockStatObject).toHaveBeenCalledWith('assets', 'units/unit-1/video.mp4')

      mockClient.mockRestore()
    })

    it('should throw error if object does not exist', async () => {
      const mockClient = vi.spyOn(minioService, 'getMinioClient')
      const mockStatObject = vi.fn().mockRejectedValue(new Error('The specified key does not exist'))

      const clientMock = {
        statObject: mockStatObject,
      } as any

      mockClient.mockReturnValue(clientMock)

      await expect(minioService.getObjectMetadata('assets', 'units/missing/video.mp4')).rejects.toThrow(
        'Failed to get object metadata',
      )

      mockClient.mockRestore()
    })
  })
})
