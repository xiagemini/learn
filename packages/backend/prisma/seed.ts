import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

import { PrismaClient } from '../src/generated/client.js'

const prisma = new PrismaClient({
  errorFormat: 'pretty',
})

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data
  console.log('🗑️  Clearing existing data...')
  await prisma.aggregateScore.deleteMany()
  await prisma.pronunciationAttempt.deleteMany()
  await prisma.dailyPlanEntry.deleteMany()
  await prisma.dailyPlan.deleteMany()
  await prisma.userProgress.deleteMany()
  await prisma.unitAsset.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.story.deleteMany()
  await prisma.level.deleteMany()
  await prisma.user.deleteMany()

  // Create sample users
  console.log('👤 Creating sample users...')
  const user1 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      username: 'johndoe',
      passwordHash: 'hashed_password_1',
      firstName: 'John',
      lastName: 'Doe',
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      username: 'janedoe',
      passwordHash: 'hashed_password_2',
      firstName: 'Jane',
      lastName: 'Doe',
    },
  })

  // Create sample levels
  console.log('📚 Creating sample levels...')
  const levelBeginner = await prisma.level.create({
    data: {
      name: 'Beginner',
      order: 1,
    },
  })

  const levelIntermediate = await prisma.level.create({
    data: {
      name: 'Intermediate',
      order: 2,
    },
  })

  const levelAdvanced = await prisma.level.create({
    data: {
      name: 'Advanced',
      order: 3,
    },
  })

  // Create stories for Beginner level
  console.log('📖 Creating sample stories...')
  const storyBeg1 = await prisma.story.create({
    data: {
      title: 'Meeting Basics',
      description: 'Learn how to introduce yourself and greet people',
      order: 1,
      levelId: levelBeginner.id,
    },
  })

  const storyBeg2 = await prisma.story.create({
    data: {
      title: 'Everyday Conversations',
      description: 'Common phrases for daily interactions',
      order: 2,
      levelId: levelBeginner.id,
    },
  })

  const storyInt1 = await prisma.story.create({
    data: {
      title: 'Business Communication',
      description: 'Professional language for workplace',
      order: 1,
      levelId: levelIntermediate.id,
    },
  })

  const storyAdv1 = await prisma.story.create({
    data: {
      title: 'Advanced Discussions',
      description: 'Complex topics and nuanced conversations',
      order: 1,
      levelId: levelAdvanced.id,
    },
  })

  // Create units for stories
  console.log('🎓 Creating sample units...')
  const unitBeg1_1 = await prisma.unit.create({
    data: {
      title: 'Greeting Phrases',
      description: 'Essential greeting expressions',
      order: 1,
      storyId: storyBeg1.id,
    },
  })

  const unitBeg1_2 = await prisma.unit.create({
    data: {
      title: 'Name Introduction',
      description: 'How to introduce your name',
      order: 2,
      storyId: storyBeg1.id,
    },
  })

  const unitBeg2_1 = await prisma.unit.create({
    data: {
      title: 'Shopping Vocabulary',
      description: 'Words and phrases for shopping',
      order: 1,
      storyId: storyBeg2.id,
    },
  })

  const unitInt1_1 = await prisma.unit.create({
    data: {
      title: 'Meeting Scheduling',
      description: 'Professional meeting arrangements',
      order: 1,
      storyId: storyInt1.id,
    },
  })

  const unitAdv1_1 = await prisma.unit.create({
    data: {
      title: 'Abstract Concepts',
      description: 'Discussing philosophy and theory',
      order: 1,
      storyId: storyAdv1.id,
    },
  })

  // Create unit assets with MinIO placeholder keys
  console.log('🎬 Creating sample unit assets...')
  await prisma.unitAsset.create({
    data: {
      unitId: unitBeg1_1.id,
      type: 'VIDEO',
      minioKey: 'placeholder/videos/greeting-basics-v1.mp4',
      duration: 300,
      metadata: JSON.stringify({ resolution: '1080p', language: 'en' }),
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitBeg1_1.id,
      type: 'AUDIO',
      minioKey: 'placeholder/audio/greeting-pronunciation-en.mp3',
      duration: 120,
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitBeg1_1.id,
      type: 'SUBTITLE',
      minioKey: 'placeholder/subtitles/greeting-basics-en.vtt',
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitBeg1_1.id,
      type: 'SCREENSHOT',
      minioKey: 'placeholder/screenshots/greeting-basics-screenshot-1.jpg',
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitBeg1_1.id,
      type: 'METADATA',
      minioKey: 'placeholder/metadata/greeting-basics-metadata.json',
      metadata: JSON.stringify({
        difficulty: 'beginner',
        duration_minutes: 5,
        vocabulary_count: 15,
      }),
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitBeg1_2.id,
      type: 'VIDEO',
      minioKey: 'placeholder/videos/name-introduction-v1.mp4',
      duration: 280,
      metadata: JSON.stringify({ resolution: '1080p', language: 'en' }),
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitBeg2_1.id,
      type: 'VIDEO',
      minioKey: 'placeholder/videos/shopping-vocab-v1.mp4',
      duration: 420,
      metadata: JSON.stringify({ resolution: '1080p', language: 'en' }),
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitInt1_1.id,
      type: 'VIDEO',
      minioKey: 'placeholder/videos/business-meeting-v1.mp4',
      duration: 600,
      metadata: JSON.stringify({ resolution: '1080p', language: 'en' }),
    },
  })

  await prisma.unitAsset.create({
    data: {
      unitId: unitAdv1_1.id,
      type: 'VIDEO',
      minioKey: 'placeholder/videos/abstract-concepts-v1.mp4',
      duration: 720,
      metadata: JSON.stringify({ resolution: '1080p', language: 'en' }),
    },
  })

  // Create sample user progress
  console.log('📊 Creating sample user progress...')
  await prisma.userProgress.create({
    data: {
      userId: user1.id,
      unitId: unitBeg1_1.id,
      completed: true,
      score: 85,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.userProgress.create({
    data: {
      userId: user1.id,
      unitId: unitBeg1_2.id,
      completed: true,
      score: 92,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.userProgress.create({
    data: {
      userId: user1.id,
      unitId: unitBeg2_1.id,
      completed: false,
      score: 0,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.userProgress.create({
    data: {
      userId: user2.id,
      unitId: unitBeg1_1.id,
      completed: true,
      score: 78,
      startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
    },
  })

  // Create sample daily plans
  console.log('📅 Creating sample daily plans...')
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const dailyPlan = await prisma.dailyPlan.create({
    data: {
      userId: user1.id,
      plannedDate: todayStart,
    },
  })

  await prisma.dailyPlanEntry.create({
    data: {
      dailyPlanId: dailyPlan.id,
      unitId: unitBeg1_1.id,
      completed: true,
      score: 85,
    },
  })

  await prisma.dailyPlanEntry.create({
    data: {
      dailyPlanId: dailyPlan.id,
      unitId: unitBeg1_2.id,
      completed: false,
      score: 0,
    },
  })

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const dailyPlanYesterday = await prisma.dailyPlan.create({
    data: {
      userId: user1.id,
      plannedDate: yesterdayStart,
    },
  })

  await prisma.dailyPlanEntry.create({
    data: {
      dailyPlanId: dailyPlanYesterday.id,
      unitId: unitBeg2_1.id,
      completed: true,
      score: 90,
    },
  })

  // Create sample pronunciation attempts
  console.log('🎙️  Creating sample pronunciation attempts...')
  await prisma.pronunciationAttempt.create({
    data: {
      userId: user1.id,
      unitId: unitBeg1_1.id,
      audioKey: 'placeholder/pronunciation/user1-unit1-attempt1.wav',
      score: 0.85,
      feedback: 'Good pronunciation, clear enunciation',
    },
  })

  await prisma.pronunciationAttempt.create({
    data: {
      userId: user1.id,
      unitId: unitBeg1_1.id,
      audioKey: 'placeholder/pronunciation/user1-unit1-attempt2.wav',
      score: 0.92,
      feedback: 'Excellent! Native-like pronunciation',
    },
  })

  await prisma.pronunciationAttempt.create({
    data: {
      userId: user2.id,
      unitId: unitBeg1_1.id,
      audioKey: 'placeholder/pronunciation/user2-unit1-attempt1.wav',
      score: 0.72,
      feedback: 'Needs work on vowel sounds',
    },
  })

  // Create sample aggregate scores
  console.log('🏆 Creating sample aggregate scores...')
  await prisma.aggregateScore.create({
    data: {
      userId: user1.id,
      period: 'DAILY',
      score: 87.5,
    },
  })

  await prisma.aggregateScore.create({
    data: {
      userId: user1.id,
      period: 'WEEKLY',
      score: 88.3,
    },
  })

  await prisma.aggregateScore.create({
    data: {
      userId: user1.id,
      period: 'MONTHLY',
      score: 86.7,
    },
  })

  await prisma.aggregateScore.create({
    data: {
      userId: user1.id,
      period: 'OVERALL',
      score: 85.2,
    },
  })

  await prisma.aggregateScore.create({
    data: {
      userId: user2.id,
      period: 'DAILY',
      score: 75.0,
    },
  })

  await prisma.aggregateScore.create({
    data: {
      userId: user2.id,
      period: 'OVERALL',
      score: 78.0,
    },
  })

  console.log('✅ Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
