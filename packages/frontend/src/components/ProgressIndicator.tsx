import styles from './ProgressIndicator.module.css'

interface ProgressIndicatorProps {
  value: number
  max: number
  variant?: 'bar' | 'circle'
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
}

const ProgressIndicator = ({
  value,
  max,
  variant = 'bar',
  size = 'medium',
  showLabel = true,
}: ProgressIndicatorProps) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0

  if (variant === 'circle') {
    const radius = size === 'small' ? 16 : size === 'large' ? 28 : 22
    const strokeWidth = size === 'small' ? 3 : size === 'large' ? 5 : 4
    const normalizedRadius = radius - strokeWidth / 2
    const circumference = normalizedRadius * 2 * Math.PI
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className={`${styles.circleContainer} ${styles[size]}`}>
        <svg height={radius * 2} width={radius * 2} className={styles.circleSvg}>
          <circle
            className={styles.circleBackground}
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            className={styles.circleProgress}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {showLabel && (
          <span className={styles.circleLabel}>{percentage}%</span>
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.barContainer} ${styles[size]}`}>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className={styles.barLabel}>
          {value} / {max}
        </span>
      )}
    </div>
  )
}

export default ProgressIndicator
