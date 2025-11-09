import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import dotenv from 'dotenv'

dotenv.config()

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

const port = Number(process.env.PORT) || 3001

console.log(`🚀 Backend server starting on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
