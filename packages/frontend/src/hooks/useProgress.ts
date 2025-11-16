import { useCallback, useEffect, useState } from 'react'
import { ProgressService } from '../services/progress'
import type { GetProgressSummaryResponse, GetStoryProgressResponse } from '../types/api'
import { useAuth } from './useAuth'

interface UseProgressSummaryResult {
  summary: GetProgressSummaryResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProgressSummary(): UseProgressSummaryResult {
  const { token } = useAuth()
  const [summary, setSummary] = useState<GetProgressSummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const service = new ProgressService({
        getToken: () => token,
      })
      const response = await service.getProgressSummary()
      setSummary(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load progress summary'
      setError(message)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  }
}

interface UseStoryProgressResult {
  progress: GetStoryProgressResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStoryProgress(storyId: string | null): UseStoryProgressResult {
  const { token } = useAuth()
  const [progress, setProgress] = useState<GetStoryProgressResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    if (!storyId) {
      setProgress(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const service = new ProgressService({
        getToken: () => token,
      })

      const response = await service.getStoryProgress(storyId)
      setProgress(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load story progress'
      setError(message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }, [storyId, token])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    loading,
    error,
    refetch: fetchProgress,
  }
}
