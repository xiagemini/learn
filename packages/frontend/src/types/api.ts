/**
 * Frontend API types for the language learning application
 */

export interface Asset {
  id: string
  unitId: string
  type: 'VIDEO' | 'AUDIO' | 'SUBTITLE' | 'SCREENSHOT' | 'METADATA'
  minioKey: string
  duration?: number | null
  metadata?: string | null
  createdAt: string
  updatedAt: string
  presignedUrl: string
}

export interface Level {
  id: string
  name: string
  order: number
  createdAt: string
  updatedAt: string
  _count: {
    stories: number
  }
}

export interface Story {
  id: string
  title: string
  description?: string | null
  order: number
  levelId: string
  createdAt: string
  updatedAt: string
  level: {
    name: string
  }
  _count: {
    units: number
  }
}

export interface Unit {
  id: string
  title: string
  description?: string | null
  order: number
  storyId: string
  createdAt: string
  updatedAt: string
  story: {
    title: string
  }
  _count: {
    assets: number
  }
}

export interface UnitWithAssets extends Unit {
  assets: Asset[]
}

export interface StoryWithUnits extends Story {
  units: UnitWithAssets[]
}

export interface DailyPlanEntry {
  id: string
  dailyPlanId: string
  unitId: string
  completed: boolean
  score: number
  createdAt: string
  updatedAt: string
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

export interface DailyPlan {
  id: string
  userId: string
  plannedDate: string
  createdAt: string
  updatedAt: string
  isOverdue: boolean
  entries: DailyPlanEntry[]
}

export interface UserProgress {
  id: string
  userId: string
  unitId: string
  completed: boolean
  score: number
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface StoryProgress {
  storyId: string
  storyTitle: string
  levelName: string
  totalUnits: number
  completedUnits: number
  averageScore: number
  units: Array<{
    unitId: string
    unitTitle: string
    completed: boolean
    score: number
    startedAt?: string | null
    completedAt?: string | null
  }>
}

export interface ProgressSummary {
  userId: string
  totalUnits: number
  completedUnits: number
  inProgressUnits: number
  averageScore: number
  totalPronunciationAttempts: number
  averagePronunciationScore: number
  recentActivity: UserProgress[]
  stories: Array<{
    storyId: string
    storyTitle: string
    completedUnits: number
    totalUnits: number
    averageScore: number
  }>
}

// API Response types
export interface GetStoriesByLevelResponse {
  stories: StoryWithUnits[]
}

export interface GetDailyPlansResponse {
  dailyPlans: DailyPlan[]
}

export interface GetStoryProgressResponse {
  storyId: string
  storyTitle: string
  levelName: string
  totalUnits: number
  completedUnits: number
  averageScore: number
  units: Array<{
    unitId: string
    unitTitle: string
    completed: boolean
    score: number
    startedAt?: string | null
    completedAt?: string | null
  }>
}

export interface GetProgressSummaryResponse {
  userId: string
  totalUnits: number
  completedUnits: number
  inProgressUnits: number
  averageScore: number
  totalPronunciationAttempts: number
  averagePronunciationScore: number
  recentActivity: UserProgress[]
  stories: Array<{
    storyId: string
    storyTitle: string
    completedUnits: number
    totalUnits: number
    averageScore: number
  }>
}

export interface ApiError {
  error: string
}
