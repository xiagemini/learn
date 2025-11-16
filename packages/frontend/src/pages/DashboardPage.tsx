import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStoriesByLevel, useDailyPlans } from '../hooks/useCourses'
import { useProgressSummary } from '../hooks/useProgress'
import StoryCard from '../components/StoryCard'
import DailyPlanCard from '../components/DailyPlanCard'
import StoryFilter, { type StoryFilterType } from '../components/StoryFilter'
import LoadingScreen from '../components/LoadingScreen'
import styles from './DashboardPage.module.css'

const DashboardPage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [storyFilter, setStoryFilter] = useState<StoryFilterType>('all')

  const { stories, loading: storiesLoading, error: storiesError } = useStoriesByLevel(user?.selectedLevelId ?? null)
  const { dailyPlans, loading: plansLoading, error: plansError } = useDailyPlans()
  const { summary: progressSummary, loading: progressLoading } = useProgressSummary()

  const levelName = useMemo(() => {
    if (!user?.selectedLevelId) return 'Not selected yet'
    return user.selectedLevel?.name ?? 'Custom level'
  }, [user?.selectedLevel?.name, user?.selectedLevelId])

  const joinDate = useMemo(() => {
    if (!user?.createdAt) return '—'
    const date = new Date(user.createdAt)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }, [user?.createdAt])

  const storiesWithProgress = useMemo(() => {
    if (!progressSummary) return stories

    return stories.map((story) => {
      const storyProgress = progressSummary.stories.find(
        (sp) => sp.storyId === story.id
      )
      return {
        story,
        progress: storyProgress
          ? {
              completedUnits: storyProgress.completedUnits,
              totalUnits: storyProgress.totalUnits,
              averageScore: storyProgress.averageScore,
            }
          : undefined,
      }
    })
  }, [stories, progressSummary])

  const filteredStories = useMemo(() => {
    if (storyFilter === 'all') return storiesWithProgress

    return storiesWithProgress.filter(({ progress }) => {
      if (!progress) return storyFilter === 'notStarted'

      const { completedUnits, totalUnits } = progress

      if (storyFilter === 'completed') {
        return totalUnits > 0 && completedUnits === totalUnits
      }

      if (storyFilter === 'inProgress') {
        return completedUnits > 0 && completedUnits < totalUnits
      }

      if (storyFilter === 'notStarted') {
        return completedUnits === 0
      }

      return true
    })
  }, [storiesWithProgress, storyFilter])

  const overduePlans = useMemo(() => {
    return dailyPlans.filter((plan) => plan.isOverdue)
  }, [dailyPlans])

  const todaysPlan = useMemo(() => {
    const today = new Date()
    return dailyPlans.find((plan) => {
      const planDate = new Date(plan.plannedDate)
      return planDate.toDateString() === today.toDateString()
    })
  }, [dailyPlans])

  const upcomingPlans = useMemo(() => {
    const today = new Date()
    return dailyPlans
      .filter((plan) => {
        const planDate = new Date(plan.plannedDate)
        return planDate > today
      })
      .slice(0, 3)
  }, [dailyPlans])

  const handleChangeLevel = () => {
    navigate('/select-level')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleStoryClick = (storyId: string) => {
    console.log('Navigate to story:', storyId)
  }

  const handleUnitClick = (unitId: string) => {
    console.log('Navigate to unit:', unitId)
  }

  if (storiesLoading || plansLoading || progressLoading) {
    return <LoadingScreen message="Loading your learning dashboard..." />
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.topSection}>
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
              <span className={styles.statLabel}>Completed Units</span>
              <span className={styles.statValue}>
                {progressSummary?.completedUnits ?? 0} / {progressSummary?.totalUnits ?? 0}
              </span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Average Score</span>
              <span className={styles.statValue}>
                {progressSummary?.averageScore ? `${Math.round(progressSummary.averageScore)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {overduePlans.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>⚠️ Overdue Plans</h2>
              <p className={styles.sectionSubtitle}>Complete these units to stay on track</p>
            </div>
            <div className={styles.plansList}>
              {overduePlans.map((plan) => (
                <DailyPlanCard
                  key={plan.id}
                  plan={plan}
                  onUnitClick={handleUnitClick}
                />
              ))}
            </div>
          </div>
        )}

        {todaysPlan && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>📅 Today&apos;s Plan</h2>
              <p className={styles.sectionSubtitle}>Your daily learning schedule</p>
            </div>
            <div className={styles.plansList}>
              <DailyPlanCard
                plan={todaysPlan}
                onUnitClick={handleUnitClick}
              />
            </div>
          </div>
        )}

        {upcomingPlans.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>📆 Upcoming Plans</h2>
              <p className={styles.sectionSubtitle}>What&apos;s next on your learning journey</p>
            </div>
            <div className={styles.plansList}>
              {upcomingPlans.map((plan) => (
                <DailyPlanCard
                  key={plan.id}
                  plan={plan}
                  onUnitClick={handleUnitClick}
                />
              ))}
            </div>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>📚 Your Stories</h2>
              <p className={styles.sectionSubtitle}>Explore stories for {levelName}</p>
            </div>
            <StoryFilter value={storyFilter} onChange={setStoryFilter} />
          </div>

          {storiesError && (
            <div className={styles.error} role="alert">
              {storiesError}
            </div>
          )}

          {!storiesError && filteredStories.length > 0 ? (
            <div className={styles.storiesGrid}>
              {filteredStories.map(({ story, progress }) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  progress={progress}
                  onClick={() => handleStoryClick(story.id)}
                />
              ))}
            </div>
          ) : !storiesError ? (
            <div className={styles.emptyState}>
              <p>No stories match your filter criteria.</p>
            </div>
          ) : null}
        </div>

        {plansError && (
          <div className={styles.error} role="alert">
            Daily plans: {plansError}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
