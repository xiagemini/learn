import styles from './LoadingScreen.module.css'

interface LoadingScreenProps {
  message?: string
}

const LoadingScreen = ({ message = 'Loading…' }: LoadingScreenProps) => {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.message}>{message}</p>
    </div>
  )
}

export default LoadingScreen
