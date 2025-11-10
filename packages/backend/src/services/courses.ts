import { PrismaClient } from '../generated/client.js'
import { listAssetsForUnit } from './assets.js'

let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export interface LevelWithStories {
  id: string
  name: string
  order: number
  createdAt: Date
  updatedAt: Date
  stories: StoryWithUnits[]
  _count: {
    stories: number
  }
}

export interface StoryWithUnits {
  id: string
  title: string
  description: string | null
  order: number
  levelId: string
  createdAt: Date
  updatedAt: Date
  level: {
    name: string
  }
  units: UnitWithAssets[]
  _count: {
    units: number
  }
}

export interface UnitWithAssets {
  id: string
  title: string
  description: string | null
  order: number
  storyId: string
  createdAt: Date
  updatedAt: Date
  story: {
    title: string
  }
  assets: any[]
  _count: {
    assets: number
  }
}

export interface DailyPlanWithEntries {
  id: string
  userId: string
  plannedDate: Date
  createdAt: Date
  updatedAt: Date
  isOverdue: boolean
  entries: DailyPlanEntryWithUnit[]
}

export interface DailyPlanEntryWithUnit {
  id: string
  dailyPlanId: string
  unitId: string
  completed: boolean
  score: number
  createdAt: Date
  updatedAt: Date
  unit: {
    id: string
    title: string
    story: {
      title: string
      level: {
        name: string
      }
    }
  }
}

/**
 * Get all levels with their stories and units
 */
export async function getLevelsWithStories(): Promise<LevelWithStories[]> {
  try {
    const levels = await getPrismaClient().level.findMany({
      include: {
        stories: {
          include: {
            level: {
              select: { name: true }
            },
            units: {
              include: {
                story: {
                  select: { title: true }
                },
                _count: {
                  select: { assets: true }
                }
              },
              orderBy: { order: 'asc' }
            },
            _count: {
              select: { units: true }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { stories: true }
        }
      },
      orderBy: { order: 'asc' }
    })

    // Add assets to each unit
    for (const level of levels) {
      for (const story of level.stories) {
        for (const unit of story.units) {
          unit.assets = await listAssetsForUnit(unit.id)
        }
      }
    }

    return levels as LevelWithStories[]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch levels with stories: ${errorMessage}`)
  }
}

/**
 * Get all stories grouped by level
 */
export async function getStoriesByLevel(): Promise<LevelWithStories[]> {
  return getLevelsWithStories()
}

/**
 * Get stories for a specific level
 */
export async function getStoriesByLevelId(levelId: string): Promise<StoryWithUnits[]> {
  try {
    const stories = await getPrismaClient().story.findMany({
      where: { levelId },
      include: {
        level: {
          select: { name: true }
        },
        units: {
          include: {
            story: {
              select: { title: true }
            },
            _count: {
              select: { assets: true }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { units: true }
        }
      },
      orderBy: { order: 'asc' }
    })

    // Add assets to each unit
    for (const story of stories) {
      for (const unit of story.units) {
        unit.assets = await listAssetsForUnit(unit.id)
      }
    }

    return stories as StoryWithUnits[]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch stories for level ${levelId}: ${errorMessage}`)
  }
}

/**
 * Get units for a specific story
 */
export async function getUnitsByStoryId(storyId: string): Promise<UnitWithAssets[]> {
  try {
    const units = await getPrismaClient().unit.findMany({
      where: { storyId },
      include: {
        story: {
          select: { title: true }
        },
        _count: {
          select: { assets: true }
        }
      },
      orderBy: { order: 'asc' }
    })

    // Add assets to each unit
    for (const unit of units) {
      unit.assets = await listAssetsForUnit(unit.id)
    }

    return units as UnitWithAssets[]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch units for story ${storyId}: ${errorMessage}`)
  }
}

/**
 * Get a single unit with its assets
 */
export async function getUnitById(unitId: string): Promise<UnitWithAssets | null> {
  try {
    const unit = await getPrismaClient().unit.findUnique({
      where: { id: unitId },
      include: {
        story: {
          select: { title: true }
        },
        _count: {
          select: { assets: true }
        }
      }
    })

    if (!unit) {
      return null
    }

    // Add assets to the unit
    unit.assets = await listAssetsForUnit(unitId)

    return unit as UnitWithAssets
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch unit ${unitId}: ${errorMessage}`)
  }
}

/**
 * Get daily plans for a user with overdue filtering
 */
export async function getDailyPlansForUser(
  userId: string,
  options: {
    startDate?: Date
    endDate?: Date
    includeOverdueOnly?: boolean
  } = {}
): Promise<DailyPlanWithEntries[]> {
  try {
    const { startDate, endDate, includeOverdueOnly } = options
    const now = new Date()

    let whereClause: any = { userId }

    // Add date range filtering
    if (startDate || endDate) {
      whereClause.plannedDate = {}
      if (startDate) {
        whereClause.plannedDate.gte = startDate
      }
      if (endDate) {
        whereClause.plannedDate.lte = endDate
      }
    }

    const dailyPlans = await getPrismaClient().dailyPlan.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            unit: {
              include: {
                story: {
                  include: {
                    level: {
                      select: { name: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { plannedDate: 'asc' }
    })

    // Add overdue flag and filter if requested
    const processedPlans = dailyPlans.map(plan => ({
      ...plan,
      isOverdue: plan.plannedDate < now && !plan.entries.every(entry => entry.completed)
    }))

    if (includeOverdueOnly) {
      return processedPlans.filter(plan => plan.isOverdue)
    }

    return processedPlans as DailyPlanWithEntries[]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch daily plans for user ${userId}: ${errorMessage}`)
  }
}

/**
 * Get a specific daily plan for a user
 */
export async function getDailyPlanForUser(
  userId: string,
  plannedDate: Date
): Promise<DailyPlanWithEntries | null> {
  try {
    const dailyPlan = await getPrismaClient().dailyPlan.findUnique({
      where: {
        userId_plannedDate: {
          userId,
          plannedDate
        }
      },
      include: {
        entries: {
          include: {
            unit: {
              include: {
                story: {
                  include: {
                    level: {
                      select: { name: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!dailyPlan) {
      return null
    }

    const now = new Date()
    const isOverdue = dailyPlan.plannedDate < now && !dailyPlan.entries.every(entry => entry.completed)

    return {
      ...dailyPlan,
      isOverdue
    } as DailyPlanWithEntries
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch daily plan for user ${userId}: ${errorMessage}`)
  }
}