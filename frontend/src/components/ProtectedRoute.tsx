import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Chargement…</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function RequireHousehold({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Chargement…</div>
  if (!appUser?.household_id) return <Navigate to="/setup" replace />
  return <>{children}</>
}
