import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { authApi } from './lib/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import IncomingCallModal from './components/call/IncomingCallModal'
import ActiveCallView from './components/call/ActiveCallView'
import ConnectingCallView from './components/call/ConnectingCallView'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuthStore()
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuthStore()
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (token) return <Navigate to="/chat" replace />
  return <>{children}</>
}

export default function App() {
  const { token, setAuth, setLoading } = useAuthStore()

  useEffect(() => {
    if (token) {
      authApi.me()
        .then((data: any) => setAuth(data, token))
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/login" element={<AuthGuard><LoginPage /></AuthGuard>} />
        <Route path="/register" element={<AuthGuard><RegisterPage /></AuthGuard>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
      {/* Global call overlays */}
      <IncomingCallModal />
      <ConnectingCallView />
      <ActiveCallView />
    </BrowserRouter>
  )
}
