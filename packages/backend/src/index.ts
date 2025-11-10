import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import dotenv from 'dotenv'
import { checkDatabaseConnection, getMinIOConfig, getAzureConfig } from './db'

dotenv.config()

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.get('/health', (c) => {
  const dbStatus = checkDatabaseConnection()
  const minioConfig = getMinIOConfig()
  const azureConfig = getAzureConfig()

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus.status,
      path: dbStatus.database,
      error: dbStatus.error,
    },
    services: {
      minio: {
        endpoint: minioConfig.endpoint,
        configured: !!minioConfig.rootUser,
        buckets: minioConfig.buckets,
      },
      azure: {
        speechConfigured: !!azureConfig.speechKey,
        blobStorageConfigured: !!azureConfig.blobStorage.account,
      },
    },
  })
})

app.get('/api/status', (c) => {
  const dbStatus = checkDatabaseConnection()
  return c.json({
    database: dbStatus,
    timestamp: new Date().toISOString(),
  })
})

const port = Number(process.env.PORT) || 3001

console.log(`🚀 Backend server starting on port ${port}`)
console.log(`📁 Database: ${process.env.DATABASE_URL || './dev.db'}`)
console.log(`🪣 MinIO: ${process.env.MINIO_ENDPOINT || 'localhost:9000'}`)

serve({
  fetch: app.fetch,
  port,
})
