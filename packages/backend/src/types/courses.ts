/**
 * Type definitions for the Courses API
 * These types can be used by frontend applications for type safety
 */

// Base entity types
export interface Asset {
  id: string
  unitId: string
  type: AssetType
  minioKey: string
  duration?: number | null
  metadata?: string | null
  createdAt: Date
  updatedAt: Date
  presignedUrl: string
}

export type AssetType = 'VIDEO' | 'AUDIO' | 'SUBTITLE' | 'SCREENSHOT' | 'METADATA'

export interface Level {
  id: string
  name: string
  order: number
  createdAt: Date
  updatedAt: Date
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
  createdAt: Date
  updatedAt: Date
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
  createdAt: Date
  updatedAt: Date
  story: {
    title: string
  }
  _count: {
    assets: number
  }
}

export interface DailyPlanEntry {
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

export interface DailyPlan {
  id: string
  userId: string
  plannedDate: Date
  createdAt: Date
  updatedAt: Date
  isOverdue: boolean
  entries: DailyPlanEntry[]
}

// Composite types with nested data
export interface LevelWithStories extends Level {
  stories: StoryWithUnits[]
}

export interface StoryWithUnits extends Story {
  units: UnitWithAssets[]
}

export interface UnitWithAssets extends Unit {
  assets: Asset[]
}

export interface DailyPlanWithEntries extends DailyPlan {}

// API Request/Response types
export interface GetLevelsResponse {
  levels: LevelWithStories[]
}

export interface GetStoriesResponse {
  levels: LevelWithStories[]
}

export interface GetStoriesByLevelIdResponse {
  stories: StoryWithUnits[]
}

export interface GetUnitsByStoryIdResponse {
  units: UnitWithAssets[]
}

export interface GetUnitByIdResponse {
  unit: UnitWithAssets
}

export interface GetDailyPlansResponse {
  dailyPlans: DailyPlanWithEntries[]
}

export interface GetDailyPlanByDateResponse {
  dailyPlan: DailyPlanWithEntries
}

// Query parameter types
export interface DailyPlansQueryParams {
  startDate?: string
  endDate?: string
  overdueOnly?: boolean
}

// API Error type
export interface ApiError {
  error: string
}

// API Client Options
export interface ApiClientOptions {
  baseUrl?: string
  authToken?: string
  defaultHeaders?: Record<string, string>
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// API Response wrapper
export interface ApiResponse<T = any> {
  data?: T
  error?: ApiError
  status: number
  ok: boolean
}

// Pagination types (for future use)
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Filter types (for future use)
export interface LevelFilters {
  name?: string
  order?: number
}

export interface StoryFilters {
  title?: string
  levelId?: string
  order?: number
}

export interface UnitFilters {
  title?: string
  storyId?: string
  order?: number
}

export interface AssetFilters {
  type?: AssetType
  unitId?: string
}

export interface DailyPlanFilters {
  userId?: string
  plannedDate?: Date
  completed?: boolean
  overdueOnly?: boolean
}

// Sort options
export type SortOrder = 'asc' | 'desc'

export interface SortOptions {
  field: string
  order: SortOrder
}

// Comprehensive filter and query types
export interface GetLevelsOptions extends PaginationParams {
  filters?: LevelFilters
  sort?: SortOptions
}

export interface GetStoriesOptions extends PaginationParams {
  filters?: StoryFilters
  sort?: SortOptions
}

export interface GetUnitsOptions extends PaginationParams {
  filters?: UnitFilters
  sort?: SortOptions
}

export interface GetAssetsOptions extends PaginationParams {
  filters?: AssetFilters
  sort?: SortOptions
}

export interface GetDailyPlansOptions extends PaginationParams {
  filters?: DailyPlanFilters
  sort?: SortOptions
}

// Progress tracking types
export interface UserProgress {
  id: string
  userId: string
  unitId: string
  completed: boolean
  score: number
  startedAt?: Date | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

// Study statistics types
export interface StudyStats {
  totalUnits: number
  completedUnits: number
  totalScore: number
  averageScore: number
  studyStreak: number
  lastStudyDate?: Date
}

// Learning path types
export interface LearningPath {
  id: string
  userId: string
  levelId: string
  currentStoryId?: string
  currentUnitId?: string
  progress: number
  createdAt: Date
  updatedAt: Date
}

// Recommendation types
export interface RecommendedUnit {
  unit: UnitWithAssets
  reason: string
  priority: number
}

export interface StudyRecommendation {
  date: Date
  recommendedUnits: RecommendedUnit[]
  estimatedDuration: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

// Export a union type for all possible resource types
export type ResourceType = 'level' | 'story' | 'unit' | 'asset' | 'dailyPlan' | 'userProgress'

// Export a generic resource interface
export interface Resource {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Export type guards
export function isAsset(obj: any): obj is Asset {
  return obj && typeof obj === 'object' && 'type' in obj && 'unitId' in obj
}

export function isUnit(obj: any): obj is Unit {
  return obj && typeof obj === 'object' && 'storyId' in obj && 'title' in obj
}

export function isStory(obj: any): obj is Story {
  return obj && typeof obj === 'object' && 'levelId' in obj && 'title' in obj
}

export function isLevel(obj: any): obj is Level {
  return obj && typeof obj === 'object' && 'name' in obj && 'order' in obj && !('levelId' in obj)
}

export function isDailyPlan(obj: any): obj is DailyPlan {
  return obj && typeof obj === 'object' && 'userId' in obj && 'plannedDate' in obj && 'entries' in obj
}