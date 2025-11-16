import type { StoryWithUnits } from '../types/api'
import ProgressIndicator from './ProgressIndicator'
import styles from './StoryCard.module.css'

interface StoryCardProps {
  story: StoryWithUnits
  progress?: {
    completedUnits: number
    totalUnits: number
    averageScore: number
  }
  onClick: () => void
}

const StoryCard = ({ story, progress, onClick }: StoryCardProps) => {
  const totalUnits = progress?.totalUnits || story._count.units
  const completedUnits = progress?.completedUnits || 0
  const averageScore = progress?.averageScore || 0

  const isInProgress = completedUnits > 0 && completedUnits < totalUnits
  const isCompleted = totalUnits > 0 && completedUnits === totalUnits

  return (
    <button
      type="button"
      className={`${styles.card} ${isInProgress ? styles.inProgress : ''} ${isCompleted ? styles.completed : ''}`}
      onClick={onClick}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{story.title}</h3>
        {isCompleted && <span className={styles.completedBadge}>✓ Completed</span>}
      </div>

      {story.description && (
        <p className={styles.description}>{story.description}</p>
      )}

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Units</span>
          <span className={styles.metaValue}>{totalUnits}</span>
        </div>

        {completedUnits > 0 && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Avg Score</span>
            <span className={styles.metaValue}>{averageScore}%</span>
          </div>
        )}
      </div>

      {completedUnits > 0 && (
        <div className={styles.progress}>
          <ProgressIndicator
            value={completedUnits}
            max={totalUnits}
            variant="bar"
            size="medium"
            showLabel={true}
          />
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.action}>View units →</span>
      </div>
    </button>
  )
}

export default StoryCard
