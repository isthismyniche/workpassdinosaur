import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const ChallengePage = lazy(() => import('./pages/ChallengePage').then(m => ({ default: m.ChallengePage })))
const RevealPage = lazy(() => import('./pages/RevealPage').then(m => ({ default: m.RevealPage })))
const PastChallengesPage = lazy(() => import('./pages/PastChallengesPage').then(m => ({ default: m.PastChallengesPage })))
const PastChallengeDetailPage = lazy(() => import('./pages/PastChallengeDetailPage').then(m => ({ default: m.PastChallengeDetailPage })))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })))
const MePage = lazy(() => import('./pages/MePage').then(m => ({ default: m.MePage })))

const PageSpinner = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
  </div>
)

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageSpinner />

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<ChallengePage />} />
        <Route path="/reveal" element={<RevealPage />} />
        <Route path="/past" element={<PastChallengesPage />} />
        <Route path="/past/:date" element={<PastChallengeDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-dvh flex flex-col bg-bg-primary text-text-primary font-body">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
