import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

const TOKEN_STORAGE_KEY = 'language-learning.authToken'

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

export interface AuthLevel {
  id: string
  name: string
  order: number
}

export interface AuthUser {
  id: string
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  profilePictureUrl?: string | null
  selectedLevelId: string | null
  selectedLevel?: AuthLevel | null
  createdAt?: string
}

interface AuthState {
  status: AuthStatus
  token: string | null
  user: AuthUser | null
  error: string | null
  isProcessing: boolean
}

interface AuthContextValue {
  status: AuthStatus
  token: string | null
  user: AuthUser | null
  authError: string | null
  isProcessing: boolean
  login: (credentials: { username: string; password: string }) => Promise<AuthUser>
  logout: () => void
  refreshUser: () => Promise<AuthUser | null>
  updateSelectedLevel: (levelId: string) => Promise<AuthUser>
}

async function extractErrorMessage(response: Response): Promise<string> {
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
  } catch (error) {
    console.error('Failed to parse error response', error)
    return fallback
  }
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === 'undefined') {
      return {
        status: 'initializing',
        token: null,
        user: null,
        error: null,
        isProcessing: false,
      }
    }

    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)

    return {
      status: storedToken ? 'initializing' : 'unauthenticated',
      token: storedToken,
      user: null,
      error: null,
      isProcessing: false,
    }
  })

  useEffect(() => {
    if (state.status !== 'initializing') {
      return
    }

    const token = state.token

    if (!token) {
      setState((prev) => ({ ...prev, status: 'unauthenticated', token: null }))
      return
    }

    let isActive = true
    const controller = new AbortController()

    const hydrateUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          credentials: 'include',
        })

        if (!response.ok) {
          const message = await extractErrorMessage(response)
          throw new Error(message)
        }

        const data = (await response.json()) as { user: AuthUser }

        if (!isActive) {
          return
        }

        setState({
          status: 'authenticated',
          token,
          user: data.user,
          error: null,
          isProcessing: false,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        console.warn('Unable to restore session', error)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY)
        }
        setState({
          status: 'unauthenticated',
          token: null,
          user: null,
          error: null,
          isProcessing: false,
        })
      }
    }

    hydrateUser()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [state.status, state.token])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }

    setState({
      status: 'unauthenticated',
      token: null,
      user: null,
      error: null,
      isProcessing: false,
    })
  }, [])

  const login = useCallback(async ({ username, password }: { username: string; password: string }) => {
    setState((prev) => ({
      ...prev,
      isProcessing: true,
      error: null,
    }))

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      })

      if (!response.ok) {
        const message = await extractErrorMessage(response)
        throw new Error(message || 'Unable to sign in')
      }

      const data = (await response.json()) as { token: string; user: AuthUser }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
      }

      setState({
        status: 'authenticated',
        token: data.token,
        user: data.user,
        error: null,
        isProcessing: false,
      })

      return data.user
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in'

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      }

      setState({
        status: 'unauthenticated',
        token: null,
        user: null,
        error: message,
        isProcessing: false,
      })

      throw new Error(message)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const token = state.token

    if (!token) {
      return null
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.status === 401 || response.status === 403) {
        logout()
        throw new Error('Session expired. Please sign in again.')
      }

      if (!response.ok) {
        const message = await extractErrorMessage(response)
        throw new Error(message)
      }

      const data = (await response.json()) as { user: AuthUser }

      setState((prev) => ({
        ...prev,
        status: 'authenticated',
        user: data.user,
        error: null,
      }))

      return data.user
    } catch (error) {
      if (error instanceof Error && error.message.includes('Session expired')) {
        throw error
      }

      const message = error instanceof Error ? error.message : 'Unable to refresh session'
      throw new Error(message)
    }
  }, [logout, state.token])

  const updateSelectedLevel = useCallback(
    async (levelId: string) => {
      const token = state.token

      if (!token) {
        throw new Error('You must be signed in to select a learning level.')
      }

      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
      }))

      try {
        const response = await fetch('/api/auth/selected-level', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ levelId }),
          credentials: 'include',
        })

        if (response.status === 401 || response.status === 403) {
          const message = await extractErrorMessage(response)
          logout()
          throw new Error(message || 'Session expired. Please sign in again.')
        }

        if (!response.ok) {
          const message = await extractErrorMessage(response)
          throw new Error(message || 'Unable to update selected level')
        }

        const data = (await response.json()) as { user: AuthUser }

        setState((prev) => ({
          ...prev,
          status: 'authenticated',
          user: data.user,
          isProcessing: false,
          error: null,
        }))

        return data.user
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update selected level'

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: message,
        }))

        throw new Error(message)
      }
    },
    [logout, state.token],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      token: state.token,
      user: state.user,
      authError: state.error,
      isProcessing: state.isProcessing,
      login,
      logout,
      refreshUser,
      updateSelectedLevel,
    }),
    [login, logout, refreshUser, state.error, state.isProcessing, state.status, state.token, state.user, updateSelectedLevel],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
