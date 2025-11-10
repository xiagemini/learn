import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * Database configuration and connection check
 * Verifies SQLite database is accessible
 */

export function checkDatabaseConnection(): {
  status: 'connected' | 'disconnected'
  database: string
  error?: string
} {
  try {
    const dbPath = resolve(process.env.DATABASE_URL?.replace('file:', '') || './dev.db')

    if (!existsSync(dbPath)) {
      return {
        status: 'disconnected',
        database: dbPath,
        error: 'Database file not found. Ensure Docker is running with pnpm docker:up',
      }
    }

    // Check if file is readable
    readFileSync(dbPath)

    return {
      status: 'connected',
      database: dbPath,
    }
  } catch (error) {
    return {
      status: 'disconnected',
      database: process.env.DATABASE_URL || './dev.db',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get MinIO configuration from environment
 */
export function getMinIOConfig() {
  return {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost:9000',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    rootUser: process.env.MINIO_ROOT_USER || 'minioadmin',
    buckets: {
      assets: process.env.MINIO_BUCKET_ASSETS || 'assets',
      uploads: process.env.MINIO_BUCKET_UPLOADS || 'uploads',
      temp: process.env.MINIO_BUCKET_TEMP || 'temp',
    },
  }
}

/**
 * Get Azure configuration from environment
 */
export function getAzureConfig() {
  return {
    speechKey: process.env.AZURE_SPEECH_KEY,
    speechRegion: process.env.AZURE_SPEECH_REGION,
    blobStorage: {
      account: process.env.AZURE_BLOB_STORAGE_ACCOUNT,
      key: process.env.AZURE_BLOB_STORAGE_KEY,
      container: process.env.AZURE_BLOB_STORAGE_CONTAINER,
    },
  }
}
