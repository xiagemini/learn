import type { DailyPlan } from '../types/api'
import DueDateBadge from './DueDateBadge'
import styles from './DailyPlanCard.module.css'

interface DailyPlanCardProps {
  plan: DailyPlan
  onUnitClick: (unitId: string) => void
}

const DailyPlanCard = ({ plan, onUnitClick }: DailyPlanCardProps) => {
  const completedCount = plan.entries.filter((entry) => entry.completed).length
  const totalCount = plan.entries.length
  const allCompleted = totalCount > 0 && completedCount === totalCount

  const planDate = new Date(plan.plannedDate)
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(planDate)

  return (
    <div className={`${styles.card} ${allCompleted ? styles.completed : ''}`}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{formattedDate}</h3>
          <p className={styles.subtitle}>
            {completedCount} of {totalCount} unit{totalCount === 1 ? '' : 's'} completed
          </p>
        </div>
        <DueDateBadge
          dueDate={plan.plannedDate}
          isOverdue={plan.isOverdue}
          isCompleted={allCompleted}
        />
      </div>

      <div className={styles.entries}>
        {plan.entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.unitCard} ${entry.completed ? styles.unitCompleted : ''}`}
            onClick={() => onUnitClick(entry.unitId)}
          >
            <div className={styles.unitHeader}>
              <div className={styles.unitInfo}>
                <span className={styles.unitTitle}>{entry.unit.title}</span>
                <span className={styles.unitStory}>
                  {entry.unit.story.title}
                </span>
              </div>
              {entry.completed && (
                <div className={styles.checkmark}>
                  <span>✓</span>
                </div>
              )}
            </div>

            {entry.completed && entry.score > 0 && (
              <div className={styles.score}>
                Score: <span className={styles.scoreValue}>{entry.score}%</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default DailyPlanCard
