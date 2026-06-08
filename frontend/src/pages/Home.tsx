import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, ShoppingCart, ChevronRight, LogIn } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'

interface Household {
  id: string
  name: string
  role: string
  _count: { members: number; lists: number }
}

export default function Home() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [createError, setCreateError] = useState('')
  const [joinError, setJoinError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['households'],
    queryFn: () => api.get<{ households: Household[] }>('/households'),
  })

  const createHousehold = useMutation({
    mutationFn: (name: string) => api.post<{ household: Household }>('/households', { name }),
    onSuccess: ({ household }) => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
      setShowCreate(false)
      setNewName('')
      navigate(`/household/${household.id}/lists`)
    },
    onError: (err: Error) => setCreateError(err.message),
  })

  const joinHousehold = useMutation({
    mutationFn: (code: string) => api.post<{ household: Household }>('/households/join', { code }),
    onSuccess: ({ household }) => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
      setShowJoin(false)
      setJoinCode('')
      navigate(`/household/${household.id}/lists`)
    },
    onError: (err: Error) => setJoinError(err.message),
  })

  const households = data?.households ?? []
  const canCreate = (appUser?.max_households ?? 0) > 0

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <PageSpinner />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🛒 FamCart</h1>
          <p className="text-gray-500 mt-1">Bonjour, {appUser?.name?.split(' ')[0]} 👋</p>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mes ménages</h2>

          {households.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Aucun ménage</p>
              <p className="text-sm text-gray-400 mt-1">Créez votre premier ménage ou rejoignez-en un</p>
            </div>
          ) : (
            <div className="space-y-3">
              {households.map(h => (
                <Link
                  key={h.id}
                  to={`/household/${h.id}/lists`}
                  className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{h.name}</h3>
                        <Badge variant={h.role === 'ADMIN' ? 'blue' : 'gray'}>
                          {h.role === 'ADMIN' ? 'Admin' : 'Membre'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {h._count.members} membre{h._count.members > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {h._count.lists} liste{h._count.lists > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {canCreate && (
            <Button onClick={() => { setShowCreate(true); setCreateError('') }} size="lg" className="w-full">
              <Plus className="w-5 h-5" />
              Créer un ménage
            </Button>
          )}
          <Button variant="outline" onClick={() => { setShowJoin(true); setJoinError('') }} size="lg" className="w-full">
            <LogIn className="w-5 h-5" />
            Rejoindre un ménage
          </Button>
        </div>

        {!canCreate && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Quota de création atteint. Demandez une invitation à l'administrateur.
          </p>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau ménage">
        <div className="space-y-4">
          <Input
            label="Nom du ménage"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ex : Famille Dupont"
            autoFocus
          />
          {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{createError}</p>}
          <Button
            className="w-full"
            size="lg"
            loading={createHousehold.isPending}
            onClick={() => createHousehold.mutate(newName)}
            disabled={!newName.trim()}
          >
            Créer
          </Button>
        </div>
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Rejoindre un ménage">
        <div className="space-y-4">
          <Input
            label="Code d'invitation (6 caractères)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="A1B2C3"
            maxLength={6}
            autoFocus
            className="tracking-widest text-center text-lg font-mono"
          />
          {joinError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{joinError}</p>}
          <Button
            className="w-full"
            size="lg"
            loading={joinHousehold.isPending}
            onClick={() => joinHousehold.mutate(joinCode)}
            disabled={joinCode.length < 4}
          >
            Rejoindre
          </Button>
        </div>
      </Modal>
    </div>
  )
}
