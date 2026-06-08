import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { APP_VERSION } from '../lib/version'

export default function Layout() {
  const { appUser, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="text-xl font-bold text-gray-900 flex items-baseline gap-1.5">
            FamCart
            <span className="text-xs font-normal text-gray-400">v{APP_VERSION}</span>
          </NavLink>
          <nav className="flex items-center gap-6">
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`
              }
            >
              À propos
            </NavLink>
            <NavLink
              to="/db-status"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`
              }
            >
              Status BD
            </NavLink>
            {appUser && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{appUser.name}</span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
