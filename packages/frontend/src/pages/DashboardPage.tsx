import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './DashboardPage.module.css'

const DashboardPage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const levelName = useMemo(() => {
    if (!user?.selectedLevelId) {
      return 'Not selected yet'
    }

    return user.selectedLevel?.name ?? 'Custom level'
  }, [user?.selectedLevel?.name, user?.selectedLevelId])

  const joinDate = useMemo(() => {
    if (!user?.createdAt) {
      return '—'
    }

    const date = new Date(user.createdAt)

    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }, [user?.createdAt])

  const handleChangeLevel = () => {
    navigate('/select-level')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Hi, {user?.username ?? 'there'} 👋</h1>
            <p className={styles.subtitle}>
              You&apos;re all set! Dive into your personalised plan and keep your momentum going.
            </p>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={handleChangeLevel}>
              Change learning level
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Current level</span>
            <span className={styles.statValue}>{levelName}</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Member since</span>
            <span className={styles.statValue}>{joinDate}</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Next focus</span>
            <span className={styles.statValue}>Explore your daily plan</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
