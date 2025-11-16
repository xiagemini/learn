import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './LevelSelectionPage.module.css'

interface LevelOption {
  id: string
  name: string
  order: number
  storyCount: number
  description: string
}

interface LevelApiResponse {
  id: string
  name: string
  order?: number | string
  _count?: {
    stories?: number
  }
  stories?: Array<unknown>
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = response.statusText || `Request failed with status ${response.status}`

  try {
    const text = await response.text()
    if (!text) {
      return fallback
    }

    const payload = JSON.parse(text) as { error?: string; message?: string } | string

    if (typeof payload === 'string') {
      return payload
    }

    return payload.error ?? payload.message ?? fallback
  } catch {
    return fallback
  }
}

const LevelSelectionPage = () => {
  const { user, updateSelectedLevel, isProcessing, logout, token } = useAuth()
  const navigate = useNavigate()
  const [levels, setLevels] = useState<LevelOption[]>([])
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(user?.selectedLevelId ?? null)
  const [loadingLevels, setLoadingLevels] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.selectedLevelId) {
      setSelectedLevelId(user.selectedLevelId)
    }
  }, [user?.selectedLevelId])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchLevels = async () => {
      setLoadingLevels(true)
      setError(null)

      try {
        const response = await fetch('/api/courses/levels', {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
          signal: controller.signal,
          credentials: 'include',
        })

        if (!response.ok) {
          const message = await readErrorMessage(response)
          throw new Error(message)
        }

        const payload = (await response.json()) as { levels?: LevelApiResponse[] }
        const normalised = (payload.levels ?? []).map((level) => {
          const storyCount = level._count?.stories ?? level.stories?.length ?? 0
          const description = storyCount
            ? `${storyCount} curated stor${storyCount === 1 ? 'y' : 'ies'} to build your skills.`
            : 'A tailored path to grow your confidence.'

          return {
            id: level.id,
            name: level.name,
            order: typeof level.order === 'number' ? level.order : Number(level.order ?? 0),
            storyCount,
            description,
          }
        })

        normalised.sort((a, b) => a.order - b.order)

        if (!isMounted) {
          return
        }

        setLevels(normalised)
      } catch (fetchError) {
        if (!isMounted || controller.signal.aborted) {
          return
        }

        const message = fetchError instanceof Error ? fetchError.message : 'Unable to load levels'
        setError(message)
      } finally {
        if (isMounted) {
          setLoadingLevels(false)
        }
      }
    }

    fetchLevels()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [token])

  const selectedLevel = useMemo(
    () => levels.find((level) => level.id === selectedLevelId) ?? null,
    [levels, selectedLevelId],
  )

  const handleSelect = useCallback((levelId: string) => {
    setSelectedLevelId(levelId)
    setError(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!selectedLevelId) {
      setError('Please choose a level before continuing.')
      return
    }

    try {
      const updatedUser = await updateSelectedLevel(selectedLevelId)
      navigate(updatedUser.selectedLevelId ? '/' : '/select-level', { replace: true })
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Unable to save selection'
      setError(message)
    }
  }, [navigate, selectedLevelId, updateSelectedLevel])

  const handleGoToDashboard = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  const handleSignOut = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h1 className={styles.title}>Choose your learning path</h1>
          <p className={styles.subtitle}>
            Select the level that best matches your comfort zone so we can tailor your stories,
            units, and pronunciation practice to the right difficulty.
          </p>
        </div>

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        <div className={styles.levelList}>
          {loadingLevels ? (
            <p className={styles.selectionStatus}>Loading levels…</p>
          ) : levels.length ? (
            levels.map((level) => {
              const isSelected = selectedLevelId === level.id
              const className = `${styles.levelCard} ${isSelected ? styles.selected : ''}`

              return (
                <button
                  key={level.id}
                  type="button"
                  className={className}
                  onClick={() => handleSelect(level.id)}
                  aria-pressed={isSelected}
                >
                  <span className={styles.levelMeta}>Level {level.order}</span>
                  <h2 className={styles.levelName}>{level.name}</h2>
                  <p className={styles.levelDescription}>{level.description}</p>
                </button>
              )
            })
          ) : (
            <p className={styles.selectionStatus}>No levels found. Please try again later.</p>
          )}
        </div>

        <div className={styles.actions}>
          <span className={styles.selectionStatus}>
            {selectedLevel
              ? `Selected level: ${selectedLevel.name}`
              : 'Choose a level to unlock your personalised learning track.'}
          </span>

          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleConfirm}
              disabled={!selectedLevelId || isProcessing}
            >
              {isProcessing ? 'Saving…' : selectedLevelId ? 'Confirm selection' : 'Pick a level'}
            </button>

            {user?.selectedLevelId ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleGoToDashboard}
                disabled={isProcessing}
              >
                Go to dashboard
              </button>
            ) : null}

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSignOut}
              disabled={isProcessing}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LevelSelectionPage
