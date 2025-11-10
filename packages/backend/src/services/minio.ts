import { Client } from 'minio'
import { getMinIOConfig } from '../db.js'

let minioClient: Client | null = null

/**
 * Initialize and get MinIO client
 */
export function getMinioClient(): Client {
  if (minioClient) {
    return minioClient
  }

  const config = getMinIOConfig()

  minioClient = new Client({
    endPoint: config.endpoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.rootUser,
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
  })

  return minioClient
}

/**
 * Configuration for presigned URL generation
 */
export interface PresignedUrlConfig {
  bucketName: string
  objectName: string
  expirySeconds?: number
}

/**
 * Generate presigned URL for an object
 */
export async function getPresignedUrl(config: PresignedUrlConfig): Promise<string> {
  const client = getMinioClient()
  const expirySeconds = config.expirySeconds || 3600 // 1 hour default

  try {
    const url = await client.presignedGetObject(
      config.bucketName,
      config.objectName,
      expirySeconds,
    )
    return url
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate presigned URL: ${errorMessage}`)
  }
}

/**
 * Generate presigned PUT URL for uploading objects
 */
export async function getPresignedPutUrl(config: PresignedUrlConfig): Promise<string> {
  const client = getMinioClient()
  const expirySeconds = config.expirySeconds || 3600 // 1 hour default

  try {
    const url = await client.presignedPutObject(
      config.bucketName,
      config.objectName,
      expirySeconds,
    )
    return url
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate presigned PUT URL: ${errorMessage}`)
  }
}

/**
 * List objects in a bucket with optional prefix filtering
 */
export async function listObjects(
  bucketName: string,
  prefix?: string,
): Promise<Array<{ name: string; size: number; etag: string; lastModified: Date }>> {
  const client = getMinioClient()
  const objects: Array<{ name: string; size: number; etag: string; lastModified: Date }> = []

  try {
    const objectsList = await client.listObjects(bucketName, prefix, true)

    return new Promise((resolve, reject) => {
      objectsList.on('data', (obj: any) => {
        objects.push({
          name: obj.name || '',
          size: obj.size || 0,
          etag: obj.etag || '',
          lastModified: new Date(obj.lastModified || 0),
        })
      })

      objectsList.on('error', (err: Error) => {
        reject(new Error(`Failed to list objects: ${err.message}`))
      })

      objectsList.on('end', () => {
        resolve(objects)
      })
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to list objects: ${errorMessage}`)
  }
}

/**
 * Check if MinIO is accessible
 */
export async function checkMinIOHealth(): Promise<boolean> {
  try {
    const client = getMinioClient()

    // Try to list buckets as a health check
    const buckets = await client.listBuckets()
    return Array.isArray(buckets) && buckets.length >= 0
  } catch {
    return false
  }
}

/**
 * Get metadata for an object
 */
export async function getObjectMetadata(bucketName: string, objectName: string) {
  const client = getMinioClient()

  try {
    const stat = await client.statObject(bucketName, objectName)
    return {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      metaData: stat.metaData,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get object metadata: ${errorMessage}`)
  }
}
