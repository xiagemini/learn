import { useState, useEffect } from 'react'

interface HealthStatus {
  status: string
  timestamp: string
  uptime: number
}

function App() {
  const [message, setMessage] = useState<string>('')
  const [health, setHealth] = useState<HealthStatus | null>(null)

  useEffect(() => {
    fetch('/api')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error('Error fetching message:', err))

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('Error fetching health:', err))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Monorepo Frontend</h1>
        <p>React + Vite + TypeScript</p>
      </header>

      <main className="app-main">
        <section className="backend-info">
          <h2>Backend Connection</h2>
          {message && <p className="message">{message}</p>}
          {health && (
            <div className="health-status">
              <h3>Health Check</h3>
              <p>
                Status:{' '}
                <span className={health.status === 'ok' ? 'healthy' : 'unhealthy'}>
                  {health.status}
                </span>
              </p>
              <p>Timestamp: {health.timestamp}</p>
              <p>Uptime: {health.uptime?.toFixed(2)}s</p>
            </div>
          )}
        </section>

        <section className="placeholder">
          <h2>Welcome to Your Monorepo!</h2>
          <p>
            This is a placeholder page demonstrating the connection between your React frontend and
            Hono backend.
          </p>
          <p>Start building your application by modifying the components in this directory.</p>
        </section>
      </main>
    </div>
  )
}

export default App
