import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoadingScreen from './components/LoadingScreen'
import { useAuth } from './hooks/useAuth'
import DashboardPage from './pages/DashboardPage'
import LevelSelectionPage from './pages/LevelSelectionPage'
import LoginPage from './pages/LoginPage'

type ProtectedRouteProps = {
  children: ReactElement
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { status } = useAuth()

  if (status === 'initializing') {
    return <LoadingScreen message="Preparing your learning experience…" />
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const { status, user } = useAuth()

  if (status === 'initializing') {
    return <LoadingScreen message="Preparing your learning experience…" />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          status === 'authenticated' ? (
            <Navigate to={user?.selectedLevelId ? '/' : '/select-level'} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/select-level"
        element={
          <ProtectedRoute>
            {user?.selectedLevelId ? <Navigate to="/" replace /> : <LevelSelectionPage />}
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.selectedLevelId ? <DashboardPage /> : <Navigate to="/select-level" replace />}
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={status === 'authenticated' ? '/' : '/login'} replace />}
      />
    </Routes>
  )
}

export default App
