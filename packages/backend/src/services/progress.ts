import { PrismaClient } from '../generated/client.js'

let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

/**
 * Start or update progress for a unit
 * Records the startedAt timestamp if not already set
 */
export async function startUnit(userId: string, unitId: string) {
  try {
    const existing = await getPrismaClient().userProgress.findUnique({
      where: { userId_unitId: { userId, unitId } },
    })

    const now = new Date()

    if (existing) {
      if (!existing.startedAt) {
        return await getPrismaClient().userProgress.update({
          where: { userId_unitId: { userId, unitId } },
          data: { startedAt: now },
        })
      }
      return existing
    }

    return await getPrismaClient().userProgress.create({
      data: {
        userId,
        unitId,
        startedAt: now,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to start unit: ${errorMessage}`)
  }
}

/**
 * Update video/asset progress
 */
export async function updateAssetProgress(
  userId: string,
  unitId: string,
  assetId: string,
  data: {
    secondsWatched: number
    progressPercentage: number
    durationSeconds?: number
    completed?: boolean
  }
) {
  try {
    await startUnit(userId, unitId)

    const secondsWatched = Math.max(0, Math.floor(data.secondsWatched))
    const progressPercentage = Math.min(Math.max(data.progressPercentage, 0), 100)
    const durationSeconds = data.durationSeconds !== undefined ? Math.max(0, Math.floor(data.durationSeconds)) : undefined
    const isCompleted = data.completed ?? progressPercentage >= 90

    const existing = await getPrismaClient().unitAssetProgress.findUnique({
      where: { userId_assetId: { userId, assetId } },
    })

    if (existing) {
      const completedAt = isCompleted ? existing.completedAt ?? new Date() : existing.completedAt ?? null

      return await getPrismaClient().unitAssetProgress.update({
        where: { userId_assetId: { userId, assetId } },
        data: {
          secondsWatched,
          progressPercentage,
          durationSeconds,
          completed: isCompleted,
          completedAt,
        },
      })
    }

    return await getPrismaClient().unitAssetProgress.create({
      data: {
        userId,
        unitId,
        assetId,
        secondsWatched,
        progressPercentage,
        durationSeconds,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to update asset progress: ${errorMessage}`)
  }
}

/**
 * Record a pronunciation attempt
 */
export async function recordPronunciationAttempt(
  userId: string,
  unitId: string,
  audioKey: string,
  score: number,
  feedback?: string
) {
  try {
    await startUnit(userId, unitId)

    const validScore = Math.min(Math.max(score, 0), 100)

    const attempt = await getPrismaClient().pronunciationAttempt.create({
      data: {
        userId,
        unitId,
        audioKey,
        score: validScore,
        feedback: feedback || null,
      },
    })

    const attempts = await getPrismaClient().pronunciationAttempt.findMany({
      where: { userId, unitId },
    })

    const averageScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length

    return {
      attempt,
      averageScore,
      attemptCount: attempts.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to record pronunciation attempt: ${errorMessage}`)
  }
}

/**
 * Calculate unit score based on pronunciation attempts and asset completion
 */
export async function calculateUnitScore(userId: string, unitId: string): Promise<number> {
  try {
    const [assets, assetProgress, attempts] = await Promise.all([
      getPrismaClient().unitAsset.findMany({ where: { unitId } }),
      getPrismaClient().unitAssetProgress.findMany({ where: { userId, unitId } }),
      getPrismaClient().pronunciationAttempt.findMany({ where: { userId, unitId } }),
    ])

    const components: number[] = []

    if (assets.length > 0) {
      const progressMap = new Map<string, number>()
      for (const progress of assetProgress) {
        progressMap.set(progress.assetId, Math.min(Math.max(progress.progressPercentage, 0), 100))
      }

      let totalAssetScore = 0
      for (const asset of assets) {
        totalAssetScore += progressMap.get(asset.id) ?? 0
      }

      const assetScore = assets.length > 0 ? totalAssetScore / assets.length : 0
      components.push(assetScore)
    }

    if (attempts.length > 0) {
      const totalPronScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0)
      const pronScore = totalPronScore / attempts.length
      components.push(pronScore)
    }

    if (components.length === 0) {
      return 0
    }

    return Math.round(components.reduce((sum, value) => sum + value, 0) / components.length)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to calculate unit score: ${errorMessage}`)
  }
}

/**
 * Complete a unit and update daily plan if applicable
 */
export async function completeUnit(userId: string, unitId: string, finalScore?: number) {
  try {
    await startUnit(userId, unitId)

    const prismaClient = getPrismaClient()
    const now = new Date()

    // Ensure all assets are marked as completed
    const assets = await prismaClient.unitAsset.findMany({ where: { unitId } })
    for (const asset of assets) {
      const existingProgress = await prismaClient.unitAssetProgress.findUnique({
        where: { userId_assetId: { userId, assetId: asset.id } },
      })

      const secondsWatched = existingProgress?.secondsWatched ?? asset.duration ?? 0
      const durationSeconds = existingProgress?.durationSeconds ?? asset.duration ?? null

      if (existingProgress) {
        if (!existingProgress.completed || existingProgress.progressPercentage < 100 || !existingProgress.completedAt) {
          await prismaClient.unitAssetProgress.update({
            where: { userId_assetId: { userId, assetId: asset.id } },
            data: {
              completed: true,
              progressPercentage: 100,
              secondsWatched,
              durationSeconds: durationSeconds ?? undefined,
              completedAt: existingProgress.completedAt ?? now,
            },
          })
        }
      } else {
        await prismaClient.unitAssetProgress.create({
          data: {
            userId,
            unitId,
            assetId: asset.id,
            completed: true,
            progressPercentage: 100,
            secondsWatched,
            durationSeconds,
            completedAt: now,
          },
        })
      }
    }

    // Calculate score if not provided
    let score = finalScore
    if (score === undefined) {
      score = await calculateUnitScore(userId, unitId)
    }
    score = Math.round(Math.min(Math.max(score, 0), 100))

    const progress = await prismaClient.userProgress.update({
      where: { userId_unitId: { userId, unitId } },
      data: {
        completed: true,
        completedAt: now,
        score,
      },
    })

    // Update related daily plan entries
    const dailyPlanEntries = await prismaClient.dailyPlanEntry.findMany({
      where: {
        unitId,
        dailyPlan: {
          userId,
        },
      },
    })

    for (const entry of dailyPlanEntries) {
      if (!entry.completed || entry.score !== score) {
        await prismaClient.dailyPlanEntry.update({
          where: { id: entry.id },
          data: {
            completed: true,
            score,
          },
        })
      }
    }

    return {
      progress,
      dailyPlanUpdated: dailyPlanEntries.length > 0,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to complete unit: ${errorMessage}`)
  }
}

/**
 * Get progress for a specific unit
 */
export async function getUnitProgress(userId: string, unitId: string) {
  try {
    const progress = await getPrismaClient().userProgress.findUnique({
      where: { userId_unitId: { userId, unitId } },
    })

    const pronunciationAttempts = await getPrismaClient().pronunciationAttempt.findMany({
      where: { userId, unitId },
      orderBy: { createdAt: 'desc' },
    })

    const assetProgress = await getPrismaClient().unitAssetProgress.findMany({
      where: { userId, unitId },
      include: {
        asset: {
          select: {
            id: true,
            type: true,
            minioKey: true,
          },
        },
      },
    })

    return {
      progress,
      pronunciationAttempts,
      assetProgress,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get unit progress: ${errorMessage}`)
  }
}

/**
 * Get progress summary for a user across all units
 */
export async function getUserProgressSummary(userId: string) {
  try {
    const allProgress = await getPrismaClient().userProgress.findMany({
      where: { userId },
      include: {
        unit: {
          include: {
            story: {
              include: {
                level: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const totalUnits = allProgress.length
    const completedUnits = allProgress.filter((p) => p.completed).length
    const inProgressUnits = allProgress.filter((p) => p.startedAt && !p.completed).length

    const completedProgress = allProgress.filter((p) => p.completed)
    const averageScore =
      completedProgress.length > 0
        ? Math.round(
            completedProgress.reduce((sum, p) => sum + p.score, 0) / completedProgress.length
          )
        : 0

    const pronunciationAttempts = await getPrismaClient().pronunciationAttempt.findMany({
      where: { userId },
    })

    const totalPronunciationAttempts = pronunciationAttempts.length
    const averagePronunciationScore =
      pronunciationAttempts.length > 0
        ? pronunciationAttempts.reduce((sum, a) => sum + a.score, 0) /
          pronunciationAttempts.length
        : 0

    // Group by story
    const storiesMap = new Map<
      string,
      {
        storyId: string
        storyTitle: string
        levelName: string
        completedUnits: number
        totalUnits: number
        totalScore: number
      }
    >()

    for (const progress of allProgress) {
      const storyId = progress.unit.storyId
      if (!storiesMap.has(storyId)) {
        storiesMap.set(storyId, {
          storyId,
          storyTitle: progress.unit.story.title,
          levelName: progress.unit.story.level.name,
          completedUnits: 0,
          totalUnits: 0,
          totalScore: 0,
        })
      }

      const storyData = storiesMap.get(storyId)!
      storyData.totalUnits++
      if (progress.completed) {
        storyData.completedUnits++
        storyData.totalScore += progress.score
      }
    }

    const stories = Array.from(storiesMap.values()).map((s) => ({
      storyId: s.storyId,
      storyTitle: s.storyTitle,
      levelName: s.levelName,
      completedUnits: s.completedUnits,
      totalUnits: s.totalUnits,
      averageScore: s.completedUnits > 0 ? Math.round(s.totalScore / s.completedUnits) : 0,
    }))

    return {
      userId,
      totalUnits,
      completedUnits,
      inProgressUnits,
      averageScore,
      totalPronunciationAttempts,
      averagePronunciationScore,
      recentActivity: allProgress.slice(0, 10),
      stories,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get user progress summary: ${errorMessage}`)
  }
}

/**
 * Get detailed progress for a specific story
 */
export async function getStoryProgress(userId: string, storyId: string) {
  try {
    // Get all units in the story
    const units = await getPrismaClient().unit.findMany({
      where: { storyId },
      include: {
        story: {
          include: {
            level: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    if (units.length === 0) {
      throw new Error('Story not found or has no units')
    }

    const storyTitle = units[0].story.title
    const levelName = units[0].story.level.name

    // Get progress for all units
    const unitsWithProgress = await Promise.all(
      units.map(async (unit) => {
        const progress = await getPrismaClient().userProgress.findUnique({
          where: { userId_unitId: { userId, unitId: unit.id } },
        })

        const attempts = await getPrismaClient().pronunciationAttempt.findMany({
          where: { userId, unitId: unit.id },
        })

        const averagePronunciationScore =
          attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length : 0

        return {
          unitId: unit.id,
          unitTitle: unit.title,
          storyId: unit.storyId,
          storyTitle,
          completed: progress?.completed ?? false,
          score: progress?.score ?? 0,
          startedAt: progress?.startedAt ?? null,
          completedAt: progress?.completedAt ?? null,
          pronunciationAttempts: attempts.length,
          averagePronunciationScore,
        }
      })
    )

    const totalUnits = units.length
    const completedUnits = unitsWithProgress.filter((u) => u.completed).length
    const completedWithScores = unitsWithProgress.filter((u) => u.completed)
    const averageScore =
      completedWithScores.length > 0
        ? Math.round(completedWithScores.reduce((sum, u) => sum + u.score, 0) / completedWithScores.length)
        : 0

    return {
      storyId,
      storyTitle,
      levelName,
      totalUnits,
      completedUnits,
      averageScore,
      units: unitsWithProgress,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get story progress: ${errorMessage}`)
  }
}

/**
 * Get all pronunciation attempts for a unit
 */
export async function getPronunciationAttempts(userId: string, unitId: string) {
  try {
    const attempts = await getPrismaClient().pronunciationAttempt.findMany({
      where: { userId, unitId },
      orderBy: { createdAt: 'desc' },
    })

    const averageScore =
      attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length : 0

    return {
      attempts,
      averageScore,
      count: attempts.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get pronunciation attempts: ${errorMessage}`)
  }
}

/**
 * Get asset progress for a unit
 */
export async function getAssetProgress(userId: string, unitId: string) {
  try {
    const assetProgress = await getPrismaClient().unitAssetProgress.findMany({
      where: { userId, unitId },
      include: {
        asset: {
          select: {
            id: true,
            type: true,
            minioKey: true,
            duration: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return assetProgress
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get asset progress: ${errorMessage}`)
  }
}
