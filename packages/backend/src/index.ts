import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import dotenv from 'dotenv'
import { PrismaClient } from './generated/client.js'
import { checkDatabaseConnection, getMinIOConfig, getAzureConfig } from './db.js'
import { checkMinIOHealth, getPresignedUrl, getPresignedPutUrl } from './services/minio.js'
import { listAssetsForUnit, getAssetWithUrl, syncAssetsFromMinIO } from './services/assets.js'
import authRouter from './routes/auth.js'
import coursesRouter from './routes/courses.js'

dotenv.config()

const prisma = new PrismaClient()

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.get('/health', async (c) => {
  const dbStatus = checkDatabaseConnection()
  const minioConfig = getMinIOConfig()
  const azureConfig = getAzureConfig()
  const minioHealthy = await checkMinIOHealth()

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
        connected: minioHealthy,
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

// Auth routes
app.route('/auth', authRouter)

// Courses routes
app.route('/courses', coursesRouter)

// Database endpoints
app.get('/api/users', async (c) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    })
    return c.json({ users })
  } catch {
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

app.get('/api/levels', async (c) => {
  try {
    const levels = await prisma.level.findMany({
      include: {
        _count: {
          select: { stories: true }
        }
      }
    })
    return c.json({ levels })
  } catch {
    return c.json({ error: 'Failed to fetch levels' }, 500)
  }
})

app.get('/api/stories', async (c) => {
  try {
    const stories = await prisma.story.findMany({
      include: {
        level: {
          select: { name: true }
        },
        _count: {
          select: { units: true }
        }
      }
    })
    return c.json({ stories })
  } catch {
    return c.json({ error: 'Failed to fetch stories' }, 500)
  }
})

app.get('/api/units', async (c) => {
  try {
    const units = await prisma.unit.findMany({
      include: {
        story: {
          select: { title: true }
        },
        _count: {
          select: { assets: true }
        }
      }
    })
    return c.json({ units })
  } catch {
    return c.json({ error: 'Failed to fetch units' }, 500)
  }
})

// Database status endpoint
app.get('/api/db/status', async (c) => {
  try {
    const userCount = await prisma.user.count()
    const levelCount = await prisma.level.count()
    const storyCount = await prisma.story.count()
    const unitCount = await prisma.unit.count()
    const assetCount = await prisma.unitAsset.count()
    
    return c.json({
      database: 'connected',
      tables: {
        users: userCount,
        levels: levelCount,
        stories: storyCount,
        units: unitCount,
        assets: assetCount,
      }
    })
  } catch {
    return c.json({ 
      database: 'error',
      error: 'Failed to connect to database' 
    }, 500)
  }
})

// MinIO health check endpoint
app.get('/api/minio/health', async (c) => {
  try {
    const config = getMinIOConfig()
    const isHealthy = await checkMinIOHealth()
    
    return c.json({
      status: isHealthy ? 'connected' : 'disconnected',
      endpoint: config.endpoint,
      buckets: config.buckets,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
})

// List all assets for a specific unit with presigned URLs
app.get('/api/units/:unitId/assets', async (c) => {
  try {
    const unitId = c.req.param('unitId')
    
    // Verify unit exists
    const unit = await prisma.unit.findUnique({
      where: { id: unitId }
    })
    
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }
    
    const assets = await listAssetsForUnit(unitId)
    
    return c.json({
      unitId,
      count: assets.length,
      assets,
    })
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to fetch assets',
    }, 500)
  }
})

// Get single asset with presigned URL
app.get('/api/assets/:assetId', async (c) => {
  try {
    const assetId = c.req.param('assetId')
    const asset = await getAssetWithUrl(assetId)
    
    if (!asset) {
      return c.json({ error: 'Asset not found' }, 404)
    }
    
    return c.json(asset)
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to fetch asset',
    }, 500)
  }
})

// Generate presigned URL for an asset
app.post('/api/assets/:assetId/presigned-url', async (c) => {
  try {
    const assetId = c.req.param('assetId')
    const body = await c.req.json() as { expirySeconds?: number }
    
    const asset = await prisma.unitAsset.findUnique({
      where: { id: assetId }
    })
    
    if (!asset) {
      return c.json({ error: 'Asset not found' }, 404)
    }
    
    const config = getMinIOConfig()
    const presignedUrl = await getPresignedUrl({
      bucketName: config.buckets.assets,
      objectName: asset.minioKey,
      expirySeconds: body.expirySeconds,
    })
    
    return c.json({
      assetId,
      presignedUrl,
      expiresAt: new Date(Date.now() + (body.expirySeconds || 3600) * 1000).toISOString(),
    })
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to generate presigned URL',
    }, 500)
  }
})

// Generate presigned PUT URL for uploading an asset
app.post('/api/assets/presigned-upload-url', async (c) => {
  try {
    const body = await c.req.json() as { unitId: string; objectKey: string; expirySeconds?: number }
    
    // Verify unit exists
    const unit = await prisma.unit.findUnique({
      where: { id: body.unitId }
    })
    
    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404)
    }
    
    const config = getMinIOConfig()
    const presignedUrl = await getPresignedPutUrl({
      bucketName: config.buckets.uploads,
      objectName: body.objectKey,
      expirySeconds: body.expirySeconds,
    })
    
    return c.json({
      unitId: body.unitId,
      objectKey: body.objectKey,
      presignedUrl,
      expiresAt: new Date(Date.now() + (body.expirySeconds || 3600) * 1000).toISOString(),
    })
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to generate presigned upload URL',
    }, 500)
  }
})

// Sync assets from MinIO
app.post('/api/minio/sync-assets', async (c) => {
  try {
    const body = await c.req.json() as { bucketPrefix?: string }
    const result = await syncAssetsFromMinIO(body.bucketPrefix)
    
    return c.json({
      message: 'Asset sync completed',
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to sync assets',
    }, 500)
  }
})

const port = Number(process.env.PORT) || 3001

console.log(`🚀 Backend server starting on port ${port}`)
console.log(`📁 Database: ${process.env.DATABASE_URL || './dev.db'}`)
console.log(`🪣 MinIO: ${process.env.MINIO_ENDPOINT || 'localhost:9000'}`)

serve({
  fetch: app.fetch,
  port,
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})
