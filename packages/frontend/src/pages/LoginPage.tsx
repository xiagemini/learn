import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './LoginPage.module.css'

const LoginPage = () => {
  const { login, authError, isProcessing, status, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(user.selectedLevelId ? '/' : '/select-level', { replace: true })
    }
  }, [navigate, status, user])

  const errorMessage = useMemo(() => formError ?? authError ?? null, [authError, formError])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedUsername = username.trim()

    if (!trimmedUsername || !password) {
      setFormError('Please enter both your username and password to continue.')
      return
    }

    setFormError(null)

    try {
      const authenticatedUser = await login({
        username: trimmedUsername,
        password,
      })

      navigate(authenticatedUser.selectedLevelId ? '/' : '/select-level', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in'
      setFormError(message)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in with your username to continue learning.</p>
        </div>

        {errorMessage ? (
          <div className={styles.error} role="alert" id="login-error">
            {errorMessage}
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="johndoe"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={styles.input}
              aria-describedby={errorMessage ? 'login-error' : undefined}
              disabled={isProcessing}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={styles.input}
              aria-describedby={errorMessage ? 'login-error' : undefined}
              disabled={isProcessing}
              required
            />
          </div>

          <button className={styles.button} type="submit" disabled={isProcessing}>
            {isProcessing ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.helper}>
          Your username is the only identifier you need — keep your password secure to protect your
          progress.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
