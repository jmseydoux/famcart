import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Users, Home, Link2, Plus, Trash2, Copy, Check, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'

interface PlatformInvitation {
  id: string; token: string; max_households: number; max_members: number
  expires_at: string; used_at: string | null
  created_by: { name: string }; used_by: { name: string; email: string } | null
}
interface AdminUser {
  id: string; name: string; email: string; is_super_admin: boolean
  max_households: number; created_at: string; _count: { householdMembers: number }
}
interface AdminHousehold {
  id: string; name: string; created_at: string; _count: { members: number; lists: number }
  members: Array<{ user: { name: string; email: string } }>
}

type Tab = 'invitations' | 'users' | 'households'

export default function Admin() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('invitations')
  const [showCreate, setShowCreate] = useState(false)
  const [inviteForm, setInviteForm] = useState({ max_households: 1, max_members: 5, expires_in_days: 7 })
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Also allow bootstrapping super-admin
  const [showBootstrap, setShowBootstrap] = useState(false)
  const [bootstrapSecret, setBootstrapSecret] = useState('')
  const [bootstrapError, setBootstrapError] = useState('')

  const { data: invData, isLoading: loadingInv } = useQuery({
    queryKey: ['admin', 'invitations'],
    queryFn: () => api.get<{ invitations: PlatformInvitation[] }>('/admin/invitations'),
    enabled: !!appUser?.is_super_admin,
  })
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<{ users: AdminUser[] }>('/admin/users'),
    enabled: tab === 'users' && !!appUser?.is_super_admin,
  })
  const { data: householdsData, isLoading: loadingHouseholds } = useQuery({
    queryKey: ['admin', 'households'],
    queryFn: () => api.get<{ households: AdminHousehold[] }>('/admin/households'),
    enabled: tab === 'households' && !!appUser?.is_super_admin,
  })

  const createInvitation = useMutation({
    mutationFn: () => api.post('/admin/invitations', inviteForm),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] }); setShowCreate(false) },
  })

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/invitations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })

  const bootstrap = useMutation({
    mutationFn: () => api.post('/auth/bootstrap', { secret: bootstrapSecret }),
    onSuccess: () => { setShowBootstrap(false); window.location.reload() },
    onError: (err: Error) => setBootstrapError(err.message),
  })

  function copyToken(token: string) {
    const url = `${window.location.origin}/register?token=${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const invitations = invData?.invitations ?? []

  if (!appUser?.is_super_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-700 mb-2">Accès restreint</h1>
        <p className="text-gray-500 mb-6">Cette page est réservée au Super-Admin.</p>
        <p className="text-sm text-gray-400 mb-4">Si vous êtes l'administrateur de la plateforme, utilisez le bootstrap :</p>
        <Button variant="outline" size="sm" onClick={() => setShowBootstrap(true)}>
          Bootstrap Super-Admin
        </Button>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <Modal open={showBootstrap} onClose={() => setShowBootstrap(false)} title="Bootstrap Super-Admin">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Saisissez le secret configuré dans la variable <code className="bg-gray-100 px-1 rounded">SUPER_ADMIN_SECRET</code> du backend.</p>
            <Input type="password" label="Secret" value={bootstrapSecret} onChange={e => setBootstrapSecret(e.target.value)} />
            {bootstrapError && <p className="text-sm text-red-600">{bootstrapError}</p>}
            <Button className="w-full" size="lg" loading={bootstrap.isPending} onClick={() => bootstrap.mutate()}>
              Devenir Super-Admin
            </Button>
          </div>
        </Modal>
      </div>
    )
  }

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'invitations', label: 'Invitations', icon: <Link2 className="w-4 h-4" /> },
    { key: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" /> },
    { key: 'households', label: 'Ménages', icon: <Home className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">Administration</h1>
            </div>
            <p className="text-sm text-gray-400">Super-Admin</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Invitations tab */}
        {tab === 'invitations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{invitations.length} invitation{invitations.length > 1 ? 's' : ''}</p>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                Créer
              </Button>
            </div>
            {loadingInv ? <PageSpinner /> : (
              <div className="space-y-3">
                {invitations.map(inv => {
                  const isExpired = new Date(inv.expires_at) < new Date()
                  const isUsed = !!inv.used_at
                  return (
                    <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isUsed ? 'gray' : isExpired ? 'red' : 'green'}>
                              {isUsed ? 'Utilisée' : isExpired ? 'Expirée' : 'Active'}
                            </Badge>
                            <span className="text-xs text-gray-400">par {inv.created_by.name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Max {inv.max_households} ménage{inv.max_households > 1 ? 's' : ''}, {inv.max_members} membres
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!isUsed && !isExpired && (
                            <button onClick={() => copyToken(inv.token)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                              {copiedToken === inv.token ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          )}
                          {!isUsed && (
                            <button onClick={() => revokeInvitation.mutate(inv.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isUsed && inv.used_by && (
                        <p className="text-xs text-gray-400">Utilisée par {inv.used_by.name} ({inv.used_by.email})</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div className="space-y-3">
            {loadingUsers ? <PageSpinner /> : usersData?.users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      {u.is_super_admin && <Badge variant="blue">Super-Admin</Badge>}
                    </div>
                    <p className="text-sm text-gray-400">{u.email}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{u._count.householdMembers} ménage{u._count.householdMembers > 1 ? 's' : ''}</p>
                    <p>Max {u.max_households} créable{u.max_households > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Households tab */}
        {tab === 'households' && (
          <div className="space-y-3">
            {loadingHouseholds ? <PageSpinner /> : householdsData?.households.map(h => (
              <div key={h.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="font-medium text-gray-900">{h.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  Admin : {h.members[0]?.user.name ?? '—'} · {h._count.members} membre{h._count.members > 1 ? 's' : ''} · {h._count.lists} liste{h._count.lists > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Créé le {new Date(h.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create invitation modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle invitation plateforme">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quota ménages</label>
            <input
              type="number" min="1" max="50" value={inviteForm.max_households}
              onChange={e => setInviteForm(f => ({ ...f, max_households: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quota membres par ménage</label>
            <input
              type="number" min="1" max="100" value={inviteForm.max_members}
              onChange={e => setInviteForm(f => ({ ...f, max_members: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validité (jours)</label>
            <input
              type="number" min="1" max="365" value={inviteForm.expires_in_days}
              onChange={e => setInviteForm(f => ({ ...f, expires_in_days: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button className="w-full" size="lg" loading={createInvitation.isPending} onClick={() => createInvitation.mutate()}>
            Générer le lien
          </Button>
        </div>
      </Modal>
    </div>
  )
}
