import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { CoursesService } from '../services/courses'
import type { StoryWithUnits, DailyPlan } from '../types/api'

interface UseStoriesResult {
  stories: StoryWithUnits[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStoriesByLevel(levelId: string | null): UseStoriesResult {
  const { token } = useAuth()
  const [stories, setStories] = useState<StoryWithUnits[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStories = useCallback(async () => {
    if (!levelId) {
      setStories([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const service = new CoursesService({
        getToken: () => token,
      })

      const response = await service.getStoriesByLevel(levelId)
      setStories(response.stories)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load stories'
      setError(message)
      setStories([])
    } finally {
      setLoading(false)
    }
  }, [levelId, token])

  useEffect(() => {
    fetchStories()
  }, [fetchStories])

  return {
    stories,
    loading,
    error,
    refetch: fetchStories,
  }
}

interface UseDailyPlansResult {
  dailyPlans: DailyPlan[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDailyPlans(params?: {
  startDate?: string
  endDate?: string
  overdueOnly?: boolean
}): UseDailyPlansResult {
  const { token } = useAuth()
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDailyPlans = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const service = new CoursesService({
        getToken: () => token,
      })

      const response = await service.getDailyPlans(params)
      setDailyPlans(response.dailyPlans)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load daily plans'
      setError(message)
      setDailyPlans([])
    } finally {
      setLoading(false)
    }
  }, [token, params])

  useEffect(() => {
    fetchDailyPlans()
  }, [fetchDailyPlans])

  return {
    dailyPlans,
    loading,
    error,
    refetch: fetchDailyPlans,
  }
}
