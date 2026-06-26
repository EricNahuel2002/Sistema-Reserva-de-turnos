import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/Navbar'
import { Login } from './views/Login'
import { Register } from './views/Register'
import { AdminRegister } from './views/AdminRegister'
import { Dashboard } from './views/Dashboard'
import { AdminDashboard } from './views/AdminDashboard'
import { NotFound } from './views/NotFound'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role.name === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user && !profile) return <Navigate to="/login" replace />
  if (user && profile?.role.name === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role.name !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role.name === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
