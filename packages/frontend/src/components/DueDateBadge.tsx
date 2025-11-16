import styles from './DueDateBadge.module.css'

interface DueDateBadgeProps {
  dueDate: string
  isOverdue: boolean
  isCompleted?: boolean
}

const DueDateBadge = ({ dueDate, isOverdue, isCompleted = false }: DueDateBadgeProps) => {
  const date = new Date(dueDate)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)

  const getClassName = () => {
    if (isCompleted) return `${styles.badge} ${styles.completed}`
    if (isOverdue) return `${styles.badge} ${styles.overdue}`
    if (isToday) return `${styles.badge} ${styles.today}`
    return `${styles.badge} ${styles.upcoming}`
  }

  const getLabel = () => {
    if (isCompleted) return 'Completed'
    if (isOverdue) return 'Overdue'
    if (isToday) return 'Due today'
    return `Due ${formattedDate}`
  }

  return (
    <span className={getClassName()} aria-label={getLabel()}>
      {getLabel()}
    </span>
  )
}

export default DueDateBadge
