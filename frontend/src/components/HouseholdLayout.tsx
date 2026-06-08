import { useRef, useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingCart, Package, History, Settings, Bell, ChevronDown, X, ChevronLeft } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { APP_VERSION } from '../lib/version'

interface Notification {
  id: string
  message: string
  type: string
  read: boolean
  created_at: string
}

interface Household {
  id: string
  name: string
  role: string
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    refetchInterval: 30_000,
  })

  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const unread = data?.unreadCount ?? 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open && unread > 0) readAll.mutate() }}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-900">Notifications</span>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {!data?.notifications.length && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucune notification</p>
            )}
            {data?.notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 ${!n.read ? 'bg-blue-50' : ''}`}>
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UserMenu({ householdName }: { householdName: string }) {
  const { appUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/login')
  }

  const initials = appUser?.name
    ? appUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 focus:outline-none"
        aria-label="Menu utilisateur"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
          {initials}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-1 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{appUser?.name}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{householdName}</p>
          </div>
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Changer de ménage
          </Link>
          {appUser?.is_super_admin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50"
            >
              Administration
            </Link>
          )}
          <NavLink
            to="/about"
            onClick={() => setOpen(false)}
            className="flex w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            À propos
          </NavLink>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}

export default function HouseholdLayout() {
  const { hid } = useParams<{ hid: string }>()

  const { data } = useQuery({
    queryKey: ['household', hid],
    queryFn: () => api.get<{ household: Household }>(`/households/${hid}`),
    enabled: !!hid,
  })

  const household = data?.household
  const isAdmin = household?.role === 'ADMIN'

  const tabs = [
    { to: 'lists', icon: ShoppingCart, label: 'Listes' },
    { to: 'products', icon: Package, label: 'Produits' },
    { to: 'history', icon: History, label: 'Historique' },
    ...(isAdmin ? [{ to: 'settings', icon: Settings, label: 'Réglages' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Ménage</p>
            <p className="font-semibold text-gray-900 leading-tight">{household?.name ?? '…'}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu householdName={household?.name ?? ''} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        <Outlet context={{ household, isAdmin }} />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={`/household/${hid}/${tab.to}`}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="text-center pb-0.5">
          <span className="text-[10px] text-gray-300">v{APP_VERSION}</span>
        </div>
      </nav>
    </div>
  )
}
