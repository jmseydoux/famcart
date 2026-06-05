import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="text-xl font-bold text-gray-900">
            FamCart
          </NavLink>
          <nav className="flex gap-6">
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
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
