import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import dotenv from 'dotenv'
import { PrismaClient } from './generated/client.js'
import { checkDatabaseConnection, getMinIOConfig, getAzureConfig } from './db'

dotenv.config()

const prisma = new PrismaClient()

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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    return c.json({ 
      database: 'error',
      error: 'Failed to connect to database' 
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
