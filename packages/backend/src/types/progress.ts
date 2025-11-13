/**
 * Type definitions for the Progress API
 */

// Progress tracking types
export interface UserProgress {
  id: string
  userId: string
  unitId: string
  completed: boolean
  score: number
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PronunciationAttempt {
  id: string
  userId: string
  unitId: string
  audioKey: string
  score: number
  feedback: string | null
  createdAt: Date
}

// Request body types
export interface StartUnitRequest {
  unitId: string
}

export interface VideoProgressRequest {
  currentTime: number
  duration: number
}

export interface PronunciationAttemptRequest {
  audioKey: string
  score: number
  feedback?: string
}

export interface CompleteUnitRequest {
  finalScore?: number
}

// Response types
export interface StartUnitResponse {
  progress: UserProgress
}

export interface VideoProgressResponse {
  progress: UserProgress
  message: string
}

export interface PronunciationAttemptResponse {
  attempt: PronunciationAttempt
  averageScore: number
  attemptCount: number
}

export interface CompleteUnitResponse {
  progress: UserProgress
  dailyPlanUpdated: boolean
}

export interface UnitProgressDetail {
  unitId: string
  unitTitle: string
  storyId: string
  storyTitle: string
  completed: boolean
  score: number
  startedAt: Date | null
  completedAt: Date | null
  pronunciationAttempts: number
  averagePronunciationScore: number
}

export interface StoryProgressSummary {
  storyId: string
  storyTitle: string
  levelName: string
  totalUnits: number
  completedUnits: number
  averageScore: number
  units: UnitProgressDetail[]
}

export interface UserProgressSummary {
  userId: string
  totalUnits: number
  completedUnits: number
  inProgressUnits: number
  averageScore: number
  totalPronunciationAttempts: number
  averagePronunciationScore: number
  recentActivity: UserProgress[]
  stories: {
    storyId: string
    storyTitle: string
    levelName: string
    completedUnits: number
    totalUnits: number
    averageScore: number
  }[]
}

export interface GetProgressResponse {
  progress: UserProgress | null
  pronunciationAttempts: PronunciationAttempt[]
}

export interface ApiError {
  error: string
}
